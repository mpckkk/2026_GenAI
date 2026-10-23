import Link from "next/link";
import { Brand } from "@/app/components/brand";
export default async function AuthError({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message =
    reason === "logout"
      ? "Your local session has been cleared, but we could not confirm sign-out with the identity service. Close its session before using a shared computer."
      : reason === "invalid"
        ? "This sign-in request has expired or could not be verified. Please start again."
        : "The sign-in service is unavailable. Please try again shortly.";
  return (
    <main id="main" className="center-page">
      <Brand />
      <div className="panel">
        <p className="eyebrow">Account access</p>
        <h1>We couldn’t complete that.</h1>
        <p>{message}</p>
        <a className="button" href="/login">
          Try signing in again
        </a>
        <Link className="text-link" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
