import { Temporal } from '@js-temporal/polyfill';
import { mentorRepository } from '../models/mentor.repository.js';
import { bookingRepository } from '../models/booking.repository.js';
import { IMentor } from '../models/mentor.schema.js';

const TRIAL_DURATION_MINUTES = 30;
const SLOT_INTERVAL_MINUTES = 30;
const MAX_DAILY_TRIALS = 2;

export interface AvailableSlot {
  instant: string;
  parentLocalTime: string;
  parentLocalDateTime: string;
}

export interface AvailabilityResult {
  date: string;
  timezone: string;
  slots: AvailableSlot[];
}

export class AvailabilityService {
  async getAvailableSlots(date: string, parentTimezone: string): Promise<AvailabilityResult> {
    this.validateDate(date);
    this.validateTimezone(parentTimezone);

    const mentors = await mentorRepository.findAllActive();
    if (mentors.length === 0) {
      return { date, timezone: parentTimezone, slots: [] };
    }

    const mentorTimezone = mentors[0].timezone;
    const workingHoursStart = mentors[0].workingHoursStart;
    const workingHoursEnd = mentors[0].workingHoursEnd;

    const candidateInstants = this.generateCandidateInstants(
      date,
      parentTimezone,
      mentorTimezone,
      workingHoursStart,
      workingHoursEnd
    );

    const availableSlots: AvailableSlot[] = [];

    for (const instant of candidateInstants) {
      const hasEligibleMentor = await this.hasEligibleMentor(instant, mentors);
      if (hasEligibleMentor) {
        const parentZonedDateTime = instant.toZonedDateTimeISO(parentTimezone);
        availableSlots.push({
          instant: instant.toString(),
          parentLocalTime: parentZonedDateTime.toPlainTime().toString().slice(0, 5),
          parentLocalDateTime: parentZonedDateTime.toPlainDateTime().toString(),
        });
      }
    }

    return { date, timezone: parentTimezone, slots: availableSlots };
  }

  private generateCandidateInstants(
    requestedDate: string,
    parentTimezone: string,
    mentorTimezone: string,
    workingHoursStart: string,
    workingHoursEnd: string
  ): Temporal.Instant[] {
    const instants: Temporal.Instant[] = [];
    const startTime = Temporal.PlainTime.from(workingHoursStart);
    const endTime = Temporal.PlainTime.from(workingHoursEnd);
    const parentDate = Temporal.PlainDate.from(requestedDate);

    const parentDayStart = parentDate.toZonedDateTime({ timeZone: parentTimezone, plainTime: '00:00' });
    const parentDayEnd = parentDate.add({ days: 1 }).toZonedDateTime({ timeZone: parentTimezone, plainTime: '00:00' });

    const mentorDayStart = parentDayStart.withTimeZone(mentorTimezone);
    const mentorDayEnd = parentDayEnd.withTimeZone(mentorTimezone);

    const startMentorDate = mentorDayStart.toPlainDate();
    const endMentorDate = mentorDayEnd.toPlainDate();

    const mentorDatesToCheck: Temporal.PlainDate[] = [startMentorDate];
    if (Temporal.PlainDate.compare(startMentorDate, endMentorDate) !== 0) {
      mentorDatesToCheck.push(endMentorDate);
    }

    for (const mentorDate of mentorDatesToCheck) {
      let currentTime = startTime;
      while (Temporal.PlainTime.compare(currentTime, endTime) < 0) {
        try {
          const zonedDateTime = mentorDate.toZonedDateTime({ timeZone: mentorTimezone, plainTime: currentTime });
          const instant = zonedDateTime.toInstant();
          const instantInParentTz = instant.toZonedDateTimeISO(parentTimezone);
          const instantParentDate = instantInParentTz.toPlainDate();

          if (Temporal.PlainDate.compare(instantParentDate, parentDate) === 0) {
            instants.push(instant);
          }
        } catch (error) {
          console.warn(`Skipping slot ${mentorDate} ${currentTime}:`, error);
        }
        currentTime = currentTime.add({ minutes: SLOT_INTERVAL_MINUTES });
      }
    }

    return instants.sort((a, b) => Temporal.Instant.compare(a, b));
  }

  private async hasEligibleMentor(instant: Temporal.Instant, mentors: IMentor[]): Promise<boolean> {
    for (const mentor of mentors) {
      const eligibility = await this.checkMentorEligibility(instant, mentor);
      if (eligibility.eligible) return true;
    }
    return false;
  }

  async checkMentorEligibility(instant: Temporal.Instant, mentor: IMentor): Promise<{ mentor: IMentor; eligible: boolean; reason?: string }> {
    const mentorZonedDateTime = instant.toZonedDateTimeISO(mentor.timezone);
    const mentorTime = mentorZonedDateTime.toPlainTime();
    const mentorDate = mentorZonedDateTime.toPlainDate();

    const workingStart = Temporal.PlainTime.from(mentor.workingHoursStart);
    const workingEnd = Temporal.PlainTime.from(mentor.workingHoursEnd);

    if (Temporal.PlainTime.compare(mentorTime, workingStart) < 0 || Temporal.PlainTime.compare(mentorTime, workingEnd) >= 0) {
      return { mentor, eligible: false, reason: 'Outside working hours' };
    }

    const startTime = instant;
    const endTime = instant.add({ minutes: TRIAL_DURATION_MINUTES });

    const overlappingBookings = await bookingRepository.findOverlappingBookings(
      mentor._id.toString(),
      new Date(startTime.toString()),
      new Date(endTime.toString())
    );

    if (overlappingBookings.length > 0) {
      return { mentor, eligible: false, reason: 'Overlapping booking exists' };
    }

    const mentorDayStart = mentorDate.toZonedDateTime({ timeZone: mentor.timezone, plainTime: '00:00' });
    const mentorDayEnd = mentorDate.add({ days: 1 }).toZonedDateTime({ timeZone: mentor.timezone, plainTime: '00:00' });

    const dailyBookingCount = await bookingRepository.countBookingsOnMentorLocalDay(
      mentor._id.toString(),
      new Date(mentorDayStart.toInstant().toString()),
      new Date(mentorDayEnd.toInstant().toString())
    );

    if (dailyBookingCount >= MAX_DAILY_TRIALS) {
      return { mentor, eligible: false, reason: 'Daily capacity reached' };
    }

    return { mentor, eligible: true };
  }

  private validateDate(date: string): void {
    try {
      Temporal.PlainDate.from(date);
    } catch {
      throw new Error(`Invalid date format: ${date}`);
    }
  }

  private validateTimezone(timezone: string): void {
    try {
      Temporal.Now.zonedDateTimeISO(timezone);
    } catch {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
  }
}

export const availabilityService = new AvailabilityService();
