import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Celloras home">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <path
          d="M16 3c8 0 13 5 13 13s-5 13-13 13S3 24 3 16 8 3 16 3Z"
          fill="currentColor"
        />
        <ellipse
          cx="13"
          cy="13"
          rx="5"
          ry="7"
          transform="rotate(-35 13 13)"
          fill="#dfe9bd"
        />
        <circle cx="22" cy="20" r="4" fill="#a4c7a9" />
      </svg>
      celloras<span className="brand-dot">.</span>
    </Link>
  );
}
