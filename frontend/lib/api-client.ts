/**
 * API client for the Codeyoung Scheduling REST API.
 * 
 * Provides typed functions for communicating with the backend.
 * No business logic - pure HTTP communication layer.
 */

import { API_CONFIG } from './api-config';
import type {
  GetAvailabilityRequest,
  GetAvailabilityResponse,
  CreateBookingRequest,
  BookingResponse,
  ProblemDetails,
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
} from '@/types/api.types';

// Re-export error classes for convenience
export {
  ValidationError,
  NotFoundError,
  ConflictError,
  ServerError,
  NetworkError,
} from '@/types/api.types';

/**
 * Build query string from object
 */
function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Parse error response and throw appropriate error
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let problemDetails: ProblemDetails | undefined;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      problemDetails = await response.json();
    }
  } catch {
    // Failed to parse error body, continue without it
  }

  const detail = problemDetails?.detail || `HTTP ${response.status} error`;

  switch (response.status) {
    case 400: {
      const { ValidationError } = await import('@/types/api.types');
      throw new ValidationError(detail, problemDetails);
    }
    case 404: {
      const { NotFoundError } = await import('@/types/api.types');
      throw new NotFoundError(detail, problemDetails);
    }
    case 409: {
      const { ConflictError } = await import('@/types/api.types');
      const conflictType = problemDetails?.conflictType || 'SLOT_UNAVAILABLE';
      throw new ConflictError(detail, conflictType, problemDetails);
    }
    case 500: {
      const { ServerError } = await import('@/types/api.types');
      throw new ServerError(detail, problemDetails);
    }
    default: {
      const { ApiError } = await import('@/types/api.types');
      throw new ApiError(detail, response.status, problemDetails);
    }
  }
}

/**
 * GET /api/availability
 * 
 * Retrieves available trial class slots for a given date and timezone.
 * 
 * @param request - Availability request parameters
 * @returns Available slots with eligible mentor IDs
 * @throws ValidationError (400) - Invalid parameters
 * @throws ServerError (500) - Server error
 * @throws NetworkError - Network/fetch failure
 */
export async function getAvailability(
  request: GetAvailabilityRequest
): Promise<GetAvailabilityResponse> {
  try {
    const queryString = buildQueryString({
      parentDate: request.parentDate,
      parentTimezone: request.parentTimezone,
      trialDurationMinutes: request.trialDurationMinutes,
      preferredStartTime: request.preferredStartTime,
    });

    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AVAILABILITY}${queryString}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
      },
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    });

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data: GetAvailabilityResponse = await response.json();
    return data;
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof Error && error.name !== 'Error') {
      throw error;
    }

    // Wrap fetch/network errors
    const { NetworkError } = await import('@/types/api.types');
    throw new NetworkError('Failed to fetch availability', error);
  }
}

/**
 * POST /api/bookings
 * 
 * Creates a trial class booking with idempotency support.
 * 
 * @param request - Booking request data
 * @param idempotencyKey - Unique key for request deduplication
 * @returns Booking confirmation with mentor and class URL
 * @throws ValidationError (400) - Invalid input
 * @throws ConflictError (409) - Slot unavailable or conflict
 * @throws ServerError (500) - Server error
 * @throws NetworkError - Network/fetch failure
 */
export async function createBooking(
  request: CreateBookingRequest,
  idempotencyKey: string
): Promise<BookingResponse> {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.BOOKINGS}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
    });

    if (!response.ok) {
      await handleErrorResponse(response);
    }

    const data: BookingResponse = await response.json();
    return data;
  } catch (error) {
    // Re-throw our custom errors
    if (error instanceof Error && error.name !== 'Error') {
      throw error;
    }

    // Wrap fetch/network errors
    const { NetworkError } = await import('@/types/api.types');
    throw new NetworkError('Failed to create booking', error);
  }
}

/**
 * Generate a unique idempotency key for booking requests.
 * 
 * Uses timestamp and random values to ensure uniqueness.
 * In production, you might want to use UUID or similar.
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `booking-${timestamp}-${random}`;
}
