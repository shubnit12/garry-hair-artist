import { isTimeString, timeToMinutes } from "./dates";

/**
 * Pure overlap rules shared by the booking validation and the Calendar tool.
 * They mirror docs/ARCHITECTURE.md: an appointment occupies
 * [start, start + duration) and keeps `buffer` minutes free afterwards.
 */

export type Appointment = {
  id: string;
  time: string;
  durationMinutes: number;
};

export type Conflict<T extends Appointment> = {
  kind: "overlap" | "buffer";
  other: T;
};

function interval(appointment: Pick<Appointment, "time" | "durationMinutes">) {
  const start = timeToMinutes(appointment.time);
  return { start, end: start + Math.max(0, appointment.durationMinutes) };
}

/**
 * Bookings on the same day that clash with `candidate`:
 * - "overlap": the appointments themselves overlap;
 * - "buffer": they don't overlap, but there is less than `bufferMinutes` between them.
 */
export function findConflicts<T extends Appointment>(
  candidate: Pick<Appointment, "time" | "durationMinutes">,
  others: readonly T[],
  bufferMinutes: number,
): Conflict<T>[] {
  if (!isTimeString(candidate.time)) return [];
  const a = interval(candidate);

  return others
    .filter((other) => isTimeString(other.time))
    .flatMap((other): Conflict<T>[] => {
      const b = interval(other);
      if (a.start < b.end && a.end > b.start) return [{ kind: "overlap", other }];
      if (a.start < b.end + bufferMinutes && a.end + bufferMinutes > b.start) {
        return [{ kind: "buffer", other }];
      }
      return [];
    })
    .sort((x, y) => timeToMinutes(x.other.time) - timeToMinutes(y.other.time));
}

/** IDs of appointments in `appointments` (one day) that overlap at least one other. */
export function overlappingIds(appointments: readonly Appointment[]): Set<string> {
  const ids = new Set<string>();
  appointments.forEach((appointment, index) => {
    const rest = appointments.filter((_, otherIndex) => otherIndex !== index);
    if (findConflicts(appointment, rest, 0).some((conflict) => conflict.kind === "overlap")) {
      ids.add(appointment.id);
    }
  });
  return ids;
}
