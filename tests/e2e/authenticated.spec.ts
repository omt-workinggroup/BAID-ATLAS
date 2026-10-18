import { expect, test, type Page } from "@playwright/test";

// Runs the signed-in workflow against real accounts using Supabase test phone numbers, which accept a
// fixed code without sending an SMS (Authentication -> Providers -> Phone -> "Test phone numbers").
// Requires E2E_OWNER_PHONE, E2E_MEMBER_PHONE (E.164) and E2E_OTP. Skipped otherwise.
const owner = process.env.E2E_OWNER_PHONE;
const member = process.env.E2E_MEMBER_PHONE;
const otp = process.env.E2E_OTP;
const shotDir = "docs/screenshots/static/e2e";

test.describe.configure({ mode: "serial" });
test.skip(!owner || !member || !otp, "QA test phone numbers not provided");

const slug = `qa-test-${Date.now().toString(36)}`;
let inviteLink = "";

async function signIn(page: Page, phone: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.waitForURL("**/verify");
  // The page submits by itself once all six digits are in.
  await page.getByLabel("6-digit code").fill(otp!);
  await page.waitForURL((u) => !u.pathname.startsWith("/verify"));
}

async function finishOnboarding(page: Page, name: string, intent: "discover" | "provide", shot?: string) {
  if (!page.url().includes("/onboarding")) await page.goto("/onboarding");
  if (!page.url().includes("/onboarding")) return; // already onboarded
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel(intent === "provide" ? /List properties/ : /Find a property/).check();
  if (shot) await page.screenshot({ path: `${shotDir}/${shot}.png` });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/onboarding"));
}

test("owner onboards and creates an organisation", async ({ page }) => {
  await signIn(page, owner!);
  await finishOnboarding(page, "QA Owner", "provide", "06-onboarding");

  await page.goto("/portal/new");
  await page.getByLabel("Organisation name").fill("QA test organisation (not a real provider)");
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Type").selectOption("agency");
  await page.screenshot({ path: `${shotDir}/07-create-organisation.png` });
  await page.getByRole("button", { name: "Create organisation" }).click();

  await page.waitForURL(`**/portal/${slug}?created=1`);
  await expect(page.getByText("Organisation created. You're the owner.")).toBeVisible();
  await expect(page.getByText("You: Owner")).toBeVisible();
  await expect(page.getByText("Not verified")).toBeVisible();
  await page.screenshot({ path: `${shotDir}/08-organisation-overview.png` });
});

test("owner invites a member and edits the profile", async ({ page }) => {
  await signIn(page, owner!);
  await page.goto(`/portal/${slug}/team`);
  await page.getByLabel("Phone number").fill(member!);
  await page.getByLabel("Role").selectOption("viewer");
  await page.getByRole("button", { name: "Create invitation" }).click();
  const link = page.getByLabel("Invitation link");
  await expect(link).toBeVisible();
  inviteLink = await link.inputValue();
  expect(inviteLink).toMatch(/\/invitations\/accept\?token=[a-f0-9]{48}$/);
  await page.screenshot({ path: `${shotDir}/09-team-invite.png`, fullPage: true });

  await page.goto(`/portal/${slug}/settings`);
  await page.getByLabel("Website").fill("http://not-https.example");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Use a full https:// address.")).toBeVisible();
  await page.getByLabel("Website").fill("");
  await page.getByLabel("Description").fill("Test organisation used for automated QA. Not a real provider.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.screenshot({ path: `${shotDir}/11-organisation-profile.png` });
});

test("member accepts the invitation with limited access", async ({ page }) => {
  expect(inviteLink).not.toBe("");
  await signIn(page, member!);
  await finishOnboarding(page, "QA Member", "discover");

  const url = new URL(inviteLink);
  await page.goto(url.pathname + url.search);
  await page.screenshot({ path: `${shotDir}/12-accept-invitation.png` });
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await page.waitForURL(`**/portal/${slug}?joined=1`);
  await expect(page.getByText("You: Viewer")).toBeVisible();

  await page.goto(`/portal/${slug}/team`);
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite someone" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change" })).toHaveCount(0);
  await page.screenshot({ path: `${shotDir}/13-team-as-viewer.png` });

  await page.goto(`/portal/${slug}/settings`);
  await expect(page.getByText("Only owners and admins can edit the organisation profile.")).toBeVisible();

  // Re-using the invitation fails.
  await page.goto(url.pathname + url.search);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page.locator("[data-form-message]")).toBeVisible();
});

test("owner changes the member's role; unknown organisations are hidden", async ({ page }) => {
  await signIn(page, owner!);
  await page.goto(`/portal/${slug}/team`);
  await page.getByLabel("Role for QA Member").selectOption("listing_manager");
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByText("Role updated.")).toBeVisible();
  await page.screenshot({ path: `${shotDir}/14-team-as-owner.png`, fullPage: true });

  await page.goto("/portal/this-org-does-not-exist/team");
  await expect(page).toHaveURL(/\/portal\?error=not-found/);
});

test("account page and sign-out", async ({ page }) => {
  await signIn(page, member!);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  await expect(page.getByText("Used to sign in. Not shown publicly.")).toBeVisible();
  await page.getByLabel("Name").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Your name is required.")).toBeVisible();
  await page.screenshot({ path: `${shotDir}/15-account.png` });
  await page.getByLabel("Name").fill("QA member");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL("**/sign-in?signed_out=1");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});
