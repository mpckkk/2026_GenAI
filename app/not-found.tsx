export default function NotFound() {
  return (
    <main id="main" className="center-page">
      <div className="panel">
        <h1>Page not found.</h1>
        <p>This page is unavailable or does not belong to your account.</p>
        <a className="button" href="/app">
          Back to projects
        </a>
      </div>
    </main>
  );
}
