import { useMemo } from "react";
import { useI18n } from "@/app/I18nContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compareMeasured } from "@/domain/model/measured";
import { estimatePower } from "@/domain/power";
import { NeedsRide } from "@/features/model/NeedsRide";
import { trimNumber } from "@/features/model/format";
import { useModelInputs } from "@/features/model/useModelInputs";

/** Idea 34: the estimate against the power a meter wrote in the file, with the error figures. */
export function MeasuredCard() {
  const { t } = useI18n();
  const { ride, params } = useModelInputs();

  const comparison = useMemo(
    () => (ride && params ? compareMeasured(ride, estimatePower(ride, params)) : null),
    [ride, params],
  );

  const rows: [string, string][] = comparison
    ? [
        [t("model.measured.samples"), String(comparison.samples)],
        [t("model.measured.meanMeasured"), `${trimNumber(comparison.meanMeasuredW, 1)} W`],
        [t("model.measured.meanEstimated"), `${trimNumber(comparison.meanEstimatedW, 1)} W`],
        [
          t("model.measured.bias"),
          comparison.biasPct === null
            ? `${trimNumber(comparison.biasW, 1)} W`
            : `${trimNumber(comparison.biasW, 1)} W (${trimNumber(comparison.biasPct, 1)}%)`,
        ],
        [t("model.measured.mae"), `${trimNumber(comparison.maeW, 1)} W`],
        [t("model.measured.rmse"), `${trimNumber(comparison.rmseW, 1)} W`],
        [
          t("model.measured.correlation"),
          comparison.correlation === null ? "–" : trimNumber(comparison.correlation, 3),
        ],
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("model.measured.title")}</CardTitle>
        <CardDescription>{t("model.measured.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!ride || !params ? (
          <NeedsRide />
        ) : !comparison ? (
          <p className="text-muted-foreground text-sm">{t("model.measured.none")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("model.measured.figure")}</TableHead>
                <TableHead>{t("model.measured.value")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([name, value]) => (
                <TableRow key={name}>
                  <TableHead scope="row">{name}</TableHead>
                  <TableCell>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
