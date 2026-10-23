export function AnnotationExample() {
  return (
    <figure className="sample-wrap">
      <div className="sample-card">
        <div className="card-topline">
          <span className="eyebrow">Annotation preview</span>
          <span className="pill">Example</span>
        </div>
        <div className="sample-title">
          <span className="cell-icon" aria-hidden="true">
            ✳
          </span>
          <div>
            <p className="muted small">Candidate cell identity</p>
            <h2>Root nodule cell</h2>
          </div>
        </div>
        <p className="sample-copy">
          Follow the evidence behind a candidate annotation.
        </p>
        <div className="evidence-row">
          <span>01</span>
          <div>
            <strong>Marker genes</strong>
            <p>Your selected genes, kept with the result.</p>
          </div>
          <span aria-hidden="true">↗</span>
        </div>
        <div className="evidence-row">
          <span>02</span>
          <div>
            <strong>Atlas evidence</strong>
            <p>Source references and supporting matches.</p>
          </div>
          <span aria-hidden="true">↗</span>
        </div>
        <div className="evidence-row">
          <span>03</span>
          <div>
            <strong>Points to review</strong>
            <p>Disagreements stay visible.</p>
          </div>
          <span aria-hidden="true">↗</span>
        </div>
        <div className="sample-bottom">
          <span className="status-dot" /> Review before accepting
        </div>
      </div>
      <figcaption>Illustrative layout · not a scientific result</figcaption>
    </figure>
  );
}
