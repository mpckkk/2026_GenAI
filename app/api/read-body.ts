type JsonBody =
  { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJsonBody(request: Request): Promise<JsonBody> {
  const reader = request.body?.getReader();
  if (!reader)
    return {
      ok: false,
      response: Response.json({ error: "JSON body required" }, { status: 400 }),
    };
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) {
        await reader.cancel();
        return {
          ok: false,
          response: Response.json(
            { error: "Request is too large" },
            { status: 413 },
          ),
        };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Valid JSON required" },
        { status: 400 },
      ),
    };
  }
}
