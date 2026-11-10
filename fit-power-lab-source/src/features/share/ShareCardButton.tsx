import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/app/AppContext";
import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import type { Analysis } from "@/domain/analysis";
import { canvasToBytes, safeFileName } from "@/features/share/imageExport";
import { loadTileImage } from "@/features/share/mapScene";
import {
  buildCardModel,
  buildCardScene,
  CARD_HEIGHT,
  CARD_WIDTH,
  drawSummaryCard,
} from "@/features/share/summaryCard";
import { downloadFile } from "@/lib/download";
import { tileConfig } from "@/lib/tiles";

interface ShareCardButtonProps {
  analysis: Pick<Analysis, "ride" | "watts">;
  fileName: string;
}

/**
 * Draws a summary card of the ride (title, date, distance, time, average power and the route on its
 * map) on a canvas and downloads it as a PNG, ready to share. Nothing is uploaded; the only request
 * is for the map tiles, from the server chosen in the map privacy settings, and none is made when
 * the map has no background. The meters hidden by those settings are not drawn and do not choose the
 * area asked for, but the tiles that cover what is shown can still include the start.
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
      const map = await buildCardScene(analysis, {
        hideEndsM,
        tiles: tileConfig(mapPrivacy),
        loadTile: loadTileImage,
      });
      drawSummaryCard(ctx, model, map);
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
