import { NextResponse } from "next/server";
import { services } from "@/app/bootstrap";
import { config } from "@/app/config";
import { logFailure } from "@/app/core/errors";

export async function GET(request: Request) {
  try {
    return NextResponse.redirect(
      await services.auth.begin(
        "login",
        new URL(request.url).searchParams.get("returnTo") ?? undefined,
      ),
    );
  } catch (error) {
    logFailure("auth.login.failed", error);
    return NextResponse.redirect(
      new URL("/auth-error?reason=unavailable", config().appUrl),
    );
  }
}
