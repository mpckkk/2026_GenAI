FROM node:22.22.0-bookworm-slim
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
RUN set -eu; case "$TARGETARCH" in arm64) arch=aarch64 ;; amd64) arch=x86_64 ;; *) exit 1 ;; esac; \
    file="openshell-${arch}-unknown-linux-musl.tar.gz"; \
    curl -fsSLo /tmp/openshell.tar.gz "https://github.com/NVIDIA/OpenShell/releases/download/v0.1.5/${file}"; \
    curl -fsSLo /tmp/checksums https://github.com/NVIDIA/OpenShell/releases/download/v0.1.5/openshell-checksums-sha256.txt; \
    checksum="$(awk -v file="$file" '$2 == file { print $1 }' /tmp/checksums)"; \
    test -n "$checksum"; echo "$checksum  /tmp/openshell.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/openshell.tar.gz -C /usr/local/bin; rm /tmp/openshell.tar.gz /tmp/checksums
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY infra/agent/ ./infra/agent/
COPY app/adapters/agent-openshell.mjs ./app/adapters/agent-openshell.mjs
COPY app/core/agent-response.mjs app/core/analysis.mjs ./app/core/
COPY app/services/agent-response.mjs ./app/services/agent-response.mjs
COPY app/adapters/research-memory.mjs ./app/adapters/research-memory.mjs
COPY app/adapters/zetaris-reference.mjs ./app/adapters/zetaris-reference.mjs
COPY app/gateway/nightshift.mjs ./app/gateway/nightshift.mjs
COPY app/core/agent-response.schema.json ./app/core/agent-response.schema.json
COPY third_party/meterless-hmem/runtime/ ./third_party/meterless-hmem/runtime/
COPY third_party/meterless-hmem/LICENSE ./third_party/meterless-hmem/LICENSE
COPY third_party/meterless-hmem/README.md ./third_party/meterless-hmem/README.md
COPY app/adapters/marker-reference.mjs ./app/adapters/marker-reference.mjs
COPY app/services/marker-evidence.mjs ./app/services/marker-evidence.mjs
COPY data/references/ ./data/references/
COPY app/adapters/project-scientific-data.mjs app/adapters/annotation-engine.mjs app/adapters/scientific-data.mjs app/adapters/literature.mjs ./app/adapters/
COPY app/services/analysis-tools.mjs ./app/services/analysis-tools.mjs
COPY data/datasets/ ./data/datasets/
COPY data/literature/ ./data/literature/
USER node
CMD ["node", "infra/agent/worker.mjs"]
