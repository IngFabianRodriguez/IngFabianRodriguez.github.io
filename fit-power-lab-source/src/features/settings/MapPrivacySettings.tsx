import { useId, useState } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import type { MapPrivacy } from "@/app/appState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionGroup } from "@/features/settings/OptionGroup";
import { tileConfig } from "@/lib/tiles";

const MAX_HIDDEN_M = 5000;

/** A whole number of meters from 0 to 5000, or null. */
function parseHidden(text: string): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const meters = Number(text);
  return meters <= MAX_HIDDEN_M ? meters : null;
}

/** Where the map gets its background and how much of the route ends it leaves out. */
export function MapPrivacySettings() {
  const { t } = useI18n();
  const { mapPrivacy } = useAppState();
  const { setMapPrivacy } = useAppActions();
  const id = useId();
  // What the user is typing in the meters field; null shows the saved value.
  const [hiddenDraft, setHiddenDraft] = useState<string | null>(null);

  const urlUsable = tileConfig({ ...mapPrivacy, mode: "custom" }).url !== null;
  const hiddenText = hiddenDraft ?? String(mapPrivacy.hideEndsM);
  const hiddenValid = parseHidden(hiddenText) !== null;

  function changeHidden(text: string) {
    setHiddenDraft(text);
    const meters = parseHidden(text);
    if (meters !== null) setMapPrivacy({ hideEndsM: meters });
  }

  return (
    <div className="grid gap-4">
      <p id={`${id}-explain`} className="text-muted-foreground text-sm">
        {t("settings.map.explain")}
      </p>

      <OptionGroup<MapPrivacy["mode"]>
        labelledBy={`${id}-mode`}
        describedBy={`${id}-explain`}
        value={mapPrivacy.mode}
        onChange={(mode) => setMapPrivacy({ mode })}
        options={[
          { value: "osm", label: t("settings.map.osm") },
          { value: "custom", label: t("settings.map.custom") },
          { value: "none", label: t("settings.map.none") },
        ]}
      />
      <span id={`${id}-mode`} className="sr-only">
        {t("settings.map.mode")}
      </span>

      {mapPrivacy.mode === "custom" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-url`}>{t("settings.map.url")}</Label>
          <Input
            id={`${id}-url`}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={mapPrivacy.customUrl}
            onChange={(event) => setMapPrivacy({ customUrl: event.target.value })}
            aria-invalid={!urlUsable}
            aria-describedby={`${id}-url-hint${urlUsable ? "" : ` ${id}-url-error`}`}
          />
          <p id={`${id}-url-hint`} className="text-muted-foreground text-sm">
            {t("settings.map.url.hint")}
          </p>
          {urlUsable ? null : (
            <p id={`${id}-url-error`} role="alert" className="text-destructive text-sm">
              {t("settings.map.url.invalid")}
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor={`${id}-hide`}>{t("settings.map.hide")}</Label>
        <Input
          id={`${id}-hide`}
          inputMode="numeric"
          autoComplete="off"
          className="max-w-32"
          value={hiddenText}
          onChange={(event) => changeHidden(event.target.value)}
          onBlur={() => setHiddenDraft(null)}
          aria-invalid={!hiddenValid}
          aria-describedby={`${id}-hide-hint${hiddenValid ? "" : ` ${id}-hide-error`}`}
        />
        <p id={`${id}-hide-hint`} className="text-muted-foreground text-sm">
          {t("settings.map.hide.hint")}
        </p>
        {hiddenValid ? null : (
          <p id={`${id}-hide-error`} className="text-destructive text-sm">
            {t("settings.map.hide.invalid")}
          </p>
        )}
      </div>
    </div>
  );
}
