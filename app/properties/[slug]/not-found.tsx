import { ButtonLink } from "@/components/ui";

export default function PropertyNotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">This property isn&apos;t available</h1>
      <p className="text-muted">It may have been sold, rented, paused or removed by the provider.</p>
      <ButtonLink href="/explore">Explore other properties</ButtonLink>
    </div>
  );
}
