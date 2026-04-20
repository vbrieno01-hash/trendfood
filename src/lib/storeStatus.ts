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

/** Returns the current time in São Paulo timezone, regardless of client timezone.
 *  Uses Intl.DateTimeFormat for correctness across all devices and DST. */
function getNowInBrasilia(): { dayOfWeek: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  // Intl returns "24" for midnight in some impls; normalize to 0
  const rawHour = parseInt(get("hour"), 10);
  return {
    dayOfWeek: weekdayMap[get("weekday")] ?? 0,
    hour: Number.isFinite(rawHour) ? rawHour % 24 : 0,
    minute: parseInt(get("minute"), 10) || 0,
  };
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
  const dayKey = DAY_MAP[now.dayOfWeek];
  const currentMinutes = now.hour * 60 + now.minute;

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
  const prevDayIndex = (now.dayOfWeek + 6) % 7;
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
    const nextOpenAt = findNextOpen(businessHours, now.dayOfWeek);
    return { open: false, opensAt: nextOpenAt };
  }

  const fromMin = timeToMinutes(today.from);
  const toMin = toMinutesClose(today.to);

  // Para turnos que cruzam meia-noite (ex: 20:00 → 04:00), a janela 00:00-04:00
  // pertence ao TURNO DO DIA ANTERIOR (que já foi verificado no passo 1️⃣).
  // O dia atual só está aberto a partir de `from` em diante.
  const isOpen = toMin > fromMin
    ? currentMinutes >= fromMin && currentMinutes < toMin
    : currentMinutes >= fromMin;

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

  const nextOpenAt = findNextOpen(businessHours, now.dayOfWeek);
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
