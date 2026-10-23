export function AnnotationExample() {
  return (
    <figure className="sample-wrap">
      <div className="sample-card">
        <div className="card-topline">
          <span className="eyebrow">Conversation preview</span>
          <span className="pill">Illustration</span>
        </div>
        <div className="sample-message sample-user">
          <p className="sample-speaker">You</p>
          <p>I’m working on soybean root cells.</p>
        </div>
        <div className="sample-message">
          <p className="sample-speaker">Celloras</p>
          <p>Keep the tissue and cluster context with your markers.</p>
        </div>
        <div className="sample-context">
          <h2>Experiment context</h2>
          <dl>
            <div>
              <dt>Plant</dt>
              <dd>Soybean</dd>
            </div>
            <div>
              <dt>Tissue</dt>
              <dd>Root</dd>
            </div>
            <div>
              <dt>Marker genes</dt>
              <dd className="muted">Add your cluster markers</dd>
            </div>
          </dl>
        </div>
        <div className="sample-bottom">
          Reference-based annotation <span>In development</span>
        </div>
      </div>
      <figcaption>Example layout; no analysis has run.</figcaption>
    </figure>
  );
}
