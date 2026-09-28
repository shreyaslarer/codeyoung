export const MORNING_SLOT_TIMES: readonly string[] = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
] as const;

export const AFTERNOON_SLOT_TIMES: readonly string[] = [
  '01:00 PM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
] as const;

export const DEFAULT_SELECTED_DATE = '2026-09-29';
export const DEFAULT_SELECTED_TIME = '10:30 AM';
export const DEFAULT_TRIAL_DURATION = '30 minutes';
