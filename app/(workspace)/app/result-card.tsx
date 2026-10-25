import type { ReactNode } from "react";
import { WorkspaceIcon, type IconName } from "./workspace-icons";
import styles from "./result-card.module.css";

export function ResultHeader({
  icon,
  title,
  detail,
}: {
  icon: IconName;
  title: string;
  detail?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <span className={styles.heading}>
        <span className={styles.icon}>
          <WorkspaceIcon name={icon} size={17} />
        </span>
        {title}
      </span>
      {detail && <span className={styles.detail}>{detail}</span>}
    </header>
  );
}

/** Segment lengths encode counts only, never estimated confidence. */
export function CountBar({
  segments,
  label,
}: {
  segments: { count: number; tone: "match" | "conflict" | "neutral" }[];
  label: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  return (
    <span className={styles.bar} role="img" aria-label={label}>
      {segments.map(
        (segment, index) =>
          segment.count > 0 && (
            <span
              key={index}
              data-tone={segment.tone}
              style={{ flex: segment.count / total }}
            />
          ),
      )}
    </span>
  );
}
