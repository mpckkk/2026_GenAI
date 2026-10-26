import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { services } from "@/app/bootstrap";
import { apiError } from "@/app/api/responses";
export const runtime = "nodejs";
let verified:
  { file: string; expected: string; size: number; mtimeMs: number } | undefined;
async function demo() {
  const fileName = process.env.CELLORAS_H5AD_DEMO_FILE;
  const expected = process.env.CELLORAS_H5AD_DEMO_SHA256;
  if (!fileName || !expected || !/^[a-f0-9]{64}$/.test(expected)) return null;
  const file = path.resolve(/* turbopackIgnore: true */ fileName);
  const info = await stat(file);
  if (!info.isFile() || info.size < 1 || info.size > 4 * 1024 ** 3)
    throw new Error("demo_file_invalid");
  if (
    !verified ||
    verified.file !== file ||
    verified.expected !== expected ||
    verified.size !== info.size ||
    verified.mtimeMs !== info.mtimeMs
  ) {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    if (hash.digest("hex") !== expected)
      throw new Error("demo_checksum_mismatch");
    verified = { file, expected, size: info.size, mtimeMs: info.mtimeMs };
  }
  return {
    file,
    headers: {
      "Content-Type": "application/x-hdf5",
      "Content-Length": String(info.size),
      "Content-Disposition":
        'attachment; filename="celloras-soybean-root-demo.h5ad"',
      "Cache-Control": "private, no-store",
      "X-Content-SHA256": expected,
      "X-Dataset-Source":
        "GSE270392 root RNA counts; converted from published RDS",
    },
  };
}
async function respond(head: boolean) {
  try {
    await services.auth.requireUser();
    const result = await demo();
    if (!result)
      return Response.json(
        { error: "The downloadable demo file is not configured." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    if (head) return new Response(null, { headers: result.headers });
    return new Response(
      Readable.toWeb(createReadStream(result.file)) as ReadableStream,
      { headers: result.headers },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function HEAD() {
  return respond(true);
}
export async function GET() {
  return respond(false);
}
