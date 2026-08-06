/**
 * Normalizes a WhatsApp number the way wa.me expects it: country code, no
 * leading zero or plus, digits only. `contact` on a prospect Lead is
 * whatever the person typed on the DISC form (spaces, dashes, a leading 0
 * or +62 — all seen in practice), so this can't assume a shape.
 */
export function waNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return `62${digits}`;
}

export function waLink(raw: string): string {
  return `https://wa.me/${waNumber(raw)}`;
}
