import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DRAFTING_PRESETS, matchPreset, type DraftingPresetId } from "@/domain/model/presets";
import { NumberField } from "@/features/model/NumberField";
import { PresetGroup, type PresetOption } from "@/features/model/PresetGroup";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Idea 32: drafting, as a multiplier on the drag. */
export function DraftingCard() {
  const { t } = useI18n();
  const { model } = useModelInputs();
  const { setModel } = useAppActions();

  const options: PresetOption<DraftingPresetId>[] = DRAFTING_PRESETS.map((p) => ({
    id: p.id,
    label: t(`model.draft.${p.id}`),
    detail: `× ${trimNumber(p.value, 2)}`,
  }));
  const reduction = Math.round((1 - model.draftingFactor) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.draft.title")}</CardTitle>
        <CardDescription>{t("model.draft.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <PresetGroup
          name="drafting"
          legend={t("model.draft.legend")}
          options={options}
          value={matchPreset(DRAFTING_PRESETS, model.draftingFactor)}
          onSelect={(id) => {
            const preset = DRAFTING_PRESETS.find((p) => p.id === id);
            if (preset) setModel({ draftingFactor: preset.value });
          }}
        />
        <NumberField
          id="model-drafting"
          label={t("model.draft.factor")}
          value={model.draftingFactor}
          min={0.3}
          max={1}
          decimals={2}
          hint={
            reduction > 0
              ? t("model.draft.reduction", { percent: reduction })
              : t("model.draft.none")
          }
          onCommit={(draftingFactor) => setModel({ draftingFactor })}
        />
        <p className="text-muted-foreground text-xs">{t("model.draft.wholeRide")}</p>
      </CardContent>
    </Card>
  );
}
