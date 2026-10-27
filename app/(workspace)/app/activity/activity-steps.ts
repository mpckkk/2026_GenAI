import type {
  ActivityData,
  ActivityEvent,
  ActivityRunDetail,
} from "@/app/core/activity";

export type Step = {
  id: string;
  first: ActivityEvent;
  last: ActivityEvent;
  events: ActivityEvent[];
  data: ActivityData;
  children: Step[];
};

export function groupSteps(events: ActivityEvent[]) {
  const spans = new Map<string, Step>();
  for (const event of events) {
    const existing = spans.get(event.spanId);
    if (existing) {
      existing.last = event;
      existing.events.push(event);
      existing.data = { ...existing.data, ...event.data };
    } else {
      spans.set(event.spanId, {
        id: event.spanId,
        first: event,
        last: event,
        events: [event],
        data: event.data,
        children: [],
      });
    }
  }
  const roots: Step[] = [];
  for (const step of spans.values()) {
    const parent = step.first.parentSpanId
      ? spans.get(step.first.parentSpanId)
      : undefined;
    if (
      parent &&
      parent.id !== step.id &&
      parent.first.parentSpanId !== step.id
    )
      parent.children.push(step);
    else roots.push(step);
  }
  return { roots, all: [...spans.values()], count: spans.size };
}

export function stepStatus(step: Step, run: ActivityRunDetail["run"]) {
  if (step.last.phase === "started") {
    if (run.status === "cancelled") return "cancelled";
    if (
      step.last.interrupted ||
      run.status === "completed" ||
      run.status === "failed"
    )
      return "interrupted";
    return "running";
  }
  return step.last.phase;
}

export function timeOfDay(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const sponsors = {
  zetaris: {
    name: "Zetaris",
    role: "Published evidence for naming cells",
    icon: "search",
  },
  hmem: {
    name: "Meterless H-MEM",
    role: "Earlier research decisions",
    icon: "book",
  },
  nightshift: {
    name: "Meterless Nightshift",
    role: "Compare evidence interpretations",
    icon: "search",
  },
  openshell: {
    name: "NVIDIA OpenShell",
    role: "Where the agent runs",
    icon: "activity",
  },
} as const;
export type Sponsor = keyof typeof sponsors;

export function sponsorForStep(step: Step): Sponsor | null {
  if (
    step.first.kind === "model" &&
    step.data.provider === "Meterless Nightshift" &&
    step.data.operation === "investigation"
  )
    return "nightshift";
  if (
    step.first.kind === "reference" &&
    step.data.reference?.provider === "Zetaris"
  )
    return "zetaris";
  if (
    step.first.kind === "memory" &&
    (step.data.provider === "Meterless H-MEM" ||
      // Earlier v1 receipts name H-MEM in their start event. Keep those original
      // events untouched; never attribute a generic memory step to this provider.
      (!step.data.provider &&
        step.first.summary.startsWith("Meterless H-MEM ")))
  )
    return "hmem";
  if (step.first.kind === "model" && step.data.runtime === "openshell")
    return "openshell";
  return null;
}

export function stepHref(step: Step) {
  return `#activity-step-${step.id}`;
}

/** Native anchor navigation, with inline evidence and a useful keyboard target. */
export function revealStep(step: Step) {
  const element = document.getElementById(`activity-step-${step.id}`);
  element?.querySelector(":scope > details")?.setAttribute("open", "");
  element?.focus({ preventScroll: true });
}
