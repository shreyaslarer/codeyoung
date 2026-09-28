import { describe, it, expect } from 'vitest';
import { detectBrowserTimezone } from '@/lib/timezone-utils';
import { DEFAULT_TIMEZONE, POPULAR_TIMEZONES } from '@/constants/timezones.constants';

describe('Timezone Utilities', () => {
  it('should return a valid timezone option from detectBrowserTimezone', () => {
    const tz = detectBrowserTimezone();
    expect(tz).toBeDefined();
    expect(tz.iana).toBeTypeOf('string');
    expect(tz.label).toBeTypeOf('string');
    expect(tz.city).toBeTypeOf('string');
  });

  it('should have London as DEFAULT_TIMEZONE with Europe/London IANA', () => {
    expect(DEFAULT_TIMEZONE.iana).toBe('Europe/London');
    expect(DEFAULT_TIMEZONE.label).toContain('London');
  });

  it('should contain popular timezones across major regions', () => {
    const ianaList = POPULAR_TIMEZONES.map((t) => t.iana);
    expect(ianaList).toContain('Europe/London');
    expect(ianaList).toContain('America/New_York');
    expect(ianaList).toContain('Asia/Kolkata');
    expect(ianaList).toContain('Asia/Dubai');
  });
});
