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

/** Returns a Date object adjusted to Brasília Time (GMT-3), regardless of client timezone */
function getNowInBrasilia(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + (-3) * 3600_000);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toMinutesClose(time: string): number {
  const mins = timeToMinutes(time);
  // 00:00 como horário de fechamento = meia-noite = fim do dia
  return mins === 0 ? 1440 : mins;
}

export type StoreStatus =
  | null
  | { open: true }
  | { open: false; opensAt: string | null; reason?: "break" };

export function getStoreStatus(
  businessHours: BusinessHours | null | undefined,
  forceOpen?: boolean,
): StoreStatus {
  if (!businessHours || !businessHours.enabled) {
    // Sem horário configurado — forceOpen não se aplica
    if (forceOpen) return { open: true };
    return null;
  }

  const now = getNowInBrasilia();
  const dayKey = DAY_MAP[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Helper: verifica se estamos em pausa de um dia ativo
  const checkBreak = (day: { break_from?: string; break_to?: string }): StoreStatus | null => {
    if (day.break_from && day.break_to) {
      const breakFrom = timeToMinutes(day.break_from);
      const breakTo = timeToMinutes(day.break_to);
      if (currentMinutes >= breakFrom && currentMinutes < breakTo) {
        return { open: false, opensAt: day.break_to, reason: "break" };
      }
    }
    return null;
  };

  // 1️⃣ Verificar se estamos DENTRO do turno do DIA ANTERIOR que cruza meia-noite
  const prevDayIndex = (now.getDay() + 6) % 7;
  const prevDayKey = DAY_MAP[prevDayIndex];
  const prevDay = businessHours.schedule[prevDayKey];
  if (prevDay && prevDay.open) {
    const prevFrom = timeToMinutes(prevDay.from);
    const prevTo = toMinutesClose(prevDay.to);
    if (prevTo < prevFrom && currentMinutes < prevTo) {
      const breakStatus = checkBreak(prevDay);
      if (breakStatus) return breakStatus; // Pausa tem prioridade sobre forceOpen
      return { open: true };
    }
  }

  // 2️⃣ Verificar turno do dia atual
  const today = businessHours.schedule[dayKey];
  if (!today || !today.open) {
    // Dia fechado — forceOpen ignora isso, mas verifica pausa primeiro
    if (forceOpen) {
      // Mesmo com forceOpen, se hoje tem pausa configurada, respeitar
      if (today) {
        const breakStatus = checkBreak(today);
        if (breakStatus) return breakStatus;
      }
      return { open: true };
    }
    const nextOpenAt = findNextOpen(businessHours, now.getDay());
    return { open: false, opensAt: nextOpenAt };
  }

  const fromMin = timeToMinutes(today.from);
  const toMin = toMinutesClose(today.to);

  const isOpen = toMin > fromMin
    ? currentMinutes >= fromMin && currentMinutes < toMin
    : currentMinutes >= fromMin || currentMinutes < toMin;

  if (isOpen) {
    const breakStatus = checkBreak(today);
    if (breakStatus) return breakStatus; // Pausa tem prioridade sobre forceOpen
    return { open: true };
  }

  // Fora do horário — forceOpen ignora, mas pausa ainda vale
  if (forceOpen) {
    const breakStatus = checkBreak(today);
    if (breakStatus) return breakStatus;
    return { open: true };
  }

  if (currentMinutes < fromMin) {
    return { open: false, opensAt: today.from };
  }

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
