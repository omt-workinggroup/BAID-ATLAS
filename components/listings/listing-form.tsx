"use client";

import { useActionState, useState } from "react";
import { Alert, Field, SelectField, TextArea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  AREA_UNIT_LABELS,
  AREA_UNITS,
  GHANA_REGIONS,
  LISTING_CURRENCIES,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  PURPOSE_LABELS,
  PURPOSES,
  type Purpose,
} from "@/lib/listings/format";
import type { ListingFormState } from "@/app/portal/[orgSlug]/listings/actions";

type Values = Record<string, string | number | null | undefined>;

const PERIODS_FOR: Record<Purpose, { value: string; label: string }[]> = {
  sale: [{ value: "total", label: "Total price" }],
  long_term_rent: [
    { value: "per_month", label: "per month" },
    { value: "per_year", label: "per year" },
  ],
  short_stay: [
    { value: "per_night", label: "per night" },
    { value: "per_week", label: "per week" },
  ],
  lease: [
    { value: "per_year", label: "per year" },
    { value: "per_month", label: "per month" },
    { value: "total", label: "Total for the lease" },
  ],
};

export function ListingForm({
  action,
  initial = {},
  submitLabel,
  locked = false,
}: {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  initial?: Values;
  submitLabel: string;
  locked?: boolean;
}) {
  const [state, formAction] = useActionState<ListingFormState, FormData>(action, undefined);
  const [purpose, setPurpose] = useState<Purpose>((initial.purpose as Purpose) ?? "sale");
  const [type, setType] = useState(String(initial.property_type ?? "house"));
  const e = state?.errors ?? {};
  const v = (k: string) => (initial[k] === null || initial[k] === undefined ? "" : String(initial[k]));
  const isLand = type === "land";

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      {state?.ok && <Alert tone="success">Saved.</Alert>}
      {state?.message && <Alert tone="error">{state.message}</Alert>}
      <fieldset disabled={locked} className="grid gap-6 disabled:opacity-70">
        <Section title="What are you offering?">
          <div role="radiogroup" aria-label="Offer type" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PURPOSES.map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="radio" name="purpose" value={p} checked={purpose === p} onChange={() => setPurpose(p)} className="peer sr-only" />
                <span className="flex min-h-12 items-center justify-center rounded-2xl border border-border bg-surface px-3 text-center text-sm font-semibold transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-contrast peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-gold">
                  {PURPOSE_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
          <SelectField
            label="Property type"
            name="property_type"
            value={type}
            onChange={(ev) => setType(ev.target.value)}
            options={PROPERTY_TYPES.map((t) => ({ value: t, label: PROPERTY_TYPE_LABELS[t] }))}
            error={e.property_type}
          />
          <Field label="Listing title" name="title" defaultValue={v("title")} placeholder="e.g. Bright 3-bedroom home near A&C Mall" maxLength={120} error={e.title} />
        </Section>

        <Section title="Price">
          <div className="grid grid-cols-[6.5rem_1fr] gap-3">
            <SelectField label="Currency" name="currency" defaultValue={v("currency") || "GHS"} options={LISTING_CURRENCIES.map((c) => ({ value: c, label: c }))} />
            <Field label="Asking price" name="asking_price" inputMode="decimal" defaultValue={v("asking_price")} placeholder="0" error={e.asking_price} />
          </div>
          <SelectField
            key={purpose}
            label="Price basis"
            name="price_period"
            defaultValue={PERIODS_FOR[purpose].some((p) => p.value === v("price_period")) ? v("price_period") : PERIODS_FOR[purpose][0].value}
            options={PERIODS_FOR[purpose]}
            error={e.price_period}
          />
        </Section>

        <Section title="Location" hint="Only the area is shown publicly. The exact address stays private.">
          <SelectField label="Region" name="region" defaultValue={v("region") || "Greater Accra"} options={GHANA_REGIONS.map((r) => ({ value: r, label: r }))} error={e.region} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Town or city" name="city" defaultValue={v("city")} placeholder="Accra" error={e.city} />
            <Field label="Neighbourhood (optional)" name="locality" defaultValue={v("locality")} placeholder="East Legon" error={e.locality} />
          </div>
          <Field label="Exact address (private)" name="address_private" defaultValue={v("address_private")} hint="Never shown on the listing." error={e.address_private} />
        </Section>

        <Section title="Details">
          {!isLand && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bedrooms" name="bedrooms" inputMode="numeric" defaultValue={v("bedrooms")} error={e.bedrooms} />
              <Field label="Bathrooms" name="bathrooms" inputMode="numeric" defaultValue={v("bathrooms")} error={e.bathrooms} />
            </div>
          )}
          {!isLand && (
            <AreaInput label="Floor area" name="floor_area" value={v("floor_area")} unit={v("floor_area_unit") || "sqm"} error={e.floor_area} />
          )}
          <AreaInput label={isLand ? "Land size" : "Land size (optional)"} name="land_area" value={v("land_area")} unit={v("land_area_unit") || (isLand ? "plot" : "sqm")} error={e.land_area} />
          <TextArea
            label="Description"
            name="description"
            rows={6}
            defaultValue={v("description")}
            placeholder="What makes this property special? Mention access roads, water, power, security and nearby amenities."
            maxLength={5000}
            error={e.description}
          />
          <p className="-mt-3 text-xs text-muted">At least 40 characters are needed before you can submit for review.</p>
        </Section>
      </fieldset>
      {!locked && (
        <div className="sticky bottom-20 z-10 rounded-full bg-bg/80 p-1 backdrop-blur lg:bottom-4">
          <SubmitButton full pendingLabel="Saving…">{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function AreaInput({ label, name, value, unit, error }: { label: string; name: string; value: string; unit: string; error?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">{label}</label>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <input
          id={`f-${name}`}
          name={name}
          inputMode="decimal"
          defaultValue={value}
          aria-invalid={error ? true : undefined}
          className={`min-h-12 w-full rounded-xl border bg-surface px-3.5 ${error ? "border-danger" : "border-border"}`}
        />
        <select name={`${name}_unit`} defaultValue={unit} aria-label={`${label} unit`} className="min-h-12 rounded-xl border border-border bg-surface px-2">
          {AREA_UNITS.map((u) => (
            <option key={u} value={u}>{AREA_UNIT_LABELS[u]}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
