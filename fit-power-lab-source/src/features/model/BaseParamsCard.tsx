import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  POSTURE_PRESETS,
  SURFACE_PRESETS,
  matchPreset,
  type PosturePresetId,
  type SurfacePresetId,
} from "@/domain/model/presets";
import { NumberField } from "@/features/model/NumberField";
import { PresetGroup, type PresetOption } from "@/features/model/PresetGroup";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Ideas 21 to 23: drag area, rolling resistance and efficiency, with posture and surface presets. */
export function BaseParamsCard() {
  const { t } = useI18n();
  const { model } = useModelInputs();
  const { setModel } = useAppActions();

  const posture: PresetOption<PosturePresetId>[] = POSTURE_PRESETS.map((p) => ({
    id: p.id,
    label: t(`model.posture.${p.id}`),
    detail: `${trimNumber(p.value, 2)} m²`,
  }));
  const surface: PresetOption<SurfacePresetId>[] = SURFACE_PRESETS.map((p) => ({
    id: p.id,
    label: t(`model.surface.${p.id}`),
    detail: `Crr ${trimNumber(p.value, 3)}`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.base.title")}</CardTitle>
        <CardDescription>{t("model.base.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <PresetGroup
          name="posture"
          legend={t("model.posture.legend")}
          options={posture}
          value={matchPreset(POSTURE_PRESETS, model.cdA)}
          onSelect={(id) => {
            const preset = POSTURE_PRESETS.find((p) => p.id === id);
            if (preset) setModel({ cdA: preset.value });
          }}
        />
        <PresetGroup
          name="surface"
          legend={t("model.surface.legend")}
          options={surface}
          value={matchPreset(SURFACE_PRESETS, model.crr)}
          onSelect={(id) => {
            const preset = SURFACE_PRESETS.find((p) => p.id === id);
            if (preset) setModel({ crr: preset.value });
          }}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id="model-cda"
            label={t("model.cdA")}
            value={model.cdA}
            min={0.05}
            max={1.5}
            decimals={3}
            onCommit={(cdA) => setModel({ cdA })}
          />
          <NumberField
            id="model-crr"
            label={t("model.crr")}
            value={model.crr}
            min={0}
            max={0.05}
            decimals={4}
            onCommit={(crr) => setModel({ crr })}
          />
          <NumberField
            id="model-efficiency"
            label={t("model.efficiency")}
            value={model.drivetrainEfficiency * 100}
            min={50}
            max={100}
            decimals={1}
            onCommit={(percent) => setModel({ drivetrainEfficiency: percent / 100 })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
