# Celloras pitch deck

[PowerPoint — editable](Celloras-Pitch-Deck.pptx) · [PDF — ready to present](Celloras-Pitch-Deck.pdf) · [Speaker notes and sources](speaker-notes.md)

Eight pitch slides and two appendix slides for the GenAI hackathon, revised on 25 October 2026. The story follows one result: ask the agent to annotate soybean cells, inspect the evidence, then revisit a researcher's decision.

## Story

1. Make cell annotation a conversation.
2. Researchers connect gene activity, marker tables, papers and past decisions.
3. One request returns a visual result across twelve soybean cell groups.
4. Follow the Root hair candidate to its measured marker genes.
5. Zetaris supplies the versioned reference and a saved query receipt.
6. Meterless H-MEM recalls a researcher's corrected decision.
7. The agent runs the tools, while the researcher reviews the interpretation.
8. Try the working soybean workflow; independent validation and own datasets come next.
9. Appendix: numerical checks and current scientific scope.
10. Appendix: scientific sources and implementation links.

## References and assets

The revised presentation draws on [Front's original Series A deck](https://front.com/blog/inside-fronts-series-a-slide-deck), with its direct problem–solution sequence and concise product explanation. Earlier references were the [original Airbnb deck](https://www.startups.com/articles/airbnb-pitch-deck-teardown-and-redesign) and [Buffer's original 2011 deck](https://buffer.com/resources/from-0-to-1000000-users-the-journey-and-statistics-of-buffer/). Their assets and business metrics are not reused.

The design uses the supplied Celloras logo, Inter, black, white and the green accent from the Amigospace design kit. Large plots and short headlines replace the earlier technical walkthrough. Validation details sit in the appendix.

All product captures and scientific figures come from actual Celloras runs. The opening point cloud uses the original UMAP coordinates of all 7,496 soybean-root nuclei, without identity labels. The annotation map is the application's full export, and the dot plot contains measured expression. The H-MEM receipt shows an illustrative review correction: group 6 stays unresolved pending independent evidence, while its computed Root hair candidate remains unchanged.

The PowerPoint contains editable text, architecture shapes, outcome counts, speaker notes and source links. Scientific plots and product receipts remain images. Detailed scope is in [annotation methods](../annotation-method.md); sponsor implementation and test pointers are in [the sponsor explanation](../sponsor-explanation.md).

## Checks

The ten-slide PowerPoint passed package, geometry, Inter font-policy and re-import checks. Every slide was rendered and inspected. The PDF was exported through LibreOffice and all ten pages were visually inspected. Native Microsoft PowerPoint execution was not tested. This revision changes the presentation and documentation only.

The 1–4 minute video is a separate deliverable; use [the recording script](../submission.md#simple-video-script--target-240).
