import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/app/components/brand";
import { services } from "@/app/bootstrap";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await services.auth.currentUser();
  if (!user) redirect("/login");
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="eyebrow sidebar-label">Research workspace</p>
        <nav aria-label="Workspace navigation">
          <Link href="/app">↗ &nbsp; Projects</Link>
          <Link href="/app/health">◉ &nbsp; Service health</Link>
        </nav>
        <div className="sidebar-account">
          <span>{user.displayName}</span>
          <form action="/api/auth/logout" method="post">
            <button className="text-link" type="submit">
              Log out ↗
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="workspace-main">
        {children}
      </main>
    </div>
  );
}
