"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActivityList, ActivityRunSummary } from "@/app/core/activity";
import { WorkspaceIcon } from "../workspace-icons";
import styles from "./activity.module.css";

export function durationLabel(milliseconds: number | null) {
  if (milliseconds === null) return "Not recorded";
  if (milliseconds < 1000) return `${Math.max(0, Math.round(milliseconds))} ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)} s`;
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Status({ status }: { status: string }) {
  const names: Record<string, string> = {
    completed: "Completed",
    running: "Running",
    queued: "Waiting to start",
    failed: "Failed",
    cancelled: "Cancelled",
    interrupted: "Outcome unknown",
    info: "Recorded",
  };
  return (
    <span className={styles.status} data-status={status}>
      {names[status] ?? status}
    </span>
  );
}

export async function activityError(response: Response) {
  if (response.status === 401)
    return "Your session has expired. Sign in again to view your activity.";
  if (response.status === 404)
    return "This activity could not be found in your workspace.";
  const body = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof body?.error === "string"
    ? body.error
    : "Activity could not be loaded. Please try again.";
}

function mergeRuns(
  existing: ActivityRunSummary[],
  fresh: ActivityRunSummary[],
) {
  const map = new Map(existing.map((run) => [run.id, run]));
  for (const run of fresh) map.set(run.id, run);
  return [...map.values()].sort((a, b) =>
    BigInt(a.position) > BigInt(b.position)
      ? -1
      : BigInt(a.position) < BigInt(b.position)
        ? 1
        : 0,
  );
}

export function ActivityDashboard({
  initialProjectId,
}: {
  initialProjectId: string;
}) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [queryText, setQueryText] = useState("");
  const [snapshot, setSnapshot] = useState<{
    query: string;
    data: ActivityList;
  } | null>(null);
  const [problem, setProblem] = useState<{
    query: string;
    message: string;
    unauthorized: boolean;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const olderLoaded = useRef(false);
  const currentQuery = useRef("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setQueryText(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const parameters = new URLSearchParams();
  if (projectId) parameters.set("projectId", projectId);
  if (status) parameters.set("status", status);
  if (queryText) parameters.set("q", queryText);
  const query = parameters.toString();
  const data = snapshot?.query === query ? snapshot.data : null;
  const error = problem?.query === query ? problem : null;

  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    let fetching = false;
    if (currentQuery.current !== query) olderLoaded.current = false;
    currentQuery.current = query;
    async function refresh() {
      if (fetching || controller.signal.aborted) return;
      fetching = true;
      try {
        const response = await fetch(`/api/activity?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const message = await activityError(response);
          if (!controller.signal.aborted)
            setProblem({
              query,
              message,
              unauthorized: response.status === 401,
            });
          return;
        }
        const next: ActivityList = await response.json();
        if (controller.signal.aborted) return;
        setSnapshot((previous) => ({
          query,
          data:
            olderLoaded.current && previous?.query === query
              ? {
                  ...next,
                  runs: mergeRuns(previous.data.runs, next.runs),
                  nextBefore: previous.data.nextBefore,
                }
              : next,
        }));
        setProblem(null);
      } catch (cause) {
        if (!controller.signal.aborted)
          setProblem({
            query,
            message:
              cause instanceof TypeError
                ? "Connection lost. Your activity remains saved; updates will retry."
                : "Activity could not be refreshed. Updates will retry.",
            unauthorized: false,
          });
      } finally {
        fetching = false;
        if (!controller.signal.aborted)
          timer = window.setTimeout(() => {
            if (document.visibilityState === "visible") void refresh();
            else
              timer = window.setTimeout(() => {
                void refresh();
              }, 5000);
          }, 5000);
      }
    }
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        window.clearTimeout(timer);
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [query, refreshKey]);

  async function loadMore() {
    if (!data?.nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/activity?${query}&before=${encodeURIComponent(data.nextBefore)}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error(await activityError(response));
      const next: ActivityList = await response.json();
      if (currentQuery.current !== query) return;
      olderLoaded.current = true;
      setSnapshot((previous) =>
        previous?.query === query
          ? {
              query,
              data: {
                ...previous.data,
                runs: mergeRuns(previous.data.runs, next.runs),
                nextBefore: next.nextBefore,
              },
            }
          : previous,
      );
      setProblem(null);
    } catch (cause) {
      if (currentQuery.current === query)
        setProblem({
          query,
          message:
            cause instanceof Error
              ? cause.message
              : "Older activity could not be loaded.",
          unauthorized: false,
        });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Behind each answer</p>
          <h1>Agent activity</h1>
          <p className={styles.description}>
            Open a question to see what Celloras did, what it found, and which
            services helped.
          </p>
        </div>
        <Link href="/app" className={styles.button}>
          Open experiments <WorkspaceIcon name="chevron" size={14} />
        </Link>
      </header>
      {data && (
        <dl
          className={styles.summary}
          aria-label="Activity totals for the selected experiment and search"
        >
          <div>
            <dt>requests</dt>
            <dd>{data.summary.total.toLocaleString()}</dd>
          </div>
          <div>
            <dt>completed</dt>
            <dd>{data.summary.completed.toLocaleString()}</dd>
          </div>
          <div>
            <dt>active</dt>
            <dd>{data.summary.active.toLocaleString()}</dd>
          </div>
          <div>
            <dt>failed</dt>
            <dd>{data.summary.failed.toLocaleString()}</dd>
          </div>
        </dl>
      )}
      <div className={styles.filters}>
        <label className={styles.filter}>
          <span>Find a request</span>
          <div className={styles.search}>
            <WorkspaceIcon name="search" size={17} />
            <input
              type="search"
              placeholder="Search what you asked…"
              value={search}
              maxLength={200}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </label>
        <label className={styles.filter}>
          <span>Experiment</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">All experiments</option>
            {(data?.projects ?? snapshot?.data.projects ?? []).map(
              (project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ),
            )}
          </select>
        </label>
        <label className={styles.filter}>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
      {error && (
        <div className={styles.notice} data-error="true" role="alert">
          <p>{error.message}</p>
          {error.unauthorized ? (
            <Link
              href="/login?returnTo=/app/activity"
              className={styles.button}
            >
              Sign in
            </Link>
          ) : (
            <button
              className={styles.button}
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!data && !error && (
        <div className={styles.empty} role="status">
          <p>Loading activity…</p>
        </div>
      )}
      {data && (
        <>
          <div className={styles.listHeading}>
            <span>
              {data.runs.length ? "Most recent first" : "Your requests"}
            </span>
            {!error && (
              <span className={styles.live}>Updates automatically</span>
            )}
          </div>
          {data.runs.length ? (
            <ol className={styles.runList} aria-label="Agent requests">
              {data.runs.map((run) => (
                <li key={run.id}>
                  <Link
                    href={`/app/activity/${run.id}`}
                    className={styles.runRow}
                  >
                    <div>
                      <p className={styles.runTitle}>{run.prompt}</p>
                      <div className={styles.runMeta}>
                        <span>
                          <WorkspaceIcon name="flask" size={12} />
                          {run.projectName}
                        </span>
                        <span>
                          {run.recordingVersion === null
                            ? "Detailed activity not recorded"
                            : `${run.toolCount} ${run.toolCount === 1 ? "analysis" : "analyses"}`}
                        </span>
                        {run.durationMs !== null && (
                          <span>{durationLabel(run.durationMs)}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.runState}>
                      <Status status={run.status} />
                      <time dateTime={run.createdAt}>
                        {dateLabel(run.createdAt)}
                      </time>
                    </div>
                    <span className={styles.chevron}>
                      <WorkspaceIcon name="chevron" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.empty}>
              <WorkspaceIcon name="activity" size={28} />
              <h2>
                {query
                  ? "No matching requests"
                  : "Your agent’s work will appear here"}
              </h2>
              <p>
                {query
                  ? "Try another experiment, status, or search."
                  : "Send a message in an experiment, then follow its actions and results here."}
              </p>
              {query ? (
                <button
                  className={styles.button}
                  onClick={() => {
                    setProjectId("");
                    setStatus("");
                    setSearch("");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link className={styles.button} href="/app">
                  Open an experiment
                </Link>
              )}
            </div>
          )}
          {data.nextBefore && (
            <div className={styles.loadMore}>
              <button
                className={styles.button}
                disabled={loadingMore}
                onClick={() => {
                  void loadMore();
                }}
              >
                {loadingMore ? "Loading…" : "Load earlier requests"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
