import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/app/components/brand";
import { services } from "@/app/bootstrap";
import styles from "./workspace.module.css";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Workspace navigation" className={styles.navigation}>
          <Link href="/app">Experiments</Link>
          <Link href="/app/health">Service health</Link>
        </nav>
        <div className={styles.account}>
          <span title={user.displayName}>{user.displayName}</span>
          <form action="/api/auth/logout" method="post">
            <button className={styles.textButton} type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main id="main" className={styles.main}>
        {children}
      </main>
    </div>
  );
}
