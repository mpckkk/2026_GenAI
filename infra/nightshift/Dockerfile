# Compatibility deployment for Linux x86_64. Vendor code is unmodified.
# Only the ARM64 daemon is emulated; its Node engine runs natively.
FROM node:22.16.0-bookworm-slim AS node
FROM ubuntu:24.04
ARG TARGETARCH
RUN test "$TARGETARCH" = "amd64" \
    && dpkg --add-architecture arm64 \
    && sed -i '/^Types: deb/a Architectures: amd64' /etc/apt/sources.list.d/ubuntu.sources \
    && printf '%s\n' \
       'deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports noble main universe' \
       'deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports noble-updates main universe' \
       'deb [arch=arm64] http://ports.ubuntu.com/ubuntu-ports noble-security main universe' \
       > /etc/apt/sources.list.d/arm64.list \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       qemu-user-static libc6:arm64 libstdc++6:arm64 ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL --retry 2 \
       https://meterless.ai/Nightshift/DGX/meterless-runtime_1.5.1-1_arm64.deb \
       -o /tmp/meterless-runtime.deb \
    && echo 'c89deb611f114f1fa2a8cee9ad5039b25412ea279f691d10683fec6645af05c3  /tmp/meterless-runtime.deb' | sha256sum -c - \
    && dpkg-deb -x /tmp/meterless-runtime.deb / \
    && rm /tmp/meterless-runtime.deb \
    && groupadd -g 10001 meterless \
    && useradd -u 10001 -g meterless -d /var/lib/meterless meterless \
    && mkdir -p /var/lib/meterless/models /var/log/meterless /run/meterless \
    && chown -R meterless:meterless /var/lib/meterless /var/log/meterless /run/meterless
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY config.toml /etc/meterless/config.toml
COPY --chown=10001:10001 lanes.toml /var/lib/meterless/lanes.toml
ENV METERLESS_STATE_DIR=/var/lib/meterless
USER 10001:10001
ENTRYPOINT ["/usr/bin/qemu-aarch64-static", "/usr/bin/meterlessd", "--config", "/etc/meterless/config.toml"]
