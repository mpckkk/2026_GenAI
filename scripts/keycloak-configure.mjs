// Apply signup settings to an existing local realm; import only creates realms.
import { readFile } from "node:fs/promises";

const realm = JSON.parse(
  await readFile(
    new URL("../infra/keycloak/realm.json", import.meta.url),
    "utf8",
  ),
);
const desiredProfile = JSON.parse(
  realm.components["org.keycloak.userprofile.UserProfileProvider"][0].config[
    "kc.user.profile.config"
  ][0],
);
const origin = "http://localhost:8180";
const username = process.env.KEYCLOAK_ADMIN || "admin";
const password = process.env.KEYCLOAK_ADMIN_PASSWORD;
if (!password) throw new Error("KEYCLOAK_ADMIN_PASSWORD is required in .env");

const response = await fetch(
  `${origin}/realms/master/protocol/openid-connect/token`,
  {
    method: "POST",
    body: new URLSearchParams({
      client_id: "admin-cli",
      grant_type: "password",
      username,
      password,
    }),
  },
);
if (!response.ok)
  throw new Error(`Keycloak admin login failed (${response.status})`);
const { access_token: token } = await response.json();
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
const realmUrl = `${origin}/admin/realms/celloras`;
const profileUrl = `${realmUrl}/users/profile`;
const current = await fetch(profileUrl, { headers });
if (!current.ok) throw new Error(`Profile read failed (${current.status})`);
const profile = await current.json();
for (const name of ["firstName", "lastName"]) {
  const attribute = profile.attributes.find((item) => item.name === name);
  const desired = desiredProfile.attributes.find((item) => item.name === name);
  if (!attribute || !desired)
    throw new Error(`Missing profile attribute: ${name}`);
  delete attribute.required;
  attribute.permissions = desired.permissions;
}
const profileUpdate = await fetch(profileUrl, {
  method: "PUT",
  headers,
  body: JSON.stringify(profile),
});
if (!profileUpdate.ok)
  throw new Error(`Signup profile update failed (${profileUpdate.status})`);
const update = await fetch(realmUrl, {
  method: "PUT",
  headers,
  body: JSON.stringify({ loginTheme: "celloras" }),
});
if (!update.ok) throw new Error(`Theme update failed (${update.status})`);
const check = await fetch(realmUrl, { headers });
if (!check.ok || (await check.json()).loginTheme !== "celloras") {
  throw new Error("Theme update could not be confirmed");
}
const profileCheck = await fetch(profileUrl, { headers });
if (!profileCheck.ok) throw new Error("Profile update could not be confirmed");
const saved = await profileCheck.json();
for (const name of ["firstName", "lastName"]) {
  const attribute = saved.attributes.find((item) => item.name === name);
  if (
    !attribute ||
    attribute.required ||
    attribute.permissions.view.includes("user") ||
    attribute.permissions.edit.includes("user")
  )
    throw new Error(`Signup still exposes or requires ${name}`);
}
console.log(
  "Celloras theme and email/password signup active on the local realm.",
);
