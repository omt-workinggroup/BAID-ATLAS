// Display labels. Stored values are stable identifiers; labels may be translated later.
export const ORGANIZATION_TYPE_LABELS: Record<string, string> = {
  agency: "Agency",
  developer: "Developer",
  landlord: "Landlord",
  property_manager: "Property manager",
  marketing_partner: "Marketing partner",
  enterprise: "Enterprise",
};

export const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  listing_manager: "Listing manager",
  marketing_manager: "Marketing manager",
  lead_manager: "Lead manager",
  viewer: "Viewer",
};

export const ORG_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Manage the team and organisation profile",
  listing_manager: "Create and edit listings",
  marketing_manager: "Studio orders and campaigns",
  lead_manager: "Handle inquiries and viewings",
  viewer: "Read-only access",
};

export const VERIFICATION_LABELS: Record<string, string> = {
  not_started: "Not verified",
  pending: "Verification pending",
  in_review: "Verification in review",
  verified: "Verified",
  rejected: "Verification not approved",
  expired: "Verification expired",
};

// Maps database error codes raised by workflow functions to user-facing messages.
export function friendlyDbError(error: { code?: string; message?: string } | null): string {
  switch (error?.code) {
    case "42501":
      return error.message?.includes("not verified")
        ? "Please verify your phone number first."
        : "You don't have permission to do that.";
    case "23505":
      return error.message?.includes("already a member")
        ? "That person is already a member."
        : "That name or address is already taken.";
    case "23514":
      return error.message?.includes("owner")
        ? "An organisation must keep at least one owner."
        : "Some details are not valid.";
    case "54000":
      return "Too many attempts. Please wait a while and try again.";
    case "P0002":
      return "This invitation is invalid, already used or expired.";
    case "22023":
      return "That role can't be used here.";
    default:
      return "Something went wrong. Please try again.";
  }
}
