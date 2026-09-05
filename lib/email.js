/**
 * Canonicalize an email at the application boundary.
 * Better Auth lower-cases emails internally, but trimming here keeps the
 * browser and server request paths identical (and avoids whitespace-only
 * differences between sign-up and sign-in).
 */
export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}
