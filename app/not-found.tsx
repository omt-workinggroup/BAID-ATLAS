import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <ButtonLink href="/">Go home</ButtonLink>
    </div>
  );
}
