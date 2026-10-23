FROM node:22.22.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @openai/codex@0.163.0 \
    && mkdir -p /sandbox && chown node:node /sandbox
COPY --chmod=755 infra/agent/run-codex.mjs /usr/local/bin/celloras-codex
ENV HOME=/sandbox
USER node
WORKDIR /sandbox
CMD ["sleep", "infinity"]
