import { describe, expect, it } from "vitest";
import { formatDue, formatINR, formatTime, formatLongDate, weekStartIST, dayPart } from "./format";

const ist = (s: string) => new Date(`${s}+05:30`);

describe("format", () => {
  it("formats times in IST for both languages", () => {
    expect(formatTime(ist("2026-10-14T18:00:00"), "en")).toBe("6:00 PM");
    expect(formatTime(ist("2026-10-14T18:00:00"), "hi")).toBe("शाम 6:00 बजे");
    expect(formatTime(ist("2026-10-14T09:05:00"), "hi")).toBe("सुबह 9:05 बजे");
    expect(formatTime(ist("2026-10-14T00:30:00"), "en")).toBe("12:30 AM");
  });

  it("formats due times relative to today", () => {
    const now = ist("2026-10-14T10:00:00");
    expect(formatDue(ist("2026-10-14T16:00:00").toISOString(), "en", now)).toBe("4:00 PM today");
    expect(formatDue(ist("2026-10-15T11:00:00").toISOString(), "hi", now)).toBe("कल सुबह 11:00 बजे तक");
    expect(formatDue(ist("2026-10-17T11:00:00").toISOString(), "en", now)).toBe("Sat 17 Oct, 11:00 AM");
  });

  it("formats long dates without Intl", () => {
    expect(formatLongDate(ist("2026-10-14T10:00:00"), "hi")).toBe("बुधवार, 14 अक्टूबर");
    expect(formatLongDate(ist("2026-10-14T10:00:00"), "en")).toBe("Wednesday, 14 October");
  });

  it("uses Indian digit grouping", () => {
    expect(formatINR(15000)).toBe("15,000");
    expect(formatINR(1500000)).toBe("15,00,000");
    expect(formatINR(220)).toBe("220");
    expect(formatINR(99.5)).toBe("99.50");
  });

  it("finds Monday of the IST week", () => {
    expect(weekStartIST(ist("2026-10-14T10:00:00"))).toBe("2026-10-12");
    // Sunday 23:30 IST still belongs to the week starting the previous Monday
    expect(weekStartIST(ist("2026-10-18T23:30:00"))).toBe("2026-10-12");
  });

  it("picks the greeting by IST hour", () => {
    expect(dayPart(ist("2026-10-14T08:00:00"))).toBe("morning");
    expect(dayPart(ist("2026-10-14T13:00:00"))).toBe("afternoon");
    expect(dayPart(ist("2026-10-14T19:00:00"))).toBe("evening");
  });
});
