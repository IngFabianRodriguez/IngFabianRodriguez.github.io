import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { AirCard } from "@/features/model/AirCard";
import { BaseParamsCard } from "@/features/model/BaseParamsCard";
import { CalibrationCard } from "@/features/model/CalibrationCard";
import { CoastDownCard } from "@/features/model/CoastDownCard";
import { DraftingCard } from "@/features/model/DraftingCard";
import { EstimateSummary } from "@/features/model/EstimateSummary";
import { HeartRateCard } from "@/features/model/HeartRateCard";
import { LearnedCard } from "@/features/model/LearnedCard";
import { MeasuredCard } from "@/features/model/MeasuredCard";
import { SpeedSignalCard } from "@/features/model/SpeedSignalCard";
import { UncertaintyCard } from "@/features/model/UncertaintyCard";
import { WindCard } from "@/features/model/WindCard";

/** The Model section: every setting of the power model, with the live estimate it produces. */
export function ModelPanel() {
  const { t } = useI18n();
  const { resetModel } = useAppActions();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("model.title")}</h2>
        <Button type="button" variant="outline" onClick={resetModel}>
          {t("model.reset")}
        </Button>
      </div>
      <EstimateSummary />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <BaseParamsCard />
        <WindCard />
        <SpeedSignalCard />
        <AirCard />
        <DraftingCard />
        <CalibrationCard />
        <CoastDownCard />
        <UncertaintyCard />
        <HeartRateCard />
        <MeasuredCard />
        <LearnedCard />
      </div>
    </div>
  );
}
