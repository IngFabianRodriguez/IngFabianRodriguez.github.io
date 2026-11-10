import { useId, useState, type ReactNode } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { DEFAULT_MAP_PRIVACY, initialAppState, type Theme } from "@/app/appState";
import { LOCALES, type Locale } from "@/app/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { describeShortcut, SHORTCUT_DOCS } from "@/features/help/shortcuts";
import { useOnboarding } from "@/features/help/useOnboarding";
import { MapPrivacySettings } from "@/features/settings/MapPrivacySettings";
import { OptionGroup } from "@/features/settings/OptionGroup";
import type { UnitSystem } from "@/lib/units";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <h2 id={id} className="leading-snug font-medium">
          {title}
        </h2>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const THEMES: Theme[] = ["light", "dark", "system"];
const UNIT_SYSTEMS: UnitSystem[] = ["metric", "imperial"];

/** Language, units, theme, map privacy, help, shortcuts and reset. Changes apply at once. */
export function SettingsPanel() {
  const { t } = useI18n();
  const { locale, units, theme } = useAppState();
  const { setLocale, setUnits, setTheme, setMapPrivacy } = useAppActions();
  const onboarding = useOnboarding();
  const id = useId();
  const [restored, setRestored] = useState(false);

  function resetPreferences() {
    const defaults = initialAppState();
    setLocale(defaults.locale);
    setUnits(defaults.units);
    setTheme(defaults.theme);
    setMapPrivacy(DEFAULT_MAP_PRIVACY);
    setRestored(true);
  }

  return (
    <div className="grid gap-6">
      <Section
        id={`${id}-language`}
        title={t("settings.language.title")}
        description={t("settings.language.description")}
      >
        <OptionGroup<Locale>
          labelledBy={`${id}-language`}
          value={locale}
          onChange={setLocale}
          options={LOCALES.map((value) => ({ value, label: t(`settings.language.${value}`) }))}
        />
      </Section>

      <Section
        id={`${id}-units`}
        title={t("settings.units.title")}
        description={t("settings.units.description")}
      >
        <OptionGroup<UnitSystem>
          labelledBy={`${id}-units`}
          value={units}
          onChange={setUnits}
          options={UNIT_SYSTEMS.map((value) => ({ value, label: t(`settings.units.${value}`) }))}
        />
      </Section>

      <Section
        id={`${id}-theme`}
        title={t("settings.theme.title")}
        description={t("settings.theme.description")}
      >
        <OptionGroup<Theme>
          labelledBy={`${id}-theme`}
          value={theme}
          onChange={setTheme}
          options={THEMES.map((value) => ({ value, label: t(`settings.theme.${value}`) }))}
        />
      </Section>

      <Section id={`${id}-map`} title={t("settings.map.title")}>
        <MapPrivacySettings />
      </Section>

      <Section
        id={`${id}-help`}
        title={t("settings.help.title")}
        description={t("settings.help.description")}
      >
        <Button variant="outline" onClick={onboarding.show}>
          {t("settings.help.onboarding")}
        </Button>
      </Section>

      <Section
        id={`${id}-shortcuts`}
        title={t("settings.shortcuts.title")}
        description={t("settings.shortcuts.description")}
      >
        <ul className="grid gap-2">
          {SHORTCUT_DOCS.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3">
              <kbd className="bg-muted min-w-8 rounded border px-2 py-0.5 text-center font-mono text-xs">
                {doc.key}
              </kbd>
              <span>{describeShortcut(doc, t)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id={`${id}-reset`}
        title={t("settings.reset.title")}
        description={t("settings.reset.description")}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={resetPreferences}>
            {t("settings.reset.button")}
          </Button>
          {/* Present from the start so that screen readers announce the change. */}
          <p role="status" className="text-sm">
            {restored ? t("settings.reset.done") : null}
          </p>
        </div>
      </Section>
    </div>
  );
}
