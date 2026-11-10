import { useI18n } from "@/app/I18nContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LIMITS = ["wind", "drafting", "position", "speed"] as const;

/** A short introduction: the watts are an estimate, what limits it and where the data goes. */
export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("help.onboarding.title")}</DialogTitle>
          <DialogDescription>{t("help.onboarding.description")}</DialogDescription>
        </DialogHeader>

        <section className="grid gap-1">
          <h3 className="font-medium">{t("help.onboarding.estimate.title")}</h3>
          <p>{t("help.onboarding.estimate.body")}</p>
        </section>

        <section className="grid gap-1">
          <h3 className="font-medium">{t("help.onboarding.limits.title")}</h3>
          <ul className="list-disc space-y-1 pl-5">
            {LIMITS.map((limit) => (
              <li key={limit}>{t(`help.onboarding.limits.${limit}`)}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">{t("help.onboarding.limits.note")}</p>
        </section>

        <section className="grid gap-1">
          <h3 className="font-medium">{t("help.onboarding.privacy.title")}</h3>
          <p>{t("help.onboarding.privacy.body")}</p>
        </section>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("help.onboarding.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
