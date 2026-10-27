import type { ActivityData, ActivityRunDetail } from "@/app/core/activity";
import { stepStatus, type Step } from "./activity-steps";

const operations: Record<
  string,
  { title: string; purpose: string; result: string }
> = {
  investigation: {
    title: "Investigate the unclear cell group",
    purpose:
      "Measure distinguishing marker signals, then compare interpretations of the evidence with Nightshift.",
    result:
      "Saved the evidence review separately from the original annotation.",
  },
  co_detection: {
    title: "Check which marker signals occur together",
    purpose:
      "Count nuclei with each selected marker set, both sets or neither. These measurements do not establish cell identity.",
    result:
      "Measured the selected marker signals in individual nuclei of this group.",
  },
  annotation: {
    title: "Suggest names for the cell groups",
    purpose:
      "Compare gene activity with published evidence to suggest what kinds of cells are in each group.",
    result:
      "The cell-type comparison finished. Open the result to review the suggestions.",
  },
  inspect: {
    title: "Show the cell map",
    purpose:
      "Use the positions already provided in the dataset to show its cells and groups.",
    result: "Created a cell map using the dataset’s existing positions.",
  },
  markers: {
    title: "Find genes that stand out",
    purpose:
      "Compare one cell group with the others to find genes with higher activity.",
    result: "Created a comparison of gene activity between the cell groups.",
  },
  expression: {
    title: "Show where a gene is active",
    purpose:
      "Read the selected gene’s activity in each cell and show it on the cell map.",
    result: "Created a map of the selected gene’s measured activity.",
  },
  dotplot: {
    title: "Compare gene activity across groups",
    purpose:
      "Show how active the selected genes are and how many cells show that activity in each group.",
    result: "Created a chart comparing the selected genes across cell groups.",
  },
  literature: {
    title: "Look for relevant research",
    purpose:
      "Search the papers available in Celloras for passages relevant to this question.",
    result:
      "Finished searching the available papers. Open the result to inspect any passages found.",
  },
  marker_evidence: {
    title: "Compare the gene list with published evidence",
    purpose:
      "Look for published links between the submitted genes and possible cell types.",
    result:
      "Finished comparing the gene list. Open the result to see matches and missing evidence.",
  },
};

export function annotationOutcome(data: ActivityData) {
  const counts = data.outputCounts;
  if (
    !counts ||
    [
      counts.clusters,
      counts.suggested,
      counts.ambiguous,
      counts.unresolved,
    ].some((value) => value === undefined)
  )
    return null;
  return {
    title: `Compared ${counts.clusters} cell ${counts.clusters === 1 ? "group" : "groups"}`,
    summary: `${counts.suggested} with a suggested cell type; ${counts.ambiguous} with competing possibilities; ${counts.unresolved} with too little evidence to name.`,
  };
}

