import { Slot } from '@/types/booking.types';
import { MORNING_SLOT_TIMES, AFTERNOON_SLOT_TIMES } from '@/constants/slots.constants';

export function parseTo24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  const [rawHours, minutes] = time.split(':');
  let hours = parseInt(rawHours, 10);

  if (hours === 12) {
    hours = modifier === 'PM' ? 12 : 0;
  } else if (modifier === 'PM') {
    hours += 12;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Accurately converts a local date (YYYY-MM-DD), 12h time string ("10:00 AM"),
 * and IANA timezone ("Europe/London", "Asia/Kolkata") to a UTC ISO 8601 instant string.
 */
export function localTimeToUtcIsoInstant(dateStr: string, time12h: string, ianaTimezone: string): string {
  try {
    const time24 = parseTo24Hour(time12h);
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = time24.split(':').map(Number);

    const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(utcGuess);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';

    const targetInZone = new Date(
      Date.UTC(
        Number(getPart('year')),
        Number(getPart('month')) - 1,
        Number(getPart('day')),
        Number(getPart('hour')),
        Number(getPart('minute')),
        Number(getPart('second'))
      )
    );

    const offsetDiffMs = utcGuess.getTime() - targetInZone.getTime();
    return new Date(utcGuess.getTime() + offsetDiffMs).toISOString();
  } catch {
    // Graceful fallback to UTC representation if timezone name is unrecognized
    const time24 = parseTo24Hour(time12h);
    return `${dateStr}T${time24}:00.000Z`;
  }
}

export function generateSlotsForDate(dateStr: string, ianaTimezone = 'Europe/London'): Slot[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  // No classes on Sundays (Sunday = 0)
  if (dateObj.getUTCDay() === 0) {
    return [];
  }

  const morningSlots: Slot[] = MORNING_SLOT_TIMES.map((time, index) => {
    const isoInstant = localTimeToUtcIsoInstant(dateStr, time, ianaTimezone);
    const endInstant = new Date(new Date(isoInstant).getTime() + 30 * 60000).toISOString();
    return {
      id: `slot-morning-${index}-${dateStr}`,
      time,
      period: 'MORNING' as const,
      startInstant: isoInstant,
      endInstant,
      parentLocalDate: dateStr,
      parentLocalTime: parseTo24Hour(time),
      eligibleMentorIds: ['mentor-01', 'mentor-02'],
      isoInstant,
      available: true,
    };
  });

  const afternoonSlots: Slot[] = AFTERNOON_SLOT_TIMES.map((time, index) => {
    const isoInstant = localTimeToUtcIsoInstant(dateStr, time, ianaTimezone);
    const endInstant = new Date(new Date(isoInstant).getTime() + 30 * 60000).toISOString();
    return {
      id: `slot-afternoon-${index}-${dateStr}`,
      time,
      period: 'AFTERNOON' as const,
      startInstant: isoInstant,
      endInstant,
      parentLocalDate: dateStr,
      parentLocalTime: parseTo24Hour(time),
      eligibleMentorIds: ['mentor-01', 'mentor-02'],
      isoInstant,
      available: true,
    };
  });

  return [...morningSlots, ...afternoonSlots];
}
