import { NextResponse } from "next/server";
import { services } from "@/app/bootstrap";
import { config } from "@/app/config";
import { logFailure } from "@/app/core/errors";

export async function GET(request: Request) {
  const callback = new URL("/api/auth/callback", config().appUrl);
  callback.search = new URL(request.url).search;
  try {
    return NextResponse.redirect(
      new URL(await services.auth.complete(callback), config().appUrl),
    );
  } catch (error) {
    logFailure("auth.callback.rejected", error);
    return NextResponse.redirect(
      new URL("/auth-error?reason=invalid", config().appUrl),
    );
  }
}
