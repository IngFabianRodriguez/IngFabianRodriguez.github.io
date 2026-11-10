import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator, type Locale, type Translator } from "@/app/i18n";
import { MESSAGES } from "@/app/messages";

interface I18n {
  locale: Locale;
  t: Translator;
}

/** Without a provider (a component rendered alone in a test) the app speaks English. */
const I18nContext = createContext<I18n>({ locale: "en", t: createTranslator(MESSAGES, "en") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: createTranslator(MESSAGES, locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}
