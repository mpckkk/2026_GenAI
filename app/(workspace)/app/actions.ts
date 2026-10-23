"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";
import {
  AuthenticationRequiredError,
  ProjectNotFoundError,
  ResearchConflictError,
  ResearchValidationError,
  logFailure,
} from "@/app/core/errors";
import type { ResearchActionState } from "@/app/core/research";

export async function createProject(data: FormData) {
  const user = await services.auth.requireUser();
  const name = data.get("name");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
    redirect("/app?error=name");
  const project = await services.projects.create(user.id, name);
  revalidatePath("/app", "layout");
  redirect(`/app/projects/${project.id}`);
}

export async function appendResearch(
  projectId: string,
  input: unknown,
): Promise<ResearchActionState> {
  try {
    const user = await services.auth.requireUser();
    const entry = await services.research.append(user.id, projectId, input);
    revalidatePath(`/app/projects/${projectId}`);
    return { status: "saved", entry };
  } catch (error) {
    if (error instanceof ResearchValidationError)
      return { status: "error", message: error.message, fields: error.fields };
    if (error instanceof ResearchConflictError)
      return {
        status: "error",
        code: "SUBMISSION_CONFLICT",
        message:
          "This save was already recorded with different content. Your draft is still here. Save it as a new entry to keep both versions.",
      };
    if (error instanceof AuthenticationRequiredError)
      return {
        status: "error",
        message:
          "Your session has expired. Sign in again in another tab, then retry. Your draft is still here.",
      };
    if (error instanceof ProjectNotFoundError)
      return {
        status: "error",
        message: "This experiment is no longer available to your account.",
      };
    logFailure("research.ui.append_failed", error);
    return {
      status: "error",
      message:
        "The save could not be confirmed. Your draft is still here; retry to check or complete the same save.",
    };
  }
}
