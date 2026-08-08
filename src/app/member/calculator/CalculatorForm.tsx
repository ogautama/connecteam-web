"use client";

import { useState, useTransition } from "react";
import {
  MAX_SUM_ASSURED,
  UNTIL_AGE_TERMS,
  makePremiumInputSchema,
  type PaymentTerm,
  type ProductDefinition,
} from "@ogautama/premium-engine/public";
import {
  BENEFIT_CATEGORIES,
  productFor,
  type BenefitCategory,
} from "@/lib/premium/categories";
import { requestPremium } from "@/lib/premium/pricing";

/** The single-term success shape of requestPremium's `body.data` — single-term
 * because this form always sends a `paymentTerm` (the multi-term shape only
 * appears when the field is omitted). */
type PricedResult = {
  productDisplayName: string;
  planType: string;
  gender: string;
  smokingStatus: string;
  sumAssured: number;
  insuranceAge: number;
  paymentTerm: number;
  annualPremium: number;
  monthlyPremium: number;
  discount: number;
  annualPremiumBeforeDiscount: number;
  monthlyPremiumBeforeDiscount: number;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** 60/99 mean "until age N" for life_PHE, not a duration (UNTIL_AGE_TERMS). */
function termLabel(term: number): string {
  return (UNTIL_AGE_TERMS as ReadonlySet<number>).has(term)
    ? `Sampai usia ${term}`
    : `${term} tahun`;
}

/**
 * The engine's zod messages are stable `validation.*` keys — this is their
 * Indonesian copy. Every key `makePremiumInputSchema` can emit for input this
 * form can actually produce (typed DOB; the rest are constrained selects).
 *
 * Sharia terminology throughout (both products are syariah, user's call
 * 2026-08-08): "Kontribusi" never "Premi", "Santunan Asuransi" never
 * "UP"/"Uang Pertanggungan". Engine identifiers (annualPremium, sumAssured)
 * are API names and stay.
 */
const VALIDATION_MESSAGES: Record<string, string> = {
  "validation.dateOfBirth.required": "Isi tanggal lahir klien dulu.",
  "validation.dateOfBirth.future": "Tanggal lahir tidak boleh di masa depan.",
  "validation.dateOfBirth.ageOutOfRange": "Usia di luar ketentuan produk ini.",
  "validation.sumAssured.required": "Isi santunan asuransi dulu.",
  "validation.sumAssured.notPositive": "Santunan asuransi harus lebih dari 0.",
  "validation.sumAssured.tooLarge": `Santunan asuransi maksimum ${rupiah.format(
    MAX_SUM_ASSURED
  )}.`,
};
const FALLBACK_VALIDATION_MESSAGE = "Input belum valid — cek lagi isianmu.";

/** The engine's error `code`s on a non-200 (mirrors handlePremiumRequest). */
const SERVER_ERROR_MESSAGES: Record<string, string> = {
  AGE_OUT_OF_RANGE: "Usia di luar ketentuan produk ini.",
  RATE_NOT_AVAILABLE: "Tarif untuk kombinasi ini belum tersedia.",
  UNKNOWN_PLAN: "Plan ini tidak tersedia untuk produk ini.",
};
const GENERIC_ERROR_MESSAGE = "Gagal menghitung kontribusi. Coba lagi.";

/** "YYYY-MM-DD" (the date input's value) → local Date. Never `new
 * Date(string)` — that parses as UTC and can shift the DOB by a day. */
function parseLocalDob(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Fields owned by the selected product — reset whenever the tab changes. */
type ProductFields = {
  planType: string;
  paymentTerm: number;
};

function defaultFieldsFor(def: ProductDefinition): ProductFields {
  return {
    planType: def.plans[0],
    paymentTerm: def.defaultPaymentTerm,
  };
}

/** Free-form by decision (2026-08-08): the premium schema prices any positive
 * amount — that's the point of the agent surface — so this isn't a picklist.
 * State keeps digits only; the input displays them id-ID-grouped ("1.000.000").
 */
const DEFAULT_SUM_ASSURED = "1000000000"; // Rp 1 miliar

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function CalculatorForm({
  categories = BENEFIT_CATEGORIES,
}: {
  /** Overridable for tests (e.g. a category pointing at a ProductId the
   * installed engine doesn't export). */
  categories?: BenefitCategory[];
}) {
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const category = categories.find((c) => c.id === categoryId) ?? categories[0];
  const product = productFor(category);

  // Client fields are shared across tabs — the same person is being priced.
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Pria");
  const [smokingStatus, setSmokingStatus] = useState("Non Smoker");
  const [sumAssured, setSumAssured] = useState(DEFAULT_SUM_ASSURED);
  const [productFields, setProductFields] = useState<ProductFields | null>(
    product ? defaultFieldsFor(product) : null
  );

  const [result, setResult] = useState<PricedResult | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /** Every input edit after a priced result marks it stale — an agent must
   * never read an old premium against new inputs (Plan 05b decision). */
  function touch() {
    if (result) setStale(true);
    setError(null);
  }

  function selectCategory(next: BenefitCategory) {
    setCategoryId(next.id);
    const nextProduct = productFor(next);
    setProductFields(nextProduct ? defaultFieldsFor(nextProduct) : null);
    touch();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !productFields) return;
    setError(null);

    // State holds digits only, so this is a plain int (or undefined when
    // empty, which the schema reports as sumAssured.required).
    const sumAssuredNumber = sumAssured === "" ? undefined : Number(sumAssured);

    // Same schema the server applies (minus the rates) — an invalid input
    // renders inline without paying the Server Action round trip.
    const parsed = makePremiumInputSchema(product).safeParse({
      productType: product.id,
      planType: productFields.planType,
      dateOfBirth: parseLocalDob(dob),
      gender,
      smokingStatus,
      sumAssured: sumAssuredNumber,
      paymentTerm: productFields.paymentTerm,
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message;
      setError(VALIDATION_MESSAGES[key] ?? FALLBACK_VALIDATION_MESSAGE);
      return;
    }

    startTransition(async () => {
      try {
        // DOB travels as the "YYYY-MM-DD" string — the engine parses it as a
        // local date itself (parseLocalDate); serializing a Date here would
        // reintroduce the timezone shift it exists to avoid.
        const response = await requestPremium({
          productType: product.id,
          planType: productFields.planType,
          dateOfBirth: dob,
          gender,
          smokingStatus,
          sumAssured: sumAssuredNumber,
          paymentTerm: productFields.paymentTerm,
        });
        if (response.httpStatus === 200) {
          setResult(
            (response.body as { data: PricedResult }).data
          );
          setStale(false);
        } else {
          const code = (response.body as { code?: string }).code;
          setError(
            (code && SERVER_ERROR_MESSAGES[code]) ?? GENERIC_ERROR_MESSAGE
          );
        }
      } catch {
        setError(GENERIC_ERROR_MESSAGE);
      }
    });
  }

  const inputClass =
    "rounded-lg border border-ink-100 bg-white px-3 py-2 text-ink-900";
  const labelClass = "text-sm font-semibold text-ink-900";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6">
        <div
          role="tablist"
          aria-label="Kategori manfaat"
          className="grid gap-3 sm:grid-cols-3"
        >
          {categories.map((c) => {
            const selected = c.id === category.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectCategory(c)}
                className={`rounded-xl border p-4 text-left ${
                  selected
                    ? "border-brand-navy-700 bg-brand-navy-50"
                    : "border-ink-100 hover:border-brand-navy-200"
                }`}
              >
                <span className="block font-bold text-ink-900">{c.label}</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {c.benefit}
                </span>
              </button>
            );
          })}
        </div>

        <p className="flex items-center gap-2 text-sm text-ink-500">
          Produk:{" "}
          <span className="rounded-full border border-ink-100 px-3 py-0.5 text-xs font-semibold text-ink-900">
            {product?.displayName ?? category.productName}
          </span>
        </p>

        {!product || !productFields ? (
          <div className="rounded-xl border border-dashed border-ink-100 px-4 py-6 text-center">
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">
              Segera hadir
            </span>
            <p className="mt-3 text-sm text-ink-500">
              {category.productName} belum bisa dihitung di sini — tab ini
              aktif begitu produknya dirilis.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="dob" className={labelClass}>
                  Tanggal lahir klien
                </label>
                <input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    touch();
                  }}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className={labelClass}>Jenis kelamin</span>
                <Segmented
                  options={["Pria", "Wanita"]}
                  value={gender}
                  onChange={(v) => {
                    setGender(v);
                    touch();
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className={labelClass}>Status merokok</span>
                <Segmented
                  options={["Non Smoker", "Smoker"]}
                  value={smokingStatus}
                  onChange={(v) => {
                    setSmokingStatus(v);
                    touch();
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="sumAssured" className={labelClass}>
                  Santunan Asuransi
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2">
                  <span className="text-ink-500">Rp</span>
                  <input
                    id="sumAssured"
                    type="text"
                    inputMode="numeric"
                    value={groupDigits(sumAssured)}
                    onChange={(e) => {
                      setSumAssured(e.target.value.replace(/\D/g, ""));
                      touch();
                    }}
                    className="w-full text-ink-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="planType" className={labelClass}>
                  Plan
                </label>
                <select
                  id="planType"
                  value={productFields.planType}
                  onChange={(e) => {
                    setProductFields({
                      ...productFields,
                      planType: e.target.value,
                    });
                    touch();
                  }}
                  className={inputClass}
                >
                  {product.plans.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="paymentTerm" className={labelClass}>
                  Masa pembayaran
                </label>
                <select
                  id="paymentTerm"
                  value={productFields.paymentTerm}
                  onChange={(e) => {
                    setProductFields({
                      ...productFields,
                      paymentTerm: Number(e.target.value),
                    });
                    touch();
                  }}
                  className={inputClass}
                >
                  {product.paymentTermOptions.map((term: PaymentTerm) => (
                    <option key={term} value={term}>
                      {termLabel(term)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p aria-live="polite" className="text-sm font-medium text-brand-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-full bg-brand-navy-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy-800 disabled:opacity-60"
            >
              {pending ? "Menghitung…" : "Hitung Kontribusi"}
            </button>
          </form>
        )}
      </div>

      {result && (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <div className="h-1 bg-gradient-to-r from-brand-navy-700 via-brand-red-500 to-brand-yellow-400" />
          <div className="p-6">
            {stale && (
              <p className="mb-4 rounded-lg border border-brand-yellow-200 bg-brand-yellow-50 px-3 py-2 text-sm font-semibold text-brand-yellow-700">
                ⚠︎ Input berubah — tekan “Hitung Kontribusi” lagi untuk harga
                terbaru.
              </p>
            )}
            <div className={stale ? "opacity-40" : undefined}>
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
                <span className="rounded-full border border-brand-navy-200 bg-brand-navy-50 px-3 py-0.5 text-xs font-semibold text-brand-navy-700">
                  {result.productDisplayName}
                </span>
                <span>
                  {result.planType} · Santunan Asuransi{" "}
                  {rupiah.format(result.sumAssured)} ·{" "}
                  {termLabel(result.paymentTerm)} · usia asuransi{" "}
                  {result.insuranceAge} · {result.smokingStatus}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-10">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    Kontribusi tahunan
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-ink-900">
                    {rupiah.format(result.annualPremium)}
                  </p>
                  {result.discount > 0 && (
                    <p className="text-sm text-ink-300 line-through">
                      {rupiah.format(result.annualPremiumBeforeDiscount)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">
                    Kontribusi bulanan
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-ink-900">
                    {rupiah.format(result.monthlyPremium)}
                  </p>
                  {result.discount > 0 && (
                    <p className="text-sm text-ink-300 line-through">
                      {rupiah.format(result.monthlyPremiumBeforeDiscount)}
                    </p>
                  )}
                </div>
              </div>
              {result.discount > 0 && (
                <p className="mt-3 inline-block rounded-full bg-brand-yellow-100 px-3 py-0.5 text-xs font-semibold text-brand-yellow-700">
                  Diskon {Math.round(result.discount * 100)}% diterapkan
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-ink-100">
      {options.map((option) => {
        const on = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option)}
            className={`flex-1 px-3 py-2 text-sm ${
              on
                ? "bg-brand-navy-700 font-semibold text-white"
                : "bg-white text-ink-500 hover:text-ink-900"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
