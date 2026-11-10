import { Encoder, type SessionMesg } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { MESG_SESSION, deviceSessionTotals } from "@/domain/metrics/session";
import { readFit } from "@/fit/readFit";

describe("deviceSessionTotals", () => {
  it("reads calories and ascent from the session message of a decoded file", () => {
    const session: SessionMesg = {
      timestamp: new Date("2024-02-25T14:00:00Z"),
      totalCalories: 640,
      totalAscent: 312,
      totalDescent: 305,
    };
    const encoder = new Encoder();
    encoder.onMesg(MESG_SESSION, session);
    const fit = readFit(encoder.close());

    expect(deviceSessionTotals(fit)).toEqual({ calories: 640, ascentM: 312, descentM: 305 });
  });

  it("adds up the sessions of a multisport file", () => {
    const fit = {
      messages: [
        { mesgNum: MESG_SESSION, fields: { totalCalories: 100, totalAscent: 10 } },
        { mesgNum: MESG_SESSION, fields: { totalCalories: 50, totalAscent: 5 } },
      ],
    };

    expect(deviceSessionTotals(fit)).toEqual({ calories: 150, ascentM: 15 });
  });

  it("leaves out what the device did not write", () => {
    expect(deviceSessionTotals({ messages: [] })).toEqual({});
    expect(
      deviceSessionTotals({
        messages: [{ mesgNum: MESG_SESSION, fields: { totalCalories: "x" } }],
      }),
    ).toEqual({});
  });
});
