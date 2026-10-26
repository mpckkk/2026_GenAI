FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 HDF5_PLUGIN_PATH=/nonexistent
WORKDIR /worker
COPY infra/science/h5ad/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --only-binary=:all: -r requirements.txt && useradd --uid 1000 --create-home celloras && mkdir /uploads /datasets && chown celloras:celloras /uploads /datasets
COPY infra/science/h5ad/importer.py infra/science/h5ad/worker.py ./
USER celloras
CMD ["python", "worker.py"]
