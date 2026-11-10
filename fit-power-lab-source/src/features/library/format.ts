import type { Locale } from "@/app/i18n";

/** Date and time of a moment, in the app's language. */
export function formatDateTime(ms: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(ms),
  );
}
