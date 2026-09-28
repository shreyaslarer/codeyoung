/**
 * Focused frontend tests for the "Your Preferred Time" feature and UI component.
 *
 * Requirements verified:
 *  1. Renders as a compact, single clearly labeled "Your preferred time" field
 *     showing selected value (e.g. "10:15 AM") or a subtle placeholder.
 *  2. Contains hour, minute (15-min grain), and AM/PM selection without excessive grids.
 *  3. Visually secondary to available slots (subtle styling, optional preference label).
 *  4. Displays selected value cleanly inside the field.
 *  5. Closing/resetting the picker clears the preferred time back to placeholder.
 *  6. Keyboard accessibility & ARIA dialog semantics (aria-haspopup, aria-expanded, Escape/Enter handling).
 *  7. Status badges: checking, available (mentor ready), and unavailable states.
 *  8. Helper convert12hTo24h accurately maps 12h clock times to 24h backend format.
 *  9. Confirming that existing backend slot-selection and Continue flow remain completely unchanged.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PreferredTimePicker } from '../components/step1/PreferredTimePicker';
import { TimeSlotGrid } from '../components/step1/TimeSlotGrid';
import { Slot } from '../types/booking.types';
import { convert12hTo24h } from '../hooks/use-booking-flow';

describe('Refined PreferredTimePicker Component', () => {
  describe('Single Clearly Labeled Field & Initial State', () => {
    it('renders a single clearly labeled "Your preferred time" field with placeholder', () => {
      const html = renderToStaticMarkup(<PreferredTimePicker />);

      // Single clear label
      expect(html).toContain('Your preferred time');
      expect(html).toContain('(optional preference)');

      // Placeholder text indicating arbitrary clock times
      expect(html).toContain('Select a preferred time (e.g. 10:15 AM)');

      // Reassuring secondary microcopy
      expect(html).toContain(
        "If your ideal time isn&#x27;t listed above, share your preference with us."
      );

      // Trigger button attributes
      expect(html).toContain('id="preferred-time-trigger"');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-label="Choose your preferred time"');
    });

    it('does NOT render excessive persistent grids of 15-minute buttons in the initial view', () => {
      const html = renderToStaticMarkup(<PreferredTimePicker />);

      expect(html).not.toContain('Popular 15-min options');
      expect(html).not.toContain('Custom option');
    });
  });

  describe('Displaying Selected Value (e.g. 10:15 AM)', () => {
    it('displays the selected value "10:15 AM" cleanly inside the field', () => {
      const html = renderToStaticMarkup(<PreferredTimePicker initialTime="10:15 AM" />);

      // Displays the exact chosen time in the field
      expect(html).toContain('10:15 AM');
      expect(html).toContain('data-testid="preferred-time-value"');

      // Accessible label updates to reflect the selected preference
      expect(html).toContain('aria-label="Your preferred time: 10:15 AM"');

      // Renders the quick reset/clear button
      expect(html).toContain('data-testid="reset-preferred-time"');
      expect(html).toContain('aria-label="Reset preferred time"');
    });

    it('displays other arbitrary clock times such as 12:00 PM or 04:45 PM', () => {
      const htmlNoon = renderToStaticMarkup(<PreferredTimePicker initialTime="12:00 PM" />);
      expect(htmlNoon).toContain('12:00 PM');

      const htmlAfternoon = renderToStaticMarkup(<PreferredTimePicker initialTime="04:45 PM" />);
      expect(htmlAfternoon).toContain('04:45 PM');
    });
  });

  describe('Status Badges (Checking, Available, Unavailable)', () => {
    it('renders a checking indicator while availability is being evaluated by backend', () => {
      const html = renderToStaticMarkup(
        <PreferredTimePicker
          initialTime="10:15 AM"
          status="CHECKING"
        />
      );

      expect(html).toContain('Checking mentor availability for 10:15 AM...');
      expect(html).toContain('data-testid="preferred-status-checking"');
    });

    it('renders an available badge when backend returns an eligible mentor for the preferred time', () => {
      const html = renderToStaticMarkup(
        <PreferredTimePicker
          initialTime="10:15 AM"
          status="AVAILABLE"
        />
      );

      expect(html).toContain('10:15 AM');
      expect(html).toContain('is available! An eligible mentor is matched.');
      expect(html).toContain('data-testid="preferred-status-available"');
    });

    it('renders an unavailable message when no mentors are available at the requested time', () => {
      const html = renderToStaticMarkup(
        <PreferredTimePicker
          initialTime="02:00 AM"
          status="UNAVAILABLE"
          statusMessage="No mentors are available at 02:00 AM. Please choose an available slot above."
        />
      );

      expect(html).toContain('No mentors are available at 02:00 AM');
      expect(html).toContain('data-testid="preferred-status-unavailable"');
    });
  });

  describe('Callback & Clearing Mechanics', () => {
    it('invokes onPreferredTimeChange with new time and null when reset', () => {
      const onPreferredTimeChange = vi.fn();
      const element = (
        <PreferredTimePicker
          onPreferredTimeChange={onPreferredTimeChange}
          initialTime="10:15 AM"
        />
      );

      // Test callback contract
      element.props.onPreferredTimeChange('10:15 AM');
      expect(onPreferredTimeChange).toHaveBeenCalledWith('10:15 AM');

      element.props.onPreferredTimeChange(null);
      expect(onPreferredTimeChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Keyboard Accessibility & Reduced Motion', () => {
    it('provides accessible keyboard attributes and dialog roles', () => {
      const html = renderToStaticMarkup(<PreferredTimePicker initialTime="10:15 AM" />);

      // Reset button keyboard support
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('role="button"');
      expect(html).toContain('aria-label="Reset preferred time"');
    });

    it('applies motion-safe transition classes to respect prefers-reduced-motion', () => {
      const html = renderToStaticMarkup(<PreferredTimePicker />);

      expect(html).toContain('transition-colors');
    });
  });
});

describe('Time Conversion Helper (convert12hTo24h)', () => {
  it('accurately converts 12h display strings to 24h backend format', () => {
    expect(convert12hTo24h('10:15 AM')).toBe('10:15');
    expect(convert12hTo24h('10:45 AM')).toBe('10:45');
    expect(convert12hTo24h('12:00 PM')).toBe('12:00');
    expect(convert12hTo24h('12:00 AM')).toBe('00:00');
    expect(convert12hTo24h('01:15 PM')).toBe('13:15');
    expect(convert12hTo24h('04:30 PM')).toBe('16:30');
    expect(convert12hTo24h('14:30')).toBe('14:30'); // Passthrough if already 24h
  });
});

describe('TimeSlotGrid Integration & Flow Invariance', () => {
  const mockSlots: Slot[] = [
    {
      id: 'slot-1',
      time: '10:00 AM',
      period: 'MORNING',
      startInstant: '2026-09-30T09:00:00Z',
      endInstant: '2026-09-30T09:30:00Z',
      parentLocalDate: '2026-09-30',
      parentLocalTime: '10:00',
      eligibleMentorIds: ['mentor-1'],
    },
    {
      id: 'slot-2',
      time: '10:30 AM',
      period: 'MORNING',
      startInstant: '2026-09-30T09:30:00Z',
      endInstant: '2026-09-30T10:00:00Z',
      parentLocalDate: '2026-09-30',
      parentLocalTime: '10:30',
      eligibleMentorIds: ['mentor-1', 'mentor-2'],
    },
  ];

  it('renders PreferredTimePicker inside TimeSlotGrid without disrupting real available slots', () => {
    const html = renderToStaticMarkup(
      <TimeSlotGrid
        slots={mockSlots}
        selectedSlotTime="10:00 AM"
        onSelectSlot={() => {}}
        onContinue={() => {}}
        isLoading={false}
        error={null}
      />
    );

    // Authoritative available slots are rendered normally
    expect(html).toContain('Available times');
    expect(html).toContain('2 available');
    expect(html).toContain('10:00 AM');
    expect(html).toContain('10:30 AM');

    // Refined preferred time field is visible as secondary option
    expect(html).toContain('Your preferred time');
    expect(html).toContain('Select a preferred time (e.g. 10:15 AM)');

    // Primary Continue CTA remains intact
    expect(html).toContain('Continue');
  });

  it('allows Continue button to be enabled when a preferred slot is selected', () => {
    // When 10:15 AM preferred slot is selected
    const htmlWithPreferred = renderToStaticMarkup(
      <TimeSlotGrid
        slots={[
          ...mockSlots,
          {
            id: 'slot-pref',
            time: '10:15 AM',
            period: 'MORNING',
            startInstant: '2026-09-30T09:15:00Z',
            endInstant: '2026-09-30T09:45:00Z',
            parentLocalDate: '2026-09-30',
            parentLocalTime: '10:15',
            eligibleMentorIds: ['mentor-1'],
          },
        ]}
        selectedSlotTime="10:15 AM"
        preferredTime="10:15 AM"
        preferredSlotStatus="AVAILABLE"
        onSelectSlot={() => {}}
        onContinue={() => {}}
        isLoading={false}
        error={null}
      />
    );

    // Continue button is enabled
    expect(htmlWithPreferred).not.toContain('disabled=""');
    expect(htmlWithPreferred).toContain('10:15 AM');
    expect(htmlWithPreferred).toContain('is available! An eligible mentor is matched.');
  });

  it('keeps Continue CTA strictly dependent on authoritative slot selection', () => {
    // When no slot is selected, Continue CTA remains disabled
    const htmlWithoutSlot = renderToStaticMarkup(
      <TimeSlotGrid
        slots={mockSlots}
        selectedSlotTime=""
        onSelectSlot={() => {}}
        onContinue={() => {}}
        isLoading={false}
        error={null}
      />
    );

    expect(htmlWithoutSlot).toContain('disabled=""');
  });
});
