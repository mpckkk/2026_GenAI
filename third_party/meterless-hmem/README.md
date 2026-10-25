# Meterless H-MEM reference

Source: https://github.com/Meterless/Meterless/tree/1742dec56a66e58eef9dda2d2b865823758ca8cd/engines/hmem

Apache-2.0 license is preserved in `LICENSE`. Files under `source/` and the conformance TypeScript/JSON are unmodified upstream bytes. `runtime/*.mjs` and `conformance/runner.mjs` are generated ES2022 JavaScript with local import extensions changed to `.mjs`. `manifest.json` records the pinned revision, compiler version and SHA-256 of every source/generated artifact.

Regenerate with `node scripts/vendor-hmem.mjs`. Explicitly fetch pinned upstream bytes with `node scripts/vendor-hmem.mjs --fetch`. Run acceptance from the repository root with `HMEM_IMPL="$PWD/third_party/meterless-hmem/runtime/index.mjs" node third_party/meterless-hmem/conformance/runner.mjs`.

The application adapter is `app/adapters/research-memory.mjs`. It adds project/owner isolation, PostgreSQL transactions and append-only ledger persistence. It only remembers explicit researcher reviews. It selects current decisions by exact target identity before H-MEM ranking, uses exact owned group selection when named and otherwise a 0.2 application retrieval threshold, with at most five results, and preserves superseded records for audit. It does not call automatic mining, sleep, dreaming, feedback-based biological confidence or semantic conflict resolution. Hashed embeddings are the upstream deterministic implementation, not an NVIDIA embedding model. Upstream code is a reference implementation, not a hosted service.
