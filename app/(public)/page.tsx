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
            <p className="eyebrow">
              Plant single-cell research · Soybean first
            </p>
            <h1>Your single-cell research, in conversation.</h1>
            <p className="hero-description">
              Keep tissue context, cluster markers and research notes together
              in a conversation you can return to.
            </p>
            <div className="hero-actions">
              <a className="button" href="/register">
                Start an experiment <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#workflow">
                See the workflow <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="hero-note">
              Early access. Reference-based cell-type suggestions are in
              development.
            </p>
          </div>
          <div className="hero-visual">
            <AnnotationExample />
          </div>
        </section>
        <section id="workflow" className="workflow shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Inside your experiment</p>
              <h2>Keep the context with the conversation.</h2>
            </div>
            <p>
              Start with soybean. Keep each cluster and its open questions in a
              research record of its own.
            </p>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Add context",
                "Tell Celloras which tissue and cluster you’re studying. Add genome details when you have them.",
              ],
              [
                "02",
                "Bring your markers",
                "Paste the genes for your cluster and keep the original list with your experiment.",
              ],
              [
                "03",
                "Keep your notes",
                "Record the questions and observations that guide your analysis, directly in the conversation.",
              ],
              [
                "04",
                "Return later",
                "Reopen the experiment with its saved context and conversation when you’re ready to continue.",
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
          <h2>Built toward evidence-backed annotation</h2>
          <p>
            The next scientific step is to connect marker genes to reference
            evidence, show competing cell-type interpretations and make
            uncertainty visible. Soybean comes first; other plants will follow
            as their references and methods are validated.
          </p>
        </section>
      </main>
      <footer className="site-footer shell">
        <Brand />
        <span>Plant single-cell research · Soybean first</span>
        <Link href="/login">Open workspace ↗</Link>
      </footer>
    </div>
  );
}
