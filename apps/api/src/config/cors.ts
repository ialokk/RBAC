// CORS_ORIGIN supports a comma-separated list (e.g. web app + a staging domain) without changing
// its env schema type — still a plain string in .env, split here at the one place it's consumed.
export function parseCorsOrigins(value: string): string | string[] {
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  return origins.length > 1 ? origins : (origins[0] ?? value);
}
