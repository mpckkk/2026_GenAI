import Image from "next/image";
import { Brand } from "@/app/components/brand";
import { RootMapPreview } from "./root-map-preview";
import styles from "./landing.module.css";

const steps = [
  {
    number: "01",
    title: "Start with a question.",
    description:
      "Open the soybean demo and follow a suggested next step. No blank canvas, no guessing what to ask.",
    example: "“Show me the cell groups in this root.”",
  },
  {
    number: "02",
    title: "Look at the evidence.",
    description:
      "Move from a cluster to its marker genes, expression patterns and relevant papers in the same conversation.",
    example: "“Which genes distinguish cluster 6?”",
  },
  {
    number: "03",
    title: "Keep your reasoning.",
    description:
      "Record what the evidence supports, what remains uncertain and why. Return to the result and your review together.",
    example: "“What evidence supports this interpretation?”",
  },
];

export default function Landing() {
  return (
    <div className={styles.landing}>
      <header className={`${styles.header} ${styles.shell}`}>
        <Brand />
        <nav aria-label="Main navigation">
          <a className={styles.navSection} href="#inside">
            Inside Celloras
          </a>
          <a className={styles.navSection} href="#workflow">
            How it works
          </a>
          <a href="/login">Log in</a>
          <a className={styles.smallButton} href="/register">
            Get started <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className={`${styles.hero} ${styles.shell}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.dot} aria-hidden="true" />A research
              partner for plant single-cell biology
            </p>
            <h1>
              Know your cells.
              <br />
              <span>Follow the evidence.</span>
            </h1>
            <p className={styles.heroDescription}>
              Spend less time naming cell groups by hand. Celloras suggests cell
              types in one click and shows the evidence behind each suggestion.
            </p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="/login">
                Explore the demo <span aria-hidden="true">↗</span>
              </a>
              <a className={styles.textLink} href="#inside">
                Take a closer look <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className={styles.demoNote}>
              A real soybean dataset, ready to explore.
              <br />
              Demo login details are on the sign-in screen.
            </p>
          </div>
          <figure className={styles.botanical}>
            <Image
              src="/images/soybean-root-editorial-v1.webp"
              alt="Illustrative soybean plant with green leaves and branching roots."
              width={1122}
              height={1402}
              sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 45vw, 520px"
              priority
              className={styles.botanicalImage}
            />
            <figcaption className={styles.botanicalCaption}>
              <div>
                <span className={styles.figureNumber}>Starting with</span>
                <strong>Soybean</strong>
                <span>Glycine max</span>
              </div>
            </figcaption>
          </figure>
        </section>
        <div className={`${styles.facts} ${styles.shell}`}>
          <p>
            <span className={styles.factLabel}>Inside the demo</span>Published
            soybean root data
          </p>
          <p>
            <strong>7,496</strong> nuclei
          </p>
          <p>
            <strong>12</strong> source clusters
          </p>
          <p>
            <strong>40,127</strong> RNA genes
          </p>
          <a
            href="https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE270392"
            target="_blank"
            rel="noreferrer"
          >
            GSE270392 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <section className={`${styles.film} ${styles.shell}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>In 90 seconds</p>
            <h2>How Celloras names your cells.</h2>
          </div>
          <video
            className={styles.filmVideo}
            src="/video/celloras-promo.mp4"
            poster="/video/celloras-promo.jpg"
            controls
            playsInline
            preload="metadata"
          />
        </section>
        <section id="inside" className={`${styles.inside} ${styles.shell}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>
              Less clicking between tools. More discovery.
            </p>
            <h2>A conversation that gives you something to work with.</h2>
            <p>Ask a question. Inspect the result. Choose where to go next.</p>
          </div>
          <div className={styles.productGrid}>
            <RootMapPreview />
            <div className={styles.productCopy}>
              <span className={styles.kicker}>From overview to detail</span>
              <h3>Your next question is already within reach.</h3>
              <p>
                Choose a cell group, compare its markers and follow the
                evidence. Suggested actions guide you to the next useful check.
              </p>
              <ol className={styles.questionTrail}>
                <li>
                  <span aria-hidden="true">01</span>
                  <div>
                    <strong>Explore the cell groups</strong>
                    <p>See the full dataset and select a cluster.</p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">02</span>
                  <div>
                    <strong>Compare marker expression</strong>
                    <p>
                      Check a gene on the map or compare several in a dot plot.
                    </p>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">03</span>
                  <div>
                    <strong>Follow the source</strong>
                    <p>Read the cited evidence and save your interpretation.</p>
                  </div>
                </li>
              </ol>
              <a className={styles.textLink} href="/login">
                Try it with the soybean demo <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
        <section id="workflow" className={styles.workflow}>
          <div className={styles.shell}>
            <div className={styles.workflowHeading}>
              <div>
                <p className={styles.eyebrow}>Built around how you think</p>
                <h2>
                  Bring the question.
                  <br />
                  Keep the scientific judgment.
                </h2>
              </div>
              <p>
                The agent helps with the work between a question and an answer.
                You decide what the evidence means.
              </p>
            </div>
            <div className={styles.steps}>
              {steps.map((step) => (
                <article key={step.number}>
                  <span className={styles.stepNumber}>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <div className={styles.exampleQuestion}>{step.example}</div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={`${styles.evidence} ${styles.shell}`}>
          <div>
            <p className={styles.eyebrow}>Evidence stays attached</p>
            <h2>A useful answer needs a traceable reason.</h2>
            <p>
              A promising marker is a starting point. Keep its expression,
              biological context and source together, so you can challenge an
              interpretation as easily as you can follow it.
            </p>
          </div>
          <dl className={styles.evidenceList}>
            <div>
              <dt>Inspect the result</dt>
              <dd>
                Plots and marker tables come from the dataset, with methods and
                source details.
              </dd>
            </div>
            <div>
              <dt>Check the fit</dt>
              <dd>
                Species, tissue and genome version matter. Incompatible evidence
                is kept out of matching results.
              </dd>
            </div>
            <div>
              <dt>Make uncertainty visible</dt>
              <dd>
                Save supported, uncertain or rejected interpretations with your
                own reasoning.
              </dd>
            </div>
          </dl>
        </section>
        <section className={`${styles.start} ${styles.shell}`}>
          <div>
            <p className={styles.eyebrow}>Soybean first. More plants ahead.</p>
            <h2>Your next discovery starts with a question.</h2>
            <p>Open a prepared dataset and see where the evidence takes you.</p>
          </div>
          <a className={styles.primaryButton} href="/login">
            Explore the demo <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
      <footer className={`${styles.footer} ${styles.shell}`}>
        <Brand />
        <span>Plant single-cell research, in conversation.</span>
        <a href="/login">
          Open workspace <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  );
}
