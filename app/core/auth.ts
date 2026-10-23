import type { User } from "./types";

export interface Auth {
  currentUser(): Promise<User | null>;
  requireUser(): Promise<User>;
  begin(mode: "login" | "register", returnTo?: string): Promise<URL>;
  complete(callback: URL): Promise<string>;
  logout(): Promise<URL>;
}
