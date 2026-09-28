import { TimezoneOption } from '@/types/booking.types';

export const POPULAR_TIMEZONES: readonly TimezoneOption[] = [
  {
    iana: 'Europe/London',
    label: 'London (GMT/BST)',
    city: 'London',
    region: 'United Kingdom',
    utcOffset: 'UTC+1',
  },
  {
    iana: 'America/New_York',
    label: 'New York (EDT/EST)',
    city: 'New York',
    region: 'United States',
    utcOffset: 'UTC-4',
  },
  {
    iana: 'America/Chicago',
    label: 'Chicago (CDT/CST)',
    city: 'Chicago',
    region: 'United States',
    utcOffset: 'UTC-5',
  },
  {
    iana: 'America/Los_Angeles',
    label: 'San Francisco / LA (PDT/PST)',
    city: 'Los Angeles',
    region: 'United States',
    utcOffset: 'UTC-7',
  },
  {
    iana: 'America/Toronto',
    label: 'Toronto (EDT/EST)',
    city: 'Toronto',
    region: 'Canada',
    utcOffset: 'UTC-4',
  },
  {
    iana: 'Europe/Paris',
    label: 'Paris (CEST/CET)',
    city: 'Paris',
    region: 'France',
    utcOffset: 'UTC+2',
  },
  {
    iana: 'Europe/Berlin',
    label: 'Berlin (CEST/CET)',
    city: 'Berlin',
    region: 'Germany',
    utcOffset: 'UTC+2',
  },
  {
    iana: 'Asia/Dubai',
    label: 'Dubai (GST)',
    city: 'Dubai',
    region: 'United Arab Emirates',
    utcOffset: 'UTC+4',
  },
  {
    iana: 'Asia/Kolkata',
    label: 'India (IST)',
    city: 'Kolkata / Mumbai',
    region: 'India',
    utcOffset: 'UTC+5:30',
  },
  {
    iana: 'Asia/Singapore',
    label: 'Singapore (SGT)',
    city: 'Singapore',
    region: 'Singapore',
    utcOffset: 'UTC+8',
  },
  {
    iana: 'Asia/Tokyo',
    label: 'Tokyo (JST)',
    city: 'Tokyo',
    region: 'Japan',
    utcOffset: 'UTC+9',
  },
  {
    iana: 'Australia/Sydney',
    label: 'Sydney (AEST/AEDT)',
    city: 'Sydney',
    region: 'Australia',
    utcOffset: 'UTC+10',
  },
] as const;

export const DEFAULT_TIMEZONE: TimezoneOption = POPULAR_TIMEZONES[0];
