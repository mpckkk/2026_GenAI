"""Durable H5AD queue consumer. File processing runs in a bounded child process."""
import json
import multiprocessing
import os
from pathlib import Path
import signal
import threading
import time
import uuid

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from importer import ImportFailure, import_file, inspect_file, sha256

UPLOADS = Path(os.environ.get('CELLORAS_UPLOAD_DIR', '/uploads')).resolve()
DATASETS = Path(os.environ.get('CELLORAS_UPLOADED_DATASET_DIR', '/datasets')).resolve()
TIMEOUT = min(1800, max(30, int(os.environ.get('CELLORAS_H5AD_TIMEOUT_SECONDS', '900'))))
WORKER_STATUS = 'starting'
MEMORY = min(8, max(1, int(os.environ.get('CELLORAS_H5AD_MEMORY_GIB', '3')))) * 1024**3

def log(event, **fields):
    print(json.dumps({'event': event, **fields}), flush=True)

def heartbeat(stop):
    while not stop.is_set():
        tmp = UPLOADS / '.worker-health.tmp'
        tmp.write_text(json.dumps({'version': 1, 'status': WORKER_STATUS, 'updatedAt': time.time()}))
        tmp.replace(UPLOADS / '.worker-health.json')
        stop.wait(10)

def confined(root, *parts):
    target = root.joinpath(*parts)
    # A source and all ancestors must be physical files/directories, not symlinks.
    current = target
    while current != root:
        if current.is_symlink(): raise ImportFailure('h5ad_path_invalid', 'Dataset storage contains a symbolic link.')
        current = current.parent
        if current == current.parent and current != root: raise ImportFailure('h5ad_path_invalid', 'Invalid dataset storage path.')
    if not target.resolve().is_relative_to(root): raise ImportFailure('h5ad_path_invalid', 'Invalid dataset storage path.')
    return target

def process_job(job, sender):
    try:
        if os.name == 'posix':
            import resource
            # Linux enforces process virtual memory; macOS uses a different allocator and is bounded by the container in deployment.
            if os.uname().sysname == 'Linux': resource.setrlimit(resource.RLIMIT_AS, (MEMORY, MEMORY))
            resource.setrlimit(resource.RLIMIT_CPU, (TIMEOUT, TIMEOUT + 5))
            signal.alarm(TIMEOUT)
        upload_id = str(uuid.UUID(str(job['id'])))
        source = confined(UPLOADS, upload_id, 'source.h5ad')
        if not source.is_file() or source.stat().st_size != job['size_bytes']:
            raise ImportFailure('h5ad_source_changed', 'The completed upload is missing or its size changed.')
        digest = sha256(source)
        if job['status'] == 'inspecting':
            result = {'sha256': digest, 'inspection': inspect_file(source)}
        else:
            if digest != job['sha256']: raise ImportFailure('h5ad_source_changed', 'The uploaded file changed after inspection. Upload it again.')
            output = confined(DATASETS, job['dataset_id'])
            result = import_file(source, output, job['dataset_id'], job['selection'], {'filename': job['filename'], 'sha256': digest})
        sender.send({'ok': True, 'result': result})
    except ImportFailure as error:
        sender.send({'ok': False, 'code': error.code, 'message': error.message})
    except (MemoryError, OSError, ValueError, TypeError, KeyError, RuntimeError):
        sender.send({'ok': False, 'code': 'h5ad_invalid', 'message': 'The H5AD could not be read within the supported format and resource limits. Check the selected matrix and metadata.'})
    finally:
        sender.close()

def execute(job):
    ctx = multiprocessing.get_context('spawn')
    receiver, sender = ctx.Pipe(duplex=False)
    child = ctx.Process(target=process_job, args=(job, sender))
    child.start(); sender.close()
    deadline = time.monotonic() + TIMEOUT + 10
    result = None
    while time.monotonic() < deadline:
        if receiver.poll(1):
            try: result = receiver.recv()
            except EOFError: pass
            break
        if not child.is_alive(): break
    if child.is_alive():
        child.join(5)
        if child.is_alive(): child.terminate(); child.join(5)
        if child.is_alive(): child.kill(); child.join()
    else: child.join()
    receiver.close()
    return result or {'ok': False, 'code': 'h5ad_resource_limit', 'message': 'Import exceeded its time or memory limit. Use a smaller preprocessed dataset.'}

