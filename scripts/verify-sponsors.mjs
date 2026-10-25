// Real provider probes only. Credentials come from the operator environment.
import { ZetarisReference } from "../app/adapters/zetaris-reference.mjs";
import { NightshiftAgent } from "../app/gateway/nightshift.mjs";
const target = process.argv[2];
try {
  if (target === "zetaris") {
    const reference = await new ZetarisReference().load();
    console.log(
      JSON.stringify({
        event: "zetaris.query.verified",
        ...reference.delivery,
      }),
    );
  } else if (target === "nightshift") {
    const runtime = new NightshiftAgent();
    await runtime.health();
    const result = await runtime.run({
      name: "provider-probe",
      prompt: JSON.stringify({
        experiment: {
          availableCards: [],
          records: [],
          analysisResults: [],
          remainingToolCalls: 0,
          scientificStatus: "not_attached",
        },
        message:
          "Briefly explain why a saved researcher label is not an independently validated cell identity. No tools or analysis.",
      }),
      progress: () => {},
    });
    if (!result.blocks.some((block) => block.type === "markdown"))
      throw new Error("missing_markdown");
    console.log(
      JSON.stringify({
        event: "nightshift.inference.verified",
        ...runtime.lastReceipt,
        blocks: result.blocks.map((block) => block.type),
      }),
    );
  } else throw new Error("Choose zetaris or nightshift");
} catch (error) {
  console.error(
    JSON.stringify({
      event: "sponsor.probe.failed",
      target,
      code: /^[a-z_]+$/.test(error.code ?? "")
        ? error.code
        : "provider_probe_failed",
    }),
  );
  process.exitCode = 1;
}
