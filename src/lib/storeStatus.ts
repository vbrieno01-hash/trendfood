import { BusinessHours } from "@/hooks/useOrganization";

const DAY_MAP: Record<number, string> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type StoreStatus =
  | null
  | { open: true }
  | { open: false; opensAt: string | null };

export function getStoreStatus(businessHours: BusinessHours | null | undefined): StoreStatus {
  if (!businessHours || !businessHours.enabled) return null;

  const now = new Date();
  const dayKey = DAY_MAP[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const today = businessHours.schedule[dayKey];
  if (!today || !today.open) {
    // Find next open day
    const nextOpenAt = findNextOpen(businessHours, now.getDay());
    return { open: false, opensAt: nextOpenAt };
  }

  const fromMin = timeToMinutes(today.from);
  const toMin = timeToMinutes(today.to);

  if (currentMinutes >= fromMin && currentMinutes < toMin) {
    return { open: true };
  }

  if (currentMinutes < fromMin) {
    return { open: false, opensAt: today.from };
  }

  // After closing — find next open moment
  const nextOpenAt = findNextOpen(businessHours, now.getDay());
  return { open: false, opensAt: nextOpenAt };
}

function findNextOpen(bh: BusinessHours, todayIndex: number): string | null {
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (todayIndex + i) % 7;
    const key = DAY_MAP[nextIndex];
    const day = bh.schedule[key];
    if (day && day.open) {
      return day.from;
    }
  }
  return null;
}
