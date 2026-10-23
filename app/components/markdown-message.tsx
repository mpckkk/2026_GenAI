"use client";

import { memo, useId, useMemo } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./markdown-message.module.css";

const blockComponents: Components = {
  // Model-generated image URLs are references, not permission to fetch resources.
  img: ({ src, alt }) =>
    typeof src === "string" && src ? (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {alt || "View image"}
      </a>
    ) : (
      <span>{alt}</span>
    ),
  table: ({ children }) => (
    <div
      className={styles.tableScroll}
      role="region"
      aria-label="Response table"
      tabIndex={0}
    >
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => (
    <pre tabIndex={0} aria-label="Code block">
      {children}
    </pre>
  ),
};

export const MarkdownMessage = memo(function MarkdownMessage({
  children,
}: {
  children: string;
}) {
  const id = useId();
  const components = useMemo<Components>(
    () => ({
      ...blockComponents,
      a: ({ href, children, title, id: linkId, ...props }) => {
        if (!href) return <span>{children}</span>;
        return (
          <a
            href={href}
            title={title}
            id={linkId}
            aria-label={props["aria-label"]}
            aria-describedby={
              props["aria-describedby"] === "footnote-label"
                ? `message-${id}-footnote-label`
                : props["aria-describedby"]
            }
            target={href.startsWith("#") ? undefined : "_blank"}
            rel={href.startsWith("#") ? undefined : "noopener noreferrer"}
          >
            {children}
          </a>
        );
      },
      h2: ({ id: headingId, children }) => (
        <h2
          id={
            headingId === "footnote-label"
              ? `message-${id}-footnote-label`
              : headingId
          }
        >
          {children}
        </h2>
      ),
    }),
    [id],
  );
  return (
    <div className={styles.message}>
      <Markdown
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        remarkRehypeOptions={{ clobberPrefix: `message-${id}-` }}
        components={components}
        skipHtml
      >
        {children}
      </Markdown>
    </div>
  );
});
