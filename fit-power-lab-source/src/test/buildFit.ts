import { Encoder, type FileIdMesg } from "@garmin/fitsdk";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";

export interface RecordInput {
  timestamp: Date;
  distance?: number;
  altitude?: number;
  speed?: number;
  cadence?: number;
  temperature?: number;
  heartRate?: number;
  power?: number;
  lat?: number;
  lon?: number;
}

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

/** Builds a small synthetic activity file; tests never need real ride data. */
export function buildFit(records: RecordInput[]): Uint8Array {
  const encoder = new Encoder();
  const first = records[0]?.timestamp ?? new Date("2024-01-01T00:00:00Z");

  const fileId: FileIdMesg = {
    type: "activity",
    manufacturer: "igpsport",
    product: 51,
    serialNumber: 1234,
    timeCreated: first,
  };
  encoder.onMesg(MESG_FILE_ID, fileId);

  for (const r of records) {
    const mesg: Record<string, unknown> = { timestamp: r.timestamp };
    if (r.distance !== undefined) mesg["distance"] = r.distance;
    if (r.altitude !== undefined) mesg["altitude"] = r.altitude;
    if (r.speed !== undefined) mesg["speed"] = r.speed;
    if (r.cadence !== undefined) mesg["cadence"] = r.cadence;
    if (r.temperature !== undefined) mesg["temperature"] = r.temperature;
    if (r.heartRate !== undefined) mesg["heartRate"] = r.heartRate;
    if (r.power !== undefined) mesg["power"] = r.power;
    if (r.lat !== undefined) mesg["positionLat"] = Math.round(r.lat * SEMICIRCLES_PER_DEGREE);
    if (r.lon !== undefined) mesg["positionLong"] = Math.round(r.lon * SEMICIRCLES_PER_DEGREE);
    encoder.onMesg(MESG_RECORD, mesg);
  }

  return encoder.close();
}
