"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { Brand } from "@/app/components/brand";
import type { Project } from "@/app/core/types";
import { WorkspaceIcon } from "./workspace-icons";
import styles from "./workspace.module.css";

export function WorkspaceShell({
  projects,
  displayName,
  children,
}: {
  projects: Project[];
  displayName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLDialogElement>(null);
  const closeNavigation = () => navigationRef.current?.close();

  function navigation() {
    return (
      <>
        <div className={styles.sidebarBrand}>
          <Brand href="/app" />
        </div>
        <Link
          href="/app#create-experiment"
          onClick={closeNavigation}
          className={styles.newExperiment}
        >
          <WorkspaceIcon name="plus" size={18} /> New experiment
        </Link>
        <nav aria-label="Workspace navigation" className={styles.sidebarLinks}>
          <Link
            href="/app"
            onClick={closeNavigation}
            className={styles.sidebarLink}
            aria-current={pathname === "/app" ? "page" : undefined}
          >
            <WorkspaceIcon name="grid" size={18} />
            <span>All experiments</span>
          </Link>
          <Link
            href="/app/activity"
            onClick={closeNavigation}
            className={styles.sidebarLink}
            aria-current={
              pathname.startsWith("/app/activity") ? "page" : undefined
            }
          >
            <WorkspaceIcon name="activity" size={18} />
            <span>Agent activity</span>
          </Link>
        </nav>
        <div className={styles.sidebarSectionLabel}>Experiments</div>
        <nav aria-label="Your experiments" className={styles.projectNavigation}>
          {projects.length ? (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/app/projects/${project.id}`}
                onClick={closeNavigation}
                className={styles.sidebarLink}
                aria-current={
                  pathname === `/app/projects/${project.id}`
                    ? "page"
                    : undefined
                }
                title={project.name}
              >
                <WorkspaceIcon name="flask" size={18} />
                <span>{project.name}</span>
              </Link>
            ))
          ) : (
            <p className={styles.sidebarEmpty}>
              Your experiments will appear here.
            </p>
          )}
        </nav>
        <div className={styles.sidebarFooter}>
          <Link
            href="/app/health"
            onClick={closeNavigation}
            className={styles.sidebarLink}
            aria-current={pathname === "/app/health" ? "page" : undefined}
          >
            <WorkspaceIcon name="activity" size={18} />
            <span>Service health</span>
          </Link>
          <div className={styles.accountRow}>
            <span className={styles.accountAvatar} aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className={styles.accountName} title={displayName}>
              {displayName}
              <small>Personal workspace</small>
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                className={styles.iconButton}
                type="submit"
                aria-label="Log out"
                title="Log out"
              >
                <WorkspaceIcon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>{navigation()}</aside>
      <div className={styles.workspaceBody}>
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Open navigation"
            onClick={() => navigationRef.current?.showModal()}
          >
            <WorkspaceIcon name="menu" />
          </button>
          <Brand href="/app" />
          <Link
            href="/app#create-experiment"
            className={styles.iconButton}
            aria-label="New experiment"
          >
            <WorkspaceIcon name="plus" />
          </Link>
        </header>
        <main
          id="main"
          className={styles.main}
          data-project={pathname.startsWith("/app/projects/")}
        >
          {children}
        </main>
      </div>
      <dialog
        className={styles.navigationDialog}
        ref={navigationRef}
        aria-label="Workspace navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeNavigation();
        }}
      >
        <button
          type="button"
          className={`${styles.iconButton} ${styles.navigationClose}`}
          aria-label="Close navigation"
          onClick={closeNavigation}
        >
          <WorkspaceIcon name="close" />
        </button>
        <div className={styles.mobileNavigation}>{navigation()}</div>
      </dialog>
    </div>
  );
}
