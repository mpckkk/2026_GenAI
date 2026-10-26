import "server-only";
import type { ActivityFilters, ActivityRepository } from "../core/activity";
import { ChatValidationError } from "../core/chat";
import type { AccessService } from "./access";

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function invalid(field: string, message: string): never {
  const error = new ChatValidationError({ [field]: message });
  error.message = "Check the activity request and try again.";
  throw error;
}
function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value))
    invalid(field, "Use a valid identifier.");
  return value.toLowerCase();
}
function filters(input: unknown): ActivityFilters {
  if (!input || typeof input !== "object" || Array.isArray(input))
    invalid("filters", "Provide valid activity filters.");
  const v = input as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) => !["projectId", "status", "q", "before", "limit"].includes(k),
    )
  )
    invalid("filters", "Unsupported activity filter.");
  const result: ActivityFilters = {};
  if (v.projectId !== undefined)
    result.projectId = uuid(v.projectId, "projectId");
  if (v.status !== undefined) {
    if (
      typeof v.status !== "string" ||
      ![
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
        "active",
      ].includes(v.status)
    )
      invalid("status", "Choose a valid request status.");
    result.status = v.status as ActivityFilters["status"];
  }
  if (v.q !== undefined) {
    if (
      typeof v.q !== "string" ||
      v.q.length > 200 ||
      /[\u0000-\u001f\u007f]/u.test(v.q)
    )
      invalid("q", "Use a search of at most 200 characters.");
    if (v.q.trim()) result.q = v.q.trim();
  }
  if (v.before !== undefined) {
    if (
      typeof v.before !== "string" ||
      !/^[1-9][0-9]{0,18}$/.test(v.before) ||
      BigInt(v.before) > 9223372036854775807n
    )
      invalid("before", "Use a valid activity page cursor.");
    result.before = v.before;
  }
  if (v.limit !== undefined) {
    if (
      (typeof v.limit !== "number" &&
        (typeof v.limit !== "string" || !/^[1-9][0-9]?$/.test(v.limit))) ||
      !Number.isInteger(Number(v.limit)) ||
      Number(v.limit) < 1 ||
      Number(v.limit) > 30
    )
      invalid("limit", "Choose between 1 and 30 requests per page.");
    result.limit = Number(v.limit);
  }
  return result;
}

export class ActivityService {
  constructor(
    private readonly access: AccessService,
    private readonly repository: ActivityRepository,
  ) {}
  async list(userId: string, input: unknown = {}) {
    const ownerId = uuid(userId, "userId");
    const parsed = filters(input);
    if (parsed.projectId)
      await this.access.requireProject(ownerId, parsed.projectId);
    return this.repository.list(ownerId, parsed);
  }
  async detail(userId: string, turnId: string) {
    const ownerId = uuid(userId, "userId");
    const id = uuid(turnId, "turnId");
    // Resolve only the owned project ID first; access precedes event/output reads.
    const projectId = await this.repository.ownedProjectId(ownerId, id);
    await this.access.requireProject(ownerId, projectId);
    return this.repository.detail(ownerId, projectId, id);
  }
}
