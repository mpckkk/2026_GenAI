# Technical workflow image

[Flowchart PNG](Celloras-Technical-Flow.png), created with the built-in image-generation tool on 26 October 2026. This is a presentation schematic, not a screenshot or measured cell plot. The existing PDF/PowerPoint deck has not been regenerated.

The central Agent node compresses the Celloras worker and runtime boundary. The worker authorizes and executes tools; the model requests them and interprets results. H-MEM runs within the worker and restores its state from PostgreSQL. The diagram highlights one ordinary analysis loop; guided actions may execute before the first model invocation. Access checks also protect upload/import, even though the simplified branch shows access next to chat admission.

Visual inspection checked the analysis yes/no branches, measured-results return, dataset/reference inputs, explicit researcher-review return to H-MEM, and activity recording. The miniature cell plot is illustrative. Only OpenShell/Codex is marked live; additional provider adapters remain future work as explained in the engineering deck guide.

## Generation prompt

Create a polished, genuinely visual engineering FLOWCHART for Celloras, a plant single-cell research app. Wide landscape 3:2 composition, high resolution, white background, deep forest-green text and connectors, subtle sage panels, one muted amber decision diamond. Crisp modern sans-serif typography, ample breathing room, consistent precise arrowheads, simple line icons, refined technical publication aesthetic. No 3D, no clip-art robot, no decorative scientific imagery, no sponsor showcase or sponsor heading.

Title at upper left: "Celloras"
Subtitle: "From uploaded data to an explained result"
Small top-right label: "Technical workflow"

A readable left-to-right main flow with an obvious analysis feedback loop. Use real flowchart conventions: parallelogram for input, rounded boxes for operations, cylinder for data storage, ONE diamond for the decision, explicit arrowheads and branch labels. The diagram must be understandable without a separate legend.

Arrange the canvas in three broad areas with small headings "01  Prepare", "02  Investigate", "03  Explain". No outer boxed columns. Main loop must occupy most of the canvas.
Exact nodes and relationships:
PREPARE area on left:
- input parallelogram "H5AD + research question"
- below it operation box "Validate and import" with smaller text "Python importer"
- below that storage cylinder "Private dataset"
- connect input -> import -> private dataset.
- from the input also draw an arrow to "Check access + queue" with smaller text "Next.js · Keycloak · PostgreSQL".
- queue then connects to the central agent box.
INVESTIGATE area middle:
- prominent green-tinted operation box "Agent" with smaller text "Interpret evidence · choose next action". Beneath, attached as a thin lower band within the same box: "Runtime interface: CLI or HTTP" and next line "Live: Codex via NVIDIA OpenShell".
- a subtle purple-tinted supporting node above Agent: "Meterless H-MEM", subtitle "Earlier research decisions", with an arrow INTO Agent.
- Agent goes to amber decision diamond labeled "Run an analysis?"
- decision YES branch goes DOWN to operation box "Scientific tools" with smaller text "Annotation · gene comparisons · plots".
- Private dataset has a clear connecting arrow INTO Scientific tools.
- supporting node beneath Scientific tools: "Zetaris", subtitle "Published marker evidence", arrow INTO Scientific tools.
- Scientific tools has a clearly routed RETURN arrow labeled "Measured results" back INTO Agent, forming one unmistakable loop.
- NO branch of decision goes RIGHT to Explain area.
EXPLAIN area right:
- operation box "Validate + save" with smaller text "Check response and result references"
- then arrow to a final slightly richer card labeled "Visual answer", smaller text "Explanation · cell map · evidence". Include a tiny schematic scatterplot and a small evidence-row motif inside this last box, purely illustrative without numbers or fake results.
- below visual answer, a small node "Researcher review" with arrow from Visual answer. A subtle long return arrow labeled "Available next time" goes from Researcher review back to Meterless H-MEM. Route away from the central analysis loop.

Across the bottom place a thin quiet horizontal strip, distinct from the workflow, labeled "Activity dashboard" with smaller text "Recorded steps · timing · sources · results". A dotted connector from the central request workflow to this strip indicates recording. The activity log is NOT the decision maker.

Small restrained footer: "PostgreSQL stores requests, results, reviews and activity. Large numerical datasets stay in private files."
Second short footer: "H5AD requires existing cell groups and UMAP. Additional model providers connect through adapters."
Do not imply the whole matrix is sent to the model. Do not imply OpenRouter or Vercel is live. Do not add any technology, claims, metrics, branding logos or extra nodes. All written labels must be spelled exactly, especially Celloras, H5AD, Zetaris, Meterless H-MEM, NVIDIA OpenShell, PostgreSQL and UMAP.
Prioritize readable text and unambiguous directed connectors over decorative density.

## Final edit

Preserve all labels and layout. Move the “Available next time” connector origin from Visual answer to Researcher review, routed around the right side. Move the dotted “Record activity” connector origin from the dataset arrow to the Agent box, with an unconnected crossing at the dataset arrow.
