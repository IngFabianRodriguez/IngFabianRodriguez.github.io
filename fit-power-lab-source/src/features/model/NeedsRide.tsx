import { useI18n } from "@/app/I18nContext";

/** Shown inside a card that needs a ride and confirmed weights to compute anything. */
export function NeedsRide() {
  const { t } = useI18n();
  return <p className="text-muted-foreground text-sm">{t("model.needsRide")}</p>;
}
