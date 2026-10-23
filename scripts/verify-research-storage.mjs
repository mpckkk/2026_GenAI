// Real migration rehearsal in disposable databases, never the development DB.
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import pg from "pg";

const execute = promisify(execFile);
if (!process.env.DATABASE_URL || !process.env.POSTGRES_ADMIN_PASSWORD)
  throw new Error(
    "Local database and administrator configuration are required",
  );
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.username = "postgres";
adminUrl.password = process.env.POSTGRES_ADMIN_PASSWORD;
adminUrl.pathname = "/postgres";
const admin = new pg.Client({ connectionString: adminUrl.href });
await admin.connect();
const databases = [];
const connections = new Set();
const suffix = randomUUID().replaceAll("-", "");

async function connect(name) {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.href });
  await client.connect();
  connections.add(client);
  return { client, url };
}

async function migrate(url) {
  await execute(process.execPath, ["scripts/migrate.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, DATABASE_URL: url.href },
  });
}

try {
  for (const mode of ["fresh", "populated"]) {
    const name = `celloras_verify_${mode}_${suffix}`;
    assert.match(name, /^celloras_verify_[a-z0-9_]+$/);
    await admin.query(`CREATE DATABASE "${name}"`);
    databases.push(name);
    const { client, url } = await connect(name);
    let originalProjectId;
    let originalTurn;
    if (mode === "populated") {
      await client.query(
        "CREATE TABLE schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      for (const name of [
        "001_foundation.sql",
        "002_research_conversation.sql",
        "003_agent_chat.sql",
        "004_agent_response_document.sql",
        "005_marker_evidence.sql",
      ]) {
        const sql = await readFile(
          new URL(`../db/migrations/${name}`, import.meta.url),
          "utf8",
        );
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES ($1,$2)",
          [name, createHash("sha256").update(sql).digest("hex")],
        );
      }
      const user = await client.query(
        "INSERT INTO app_users(issuer,subject,display_name) VALUES ('https://example.test','migration-rehearsal','Migration rehearsal') RETURNING id",
      );
      const project = await client.query(
        "INSERT INTO projects(owner_id,name) VALUES ($1,'Existing experiment') RETURNING id",
        [user.rows[0].id],
      );
      originalProjectId = project.rows[0].id;
      originalTurn = (
        await client.query(
          "INSERT INTO agent_turns(project_id,owner_id,submission_id,prompt,response_text,status) VALUES ($1,$2,$3,'Existing prompt','**Existing reply**','completed') RETURNING *",
          [originalProjectId, user.rows[0].id, randomUUID()],
        )
      ).rows[0];
      await assert.rejects(
        client.query("SELECT id FROM analysis_runs LIMIT 0"),
        { code: "42P01" },
      );
    }
    await migrate(url);
    await client.query(
      "SELECT id, project_id, position FROM research_entries LIMIT 0",
    );
    const first = await client.query(
      "SELECT name,checksum FROM schema_migrations ORDER BY name",
    );
    assert.equal(first.rowCount, 6);
    await client.query("SELECT id,input,result FROM analysis_runs LIMIT 0");
    await client.query(
      "SELECT submission_id,note FROM analysis_reviews LIMIT 0",
    );
    await client.query(
      "SELECT dataset_id,artifact_version FROM project_datasets LIMIT 0",
    );
    await client.query("SELECT owner_id,demo_key FROM demo_projects LIMIT 0");
    await client.query("SELECT id,result FROM marker_evidence_runs LIMIT 0");
    await client.query("SELECT evidence_run_id FROM research_entries LIMIT 0");
    await client.query("SELECT response_document FROM agent_turns LIMIT 0");
    await migrate(url);
    assert.deepEqual(
      (
        await client.query(
          "SELECT name,checksum FROM schema_migrations ORDER BY name",
        )
      ).rows,
      first.rows,
    );
    if (originalTurn) {
      const stored = (
        await client.query("SELECT * FROM agent_turns WHERE id=$1", [
          originalTurn.id,
        ])
      ).rows[0];
      assert.equal(stored.response_document, null);
      assert.deepEqual(stored, { ...originalTurn, requested_action: null });
    }
    if (originalProjectId) {
      assert.deepEqual(
        (await client.query("SELECT id,name FROM projects")).rows,
        [{ id: originalProjectId, name: "Existing experiment" }],
      );
    }
    console.log(
      JSON.stringify({
        event: "migration.rehearsal.passed",
        mode,
        rerunUnchanged: true,
        previousProjectPreserved: mode === "populated",
      }),
    );
    await client.end();
    connections.delete(client);
  }
} catch (error) {
  // Do not print child process errors: their captured environment may contain secrets.
  console.error(
    JSON.stringify({
      event: "migration.rehearsal.failed",
      errorType: error?.constructor?.name ?? "UnknownError",
      code: typeof error?.code === "string" ? error.code : undefined,
    }),
  );
  process.exitCode = 1;
} finally {
  for (const client of connections) await client.end();
  for (const name of databases) {
    assert.match(name, /^celloras_verify_[a-z0-9_]+$/);
    await admin.query(`DROP DATABASE "${name}"`);
  }
  await admin.end();
}
