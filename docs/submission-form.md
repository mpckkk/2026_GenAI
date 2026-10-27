# Submission form – copy/paste

## Track
The Agent That Can Explain Why

## Description
Plant scientists can now measure which genes are active in thousands of single cells. The machine sorts cells into groups but can't say what each group is, so scientists still name them by hand across papers, spreadsheets and plots.

Celloras is an AI research partner that does this detective work in one conversation. The researcher asks, the agent runs the right tools and answers with a cell map, a suggested cell type per group, and the evidence: which marker genes are measured and the published source behind each one. When the evidence isn't enough, it says so instead of guessing. The researcher decides, and Celloras remembers the decision.

We tested it on published soybean root data. For most groups, Celloras landed on the same cell types the original scientists had found by hand. When a group is unclear, you can ask it to dig deeper, and it tells you what is still uncertain and what to check next. The numbers come from the data, not from the AI.

## Sponsor technology explanation
Zetaris: stores our versioned reference of 42 published soybean root marker genes. The annotation tool queries it read-only on every request, verifies its content hash, and records the query in the activity view.

Meterless H-MEM: remembers the researcher's saved decisions. On later questions it recalls them with a link to the original review, kept separate from the measured evidence.

Meterless Nightshift + NVIDIA Nemotron: "Investigate this group" sends an unclear group's evidence to Nightshift, which runs NVIDIA Nemotron 3 Ultra to compare three explanations and returns what is still uncertain and what to check next. The original result never changes.

NVIDIA OpenShell: the agent runs inside an OpenShell sandbox and can only call Celloras' tools. Every model and tool call is recorded.

## Video
https://www.youtube.com/watch?v=9Q0m_sJrHcY

## Github Solution
https://github.com/mpckkk/2026_GenAI

## Pitch Deck
https://celloras.com/deck/Celloras-Pitch.pdf
