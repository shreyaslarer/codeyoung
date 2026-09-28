import { TimezoneOption } from '@/types/booking.types';
import { POPULAR_TIMEZONES, DEFAULT_TIMEZONE } from '@/constants/timezones.constants';

/**
 * Validate if a string is a valid IANA timezone identifier.
 * Uses browser's Intl API to check validity.
 * 
 * @param timezone - IANA timezone string to validate
 * @returns true if valid IANA timezone, false otherwise
 */
export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Intl.DateTimeFormat will throw if timezone is invalid
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect browser timezone synchronously.
 * This is used as a fallback when IP-based detection is not available.
 * 
 * @returns TimezoneOption from browser detection
 */
export function detectBrowserTimezone(): TimezoneOption {
  try {
    const detectedIana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Validate before using
    if (!isValidIanaTimezone(detectedIana)) {
      return DEFAULT_TIMEZONE;
    }
    
    const match = POPULAR_TIMEZONES.find((tz) => tz.iana === detectedIana);
    if (match) return match;

    const city = detectedIana.split('/')[1]?.replace(/_/g, ' ') || detectedIana;
    const region = detectedIana.split('/')[0] || 'Global';

    return {
      iana: detectedIana,
      label: `${city} (Local)`,
      city,
      region,
      utcOffset: 'Local',
    };
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
