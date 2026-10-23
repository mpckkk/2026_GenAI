import Link from "next/link";
import { Brand } from "@/app/components/brand";
import { AnnotationExample } from "@/app/components/annotation-card";

export default function Landing() {
  return (
    <div className="landing">
      <header className="site-header shell">
        <Brand />
        <nav aria-label="Main navigation">
          <a className="nav-process" href="#workflow">
            How it works
          </a>
          <a href="/login">Log in</a>
          <a className="button button-small" href="/register">
            Get started <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero shell">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> A workspace for plant single-cell
              research
            </div>
            <h1>
              Cell identity,
              <br />
              <em>with evidence.</em>
            </h1>
            <p className="hero-description">
              Explore soybean cell types from marker genes. Bring atlas
              evidence, competing annotations, and your research notes into one
              project.
            </p>
            <div className="hero-actions">
              <a className="button" href="/register">
                Start a research project <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#workflow">
                Explore the workflow <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="hero-note">
              Built for careful review. Your scientific judgment stays central.
            </p>
          </div>
          <div className="hero-visual">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <AnnotationExample />
          </div>
        </section>
        <section id="workflow" className="workflow shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">From question to context</p>
              <h2>A clearer path through your evidence.</h2>
            </div>
            <p>
              Keep the reasoning beside the result, so you can return to both.
            </p>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Bring your markers",
                "Start with the genes that define your cluster and give your analysis a project of its own.",
              ],
              [
                "02",
                "Examine the evidence",
                "Review candidate cell identities alongside atlas references and any disagreements.",
              ],
              [
                "03",
                "Keep the context",
                "Build a record of your findings, corrections, and the questions that still need an answer.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span className="step-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="research-note shell">
          <span className="eyebrow">Made for research</span>
          <p>
            Annotations are hypotheses to investigate. Evidence quality, source
            provenance, and biological context matter more than a
            confident-sounding answer.
          </p>
        </section>
      </main>
      <footer className="site-footer shell">
        <Brand />
        <span>Soybean cell annotation · Research workspace</span>
        <Link href="/login">Open workspace ↗</Link>
      </footer>
    </div>
  );
}
