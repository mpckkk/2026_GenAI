# Celloras — four-slide speaker notes

Roughly two minutes. Read the narration; supporting detail and links are for questions.

## Slide 1

Root-hair cells help soybeans take up water and nutrients. To study those cells in sequencing data, researchers first need to identify them. Our demo uses a real published soybean dataset: 7,496 nuclei, the compartments inside cells. Celloras investigates the data and suggests which groups could be root-hair cells.

### Supporting detail

Root hairs help plants take up water and nutrients. To study them in sequencing data, researchers first need to identify the corresponding cells. Celloras is an annotation agent and research journal. Our real demo reanalyses published soybean data: gene activity measured in 7,496 nuclei, the compartments inside cells. We follow one group of 388 nuclei and ask whether the evidence supports a root-hair identity. The map is the actual Celloras output. This is a reanalysis of a published atlas, not a customer deployment or a nutrient-treatment experiment. We have not measured improvements in crop yield or nutrient uptake.

### Sources

- https://pubmed.ncbi.nlm.nih.gov/27812010/
- https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE270392
- https://pmc.ncbi.nlm.nih.gov/articles/PMC12136577/
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md

## Slide 2

Without Celloras, the researcher coordinates scripts, published marker references and research notes. Here, they ask the agent to investigate one group, inspect the measured genes and sources, then save their judgment in the same conversation. The researcher still decides whether the evidence is enough.

### Supporting detail

The task is concrete: assess whether one group in this soybean root dataset represents root-hair cells. Without Celloras, the researcher coordinates scripts, marker-reference lookup and notes. With Celloras, the agent runs the available tools and returns evidence for review in the conversation. The researcher can leave the identity unresolved and record why. We compare workflow responsibilities; no measured time-saving or accuracy improvement is claimed.

### Sources

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md

## Slide 3

In this actual run, one group contains 388 nuclei. Two genes support a Root hair candidate. The agent retrieves published marker evidence through Zetaris and runs the scientific analysis. Meterless H-MEM retrieves the researcher’s saved review when they return to the question.

### Supporting detail

In the verified workflow, group 6 contains 388 nuclei. The annotation engine suggests Root hair, supported by Glyma.01G224900 and Glyma.17G030700. Markers are genes whose activity helps identify cell types. The OpenShell/Codex agent runs the scientific tools and explains their outputs. Zetaris delivers the checked, versioned marker reference; numerical tools measure expression from the actual matrix. Meterless H-MEM recalls explicit reviews and their sources when asked. These are tool uses across one conversation, not a claim that every prompt calls every tool. The supporting panel comes from the same atlas study, so the candidate needs independent biological review. Next.js/Keycloak provide the interface and authentication; PostgreSQL holds project-owned state.

### Sources

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/annotation-method.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/tree/celloras.com

## Slide 4

Here is the real saved reply. For the demonstration, we left the label unresolved pending independent evidence. The agent remembers that correction and links to its source. We start with soybean research. The broader single-cell sequencing market is forecast at $3.46 billion by 2030; our product addresses the interpretation work within it.

### Supporting detail

The journal makes a concrete difference: it retains the corrected review instead of repeating an older provisional label. This is the first sentence of the actual saved agent reply. The review was explicitly entered for the demonstration, not an external researcher testimonial. It leaves group 6 unresolved pending independent evidence while the computed Root hair candidate stays unchanged. The same verified public workflow includes Zetaris reference retrieval, annotation and measured-marker comparison. Our initial users are plant research labs, starting with soybean and other plants later. For context, MarketsandMarkets forecasts the broader global single-cell sequencing industry at USD 3.46 billion in 2030, versus USD 1.95 billion in 2025 (12.2% reported CAGR). That includes instruments, consumables, software and services; it is not a plant-annotation software market estimate or Celloras revenue forecast. Numerical checks passed 2,952 independent base-R comparisons; independent biological validation and measured user impact remain next work. Try the actual demo at celloras.com.

### Sources

- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/demo.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/verification.md
- https://github.com/mpckkk/2026_GenAI/blob/celloras.com/docs/sponsor-explanation.md
- https://www.marketsandmarkets.com/Market-Reports/single-cell-sequencing-market-244864213.html
- https://github.com/mpckkk/2026_GenAI/tree/celloras.com