/** Readable descriptions of recorded operations, never generated agent reasoning. */
export function describeStep(step: Step, detail: ActivityRunDetail) {
  const status = stepStatus(step, detail.run);
  const done = status === "completed";
  const kind = step.first.kind;
  let title = step.last.name;
  let purpose = "";
  let outcome = step.last.summary;
  if (kind === "queue") {
    title = "Receive your question";
    outcome = done
      ? "Celloras received your question and the agent started working on it."
      : "Your question reached Celloras and is waiting for an available agent.";
  } else if (kind === "context") {
    title = "Read the experiment details";
    purpose =
      "Gather the data, notes and earlier conversation available for this question.";
    const c = step.data.contextCounts;
    outcome = done
      ? c
        ? [
            c.turns !== undefined
              ? `${c.turns} earlier conversation ${c.turns === 1 ? "exchange" : "exchanges"}`
              : null,
            c.researchEntries !== undefined
              ? `${c.researchEntries} research ${c.researchEntries === 1 ? "record" : "records"}`
              : null,
            c.analysisRuns !== undefined
              ? `${c.analysisRuns} earlier ${c.analysisRuns === 1 ? "analysis" : "analyses"}`
              : null,
            c.markers !== undefined
              ? `${c.markers} gene ${c.markers === 1 ? "list" : "lists"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "The experiment information is ready for the agent."
      : "Reading the information available in this experiment.";
  } else if (kind === "memory") {
    title = "Look for earlier decisions";
    purpose =
      "Find relevant decisions already recorded in this experiment, so the agent can refer back to them.";
    const count = step.data.memoryCount;
    outcome = done
      ? count === 0
        ? "No earlier decisions matched this question."
        : count === undefined
          ? "The search finished; no result count was recorded."
          : `Found ${count} earlier ${count === 1 ? "decision" : "decisions"} and included ${count === 1 ? "it" : "them"} in the information prepared for the agent.`
      : "Searching this experiment’s recorded decisions.";
  } else if (kind === "reference") {
    title =
      step.first.name === "Check marker reference"
        ? "Check the published gene reference"
        : step.first.name === "Load annotation reference"
          ? "Prepare the gene reference for analysis"
          : "Get published evidence for this comparison";
    purpose =
      step.first.parentSpanId === "context"
        ? "Check the reference that links genes to possible cell types before analysis uses it."
        : "Supply published links between genes and possible cell types for this analysis.";
    const r = step.data.reference;
    outcome = done
      ? `${r?.recordCount === undefined ? "The reference check finished" : `${r.recordCount} reference entries retrieved`}${r?.provider === "Zetaris" ? " through Zetaris" : ""}.${r?.contentSha256 ? " Its contents match the expected reference version." : ""}`
      : "Reading and checking the published reference.";
  } else if (kind === "tool") {
    const operation = operations[step.data.operation ?? ""];
    if (operation) {
      title = operation.title;
      purpose = operation.purpose;
      const annotation =
        step.data.operation === "annotation"
          ? annotationOutcome(step.data)
          : null;
      outcome = done
        ? annotation
          ? `${annotation.title}. ${annotation.summary}`
          : operation.result
        : "The analysis is running.";
    }
  } else if (
    kind === "model" &&
    step.data.provider === "Meterless Nightshift" &&
    step.data.operation === "investigation"
  ) {
    title = "Compare interpretations with Nightshift";
    purpose =
      "Generate three interpretations of the same measured evidence, then evaluate their quality. Agreement is not biological confidence.";
    outcome = done
      ? `Received ${step.data.outputCounts?.attempts ?? 3} interpretations. The visual review preserves their differences and source references.`
      : "Nightshift is comparing the supplied evidence. The original annotation remains unchanged.";
  } else if (kind === "model") {
    title = "Work out how to answer";
    purpose =
      "The agent interprets the information it received and decides whether to request an analysis or write an answer.";
    const requested = step.data.decision?.startsWith("Request ")
      ? operations[step.data.decision.slice(8)]
      : undefined;
    outcome = done
      ? step.data.decision === "Return answer"
        ? "The agent wrote an answer. Celloras will check its format and result links before showing it."
        : requested
          ? `The agent requested the next analysis: ${requested.title.toLowerCase()}.`
          : step.data.decision?.startsWith("Request ")
            ? "The agent requested another analysis."
            : "The agent finished this step; its next action was not recorded."
      : "The agent is working on this question.";
  } else if (kind === "response") {
    if (step.id === "turn") {
      title = "Show the answer in the conversation";
      outcome = done
        ? "The answer is ready in the conversation."
        : "Preparing the answer for the conversation.";
    } else {
      title = "Check the answer and its result links";
      purpose =
        "Check that the answer can be displayed and that its result cards belong to this experiment.";
      outcome = done
        ? "The format and result links passed the checks. This does not verify the scientific conclusions."
        : "Checking the answer’s format and links to results.";
    }
  } else if (kind === "cleanup") {
    title = "Close the agent’s temporary workspace";
    purpose = "Remove the separate environment used to run this request.";
    outcome = done
      ? "The temporary workspace was removed."
      : "Removing the temporary workspace.";
  }
  if (status === "failed")
    outcome =
      kind === "response" && step.id === "turn"
        ? "The request stopped before an answer was ready. Completed steps remain visible below."
        : "This step failed. No completed outcome was recorded for it.";
  if (status === "cancelled")
    outcome = "The request was cancelled before this step finished.";
  if (status === "interrupted")
    outcome =
      "The request stopped while this step was open. Its outcome was not recorded.";
  return { title, purpose, outcome };
}
