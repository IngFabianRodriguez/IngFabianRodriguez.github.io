import { useState } from "react";
import { useAppActions } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import { buildSampleRide } from "@/lib/sampleRide";

interface LoadSampleButtonProps {
  /** Called with the id of the new ride, for example to switch to the overview. */
  onLoaded?: (id: string) => void;
}

/** Adds the synthetic sample ride, so the app can be tried without a file of one's own. */
export function LoadSampleButton({ onLoaded }: LoadSampleButtonProps) {
  const { t } = useI18n();
  const { addRide } = useAppActions();
  const [loaded, setLoaded] = useState(false);

  function load() {
    const id = addRide(buildSampleRide());
    setLoaded(true);
    onLoaded?.(id);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={load}>
        {t("help.sample.button")}
      </Button>
      <p className="text-muted-foreground text-sm">{t("help.sample.hint")}</p>
      {/* The live region exists from the start so that screen readers announce the change. */}
      <p role="status" className="text-sm">
        {loaded ? t("help.sample.done") : null}
      </p>
    </div>
  );
}
