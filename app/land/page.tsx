import { redirect } from "next/navigation";

// Category hub: a shareable short link into Explore with a preset filter.
export default function Page() {
  redirect("/explore?type=land");
}
