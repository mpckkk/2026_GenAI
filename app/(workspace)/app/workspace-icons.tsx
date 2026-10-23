import type { CSSProperties } from "react";

export type IconName =
  | "plus"
  | "flask"
  | "chat"
  | "chevron"
  | "arrow"
  | "menu"
  | "close"
  | "panel"
  | "activity"
  | "logout"
  | "grid"
  | "leaf";

const paths: Record<IconName, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  flask: (
    <>
      <path d="M9 3h6M10 3v7L5 19a1.3 1.3 0 0 0 1.2 2h11.6a1.3 1.3 0 0 0 1.2-2l-5-9V3M8 15h8" />
    </>
  ),
  chat: <path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M12 20V4m-7 7 7-7 7 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  logout: (
    <>
      <path d="M9 4H5v16h4M10 12h11m-4-4 4 4-4 4" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  leaf: (
    <path d="M20 4c-9-1-16 3-16 9a6 6 0 0 0 10 5c4-3 5-8 6-14ZM4 21 16 9" />
  ),
};

export function WorkspaceIcon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
