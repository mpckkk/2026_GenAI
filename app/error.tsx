"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="center-page">
      <div className="panel">
        <h1>We couldn’t load this page.</h1>
        <p>A required service may be unavailable. Please try again.</p>
        <button className="button" onClick={reset}>
          Try again
        </button>
        <Link className="text-link" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
