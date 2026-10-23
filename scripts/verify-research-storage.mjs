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
    if (mode === "populated") {
      const sql = await readFile(
        new URL("../db/migrations/001_foundation.sql", import.meta.url),
        "utf8",
      );
      await client.query(sql);
      await client.query(
        "CREATE TABLE schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      await client.query(
        "INSERT INTO schema_migrations(name,checksum) VALUES ($1,$2)",
        ["001_foundation.sql", createHash("sha256").update(sql).digest("hex")],
      );
      const user = await client.query(
        "INSERT INTO app_users(issuer,subject,display_name) VALUES ('https://example.test','migration-rehearsal','Migration rehearsal') RETURNING id",
      );
      const project = await client.query(
        "INSERT INTO projects(owner_id,name) VALUES ($1,'Existing experiment') RETURNING id",
        [user.rows[0].id],
      );
      originalProjectId = project.rows[0].id;
      await assert.rejects(
        client.query("SELECT id FROM research_entries LIMIT 0"),
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
    assert.equal(first.rowCount, 2);
    await migrate(url);
    assert.deepEqual(
      (
        await client.query(
          "SELECT name,checksum FROM schema_migrations ORDER BY name",
        )
      ).rows,
      first.rows,
    );
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
