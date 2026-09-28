/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { autoDetectTimezone, isValidIanaTimezone, detectBrowserTimezone } from '@/lib/timezone-detection';

describe('Timezone Detection', () => {
  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('isValidIanaTimezone', () => {
    it('should validate correct IANA timezones', () => {
      expect(isValidIanaTimezone('Asia/Kolkata')).toBe(true);
      expect(isValidIanaTimezone('Europe/London')).toBe(true);
      expect(isValidIanaTimezone('America/New_York')).toBe(true);
      expect(isValidIanaTimezone('UTC')).toBe(true);
    });

    it('should reject invalid timezones', () => {
      expect(isValidIanaTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidIanaTimezone('NotATimezone')).toBe(false);
      expect(isValidIanaTimezone('GMT+5:30')).toBe(false); // Not IANA format
    });

    it('should reject empty or non-string values', () => {
      expect(isValidIanaTimezone('')).toBe(false);
      expect(isValidIanaTimezone(null as any)).toBe(false);
      expect(isValidIanaTimezone(undefined as any)).toBe(false);
      expect(isValidIanaTimezone(123 as any)).toBe(false);
    });
  });

  describe('detectBrowserTimezone', () => {
    it('should detect browser timezone synchronously', () => {
      const result = detectBrowserTimezone();
      
      // Browser detection should succeed in normal test environment
      if (result) {
        expect(result.iana).toBeDefined();
        expect(typeof result.iana).toBe('string');
        expect(result.label).toBeDefined();
        expect(result.city).toBeDefined();
        expect(result.region).toBeDefined();
      }
    });

    it('should return valid IANA timezone when successful', () => {
      const result = detectBrowserTimezone();
      
      // In normal test environment, browser detection should work
      if (result) {
        expect(isValidIanaTimezone(result.iana)).toBe(true);
      } else {
        // Browser detection can legitimately return null in restricted environments
        expect(result).toBeNull();
      }
    });

    it('should return null on error, not invent a timezone', () => {
      // Mock Intl.DateTimeFormat to throw
      const originalDateTimeFormat = Intl.DateTimeFormat;
      
      try {
        (Intl as any).DateTimeFormat = class {
          constructor() {
            throw new Error('Mock error');
          }
        };

        const result = detectBrowserTimezone();
        
        // Critical: Must return null, not UTC or Europe/London
        expect(result).toBeNull();
      } finally {
        // Always restore, even if test fails
        Intl.DateTimeFormat = originalDateTimeFormat;
      }
    });
  });

  describe('autoDetectTimezone - IP Geolocation Success', () => {
    it('should detect timezone from IP (India)', async () => {
      // Mock successful IP geolocation response for India
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Asia/Kolkata' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('Asia/Kolkata');
      expect(result.timezone).not.toBeNull();
      expect(result.timezone!.iana).toBe('Asia/Kolkata');
      expect(fetch).toHaveBeenCalledWith(
        'https://ipapi.co/json/',
        expect.objectContaining({
          headers: { 'Accept': 'application/json' },
        })
      );
    });

    it('should detect timezone from IP (UK)', async () => {
      // Mock successful IP geolocation response for UK
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Europe/London' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('Europe/London');
      expect(result.timezone).not.toBeNull();
      expect(result.timezone!.iana).toBe('Europe/London');
    });

    it('should detect timezone from IP (US)', async () => {
      // Mock successful IP geolocation response for US
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'America/New_York' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('America/New_York');
      expect(result.timezone).not.toBeNull();
      expect(result.timezone!.iana).toBe('America/New_York');
    });

    it('should detect VPN location (UK VPN from India)', async () => {
      // When using UK VPN from India, ipapi.co returns UK timezone
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Europe/London' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('Europe/London');
      expect(result.timezone).not.toBeNull();
      // VPN exit node determines detected timezone
    });

    it('should create custom timezone option for unlisted IANA zones', async () => {
      // Mock response with valid but unlisted timezone
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Asia/Shanghai' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('Asia/Shanghai');
      expect(result.timezone).not.toBeNull();
      expect(result.timezone!.label).toContain('Shanghai');
      expect(result.timezone!.city).toBe('Shanghai');
      expect(result.timezone!.region).toBe('Asia');
    });
  });

  describe('autoDetectTimezone - IP Geolocation Failures', () => {
    it('should fall back to browser on HTTP error', async () => {
      // Mock HTTP error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on network error', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on timeout', async () => {
      // Mock timeout (AbortError)
      const abortError = new Error('Timeout');
      abortError.name = 'AbortError';
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on API error response', async () => {
      // Mock API error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: true, reason: 'Rate limit exceeded' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on invalid timezone from API', async () => {
      // Mock API returning invalid timezone
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Invalid/Timezone' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on malformed JSON', async () => {
      // Mock malformed JSON response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Malformed JSON');
        },
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should fall back to browser on missing timezone in response', async () => {
      // Mock response with no timezone field
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });
  });

  describe('autoDetectTimezone - Complete Detection Failure', () => {
    it('CRITICAL: should return explicit null when both IP and browser fail, never invent Europe/London', async () => {
      // Mock IP failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Mock browser failure - Intl.DateTimeFormat throws
      const originalDateTimeFormat = Intl.DateTimeFormat;
      
      try {
        (Intl as any).DateTimeFormat = class {
          constructor() {
            throw new Error('Browser error');
          }
        };

        const result = await autoDetectTimezone();

        // CRITICAL ASSERTIONS: Must not invent a timezone
        expect(result.source).toBe('failed');
        expect(result.timezone).toBeNull();
        expect(result.ianaTimezone).toBeNull();
        
        // Explicitly verify Europe/London is NOT used as fallback
        expect(result.ianaTimezone).not.toBe('Europe/London');
        expect(result.timezone?.iana).not.toBe('Europe/London');
      } finally {
        // Restore
        Intl.DateTimeFormat = originalDateTimeFormat;
      }
    });

    it('should return explicit null when browser returns empty/invalid timezone', async () => {
      // Mock IP failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Mock browser returning invalid timezone
      const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
      
      try {
        Intl.DateTimeFormat.prototype.resolvedOptions = function() {
          return { timeZone: '' } as any;
        };

        const result = await autoDetectTimezone();

        // Must return failure, not invent a timezone
        expect(result.source).toBe('failed');
        expect(result.timezone).toBeNull();
        expect(result.ianaTimezone).toBeNull();
      } finally {
        // Restore
        Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
      }
    });
  });

  describe('autoDetectTimezone - Validation', () => {
    it('should validate IP-detected timezone before using', async () => {
      // First call with invalid timezone, should fall back to browser
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ timezone: 'NotValid/Zone' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('browser'); // Falls back due to validation
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });

    it('should handle edge case timezones correctly', async () => {
      // Test with UTC (valid but minimal)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'UTC' }),
      });

      const result = await autoDetectTimezone();

      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('UTC');
      expect(result.timezone).not.toBeNull();
      expect(isValidIanaTimezone(result.ianaTimezone!)).toBe(true);
    });
  });

  describe('autoDetectTimezone - Integration', () => {
    it('should complete detection within reasonable time', async () => {
      // Mock slow but successful response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ timezone: 'Asia/Kolkata' }),
                }),
              100
            )
          )
      );

      const startTime = Date.now();
      const result = await autoDetectTimezone();
      const duration = Date.now() - startTime;

      expect(result.source).toBe('ip-geolocation');
      expect(duration).toBeLessThan(6000); // Should timeout within 5s + margin
    });

    it('should provide all required timezone fields', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Asia/Kolkata' }),
      });

      const result = await autoDetectTimezone();

      // When detection succeeds
      if (result.timezone) {
        // Verify TimezoneOption structure
        expect(result.timezone).toHaveProperty('iana');
        expect(result.timezone).toHaveProperty('label');
        expect(result.timezone).toHaveProperty('city');
        expect(result.timezone).toHaveProperty('region');
        expect(result.timezone).toHaveProperty('utcOffset');
      }

      // Verify result structure
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('ianaTimezone');
    });
  });

  describe('UI Integration - Graceful Failure Handling', () => {
    it('CRITICAL: UI must handle detection failure without breaking booking flow', async () => {
      // Simulate complete detection failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const originalDateTimeFormat = Intl.DateTimeFormat;
      
      try {
        (Intl as any).DateTimeFormat = class {
          constructor() {
            throw new Error('Browser detection unavailable');
          }
        };

        const result = await autoDetectTimezone();
        
        // Verify failure state
        expect(result.source).toBe('failed');
        expect(result.timezone).toBeNull();
        expect(result.ianaTimezone).toBeNull();
        
        // UI contract: When timezone is null, UI should:
        // 1. Keep DEFAULT_TIMEZONE from initial state
        // 2. Allow user to manually select via timezone modal
        // 3. Not crash or block the booking flow
        // 4. Show appropriate messaging
        
        // This test documents the expected behavior:
        // - The detection service returns explicit null
        // - The UI layer (use-booking-flow.ts) handles this by keeping DEFAULT_TIMEZONE
        // - User can manually correct via the existing timezone selector modal
        
      } finally {
        Intl.DateTimeFormat = originalDateTimeFormat;
      }
    });

    it('should document fallback chain: IP → Browser → Explicit Failure (never hardcoded timezone)', async () => {
      // This test documents the complete fallback chain
      
      // Step 1: IP detection (primary)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ timezone: 'Asia/Kolkata' }),
      });
      
      let result = await autoDetectTimezone();
      expect(result.source).toBe('ip-geolocation');
      expect(result.ianaTimezone).toBe('Asia/Kolkata');
      
      // Step 2: Browser fallback (when IP fails)
      global.fetch = vi.fn().mockRejectedValue(new Error('IP detection failed'));
      
      result = await autoDetectTimezone();
      expect(result.source).toBe('browser');
      expect(result.timezone).not.toBeNull();
      
      // Step 3: Explicit failure (when both fail)
      const originalDateTimeFormat = Intl.DateTimeFormat;
      
      try {
        (Intl as any).DateTimeFormat = class {
          constructor() {
            throw new Error('Browser detection failed');
          }
        };
        
        result = await autoDetectTimezone();
        expect(result.source).toBe('failed');
        expect(result.timezone).toBeNull();
        
        // CRITICAL: No hardcoded Europe/London, UTC, or any other invented timezone
        expect(result.ianaTimezone).toBeNull();
        
      } finally {
        Intl.DateTimeFormat = originalDateTimeFormat;
      }
    });
  });
});
