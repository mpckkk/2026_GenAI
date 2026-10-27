# Nightshift on the Celloras Linux server

This is a custom x86_64 deployment of Meterless's official DGX runtime 1.5.1.
The published core binary is ARM64. QEMU runs that unmodified daemon, while
the shipped JavaScript engine runs under native Node 22.16.0. No host-wide
emulation registration, privileged container, GPU, Docker socket or laptop is
required. This is not a vendor-supported x86 release.

The container is configured for cloud providers. A provider API key is still
required. A Codex subscription login is not an OpenAI API key. The bundled
local GPU inference binaries are not enabled or verified by this deployment.
The runtime package is downloaded from Meterless and checksum-verified during
the build; proprietary vendor files are not vendored in this repository.

## Install

Copy this directory to persistent operator storage outside the application
checkout. On the existing Linux x86_64 Docker host, set `CELLORAS_NETWORK`
to the running application's Docker network, then run:

```sh
docker compose up -d --build
docker compose ps
docker compose exec nightshift /usr/local/bin/node /usr/lib/meterless/cli/ns.mjs status --json
```

No host ports are published. The authenticated runtime API is reachable by
Celloras at `http://nightshift:8088/v1` on its private Docker network. Admin
operations use the container's Unix socket, not a public HTTP endpoint.
The state volume retains provider configuration, runtime tokens and receipts.
Do not copy it into Git or discard it when recreating the container.

## Configure and activate

1. Configure a real provider key through Nightshift's supported provider
   settings/control interface. Keep keys in private operator secret storage.
2. Transfer `/var/lib/meterless/proxy-token` from the runtime into the worker's
   secret configuration without printing it. Set `NIGHTSHIFT_API_URL` to the
   private address above and `NIGHTSHIFT_MODEL` to a returned route such as
   `meterless/auto`. The runtime token and upstream provider key are distinct.
3. Run the existing `scripts/verify-sponsors.mjs nightshift` probe with those
   settings. It must return a real, schema-valid answer and provider receipt.
4. Keep `CELLORAS_AGENT_RUNTIME=openshell` for conversation. Verify a real
   investigation through `scripts/verify-investigation.mjs RUN_ID GROUP
--provider`, then its visual card, explicit decision, H-MEM recall and
   activity attribution. Only then enable `CELLORAS_INVESTIGATION_ENABLED=true`
   in both app and worker. See the [activation gate](../../docs/configuration.md#investigate-an-unclear-group).

Health and `/v1/models` responses do not prove inference. With no compute
provider configured, an actual completion returns `no_provider_configured`.
There is no automatic fallback to another Celloras runtime.

## Recovery and limits

Retain the working OpenShell configuration while completing acceptance.
Switching the Celloras runtime is an explicit operator action. The container
can be stopped independently with `docker compose stop`; do not remove the
state volume. Resource limits cover the routing service, not local inference.
Emulation performance under concurrent traffic, local GPU lanes, media
generation and the full overnight-job workflow have not been verified.

Sources: [DGX installer](https://meterless.ai/Nightshift/DGX/install.sh),
[published checksums](https://meterless.ai/Nightshift/DGX/SHA256SUMS),
[provider contract](https://github.com/Meterless/Meterless/blob/main/docs/agent-ready/add-meterless-provider.md).
