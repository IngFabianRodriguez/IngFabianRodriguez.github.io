export type Locale = "en" | "es";
export const LOCALES: Locale[] = ["en", "es"];

export type Dictionary = Record<string, string>;

/** Every area of the app owns one `Messages` object; they are merged in `src/app/messages.ts`. */
export interface Messages {
  en: Dictionary;
  es: Dictionary;
}

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function mergeMessages(...parts: Messages[]): Messages {
  return {
    en: Object.assign({}, ...parts.map((p) => p.en)) as Dictionary,
    es: Object.assign({}, ...parts.map((p) => p.es)) as Dictionary,
  };
}

/** Looks a key up in the chosen language, then in English, then returns the key itself. */
export function createTranslator(messages: Messages, locale: Locale): Translator {
  return (key, vars) => {
    const template = messages[locale][key] ?? messages.en[key] ?? key;
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = vars[name];
      return value === undefined ? whole : String(value);
    });
  };
}
