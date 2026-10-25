import { randomUUID, createHash } from "node:crypto";
import { isIP } from "node:net";
import { verifiedReference } from "./annotation-engine.mjs";
import { PublishedMarkerReference } from "./marker-reference.mjs";

export class ZetarisError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function configuration() {
  const {
    ZETARIS_API_URL,
    ZETARIS_API_TOKEN,
    ZETARIS_ORG_ID,
    ZETARIS_REFERENCE_TABLE,
  } = process.env;
  if (
    ![
      ZETARIS_API_URL,
      ZETARIS_API_TOKEN,
      ZETARIS_ORG_ID,
      ZETARIS_REFERENCE_TABLE,
    ].every(Boolean)
  )
    throw new ZetarisError("zetaris_unconfigured");
  let url;
  try {
    url = new URL(ZETARIS_API_URL);
  } catch {
    throw new ZetarisError("zetaris_invalid_configuration");
  }
  // Self-hosted Zetaris exposes HTTP on a private Docker network or loopback.
  // This is an explicit operator choice, never an automatic HTTPS downgrade.
  const host = url.hostname;
  const privateIPv4 =
    isIP(host) === 4 &&
    (/^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(host));
  const privateHost =
    /^[a-z0-9][a-z0-9-]*$/i.test(host) ||
    host === "[::1]" ||
    host === "host.docker.internal" ||
    privateIPv4;
  const privateHttp =
    url.protocol === "http:" &&
    privateHost &&
    process.env.ZETARIS_ALLOW_PRIVATE_HTTP === "true";
  if (
    (url.protocol !== "https:" && !privateHttp) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\d{1,18}$/.test(ZETARIS_ORG_ID) ||
    !/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*){0,3}$/.test(ZETARIS_REFERENCE_TABLE)
  )
    throw new ZetarisError("zetaris_invalid_configuration");
  return {
    base: url.href.replace(/\/$/, ""),
    token: ZETARIS_API_TOKEN,
    org: ZETARIS_ORG_ID,
    table: ZETARIS_REFERENCE_TABLE,
  };
}

// Exact reference identity is application configuration; neither model text nor
// uploaded gene lists can become SQL, a URL or a table identifier.
export class ZetarisReference {
  async load({ signal } = {}) {
    const config = configuration();
    const expected = verifiedReference();
    const requestId = randomUUID();
    const headers = {
      Authorization: `Bearer ${config.token}`,
      "X-Org-ID": config.org,
      "X-Request-ID": requestId,
      "Content-Type": "application/json",
    };
    let queryToken;
    try {
      const response = await fetch(`${config.base}/api/v1.0/query/sql/start`, {
        method: "POST",
        headers,
        redirect: "error",
        body: JSON.stringify({
          select: `SELECT record_index, record_json, content_sha256 FROM ${config.table} WHERE reference_id = '${expected.reference.id}' ORDER BY record_index`,
          pageLimit: 100,
        }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
          : AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new ZetarisError(
          response.status === 401 || response.status === 403
            ? "zetaris_unauthorized"
            : "zetaris_query_failed",
        );
      const reader = response.body.getReader();
      const chunks = [];
      let bytes = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 1_048_576)
            throw new ZetarisError("zetaris_response_too_large");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        typeof result.queryToken === "string" &&
        result.queryToken.length <= 2048
      )
        queryToken = result.queryToken;
      if (
        !queryToken ||
        result.totalCount !== expected.records.length ||
        result.totalPages !== 1 ||
        !Array.isArray(result.records) ||
        result.records.length !== expected.records.length
      )
        throw new ZetarisError("zetaris_reference_incomplete");
      const records = result.records
        .sort((a, b) => Number(a.record_index) - Number(b.record_index))
        .map((row, index) => {
          if (
            Number(row.record_index) !== index ||
            row.content_sha256 !== expected.contentSha256 ||
            typeof row.record_json !== "string"
          )
            throw new ZetarisError("zetaris_reference_mismatch");
          return JSON.parse(row.record_json);
        });
      const { contentSha256, ...content } = expected;
      content.records = records;
      if (
        createHash("sha256").update(JSON.stringify(content)).digest("hex") !==
        contentSha256
      )
        throw new ZetarisError("zetaris_reference_mismatch");
      return {
        ...content,
        contentSha256,
        delivery: {
          provider: "Zetaris",
          requestId,
          retrievedAt: new Date().toISOString(),
          recordCount: records.length,
          contentSha256,
        },
      };
    } catch (error) {
      if (error instanceof ZetarisError) throw error;
      throw new ZetarisError(
        signal?.aborted ? "zetaris_cancelled" : "zetaris_query_failed",
      );
    } finally {
      if (queryToken) {
        let closed = false;
        try {
          const response = await fetch(
            `${config.base}/api/v1.0/query/sql/close/${encodeURIComponent(queryToken)}`,
            {
              method: "DELETE",
              headers: { ...headers, "X-Request-ID": randomUUID() },
              redirect: "error",
              signal: AbortSignal.timeout(5000),
            },
          );
          closed = response.ok;
          await response.body?.cancel();
        } catch {
          /* fail closed; no successful data delivery with an unclosed query */
        }
        if (!closed) throw new ZetarisError("zetaris_query_cleanup_failed");
      }
    }
  }
  async health() {
    if (this.verifiedAt && Date.now() - this.verifiedAt < 60000)
      return this.receipt;
    const source = await this.load();
    this.receipt = source.delivery;
    this.verifiedAt = Date.now();
    return this.receipt;
  }
}

export function configuredReferences() {
  const provider = process.env.CELLORAS_REFERENCE_PROVIDER || "published";
  if (provider === "published")
    return {
      name: "Published reference",
      marker: new PublishedMarkerReference(),
      load: async () => verifiedReference(),
    };
  if (provider !== "zetaris")
    throw new ZetarisError("reference_provider_invalid");
  const zetaris = new ZetarisReference();
  return {
    name: "Zetaris",
    marker: new PublishedMarkerReference({
      atlasLoader: (options) => zetaris.load(options),
      atlasOnly: true,
    }),
    load: (options) => zetaris.load(options),
  };
}
