const form = document.getElementById("kc-form-login");
const button = document.getElementById("celloras-demo-fill");
const username = form?.querySelector('input[name="username"]');
const password = form?.querySelector('input[name="password"]');

if (button && username && password) {
  button.hidden = false;
  button.addEventListener("click", () => {
    username.value = document.getElementById("celloras-demo-email").textContent;
    password.value = document.getElementById(
      "celloras-demo-password",
    ).textContent;
    for (const input of [username, password]) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    form.querySelector('input[type="submit"], button[type="submit"]').focus();
  });
}
