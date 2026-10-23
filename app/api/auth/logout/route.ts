import { NextResponse } from "next/server";
import { services } from "@/app/bootstrap";
import { assertSameOrigin, config } from "@/app/config";
import { logFailure } from "@/app/core/errors";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  try {
    return NextResponse.redirect(await services.auth.logout(), 303);
  } catch (error) {
    logFailure("auth.logout.failed", error);
    return NextResponse.redirect(
      new URL("/auth-error?reason=logout", config().appUrl),
      303,
    );
  }
}
