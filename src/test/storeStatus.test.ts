import { describe, it, expect, vi, afterEach } from "vitest";

// We need to mock getNowInBrasilia to control the time
// Since it's a private function, we'll test getStoreStatus with mocked Date

// Import after mocking
const mockDate = (dateStr: string) => {
  // dateStr like "2026-03-04T01:30:00" interpreted as Brasília time
  // We need to create a Date where getHours/getMinutes/getDay returns the Brasília values
  // Since getNowInBrasilia does: utcMs + offset + (-3h), and getHours uses local tz,
  // we mock Date.now to produce the right result
  const target = new Date(dateStr + "Z"); // treat as UTC for simplicity
  // getNowInBrasilia: new Date(now.getTime() + now.getTimezoneOffset()*60000 + (-3)*3600000)
  // We want getHours() on result to equal target.getUTCHours()
  // In test env (UTC), getTimezoneOffset() = 0, so:
  // result = new Date(now.getTime() + 0 + (-3)*3600000)
  // getHours() in UTC = (now - 3h).getUTCHours()
  // We want this = target.getUTCHours()
  // So now = target + 3h
  const fakeNow = new Date(target.getTime() + 3 * 3600_000);
  vi.setSystemTime(fakeNow);
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
});
