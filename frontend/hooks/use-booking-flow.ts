"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { BookingStep, TimezoneOption, DateItem, Slot, ConfirmedBooking } from "@/types/booking.types";
import { DEFAULT_TIMEZONE } from "@/constants/timezones.constants";
import { DEFAULT_SELECTED_DATE, DEFAULT_SELECTED_TIME } from "@/constants/slots.constants";
import { getAvailability, createBooking, generateIdempotencyKey, ConflictError, ValidationError, NetworkError } from "@/lib/api-client";
import type { AvailabilitySlot, BookingConflictType } from "@/types/api.types";
import { autoDetectTimezone } from "@/lib/timezone-detection";

const DAYS_WINDOW_SIZE = 5;
const BASE_YEAR = 2026;
const BASE_MONTH = 8; // September (0-indexed)
const BASE_DAY = 28;  // Monday, September 28, 2026

const DAY_ABBREVIATIONS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function useBookingFlow() {
  const [step, setStep] = useState<BookingStep>(1);
  const [timezone, setTimezone] = useState<TimezoneOption>(DEFAULT_TIMEZONE);
  const [selectedDate, setSelectedDate] = useState<string>(DEFAULT_SELECTED_DATE);
  const [selectedTime, setSelectedTime] = useState<string>(DEFAULT_SELECTED_TIME);
  const [dayOffset, setDayOffset] = useState<number>(0);
  const [parentName, setParentName] = useState<string>("");
  const [parentEmail, setParentEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Typed conflict state — distinguished from generic errors so UI renders the
  // right notice (calm scheduling state vs red unexpected-failure alert).
  const [submitConflict, setSubmitConflict] = useState<BookingConflictType | null>(null);
  // Incrementing this key forces the availability useEffect to re-run after a
  // conflict even when selectedDate and timezone haven't changed.
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState<number>(0);

  // Backend availability state
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Confirmed booking from backend
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);

  // Preferred time state (evaluated by backend availability engine)
  const [preferredTime, setPreferredTime] = useState<string | null>(null);
  const [preferredSlotStatus, setPreferredSlotStatus] = useState<
    'IDLE' | 'CHECKING' | 'AVAILABLE' | 'UNAVAILABLE'
  >('IDLE');
  const [preferredSlotMessage, setPreferredSlotMessage] = useState<string | null>(null);

  // Date strip generation (5 days window)
  const dateItems: DateItem[] = useMemo(() => {
    const baseDate = new Date(BASE_YEAR, BASE_MONTH, BASE_DAY);
    baseDate.setDate(baseDate.getDate() + dayOffset);

    return Array.from({ length: DAYS_WINDOW_SIZE }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);

      const year = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, "0");
      const dayStr = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dayName = DAY_ABBREVIATIONS[date.getDay()];
      const dayNumber = dayStr;
      const fullDayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const fullMonthName = MONTH_NAMES[date.getMonth()];
      const fullFormatted = `${fullDayName}, ${fullMonthName} ${date.getDate()}`;
      const monthYear = `${fullMonthName} ${year}`;

      return {
        dateStr,
        dayName,
        dayNumber,
        fullFormatted,
        monthYear,
      };
    });
  }, [dayOffset]);

  const activeDateItem: DateItem = useMemo(() => {
    return (
      dateItems.find((item) => item.dateStr === selectedDate) ?? {
        dateStr: selectedDate,
        dayName: "TUE",
        dayNumber: "29",
        fullFormatted: "Tuesday, September 29",
        monthYear: "September 2026",
      }
    );
  }, [dateItems, selectedDate]);

  /**
   * Automatically detect user's timezone on initial mount.
   * Uses IP-based geolocation with fallback to browser detection.
   * 
   * When both methods fail, keeps the DEFAULT_TIMEZONE and allows user
   * to manually correct via the timezone modal (existing UI mechanism).
   * 
   * Runs once on component mount, does not force user to open timezone modal.
   */
  useEffect(() => {
    let cancelled = false;

    async function detectAndSetTimezone() {
      try {
        const result = await autoDetectTimezone();
        
        if (cancelled) return;
        
        if (result.timezone) {
          // Detection succeeded
          setTimezone(result.timezone);
          console.log('[Booking Flow] Timezone auto-detected:', result.ianaTimezone, 'via', result.source);
        } else {
          // Both IP and browser detection failed
          // Keep DEFAULT_TIMEZONE from initial state
          // User can manually select via timezone modal if needed
          console.warn('[Booking Flow] Timezone detection failed. Using default. User can select manually via region selector.');
        }
      } catch (error) {
        console.warn('[Booking Flow] Timezone detection error:', error);
        // Keep DEFAULT_TIMEZONE that was set in initial state
      }
    }

    detectAndSetTimezone();

    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount

  /**
   * Fetch availability from backend whenever date or timezone changes.
   * Backend is the single source of truth for slot availability.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchAvailability() {
      setIsLoadingSlots(true);
      setSlotsError(null);

      try {
        const response = await getAvailability({
          parentDate: selectedDate,
          parentTimezone: timezone.iana,
          trialDurationMinutes: 30,
        });

        if (cancelled) return;

        // Transform backend slots to frontend display format
        const transformedSlots: Slot[] = response.slots.map((backendSlot: AvailabilitySlot, index: number) => {
          // Convert 24h backend time (HH:MM) to 12h display format (HH:MM AM/PM)
          const displayTime = convert24hTo12h(backendSlot.parentLocalTime);
          const period = determineSlotPeriod(backendSlot.parentLocalTime);

          return {
            id: `slot-${selectedDate}-${backendSlot.startInstant}-${index}`,
            time: displayTime,
            period,
            startInstant: backendSlot.startInstant,
            endInstant: backendSlot.endInstant,
            parentLocalDate: backendSlot.parentLocalDate,
            parentLocalTime: backendSlot.parentLocalTime,
            eligibleMentorIds: backendSlot.eligibleMentorIds,
          };
        });

        setAvailableSlots(transformedSlots);

        // Auto-select first slot if current selection is invalid
        setSelectedTime((prevTime) => {
          if (transformedSlots.length > 0 && !transformedSlots.some((s) => s.time === prevTime)) {
            return transformedSlots[0].time;
          } else if (transformedSlots.length === 0) {
            return "";
          }
          return prevTime;
        });
      } catch (error) {
        if (cancelled) return;

        if (error instanceof ValidationError) {
          setSlotsError("Invalid date or timezone. Please try again.");
        } else if (error instanceof NetworkError) {
          setSlotsError("Unable to connect to server. Please check your connection.");
        } else {
          setSlotsError("Failed to load available slots. Please try again.");
        }
        setAvailableSlots([]);
        setSelectedTime("");
      } finally {
        if (!cancelled) {
          setIsLoadingSlots(false);
        }
      }
    }

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, timezone.iana, availabilityRefreshKey]); // availabilityRefreshKey forces re-fetch after a conflict

  // Exact selected slot domain entity (Rule 221 & 225)
  const selectedSlot: Slot | null = useMemo(() => {
    return availableSlots.find((s) => s.time === selectedTime) ?? null;
  }, [availableSlots, selectedTime]);

  const goToStep = useCallback((newStep: BookingStep) => {
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Rule 224: When date changes, fetch fresh availability from backend
  const handleSelectDate = useCallback((newDateStr: string) => {
    setSelectedDate(newDateStr);

    // Calculate offset from base date so the 5-day strip shows the selected date's window
    const [targetY, targetM, targetD] = newDateStr.split("-").map(Number);
    const targetDate = new Date(Date.UTC(targetY, targetM - 1, targetD));
    const baseDate = new Date(Date.UTC(BASE_YEAR, BASE_MONTH, BASE_DAY));
    const diffDays = Math.round((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      const windowOffset = Math.floor(diffDays / DAYS_WINDOW_SIZE) * DAYS_WINDOW_SIZE;
      setDayOffset(windowOffset);
    }

    // Backend availability will be fetched automatically via useEffect
    // No need to manage slots here - backend is authoritative
  }, []);

  // Rule 223: When timezone changes, fetch fresh availability from backend
  const handleSelectTimezone = useCallback((newTz: TimezoneOption) => {
    setTimezone(newTz);
    // Backend availability will be fetched automatically via useEffect
    // No need to manage slots here - backend is authoritative
  }, []);

  const handleSelectSlot = useCallback((slot: Slot) => {
    setSelectedTime(slot.time);
    setSubmitConflict(null);
    setSubmitError(null);
    setPreferredSlotStatus('IDLE');
    setPreferredSlotMessage(null);
  }, []);

  /**
   * Handle arbitrary preferred time selection by querying backend availability.
   * If the backend returns an eligible slot for the requested 30-min window,
   * it is merged into availableSlots and selected.
   */
  const handleSelectPreferredTime = useCallback(
    async (timeStr: string | null) => {
      if (!timeStr) {
        setPreferredTime(null);
        setPreferredSlotStatus('IDLE');
        setPreferredSlotMessage(null);
        return;
      }

      setPreferredTime(timeStr);
      setPreferredSlotStatus('CHECKING');
      setPreferredSlotMessage('Checking mentor availability...');

      try {
        const time24 = convert12hTo24h(timeStr);
        const response = await getAvailability({
          parentDate: selectedDate,
          parentTimezone: timezone.iana,
          trialDurationMinutes: 30,
          preferredStartTime: time24,
        });

        if (response.preferredSlot && response.preferredSlot.eligibleMentorIds.length > 0) {
          const backendSlot = response.preferredSlot;
          const displayTime = convert24hTo12h(backendSlot.parentLocalTime);
          const period = determineSlotPeriod(backendSlot.parentLocalTime);

          const newSlot: Slot = {
            id: `slot-${selectedDate}-${backendSlot.startInstant}-pref`,
            time: displayTime,
            period,
            startInstant: backendSlot.startInstant,
            endInstant: backendSlot.endInstant,
            parentLocalDate: backendSlot.parentLocalDate,
            parentLocalTime: backendSlot.parentLocalTime,
            eligibleMentorIds: backendSlot.eligibleMentorIds,
          };

          setAvailableSlots((prevSlots) => {
            if (prevSlots.some((s) => s.startInstant === newSlot.startInstant)) {
              return prevSlots;
            }
            return [...prevSlots, newSlot].sort((a, b) =>
              a.startInstant.localeCompare(b.startInstant)
            );
          });

          setSelectedTime(displayTime);
          setPreferredSlotStatus('AVAILABLE');
          setPreferredSlotMessage(`Available! An active mentor is ready for ${displayTime}.`);
        } else {
          setPreferredSlotStatus('UNAVAILABLE');
          setPreferredSlotMessage(
            `No mentors are available at ${timeStr}. Please select an available slot above.`
          );
        }
      } catch {
        setPreferredSlotStatus('UNAVAILABLE');
        setPreferredSlotMessage(
          `Unable to check availability for ${timeStr}. Please select an available slot.`
        );
      }
    },
    [selectedDate, timezone.iana]
  );

  const isPrevDisabled = dayOffset <= 0;

  const handlePrevDays = useCallback(() => {
    setDayOffset((prev) => Math.max(0, prev - DAYS_WINDOW_SIZE));
  }, []);

  const handleNextDays = useCallback(() => {
    setDayOffset((prev) => prev + DAYS_WINDOW_SIZE);
  }, []);

  // Real booking submission to backend (Rule 95: double-submit guard)
  const handleConfirmBooking = useCallback(async () => {
    if (isSubmitting || !selectedSlot) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitConflict(null);

      // Generate idempotency key for this booking attempt
      const idempotencyKey = generateIdempotencyKey();

      // Call backend with EXACT slot data from backend response
      const bookingResponse = await createBooking(
        {
          parentName: parentName.trim(),
          parentEmail: parentEmail.trim(),
          parentLocalDate: selectedSlot.parentLocalDate,  // Backend-provided
          parentLocalTime: selectedSlot.parentLocalTime,  // Backend-provided (24h format)
          parentTimezone: timezone.iana,
          trialDurationMinutes: 30,
        },
        idempotencyKey
      );

      // Store the real booking response from backend
      setConfirmedBooking(bookingResponse);

      // Move to confirmation screen with real booking data
      goToStep(3);
    } catch (err) {
      if (err instanceof ConflictError) {
        // 409: slot is taken — show the calm scheduling notice, not a red error.
        // Refresh availability so the grid reflects current state.
        setSubmitConflict(err.conflictType);
        setSubmitError(null);
        setAvailabilityRefreshKey(k => k + 1);
      } else if (err instanceof ValidationError) {
        setSubmitConflict(null);
        setSubmitError("Invalid booking details. Please check your information.");
      } else if (err instanceof NetworkError) {
        setSubmitConflict(null);
        setSubmitError("Unable to connect to server. Please check your connection and try again.");
      } else if (err instanceof Error) {
        setSubmitConflict(null);
        setSubmitError(err.message);
      } else {
        setSubmitConflict(null);
        setSubmitError("Failed to confirm booking. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedSlot, parentName, parentEmail, timezone.iana, goToStep]);

  return {
    step,
    timezone,
    selectedDate,
    selectedTime,
    selectedSlot,
    parentName,
    parentEmail,
    dateItems,
    activeDateItem,
    availableSlots,
    isPrevDisabled,
    isSubmitting,
    submitError,
    submitConflict,          // Typed 409 conflict type, distinct from generic errors
    isLoadingSlots,          // Loading state for availability
    slotsError,              // Error state for availability
    confirmedBooking,        // Real booking response from backend
    preferredTime,           // User's custom preferred clock time
    preferredSlotStatus,     // Checking, Available, Unavailable status
    preferredSlotMessage,    // Informational message for preferred slot
    setTimezone: handleSelectTimezone,
    setParentName,
    setParentEmail,
    goToStep,
    handleSelectDate,
    handleSelectSlot,
    handleSelectPreferredTime,
    handlePrevDays,
    handleNextDays,
    handleConfirmBooking,
  };
}

/**
 * Convert 12h time (HH:MM AM/PM) to 24h format (HH:MM)
 */
export function convert12hTo24h(time12: string): string {
  const trimmed = time12.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours < 12) hours += 12;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Convert 24h time (HH:MM) to 12h display format (HH:MM AM/PM)
 */
function convert24hTo12h(time24: string): string {
  const [hoursStr, minutesStr] = time24.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;

  if (hours === 0) {
    return `12:${minutes} AM`;
  } else if (hours < 12) {
    return `${hours}:${minutes} AM`;
  } else if (hours === 12) {
    return `12:${minutes} PM`;
  } else {
    return `${hours - 12}:${minutes} PM`;
  }
}

/**
 * Determine slot period (morning/afternoon/evening) from 24h time
 * Categorizes all 24 hours to ensure no slots are hidden
 */
function determineSlotPeriod(time24: string): 'MORNING' | 'AFTERNOON' | 'EVENING' {
  const hours = parseInt(time24.split(':')[0], 10);
  
  // Early morning and night hours (00:00-05:59) = MORNING
  // This ensures slots like 00:00-04:30 are shown in morning section
  if (hours >= 0 && hours < 6) {
    return 'MORNING';
  } else if (hours >= 6 && hours < 12) {
    return 'MORNING';
  } else if (hours >= 12 && hours < 18) {
    return 'AFTERNOON';
  } else {
    // Evening hours (18:00-23:59) = EVENING
    return 'EVENING';
  }
}
