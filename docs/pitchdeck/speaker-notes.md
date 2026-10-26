# Celloras four-slide pitch: speaker notes

## Slide 1

Celloras is an agent for plant single-cell research, starting with soybean. Ask it to annotate the groups and it runs the tools, returns a visual map and lets you inspect the evidence behind each candidate. The figure is the actual 7,496-nucleus demo. The researcher keeps the final judgment; independent biological validation remains next work.

Sources:
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 2

A concrete task: identify the cell groups in a soybean root dataset. A researcher has thousands of gene profiles grouped by expression, but needs evidence for the cell-type names. Celloras accepts a prepared H5AD file, runs annotation, brings together measured gene activity and published marker references, and keeps reviewed decisions in the conversation. H5AD contains raw counts, existing groups and existing UMAP coordinates; this is not a FASTQ-to-analysis pipeline. The comparison describes the manual coordination of analysis, references and notes; it does not claim other tools cannot annotate cells. No measured time-saving or accuracy improvement is claimed.

Sources:
https://celloras.com/app/projects/7bdae43c-5cd2-4203-a571-e73b445985db
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/evidence/agent-activity-public-2026-10-26.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 3

This is the actual annotation card returned in the uploaded-data workflow on 26 October 2026. The uploaded soybean-root-gse270392.h5ad is 28,919,346 bytes and contains 7,496 nuclei and 12 existing groups. The agent run queried Zetaris for 42 published marker associations, verified the reference checksum, and invoked the numerical annotation tool. Results: 7 suggested groups, 1 ambiguous and 4 unresolved. Group 6 has 388 nuclei and Root hair is a provisional suggestion supported by two genes, Glyma.01G224900 and Glyma.17G030700. Existing UMAP coordinates are reused. The screenshot is a direct crop of the real card, without fabricated content. The agent interprets tool outputs, recommends and explains; the numerical tool computes the candidates. These are evidence-based suggestions, not an independently validated biological accuracy result.

Sources:
https://celloras.com/app/projects/7bdae43c-5cd2-4203-a571-e73b445985db
https://celloras.com/app/activity/3ff0f30e-3655-4e83-8b4e-08f703054b46
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/evidence/agent-activity-public-2026-10-26.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 4

Continue the same uploaded H5AD experiment from slide 3. The illustrative researcher review accepts Root hair provisionally for group 6, records support from Glyma.01G224900 and Glyma.17G030700, and explicitly requires independent evidence before treating the identity as validated. Meterless H-MEM retrieves that saved review, and the agent explains it in a later request with a link to the source. The slide paraphrases that review and response; the headline is the user question, not a claim that a fresh scientific conclusion was reached. The implemented H-MEM engine runs inside the orchestrator and stores memory in PostgreSQL. The annotation activity has 19 events, including a completed Zetaris reference query, scientific tool execution and response validation. Recall activity confirms the H-MEM hit and source. Both links point to the recorded working feature and require the demo login. This demonstrates traceability and memory, not an accuracy benchmark or automatic acceptance of AI outputs. Public code, setup instructions and evidence are available in the repository.

Sources:
https://celloras.com/app/projects/7bdae43c-5cd2-4203-a571-e73b445985db
https://celloras.com/app/activity/ee487b10-71e8-45c7-82d0-c857bc47588f
https://celloras.com/app/activity/3ff0f30e-3655-4e83-8b4e-08f703054b46
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/evidence/agent-activity-public-2026-10-26.json
https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
https://github.com/mpckkk/2026_GenAI/tree/celloras.com

