import { exportColumns } from "@/domain/exporters/columns";
import type { Ride } from "@/domain/ride";

const max = (values: number[]) => values.reduce((a, b) => Math.max(a, b), -Infinity);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/**
 * A TCX (Training Center Database v2) activity with one lap over the whole ride. Watts and speed
 * go in each trackpoint's `TPX` element of Garmin's ActivityExtension v2, and the average and
 * maximum watts in the lap's `LX`. Calories are written as 0 because the file has none.
 */
export function toTcx(ride: Ride, watts: number[]): string {
  const c = exportColumns(ride, watts);
  const start = ride.startTime.toISOString();
  const last = ride.samples.length - 1;

  const trackpoints = ride.samples.map((_, i) => {
    const lat = c.latitudeDeg[i];
    const lon = c.longitudeDeg[i];
    const hr = c.heartRateBpm[i];
    const cad = c.cadenceRpm[i];
    return [
      `        <Trackpoint>`,
      `          <Time>${c.time[i]}</Time>`,
      lat == null || lon == null
        ? ""
        : `          <Position><LatitudeDegrees>${lat}</LatitudeDegrees><LongitudeDegrees>${lon}</LongitudeDegrees></Position>`,
      `          <AltitudeMeters>${c.altitudeM[i]}</AltitudeMeters>`,
      `          <DistanceMeters>${c.distanceM[i]}</DistanceMeters>`,
      hr == null ? "" : `          <HeartRateBpm><Value>${hr}</Value></HeartRateBpm>`,
      cad == null ? "" : `          <Cadence>${cad}</Cadence>`,
      `          <Extensions><ns3:TPX><ns3:Speed>${c.speedMs[i]}</ns3:Speed><ns3:Watts>${c.powerW[i]}</ns3:Watts></ns3:TPX></Extensions>`,
      `        </Trackpoint>`,
    ]
      .filter((line) => line !== "")
      .join("\n");
  });

  const heartRates = c.heartRateBpm.filter((v): v is number => v !== null);
  const heartRateLines =
    heartRates.length === 0
      ? []
      : [
          `      <AverageHeartRateBpm><Value>${Math.round(mean(heartRates))}</Value></AverageHeartRateBpm>`,
          `      <MaximumHeartRateBpm><Value>${max(heartRates)}</Value></MaximumHeartRateBpm>`,
        ];
  const distance = (c.distanceM[last] ?? 0) - (c.distanceM[0] ?? 0);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"` +
      ` xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">`,
    `  <Activities>`,
    `    <Activity Sport="Biking">`,
    `      <Id>${start}</Id>`,
    `      <Lap StartTime="${start}">`,
    `      <TotalTimeSeconds>${c.elapsedS[last] ?? 0}</TotalTimeSeconds>`,
    `      <DistanceMeters>${Math.round(distance * 100) / 100}</DistanceMeters>`,
    `      <MaximumSpeed>${max(c.speedMs)}</MaximumSpeed>`,
    `      <Calories>0</Calories>`,
    ...heartRateLines,
    `      <Intensity>Active</Intensity>`,
    `      <TriggerMethod>Manual</TriggerMethod>`,
    `      <Track>`,
    ...trackpoints,
    `      </Track>`,
    `      <Extensions><ns3:LX><ns3:AvgWatts>${Math.round(mean(c.powerW))}</ns3:AvgWatts><ns3:MaxWatts>${max(c.powerW)}</ns3:MaxWatts></ns3:LX></Extensions>`,
    `      </Lap>`,
    `    </Activity>`,
    `  </Activities>`,
    `</TrainingCenterDatabase>`,
    ``,
  ].join("\n");
}
