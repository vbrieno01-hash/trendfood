import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Sets the system clock to a specific moment in Brasília (São Paulo) time.
 * Internally converts to the equivalent UTC instant. Since the SUT now uses
 * Intl.DateTimeFormat with timeZone "America/Sao_Paulo", any UTC instant
 * works — we just need it to map back to the desired BRT wall-clock.
 *
 * BRT is UTC-3 (no DST since 2019), so BRT 01:30 == UTC 04:30.
 */
const mockDate = (brtDateStr: string) => {
  // brtDateStr like "2026-03-04T01:30:00" interpreted as Brasília wall-clock
  const [datePart, timePart] = brtDateStr.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s = 0] = timePart.split(":").map(Number);
  // Build the UTC instant that corresponds to that BRT wall-clock (BRT = UTC-3)
  const utcMs = Date.UTC(y, mo - 1, d, h + 3, mi, s);
  vi.setSystemTime(new Date(utcMs));
};

describe("getStoreStatus cross-midnight", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show open at 01:30 when previous day has 22:00-02:00 schedule", async () => {
    vi.useFakeTimers();
    // Wednesday 01:30 Brasília time (2026-03-04 is a Wednesday)
    mockDate("2026-03-04T01:30:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "22:00", to: "02:00" }, // Tuesday crosses midnight
        qua: { open: true, from: "08:00", to: "22:00" }, // Wednesday opens at 08:00
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "23:00" },
        sab: { open: true, from: "10:00", to: "23:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    expect(status).toEqual({ open: true });
  });

  it("should show closed at 03:00 when previous day closes at 02:00", async () => {
    vi.useFakeTimers();
    // Wednesday 03:00 Brasília
    mockDate("2026-03-04T03:00:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "22:00", to: "02:00" },
        qua: { open: true, from: "08:00", to: "22:00" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "23:00" },
        sab: { open: true, from: "10:00", to: "23:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    // At 03:00 Wed, Tuesday's cross-midnight shift (22-02) is over, and Wed opens at 08:00
    expect(status).toEqual({ open: false, opensAt: "08:00" });
  });

  it("should show open at 23:00 on the same day with cross-midnight schedule", async () => {
    vi.useFakeTimers();
    // Tuesday 23:00 Brasília
    mockDate("2026-03-03T23:00:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "22:00", to: "02:00" },
        qua: { open: true, from: "08:00", to: "22:00" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "23:00" },
        sab: { open: true, from: "10:00", to: "23:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    expect(status).toEqual({ open: true });
  });

  it("force_open should always return open", async () => {
    vi.useFakeTimers();
    mockDate("2026-03-04T03:00:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: false, from: "08:00", to: "22:00" },
        ter: { open: false, from: "08:00", to: "22:00" },
        qua: { open: false, from: "08:00", to: "22:00" },
        qui: { open: false, from: "08:00", to: "22:00" },
        sex: { open: false, from: "08:00", to: "22:00" },
        sab: { open: false, from: "08:00", to: "22:00" },
        dom: { open: false, from: "08:00", to: "22:00" },
      },
    };

    const status = getStoreStatus(bh, true);
    expect(status).toEqual({ open: true });
  });

  it("should show closed during break interval", async () => {
    vi.useFakeTimers();
    // Wednesday 12:30 Brasília
    mockDate("2026-03-04T12:30:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "08:00", to: "22:00" },
        qua: { open: true, from: "08:00", to: "22:00", break_from: "12:00", break_to: "13:30" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "22:00" },
        sab: { open: true, from: "08:00", to: "22:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    expect(status).toEqual({ open: false, opensAt: "13:30", reason: "break" });
  });

  it("should show open after break interval ends", async () => {
    vi.useFakeTimers();
    // Wednesday 14:00 Brasília
    mockDate("2026-03-04T14:00:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "08:00", to: "22:00" },
        qua: { open: true, from: "08:00", to: "22:00", break_from: "12:00", break_to: "13:30" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "22:00" },
        sab: { open: true, from: "08:00", to: "22:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    expect(status).toEqual({ open: true });
  });

  it("force_open should NOT override break (pause)", async () => {
    vi.useFakeTimers();
    // Wednesday 12:30 Brasília — inside break
    mockDate("2026-03-04T12:30:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "08:00", to: "22:00" },
        qua: { open: true, from: "08:00", to: "22:00", break_from: "12:00", break_to: "13:30" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "22:00" },
        sab: { open: true, from: "08:00", to: "22:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    // Even with forceOpen=true, break should win
    const status = getStoreStatus(bh, true);
    expect(status).toEqual({ open: false, opensAt: "13:30", reason: "break" });
  });

  it("should show open when no break is configured", async () => {
    vi.useFakeTimers();
    // Wednesday 12:30 Brasília — no break configured
    mockDate("2026-03-04T12:30:00");

    const { getStoreStatus } = await import("@/lib/storeStatus");

    const bh = {
      enabled: true,
      schedule: {
        seg: { open: true, from: "08:00", to: "22:00" },
        ter: { open: true, from: "08:00", to: "22:00" },
        qua: { open: true, from: "08:00", to: "22:00" },
        qui: { open: true, from: "08:00", to: "22:00" },
        sex: { open: true, from: "08:00", to: "22:00" },
        sab: { open: true, from: "08:00", to: "22:00" },
        dom: { open: false, from: "10:00", to: "20:00" },
      },
    };

    const status = getStoreStatus(bh);
    expect(status).toEqual({ open: true });
  });
});
