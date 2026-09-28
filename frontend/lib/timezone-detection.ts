/**
 * Automatic Timezone Detection Service
 * 
 * Detects user's timezone using IP-based geolocation with graceful fallback to browser detection.
 * 
 * Strategy:
 * 1. Primary: IP geolocation via ipapi.co (free, reliable, supports VPN detection)
 * 2. Fallback: Browser's Intl API (always available, respects user's system settings)
 * 
 * All detected timezones are validated against IANA standards before use.
 */

import { TimezoneOption } from '@/types/booking.types';
import { POPULAR_TIMEZONES } from '@/constants/timezones.constants';

/**
 * Response from ipapi.co geolocation service
 */
interface IpApiResponse {
  timezone?: string;  // IANA timezone identifier (e.g., "Asia/Kolkata")
  error?: boolean;
  reason?: string;
}

/**
 * Result of timezone detection attempt.
 * 
 * When detection succeeds:
 * - timezone: The detected timezone option
 * - source: Where the timezone came from ('ip-geolocation' or 'browser')
 * - ianaTimezone: IANA timezone identifier
 * 
 * When detection fails:
 * - timezone: null
 * - source: 'failed'
 * - ianaTimezone: null
 * 
 * The UI must handle the failure case gracefully by prompting user selection.
 */
export interface TimezoneDetectionResult {
  timezone: TimezoneOption | null;
  source: 'ip-geolocation' | 'browser' | 'failed';
  ianaTimezone: string | null;
}

/**
 * Validate if a string is a valid IANA timezone identifier.
 * Uses browser's Intl API to check validity without hardcoding timezone lists.
 * 
 * @param timezone - IANA timezone string to validate
 * @returns true if valid IANA timezone, false otherwise
 */
export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Intl.DateTimeFormat will throw RangeError if timezone is invalid
    // Using undefined for locale lets the browser use its default
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    // Invalid timezone throws RangeError
    return false;
  }
}

/**
 * Detect user's timezone from browser's Intl API.
 * This respects the user's system timezone settings.
 * 
 * @returns Browser-detected IANA timezone, or null if unavailable
 */
function detectBrowserIanaTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Validate that the browser actually returned a timezone
    if (!timezone || typeof timezone !== 'string') {
      return null;
    }
    
    return timezone;
  } catch {
    // Browser doesn't support timezone detection
    return null;
  }
}

/**
 * Convert IANA timezone identifier to TimezoneOption.
 * Tries to match against POPULAR_TIMEZONES list first, then creates a custom option.
 * 
 * @param ianaTimezone - IANA timezone identifier
 * @returns TimezoneOption for the given timezone
 */
function createTimezoneOption(ianaTimezone: string): TimezoneOption {
  // Try to find in popular timezones list
  const match = POPULAR_TIMEZONES.find((tz) => tz.iana === ianaTimezone);
  if (match) {
    return match;
  }

  // Create custom timezone option from IANA identifier
  const parts = ianaTimezone.split('/');
  const city = parts[1]?.replace(/_/g, ' ') || ianaTimezone;
  const region = parts[0] || 'Global';

  return {
    iana: ianaTimezone,
    label: `${city} (Detected)`,
    city,
    region,
    utcOffset: 'Local',
  };
}

/**
 * Detect timezone using IP-based geolocation.
 * Uses ipapi.co free tier (no API key required, 30k requests/month).
 * 
 * Supports:
 * - Real user location detection (India → Asia/Kolkata)
 * - VPN detection (UK VPN → Europe/London when provider supports it)
 * - Proxy detection (returns timezone of proxy exit node)
 * 
 * @param timeoutMs - Request timeout in milliseconds (default: 5000)
 * @returns IANA timezone string or null if detection fails
 */
async function detectTimezoneFromIp(timeoutMs = 5000): Promise<string | null> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Call ipapi.co - free tier, no API key needed
    // Returns timezone based on IP address location
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Timezone Detection] IP geolocation HTTP error:', response.status);
      return null;
    }

    const data: IpApiResponse = await response.json();

    // Check for API error response
    if (data.error) {
      console.warn('[Timezone Detection] IP geolocation API error:', data.reason);
      return null;
    }

    // Validate timezone from API
    if (data.timezone && isValidIanaTimezone(data.timezone)) {
      console.log('[Timezone Detection] IP geolocation success:', data.timezone);
      return data.timezone;
    }

    console.warn('[Timezone Detection] Invalid timezone from API:', data.timezone);
    return null;
  } catch (error) {
    // Handle network errors, timeouts, CORS issues gracefully
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[Timezone Detection] IP geolocation timeout');
      } else {
        console.warn('[Timezone Detection] IP geolocation failed:', error.message);
      }
    }
    return null;
  }
}

/**
 * Automatically detect user's timezone with two-level fallback strategy.
 * 
 * Detection Flow:
 * 1. Try IP-based geolocation (ipapi.co) - detects location including VPN/proxy
 * 2. Fallback to browser's Intl API - uses system timezone settings
 * 3. Return explicit failure if both methods fail
 * 
 * All detected timezones are validated before use.
 * 
 * Critical: This function never invents a timezone. When both IP and browser
 * detection fail, it returns an explicit failure state (timezone: null, source: 'failed').
 * The UI must handle this by prompting the user to manually select a timezone.
 * 
 * @returns TimezoneDetectionResult with detected timezone or explicit failure
 */
export async function autoDetectTimezone(): Promise<TimezoneDetectionResult> {
  // Step 1: Try IP-based geolocation (primary method)
  try {
    const ipTimezone = await detectTimezoneFromIp();
    
    if (ipTimezone && isValidIanaTimezone(ipTimezone)) {
      return {
        timezone: createTimezoneOption(ipTimezone),
        source: 'ip-geolocation',
        ianaTimezone: ipTimezone,
      };
    }
  } catch (error) {
    // IP detection failed, continue to fallback
    console.warn('[Timezone Detection] IP geolocation exception:', error);
  }

  // Step 2: Fallback to browser timezone
  try {
    const browserTimezone = detectBrowserIanaTimezone();
    
    if (browserTimezone && isValidIanaTimezone(browserTimezone)) {
      console.log('[Timezone Detection] Using browser fallback:', browserTimezone);
      return {
        timezone: createTimezoneOption(browserTimezone),
        source: 'browser',
        ianaTimezone: browserTimezone,
      };
    }
  } catch (error) {
    // Browser detection failed
    console.warn('[Timezone Detection] Browser detection failed:', error);
  }

  // Step 3: Explicit failure - do not invent a timezone
  // The UI must handle this by prompting manual selection
  console.warn('[Timezone Detection] All detection methods failed. User must select timezone manually.');
  return {
    timezone: null,
    source: 'failed',
    ianaTimezone: null,
  };
}

/**
 * Detect browser timezone synchronously (for compatibility with existing code).
 * 
 * Returns null when browser detection fails rather than inventing a timezone.
 * Callers must handle the null case by prompting manual selection.
 * 
 * @returns TimezoneOption from browser detection, or null if unavailable
 */
export function detectBrowserTimezone(): TimezoneOption | null {
  try {
    const detectedIana = detectBrowserIanaTimezone();
    
    if (!detectedIana) {
      return null;
    }
    
    if (!isValidIanaTimezone(detectedIana)) {
      return null;
    }
    
    return createTimezoneOption(detectedIana);
  } catch {
    return null;
  }
}
