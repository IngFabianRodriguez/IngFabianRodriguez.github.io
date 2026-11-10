import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/domain/analysis";
import { canvasToBytes, safeFileName } from "@/features/share/imageExport";
import {
  buildCardModel,
  cardRoute,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawSummaryCard,
} from "@/features/share/summaryCard";
import { downloadFile } from "@/lib/download";

interface ShareCardButtonProps {
  analysis: Pick<Analysis, "ride" | "watts">;
  fileName: string;
}

/**
 * Draws a summary card of the ride (title, date, distance, time, average power and a small map of
 * the route) on a canvas and downloads it as a PNG, ready to share. Nothing is uploaded. The
 * meters hidden by the map privacy settings are left out of the route.
 */
export function ShareCardButton({ analysis, fileName }: ShareCardButtonProps) {
  const { t, locale } = useI18n();
  const { units, mapPrivacy } = useAppState();
  const [failed, setFailed] = useState(false);

  async function download() {
    setFailed(false);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("The browser has no 2D canvas.");

      const hideEndsM = mapPrivacy.hideEndsM;
      const model = buildCardModel(analysis, fileName, { units, locale, t, hideEndsM });
      drawSummaryCard(ctx, model, cardRoute(analysis, hideEndsM));
      downloadFile(await canvasToBytes(canvas), `${safeFileName(model.title)}-card.png`);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => void download()}>
        <ImageIcon aria-hidden="true" />
        {t("share.card.button")}
      </Button>
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {t("share.card.failed")}
        </p>
      ) : null}
    </div>
  );
}
