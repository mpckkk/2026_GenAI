import { NextResponse } from "next/server";
import { services } from "@/app/bootstrap";
import { config } from "@/app/config";
import { logFailure } from "@/app/core/errors";

export async function GET() {
  try {
    return NextResponse.redirect(await services.auth.begin("register"));
  } catch (error) {
    logFailure("auth.register.failed", error);
    return NextResponse.redirect(
      new URL("/auth-error?reason=unavailable", config().appUrl),
    );
  }
}
