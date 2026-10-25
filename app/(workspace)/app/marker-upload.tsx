"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { readMarkerCsv, groupMarkerCsv } from "@/app/adapters/marker-csv";
import {
  markerImportLimits,
  type MarkerColumns,
  type MarkerImportReceipt,
} from "@/app/core/marker-import";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./marker-upload.module.css";

const subscribe = () => () => {};
const ready = () => true,
  notReady = () => false;
const sampleUrl = "/examples/soybean-root-markers.csv";
async function errorMessage(response: Response) {
  const body = await response.json().catch(() => ({}));
  return (
    [body.error, ...Object.values(body.fields ?? {})]
      .filter(Boolean)
      .join(" ") ||
    "The request could not be confirmed. Retry to check the same import."
  );
}

export function MarkerUpload({
  projectId,
  canAsk,
  onAsk,
}: {
  projectId: string;
  canAsk: boolean;
  onAsk: (prompt: string) => void;
}) {
  const hydrated = useSyncExternalStore(subscribe, ready, notReady);
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const attempt = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [file, setFile] = useState<{
    name: string;
    csv: string;
    table: ReturnType<typeof readMarkerCsv>;
  } | null>(null);
  const [columns, setColumns] = useState<MarkerColumns>({
    group: "",
    gene: "",
  });
  const [tissue, setTissue] = useState("");
  const [genome, setGenome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [imports, setImports] = useState<MarkerImportReceipt[]>([]);
  const [selected, setSelected] = useState<MarkerImportReceipt | null>(null);
  const endpoint = `/api/projects/${projectId}/marker-imports`;
  let preview: ReturnType<typeof groupMarkerCsv> = [],
    previewError = "";
  if (file) {
    try {
      preview = groupMarkerCsv(file.table, columns);
    } catch (reason) {
      previewError =
        reason instanceof Error
          ? reason.message
          : "Check the selected columns.";
    }
  }

  async function open() {
    dialog.current?.showModal();
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error(await errorMessage(response));
      const saved: MarkerImportReceipt[] = await response.json();
      setImports(saved);
      setSelected((current) => current ?? saved[0] ?? null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Saved imports could not be loaded.",
      );
    }
  }
  function inspect(name: string, csv: string) {
    if (!/\.csv$/i.test(name))
      throw new Error("Choose a .csv file. In Excel, use Save as → CSV UTF-8.");
    const table = readMarkerCsv(csv);
    const find = (aliases: string[]) =>
      table.headers.find((h) => aliases.includes(h.toLowerCase())) ?? "";
    setColumns({
      group: find(["cluster", "group", "cluster_id", "seurat_clusters"]),
      gene: find(["gene", "gene_id", "feature", "geneid"]),
    });
    const metadata = (aliases: string[]) => {
      const index = table.headers.indexOf(find(aliases));
      const values =
        index < 0
          ? []
          : [...new Set(table.rows.map((row) => row[index].trim()))];
      return values.length === 1 ? values[0] : "";
    };
    setTissue(metadata(["tissue"]));
    setGenome(metadata(["genome_version", "genome", "genome_build"]));
    setFile({ name, csv, table });
    setError(null);
    setConflict(false);
  }
  async function choose(file: File | undefined) {
    if (!file || busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      if (file.size > markerImportLimits.bytes)
        throw new Error(
          "Choose a marker CSV smaller than 256 KiB. Full expression matrices are not supported here.",
        );
      inspect(
        file.name,
        new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
          await file.arrayBuffer(),
        ),
      );
    } catch (reason) {
      setFile(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "This file is not valid UTF-8 CSV.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function loadExample() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const response = await fetch(sampleUrl);
      if (!response.ok)
        throw new Error("The example file could not be loaded.");
      inspect("soybean-root-markers.csv", await response.text());
      if (fileInput.current) fileInput.current.value = "";
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The example could not be loaded.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || !file || previewError) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setConflict(false);
    attempt.current ??= crypto.randomUUID();
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: attempt.current,
          fileName: file.name,
          csv: file.csv,
          columns,
          context: {
            speciesId: "glycine-max",
            tissue: tissue.trim() || null,
            genomeVersion: genome.trim() || null,
            geneIdNamespace: "Glyma",
            sampleLabel: null,
            developmentalStage: null,
            notes:
              "Context supplied with a marker CSV. Extra CSV columns are preserved in the original file; marker comparison uses gene IDs only.",
          },
        }),
      });
      if (!response.ok) {
        setConflict(response.status === 409);
        throw new Error(await errorMessage(response));
      }
      const receipt: MarkerImportReceipt = await response.json();
      if (!receipt.id || !receipt.groups?.length)
        throw new Error(
          "The save could not be confirmed. Retry to check the same import.",
        );
      setSelected(receipt);
      setImports((previous) =>
        [receipt, ...previous.filter((item) => item.id !== receipt.id)].slice(
          0,
          20,
        ),
      );
      setFile(null);
      attempt.current = null;
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The save could not be confirmed. Retry to check the same import.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function ask(group: MarkerImportReceipt["groups"][number]) {
    if (!canAsk || pending) return;
    dialog.current?.close();
    onAsk(
      `Compare the uploaded marker genes for group ${JSON.stringify(group.label)} with compatible published cell-type markers. Use the lookup_marker_evidence tool for the saved record marker-set:${group.entryId}. Show the published evidence card, explain supported candidate identities, alternatives and missing evidence. These are uploaded marker lists, not an attached expression matrix; do not claim a measured annotation or a new cell map.`,
    );
  }
  return (
    <>
      <button
        className={styles.trigger}
        type="button"
        aria-label="Upload markers"
        title="Upload markers"
        aria-haspopup="dialog"
        disabled={!hydrated}
        onClick={() => void open()}
      >
        <WorkspaceIcon name="plus" size={18} />
        <span>Upload markers</span>
      </button>
      {hydrated &&
        createPortal(
          <dialog
            ref={dialog}
            className={styles.dialog}
            aria-labelledby="marker-upload-title"
            onCancel={(event) => {
              if (busy.current) event.preventDefault();
            }}
          >
            <header className={styles.heading}>
              <div>
                <p>Your data</p>
                <h2 id="marker-upload-title">Upload marker genes</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="Close marker upload"
                disabled={pending}
                onClick={() => dialog.current?.close()}
              >
                <WorkspaceIcon name="close" />
              </button>
            </header>
            <p className={styles.intro}>
              Bring a marker table from your experiment. Choose a cell group and
              let Celloras find evidence for its identity.
            </p>
            {!file && !selected && (
              <div className={styles.example}>
                <div>
                  <strong>Try it with a soybean example</strong>
                  <p>
                    Published marker examples for three groups. This is an
                    illustrative input, not a new experiment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadExample()}
                  disabled={pending}
                >
                  Use example
                </button>
                <a href={sampleUrl} download>
                  Download CSV
                </a>
              </div>
            )}
            <form onSubmit={save}>
              <fieldset disabled={pending} className={styles.fields}>
                <label className={styles.file}>
                  Marker CSV
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => void choose(event.target.files?.[0])}
                  />
                </label>
                <p className={styles.hint}>
                  CSV UTF-8 from Excel or your analysis tool. Up to 256 KiB, 20
                  groups and 200 genes per group.
                </p>
                {file && (
                  <>
                    <div className={styles.grid}>
                      <label>
                        Cell group column
                        <select
                          value={columns.group}
                          onChange={(event) =>
                            setColumns({
                              ...columns,
                              group: event.target.value,
                            })
                          }
                        >
                          <option value="">Choose column</option>
                          {file.table.headers.map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Gene ID column
                        <select
                          value={columns.gene}
                          onChange={(event) =>
                            setColumns({ ...columns, gene: event.target.value })
                          }
                        >
                          <option value="">Choose column</option>
                          {file.table.headers.map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className={styles.grid}>
                      <label>
                        Tissue
                        <input
                          value={tissue}
                          onChange={(event) => setTissue(event.target.value)}
                          maxLength={120}
                          placeholder="e.g. root"
                        />
                      </label>
                      <label>
                        Genome / annotation version
                        <input
                          value={genome}
                          onChange={(event) => setGenome(event.target.value)}
                          list="upload-genomes"
                          maxLength={120}
                          placeholder="Leave blank if unknown"
                        />
                        <datalist id="upload-genomes">
                          <option value="Wm82v4" />
                          <option value="Glycine_max_v2.1.52" />
                        </datalist>
                      </label>
                    </div>
                    <p className={styles.hint}>
                      Soybean · Glyma gene IDs. Confirm the actual tissue and
                      genome version; unknown or incompatible context stays
                      unresolved.
                    </p>
                    {previewError ? (
                      <p role="alert" className={styles.error}>
                        {previewError}
                      </p>
                    ) : (
                      <div className={styles.preview}>
                        <h3>
                          Ready to import {preview.length}{" "}
                          {preview.length === 1 ? "group" : "groups"}
                        </h3>
                        <p>
                          {file.name} · {file.table.rows.length} rows
                        </p>
                        <ul>
                          {preview.map((group) => (
                            <li key={group.label}>
                              <strong>{group.label}</strong>
                              <span>{group.genes.length} genes</span>
                              <small>
                                {group.genes.slice(0, 3).join(", ")}
                                {group.genes.length > 3 ? "…" : ""}
                              </small>
                            </li>
                          ))}
                        </ul>
                        <p className={styles.hint}>
                          Duplicate gene IDs count once per group. The original
                          CSV and extra columns are preserved; this comparison
                          uses gene IDs.
                        </p>
                      </div>
                    )}
                    <button
                      className={styles.primary}
                      type="submit"
                      disabled={pending || Boolean(previewError)}
                    >
                      {pending ? "Saving…" : "Import marker groups"}
                    </button>
                  </>
                )}
              </fieldset>
            </form>
            {error && (
              <div role="alert" className={styles.error}>
                {error}
                {conflict && (
                  <button
                    type="button"
                    onClick={() => {
                      attempt.current = null;
                      setConflict(false);
                      setError(null);
                    }}
                  >
                    Start a new import
                  </button>
                )}
              </div>
            )}
            {selected && (
              <section
                className={styles.saved}
                aria-label="Saved marker imports"
              >
                <h3>Choose a group to explore</h3>
                {imports.length > 1 && (
                  <label>
                    Saved upload
                    <select
                      value={selected.id}
                      onChange={(event) =>
                        setSelected(
                          imports.find(
                            (item) => item.id === event.target.value,
                          ) ?? null,
                        )
                      }
                    >
                      {imports.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.fileName} ·{" "}
                          {new Date(item.createdAt).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <p>
                  {selected.fileName} ·{" "}
                  {selected.context.tissue || "Tissue unknown"} ·{" "}
                  {selected.context.genomeVersion || "Genome unknown"}
                </p>
                <ul>
                  {selected.groups.map((group) => (
                    <li key={group.entryId}>
                      <div>
                        <strong>{group.label}</strong>
                        <span>{group.geneCount} marker genes</span>
                      </div>
                      <button
                        type="button"
                        disabled={!canAsk || pending}
                        onClick={() => ask(group)}
                      >
                        Find cell-type evidence{" "}
                        <span aria-hidden="true">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!canAsk && (
                  <p className={styles.hint}>
                    Your upload is saved. Finish the current response or
                    reconnect the agent to explore a group.
                  </p>
                )}
                <a href={`${endpoint}?download=${selected.id}`}>
                  Download original CSV
                </a>
              </section>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
