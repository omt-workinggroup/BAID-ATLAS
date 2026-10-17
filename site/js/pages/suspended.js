// Shown to suspended or closed accounts.
import { boot, getProfile, requireUser, signOut } from "../core.js";

boot();
await requireUser();
const profile = await getProfile();
if (profile?.account_status === "active") location.replace("/account");
if (profile?.account_status === "closed") {
  document.getElementById("reason").textContent = "This account is closed, so you can't use provider or account features. If you think this is a mistake, contact support.";
}
document.getElementById("sign-out").addEventListener("click", () => signOut());
