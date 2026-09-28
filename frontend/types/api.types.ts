/**
 * API types for the Codeyoung Scheduling REST API.
 * These types match the actual backend API contract.
 */

// ============================================================================
// Availability API Types
// ============================================================================

/**
 * Request parameters for GET /api/availability
 */
export interface GetAvailabilityRequest {
  parentDate: string;           // YYYY-MM-DD format
  parentTimezone: string;       // IANA timezone identifier
  trialDurationMinutes?: number; // Optional, defaults to 30
  preferredStartTime?: string;  // Optional arbitrary time (e.g., "10:15", "10:45", "12:00")
}

/**
 * A single available time slot
 */
export interface AvailabilitySlot {
  startInstant: string;         // ISO 8601 UTC instant
  endInstant: string;           // ISO 8601 UTC instant
  parentLocalDate: string;      // YYYY-MM-DD in parent's timezone
  parentLocalTime: string;      // HH:MM in parent's timezone
  eligibleMentorIds: string[];  // Mentor IDs that can handle this slot
}

/**
 * Response from GET /api/availability
 */
export interface GetAvailabilityResponse {
  parentDate: string;
  parentTimezone: string;
  trialDurationMinutes: number;
  slots: AvailabilitySlot[];
  preferredSlot?: AvailabilitySlot | null; // Evaluated slot if preferredStartTime was requested
}

// ============================================================================
// Booking API Types
// ============================================================================

/**
 * Request body for POST /api/bookings
 */
export interface CreateBookingRequest {
  parentName: string;
  parentEmail: string;
  parentLocalDate: string;      // YYYY-MM-DD format
  parentLocalTime: string;      // HH:MM format
  parentTimezone: string;       // IANA timezone identifier
  trialDurationMinutes: number;
}

/**
 * Successful booking response from POST /api/bookings
 */
export interface BookingResponse {
  id: string;
  mentorId: string;
  parentName: string;
  parentEmail: string;
  startTime: string;            // ISO 8601 UTC instant
  endTime: string;              // ISO 8601 UTC instant
  parentTimezone: string;
  status: 'CONFIRMED' | 'CANCELLED';
  classUrl: string;
}

// ============================================================================
// Error Types (Problem Details Format)
// ============================================================================

/**
 * Standard Problem Details error format
 * Used for 400, 404, 409, 500 responses
 */
export interface ProblemDetails {
  type: string;                 // Problem type URI
  title: string;                // Short human-readable title
  status: number;               // HTTP status code
  detail: string;               // Detailed explanation
  conflictType?: BookingConflictType; // Only present for 409 conflicts
}

/**
 * Types of booking conflicts (409 responses)
 */
export type BookingConflictType = 
  | 'SLOT_UNAVAILABLE'
  | 'CAPACITY_REACHED'
  | 'NO_MENTORS_AVAILABLE';

// ============================================================================
// API Error Classes
// ============================================================================

/**
 * Base class for all API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly problemDetails?: ProblemDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 400 Bad Request - Validation error or invalid input
 */
export class ValidationError extends ApiError {
  constructor(detail: string, problemDetails?: ProblemDetails) {
    super(detail, 400, problemDetails);
    this.name = 'ValidationError';
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(detail: string, problemDetails?: ProblemDetails) {
    super(detail, 404, problemDetails);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 Conflict - Booking conflict (slot unavailable, capacity reached)
 */
export class ConflictError extends ApiError {
  constructor(
    detail: string,
    public readonly conflictType: BookingConflictType,
    problemDetails?: ProblemDetails
  ) {
    super(detail, 409, problemDetails);
    this.name = 'ConflictError';
  }
}

/**
 * 500 Internal Server Error - Unexpected server failure
 */
export class ServerError extends ApiError {
  constructor(detail: string, problemDetails?: ProblemDetails) {
    super(detail, 500, problemDetails);
    this.name = 'ServerError';
  }
}

/**
 * Network error - Request failed before reaching server
 */
export class NetworkError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}
