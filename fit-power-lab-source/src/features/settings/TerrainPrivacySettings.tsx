import { useId } from "react";
import { useAppActions, useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import type { TerrainPrivacy } from "@/app/appState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionGroup } from "@/features/settings/OptionGroup";
import { terrainConfig } from "@/lib/tiles";

/** Where the relief of the 3D video comes from: a public server, the user's own, or no relief. */
export function TerrainPrivacySettings() {
  const { t } = useI18n();
  const { terrainPrivacy } = useAppState();
  const { setTerrainPrivacy } = useAppActions();
  const id = useId();

  const urlUsable = terrainConfig({ ...terrainPrivacy, mode: "custom" }).url !== null;

  return (
    <div className="grid gap-4">
      <p id={`${id}-title`} className="text-sm font-medium">
        {t("settings.terrain.title")}
      </p>
      <p id={`${id}-explain`} className="text-muted-foreground text-sm">
        {t("settings.terrain.explain")}
      </p>

      <OptionGroup<TerrainPrivacy["mode"]>
        labelledBy={`${id}-title`}
        describedBy={`${id}-explain`}
        value={terrainPrivacy.mode}
        onChange={(mode) => setTerrainPrivacy({ mode })}
        options={[
          { value: "public", label: t("settings.terrain.public") },
          { value: "custom", label: t("settings.terrain.custom") },
          { value: "none", label: t("settings.terrain.none") },
        ]}
      />

      {terrainPrivacy.mode === "custom" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-url`}>{t("settings.terrain.url")}</Label>
          <Input
            id={`${id}-url`}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={terrainPrivacy.customUrl}
            onChange={(event) => setTerrainPrivacy({ customUrl: event.target.value })}
            aria-invalid={!urlUsable}
            aria-describedby={`${id}-url-hint${urlUsable ? "" : ` ${id}-url-error`}`}
          />
          <p id={`${id}-url-hint`} className="text-muted-foreground text-sm">
            {t("settings.terrain.url.hint")}
          </p>
          {urlUsable ? null : (
            <p id={`${id}-url-error`} role="alert" className="text-destructive text-sm">
              {t("settings.terrain.url.invalid")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
