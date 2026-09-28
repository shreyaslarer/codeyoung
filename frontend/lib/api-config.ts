/**
 * API configuration for the Codeyoung Scheduling API.
 * 
 * The base URL is configurable through environment variables.
 * Defaults to localhost for development.
 */

/**
 * Get the API base URL from environment or default to localhost
 */
function getApiBaseUrl(): string {
  // Check Next.js public environment variables
  if (typeof window !== 'undefined') {
    // Client-side
    const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (publicApiUrl) {
      return publicApiUrl;
    }
  } else {
    // Server-side
    const apiUrl = process.env.API_URL;
    if (apiUrl) {
      return apiUrl;
    }
  }

  // Default to localhost for development
  return 'http://localhost:3001';
}

/**
 * API configuration
 */
export const API_CONFIG = {
  /**
   * Base URL for the API (without trailing slash)
   */
  BASE_URL: getApiBaseUrl(),

  /**
   * API endpoints
   */
  ENDPOINTS: {
    AVAILABILITY: '/api/availability',
    BOOKINGS: '/api/bookings',
  },

  /**
   * Request headers
   */
  HEADERS: {
    CONTENT_TYPE: 'application/json',
  },

  /**
   * Request timeout in milliseconds
   */
  TIMEOUT: 30000, // 30 seconds
} as const;