def claim(conn):
    with conn.transaction():
        # An interrupted job is made explicitly retryable by a fresh upload; never assume an unfinished artifact is valid.
        conn.execute("UPDATE dataset_uploads SET status='failed',error_code='h5ad_worker_interrupted',error_message='The import worker stopped before completion. Please upload the file again.',updated_at=now() WHERE status IN ('inspecting','importing') AND started_at < now() - make_interval(secs => %s)", (TIMEOUT + 60,))
        row = conn.execute("SELECT u.* FROM dataset_uploads u JOIN projects p ON p.id=u.project_id AND p.owner_id=u.owner_id WHERE u.status IN ('inspect_queued','import_queued') ORDER BY u.created_at FOR UPDATE OF u SKIP LOCKED LIMIT 1").fetchone()
        if not row: return None
        state = 'inspecting' if row['status'] == 'inspect_queued' else 'importing'
        conn.execute("UPDATE dataset_uploads SET status=%s,started_at=now(),updated_at=now(),error_code=NULL,error_message=NULL WHERE id=%s", (state, row['id']))
        row['status'] = state
        return row

def finish(conn, job, outcome):
    with conn.transaction():
        # Lock the project, serializing with dataset binding, and re-check ownership before any publication.
        project = conn.execute('SELECT id FROM projects WHERE id=%s AND owner_id=%s FOR UPDATE', (job['project_id'], job['owner_id'])).fetchone()
        row = conn.execute('SELECT status FROM dataset_uploads WHERE id=%s AND owner_id=%s FOR UPDATE', (job['id'], job['owner_id'])).fetchone()
        if not project or not row or row['status'] != job['status']:
            raise ImportFailure('h5ad_ownership_changed', 'Import ownership or state changed before completion.')
        if not outcome['ok']:
            conn.execute("UPDATE dataset_uploads SET status='failed',error_code=%s,error_message=%s,updated_at=now() WHERE id=%s", (outcome['code'], outcome['message'], job['id']))
        elif job['status'] == 'inspecting':
            result = outcome['result']
            conn.execute("UPDATE dataset_uploads SET status='awaiting_selection',sha256=%s,inspection=%s,updated_at=now() WHERE id=%s", (result['sha256'], Jsonb(result['inspection']), job['id']))
        else:
            result = outcome['result']
            bound = conn.execute('INSERT INTO project_datasets(project_id,dataset_id,artifact_version) VALUES(%s,%s,%s) ON CONFLICT(project_id) DO NOTHING RETURNING project_id', (job['project_id'], job['dataset_id'], result['manifestSha256'])).fetchone()
            if not bound:
                conn.execute("UPDATE dataset_uploads SET status='failed',error_code='h5ad_attachment_conflict',error_message='This experiment already has a dataset. Upload into a new experiment.',updated_at=now() WHERE id=%s", (job['id'],))
                return
            conn.execute("UPDATE dataset_uploads SET status='ready',manifest_sha256=%s,dataset=%s,updated_at=now() WHERE id=%s", (result['manifestSha256'], Jsonb(result['dataset']), job['id']))

def main():
    global WORKER_STATUS
    UPLOADS.mkdir(parents=True, exist_ok=True); DATASETS.mkdir(parents=True, exist_ok=True)
    stop = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT): signal.signal(sig, lambda *_: stop.set())
    thread = threading.Thread(target=heartbeat, args=(stop,), daemon=True); thread.start()
    log('h5ad.worker.started')
    while not stop.is_set():
        try:
            with psycopg.connect(os.environ['DATABASE_URL'], row_factory=dict_row, autocommit=True) as conn:
                WORKER_STATUS = 'ready'
                while not stop.is_set():
                    job = claim(conn)
                    if job is None: stop.wait(2); continue
                    log('h5ad.job.started', uploadId=str(job['id']), operation=job['status'])
                    outcome = execute(job)
                    finish(conn, job, outcome)
                    log('h5ad.job.finished', uploadId=str(job['id']), operation=job['status'], success=outcome['ok'], code=outcome.get('code'))
        except Exception as error:
            WORKER_STATUS = 'unavailable'
            # Never emit database URLs, credentials, file content, or raw database exception text.
            log('h5ad.worker.error', type=type(error).__name__)
            stop.wait(5)
    stop.set(); thread.join(2)
    (UPLOADS / '.worker-health.json').unlink(missing_ok=True)

if __name__ == '__main__': main()
