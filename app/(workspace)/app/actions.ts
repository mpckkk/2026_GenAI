"use server";
import { redirect } from "next/navigation";
import { services } from "@/app/bootstrap";

export async function createProject(data: FormData) {
  const user = await services.auth.requireUser();
  const name = data.get("name");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120)
    redirect("/app?error=name");
  const project = await services.projects.create(user.id, name);
  redirect(`/app/projects/${project.id}`);
}
