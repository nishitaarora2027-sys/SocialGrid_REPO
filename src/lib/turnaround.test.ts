import { describe, expect, it } from "vitest";
import { addWorkingHours, urgencyLevel } from "./turnaround";

const wh = {
  work_start: "09:00",
  work_end: "21:00",
  work_days: [1, 2, 3, 4, 5, 6, 7],
  timezone: "Asia/Kolkata",
};

// IST is UTC+5:30, so 10:00 IST = 04:30 UTC
const ist = (iso: string) => new Date(`${iso}+05:30`);

describe("addWorkingHours", () => {
  it("adds hours within the same working day", () => {
    expect(addWorkingHours(ist("2026-10-14T10:00:00"), 6, wh)).toEqual(ist("2026-10-14T16:00:00"));
  });

  it("rolls over to the next working morning", () => {
    expect(addWorkingHours(ist("2026-10-14T19:00:00"), 6, wh)).toEqual(ist("2026-10-15T13:00:00"));
  });

  it("starts counting at opening time when requested at night", () => {
    expect(addWorkingHours(ist("2026-10-14T23:30:00"), 2, wh)).toEqual(ist("2026-10-15T11:00:00"));
    expect(addWorkingHours(ist("2026-10-15T06:00:00"), 2, wh)).toEqual(ist("2026-10-15T11:00:00"));
  });

  it("skips non-working days", () => {
    const weekdays = { ...wh, work_days: [1, 2, 3, 4, 5, 6] }; // Sunday off
    // 2026-10-17 is a Saturday
    expect(addWorkingHours(ist("2026-10-17T20:00:00"), 3, weekdays)).toEqual(
      ist("2026-10-19T11:00:00"),
    );
  });

  it("handles fractional hours", () => {
    expect(addWorkingHours(ist("2026-10-14T10:00:00"), 1.5, wh)).toEqual(ist("2026-10-14T11:30:00"));
  });
});

describe("urgencyLevel", () => {
  const now = new Date("2026-10-14T10:00:00Z");
  it("classifies due times", () => {
    expect(urgencyLevel("2026-10-14T09:00:00Z", now)).toBe("overdue");
    expect(urgencyLevel("2026-10-14T10:30:00Z", now)).toBe("soon");
    expect(urgencyLevel("2026-10-14T14:00:00Z", now)).toBe("on_time");
  });
});
