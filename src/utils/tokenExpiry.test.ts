import { describe, expect, it } from "vitest";
import { isExpired, isExpiringSoon, parseDate, toValidDateIso } from "./tokenExpiry";

describe("tokenExpiry", () => {
  const now = new Date("2026-08-17T00:00:00.000Z");

  it("parses valid date-like values", () => {
    expect(parseDate("2026-08-17T00:00:00.000Z")?.toISOString()).toBe("2026-08-17T00:00:00.000Z");
    expect(parseDate("invalid-date")).toBeNull();
  });

  it("treats missing or invalid expiration as expired", () => {
    expect(isExpired(null, now)).toBe(true);
    expect(isExpired("invalid", now)).toBe(true);
  });

  it("detects expired and non-expired tokens", () => {
    expect(isExpired("2026-08-16T23:59:59.000Z", now)).toBe(true);
    expect(isExpired("2026-08-17T00:01:00.000Z", now)).toBe(false);
  });

  it("detects tokens expiring within a margin", () => {
    expect(isExpiringSoon("2026-08-17T00:00:20.000Z", now, 30000)).toBe(true);
    expect(isExpiringSoon("2026-08-17T00:01:00.000Z", now, 30000)).toBe(false);
  });

  it("returns ISO string only for valid values", () => {
    expect(toValidDateIso("2026-08-17T00:00:00.000Z")).toBe("2026-08-17T00:00:00.000Z");
    expect(toValidDateIso("not-a-date")).toBeUndefined();
  });
});
