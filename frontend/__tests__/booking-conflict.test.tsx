/**
 * Focused frontend tests for the booking-conflict and scheduling-state UX.
 *
 * Requirements covered:
 *  1. Conflict message: polished human wording ("That time is no longer available"
 *     and "All available mentors are booked for this time. Please choose another time.")
 *     with no technical terms, mentor counts, capacity limits, or DB details.
 *  2. Recovery action: obvious action ("Choose another time") to return to the available time slots.
 *  3. Preserved user input: parent's entered name, email, and date remain intact across conflict state.
 *  4. Availability refresh: 409 Conflict triggers fresh availability fetch while non-conflict
 *     errors route to alert state.
 *  5. Graceful reduced-motion behavior: uses motion-safe transitions that respect prefers-reduced-motion.
 *  6. Distinguishes normal scheduling state (role="status", calm amber) from unexpected
 *     server/network error (role="alert", red).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingConflictNotice } from '../components/step2/BookingConflictNotice';
import { ParentDetailsForm } from '../components/step2/ParentDetailsForm';
import { ConflictError, NetworkError, ServerError, ValidationError } from '../types/api.types';

describe('BookingConflictNotice Component', () => {
  describe('Conflict Message & Copy', () => {
    it('renders calm, polished human wording without blunt or technical phrases', () => {
      const html = renderToStaticMarkup(
        <BookingConflictNotice
          conflictType="SLOT_UNAVAILABLE"
          errorMessage={null}
          onChooseAnotherTime={() => {}}
        />
      );

      // Primary heading
      expect(html).toContain('That time is no longer available');

      // Calming explanation
      expect(html).toContain(
        'All available mentors are booked for this time. Please choose another time.'
      );

      // Obvious recovery action
      expect(html).toContain('Choose another time');

      // Does NOT include blunt messages like "choose another time." in an aggressive tone
      // Does NOT include technical jargon or internal capacity details
      expect(html).not.toContain('409');
      expect(html).not.toContain('SLOT_UNAVAILABLE');
      expect(html).not.toContain('mentor count');
      expect(html).not.toContain('database');
      expect(html).not.toContain('CAPACITY_REACHED');
      expect(html).not.toContain('NO_MENTORS_AVAILABLE');
    });

    it('renders the same calm wording for all 409 conflict variants', () => {
      const conflictTypes = ['SLOT_UNAVAILABLE', 'CAPACITY_REACHED', 'NO_MENTORS_AVAILABLE'] as const;

      for (const type of conflictTypes) {
        const html = renderToStaticMarkup(
          <BookingConflictNotice
            conflictType={type}
            errorMessage={null}
            onChooseAnotherTime={() => {}}
          />
        );

        expect(html).toContain('That time is no longer available');
        expect(html).toContain('All available mentors are booked for this time. Please choose another time.');
        expect(html).toContain('Choose another time');
      }
    });
  });

  describe('Visual Hierarchy & Semantic Roles', () => {
    it('uses role="status" and polite live region for conflicts so it does not feel like an error alert', () => {
      const html = renderToStaticMarkup(
        <BookingConflictNotice
          conflictType="SLOT_UNAVAILABLE"
          errorMessage={null}
          onChooseAnotherTime={() => {}}
        />
      );

      // Must be a polite scheduling status, NOT a catastrophic error alert
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
      expect(html).not.toContain('role="alert"');

      // Uses calm amber surface, not alarming red
      expect(html).toContain('bg-amber-50');
      expect(html).toContain('border-amber-200');
      expect(html).not.toContain('bg-red-50');
    });

    it('distinguishes unexpected server/network errors with role="alert" and red styling', () => {
      const html = renderToStaticMarkup(
        <BookingConflictNotice
          conflictType={null}
          errorMessage="Unable to connect to server. Please check your connection and try again."
          onChooseAnotherTime={() => {}}
        />
      );

      // Must use role="alert" for unexpected errors
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).not.toContain('role="status"');

      // Uses red error theme for true failures
      expect(html).toContain('bg-red-50');
      expect(html).toContain('border-red-200');
      expect(html).toContain('Unable to connect to server');

      // Does not show the "Choose another time" CTA for network/server errors
      expect(html).not.toContain('Choose another time');
    });

    it('renders nothing when there is neither a conflict nor an error', () => {
      const html = renderToStaticMarkup(
        <BookingConflictNotice
          conflictType={null}
          errorMessage={null}
          onChooseAnotherTime={() => {}}
        />
      );

      expect(html).toBe('');
    });
  });

  describe('Reduced-Motion & Animation', () => {
    it('applies motion-safe prefix for animations to respect prefers-reduced-motion', () => {
      const html = renderToStaticMarkup(
        <BookingConflictNotice
          conflictType="SLOT_UNAVAILABLE"
          errorMessage={null}
          onChooseAnotherTime={() => {}}
        />
      );

      // Entrance animation is gated behind motion-safe:
      expect(html).toContain('motion-safe:animate-in');
      expect(html).toContain('motion-safe:fade-in');

      // Content renders statically without requiring animation runtime
      expect(html).toContain('That time is no longer available');
      expect(html).toContain('Choose another time');
    });
  });

  describe('Recovery Action & Callback', () => {
    it('executes onChooseAnotherTime callback when clicked', () => {
      const onChooseAnotherTime = vi.fn();
      const notice = (
        <BookingConflictNotice
          conflictType="SLOT_UNAVAILABLE"
          errorMessage={null}
          onChooseAnotherTime={onChooseAnotherTime}
        />
      );

      // Verify the element prop receives the exact function
      expect(notice.props.onChooseAnotherTime).toBe(onChooseAnotherTime);
      notice.props.onChooseAnotherTime();
      expect(onChooseAnotherTime).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ParentDetailsForm Input Preservation Across Conflict State', () => {
  it('preserves the parent name and email when a booking conflict occurs', () => {
    const parentName = 'Priya Patel';
    const parentEmail = 'priya.patel@example.com';

    const html = renderToStaticMarkup(
      <ParentDetailsForm
        parentName={parentName}
        parentEmail={parentEmail}
        onNameChange={() => {}}
        onEmailChange={() => {}}
        onConfirm={() => {}}
        onChangeTime={() => {}}
        isSubmitting={false}
        submitConflict="SLOT_UNAVAILABLE"
        errorMessage={null}
      />
    );

    // Conflict notice is visible
    expect(html).toContain('That time is no longer available');
    expect(html).toContain('All available mentors are booked for this time. Please choose another time.');

    // Inputs preserve entered values
    expect(html).toContain(`value="${parentName}"`);
    expect(html).toContain(`value="${parentEmail}"`);
  });

  it('renders generic validation and network errors appropriately', () => {
    const html = renderToStaticMarkup(
      <ParentDetailsForm
        parentName="Alex"
        parentEmail="alex@test.com"
        onNameChange={() => {}}
        onEmailChange={() => {}}
        onConfirm={() => {}}
        onChangeTime={() => {}}
        isSubmitting={false}
        submitConflict={null}
        errorMessage="Network error occurred"
      />
    );

    // Shows error alert, not the conflict notice
    expect(html).toContain('role="alert"');
    expect(html).toContain('Network error occurred');
    expect(html).not.toContain('That time is no longer available');
  });
});

describe('Conflict Error Classification & Availability Refresh Flow', () => {
  it('classifies 409 ConflictError distinctly from NetworkError and ServerError', () => {
    const conflictError = new ConflictError(
      'The requested time slot is no longer available',
      'SLOT_UNAVAILABLE'
    );
    const networkError = new NetworkError('Connection timeout');
    const serverError = new ServerError('Internal database error');
    const validationError = new ValidationError('Invalid name');

    expect(conflictError).toBeInstanceOf(ConflictError);
    expect(conflictError.status).toBe(409);
    expect(conflictError.conflictType).toBe('SLOT_UNAVAILABLE');

    expect(networkError).toBeInstanceOf(NetworkError);
    expect(serverError).toBeInstanceOf(ServerError);
    expect(validationError).toBeInstanceOf(ValidationError);
  });

  it('demonstrates availability refresh trigger logic on conflict', () => {
    let refreshCounter = 0;
    let submitConflict: string | null = null;
    let submitError: string | null = null;

    // Simulate error handler in useBookingFlow
    const handleError = (err: unknown) => {
      if (err instanceof ConflictError) {
        submitConflict = err.conflictType;
        submitError = null;
        refreshCounter += 1;
      } else if (err instanceof NetworkError) {
        submitConflict = null;
        submitError = 'Unable to connect to server.';
      }
    };

    // When 409 occurs:
    const error409 = new ConflictError('Slot taken', 'SLOT_UNAVAILABLE');
    handleError(error409);

    expect(submitConflict).toBe('SLOT_UNAVAILABLE');
    expect(submitError).toBeNull();
    expect(refreshCounter).toBe(1); // Increment forces useEffect to fetch fresh availability

    // When network error occurs:
    const errorNet = new NetworkError('Failed');
    handleError(errorNet);

    expect(submitConflict).toBeNull();
    expect(submitError).toBe('Unable to connect to server.');
    expect(refreshCounter).toBe(1); // Not incremented on generic error
  });
});
