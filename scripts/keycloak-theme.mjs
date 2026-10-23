// Apply the theme to an existing local realm; startup import only creates realms.
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
console.log("Celloras login theme active on the local celloras realm.");
