/**
 * Tests for the API client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAvailability,
  createBooking,
  generateIdempotencyKey,
  ValidationError,
  ConflictError,
  ServerError,
  NetworkError,
} from '../lib/api-client';
import type {
  GetAvailabilityResponse,
  BookingResponse,
} from '../types/api.types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    mockFetch.mockReset();
  });

  describe('getAvailability', () => {
    it('should successfully fetch availability with correct query string', async () => {
      const mockResponse: GetAvailabilityResponse = {
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        slots: [
          {
            startInstant: '2026-09-30T03:30:00Z',
            endInstant: '2026-09-30T04:00:00Z',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '04:30',
            eligibleMentorIds: ['id1', 'id2'],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await getAvailability({
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('/api/availability');
      expect(callUrl).toContain('parentDate=2026-09-30');
      expect(callUrl).toContain('parentTimezone=Europe%2FLondon');
      expect(callUrl).toContain('trialDurationMinutes=30');
    });

    it('should use default duration when not provided', async () => {
      const mockResponse: GetAvailabilityResponse = {
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        slots: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await getAvailability({
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('parentDate=2026-09-30');
      expect(callUrl).not.toContain('trialDurationMinutes');
    });

    it('should throw ValidationError on 400 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          type: 'https://codeyoung.dev/problems/invalid-parameter',
          title: 'Invalid Parameter',
          status: 400,
          detail: 'parentDate is required',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(
        getAvailability({
          parentDate: '',
          parentTimezone: 'Europe/London',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ServerError on 500 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          type: 'https://codeyoung.dev/problems/internal-error',
          title: 'Internal Server Error',
          status: 500,
          detail: 'An unexpected error occurred',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(
        getAvailability({
          parentDate: '2026-09-30',
          parentTimezone: 'Europe/London',
        })
      ).rejects.toThrow(ServerError);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        getAvailability({
          parentDate: '2026-09-30',
          parentTimezone: 'Europe/London',
        })
      ).rejects.toThrow(NetworkError);
    });

    it('should handle empty slots array', async () => {
      const mockResponse: GetAvailabilityResponse = {
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
        slots: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await getAvailability({
        parentDate: '2026-09-30',
        parentTimezone: 'Europe/London',
      });

      expect(result.slots).toEqual([]);
    });
  });

  describe('createBooking', () => {
    it('should successfully create booking with correct body and headers', async () => {
      const mockResponse: BookingResponse = {
        id: '507f1f77bcf86cd799439011',
        mentorId: '6ab7e2998513d10a0e78ce0c',
        parentName: 'Jane Doe',
        parentEmail: 'jane@example.com',
        startTime: '2026-09-30T13:30:00.000Z',
        endTime: '2026-09-30T14:00:00.000Z',
        parentTimezone: 'Europe/London',
        status: 'CONFIRMED',
        classUrl: 'https://meet.codeyoung.dev/abc123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request = {
        parentName: 'Jane Doe',
        parentEmail: 'jane@example.com',
        parentLocalDate: '2026-09-30',
        parentLocalTime: '14:30',
        parentTimezone: 'Europe/London',
        trialDurationMinutes: 30,
      };

      const result = await createBooking(request, 'test-key-123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      const callUrl = callArgs[0];
      const callOptions = callArgs[1];

      expect(callUrl).toContain('/api/bookings');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers['Idempotency-Key']).toBe('test-key-123');
      expect(callOptions.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(callOptions.body);
      expect(body).toEqual(request);
    });

    it('should throw ValidationError on 400 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          type: 'https://codeyoung.dev/problems/validation-error',
          title: 'Validation Error',
          status: 400,
          detail: 'Invalid email format',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(
        createBooking(
          {
            parentName: 'Jane Doe',
            parentEmail: 'invalid-email',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '14:30',
            parentTimezone: 'Europe/London',
            trialDurationMinutes: 30,
          },
          'test-key'
        )
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError on 409 response with conflict type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          type: 'https://codeyoung.dev/problems/booking-conflict',
          title: 'Booking Conflict',
          status: 409,
          detail: 'The requested time slot is no longer available',
          conflictType: 'SLOT_UNAVAILABLE',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      try {
        await createBooking(
          {
            parentName: 'Jane Doe',
            parentEmail: 'jane@example.com',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '14:30',
            parentTimezone: 'Europe/London',
            trialDurationMinutes: 30,
          },
          'test-key'
        );
        expect.fail('Should have thrown ConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        if (error instanceof ConflictError) {
          expect(error.conflictType).toBe('SLOT_UNAVAILABLE');
        }
      }
    });

    it('should include Idempotency-Key header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'test-id',
          mentorId: 'mentor-id',
          parentName: 'Test',
          parentEmail: 'test@example.com',
          startTime: '2026-09-30T13:30:00Z',
          endTime: '2026-09-30T14:00:00Z',
          parentTimezone: 'Europe/London',
          status: 'CONFIRMED',
          classUrl: 'https://meet.codeyoung.dev/test',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const idempotencyKey = 'unique-key-12345';

      await createBooking(
        {
          parentName: 'Test',
          parentEmail: 'test@example.com',
          parentLocalDate: '2026-09-30',
          parentLocalTime: '14:30',
          parentTimezone: 'Europe/London',
          trialDurationMinutes: 30,
        },
        idempotencyKey
      );

      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers['Idempotency-Key']).toBe(idempotencyKey);
    });

    it('should serialize request body correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'test',
          mentorId: 'test',
          parentName: 'Test',
          parentEmail: 'test@example.com',
          startTime: '2026-09-30T13:30:00Z',
          endTime: '2026-09-30T14:00:00Z',
          parentTimezone: 'Europe/London',
          status: 'CONFIRMED',
          classUrl: 'https://test.com',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const request = {
        parentName: 'John Doe',
        parentEmail: 'john@example.com',
        parentLocalDate: '2026-10-01',
        parentLocalTime: '15:00',
        parentTimezone: 'America/New_York',
        trialDurationMinutes: 45,
      };

      await createBooking(request, 'test-key');

      const callBody = mockFetch.mock.calls[0][1].body;
      const parsedBody = JSON.parse(callBody);

      expect(parsedBody).toEqual(request);
      expect(parsedBody.parentName).toBe('John Doe');
      expect(parsedBody.trialDurationMinutes).toBe(45);
    });

    it('should throw ServerError on 500 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          type: 'https://codeyoung.dev/problems/internal-error',
          title: 'Internal Server Error',
          status: 500,
          detail: 'Database connection failed',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await expect(
        createBooking(
          {
            parentName: 'Test',
            parentEmail: 'test@example.com',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '14:30',
            parentTimezone: 'Europe/London',
            trialDurationMinutes: 30,
          },
          'test-key'
        )
      ).rejects.toThrow(ServerError);
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        createBooking(
          {
            parentName: 'Test',
            parentEmail: 'test@example.com',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '14:30',
            parentTimezone: 'Europe/London',
            trialDurationMinutes: 30,
          },
          'test-key'
        )
      ).rejects.toThrow(NetworkError);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();
      const key3 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('should generate keys with correct format', () => {
      const key = generateIdempotencyKey();

      expect(key).toMatch(/^booking-\d+-[a-z0-9]+$/);
      expect(key.startsWith('booking-')).toBe(true);
    });

    it('should include timestamp in key', () => {
      const beforeTimestamp = Date.now();
      const key = generateIdempotencyKey();
      const afterTimestamp = Date.now();

      const parts = key.split('-');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('Error Handling', () => {
    it('should parse Problem Details from 400 error', async () => {
      const problemDetails = {
        type: 'https://codeyoung.dev/problems/invalid-parameter',
        title: 'Invalid Parameter',
        status: 400,
        detail: 'parentDate must be in YYYY-MM-DD format',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => problemDetails,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      try {
        await getAvailability({
          parentDate: 'invalid',
          parentTimezone: 'Europe/London',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.problemDetails).toEqual(problemDetails);
          expect(error.message).toBe(problemDetails.detail);
        }
      }
    });

    it('should parse conflict type from 409 error', async () => {
      const problemDetails = {
        type: 'https://codeyoung.dev/problems/booking-conflict',
        title: 'Booking Conflict',
        status: 409,
        detail: 'Mentor has reached daily capacity',
        conflictType: 'CAPACITY_REACHED',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => problemDetails,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      try {
        await createBooking(
          {
            parentName: 'Test',
            parentEmail: 'test@example.com',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '14:30',
            parentTimezone: 'Europe/London',
            trialDurationMinutes: 30,
          },
          'test-key'
        );
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        if (error instanceof ConflictError) {
          expect(error.conflictType).toBe('CAPACITY_REACHED');
          expect(error.problemDetails).toEqual(problemDetails);
        }
      }
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON');
        },
        headers: new Headers({ 'content-type': 'text/html' }),
      });

      await expect(
        getAvailability({
          parentDate: '2026-09-30',
          parentTimezone: 'Europe/London',
        })
      ).rejects.toThrow(ServerError);
    });
  });
});
