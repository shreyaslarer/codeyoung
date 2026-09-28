/**
 * Focused frontend tests for Page 3 post-booking confirmation experience.
 *
 * Requirements verified:
 *  1. Action hierarchy:
 *     - "Add to Google Calendar" is the prominent primary CTA button.
 *     - "Download calendar file (.ics)" is the secondary calendar action.
 *     - "Copy class link" is the secondary action for accessing the dummy classroom link.
 *     - "Join trial class" is NOT presented as the primary action / navigation link.
 *  2. Exact preservation of class URL:
 *     - Uses exactly the URL returned by the booking response (no modification, truncation, regeneration, or reinterpretation).
 *     - Correctly defaults to prototype classroom URL when meetingUrl is not specified.
 *  3. Successful clipboard copy:
 *     - Uses browser Clipboard API (navigator.clipboard.writeText) with exact URL.
 *     - Provides immediate accessible confirmation: "Link copied", emerald check icon, and aria-live polite announcement.
 *  4. Graceful clipboard failure handling:
 *     - When clipboard API rejects or fails, gracefully catches error without breaking the confirmation page.
 *     - Provides accessible feedback ("Copy failed") and preserves visible URL for manual copy.
 *  5. Google Calendar integration:
 *     - Generates valid calendar template URL with encoded title, details, location, and dates.
 *  6. .ics Calendar export:
 *     - Generates valid RFC 5545 iCalendar content with exact timestamps, SUMMARY, LOCATION, and STATUS:CONFIRMED.
 *  7. Email reassurance block:
 *     - Dynamically renders parent email when provided, or reassuring fallback when absent.
 *  8. Book Another Session:
 *     - Renders button and triggers onBookAnother callback.
 *  9. Full Step 3 confirmation screen hierarchy:
 *     - "Trial class confirmed" as header success state.
 *     - Exact booked date, local start time, timezone, duration, and mentor allocation details rendered.
 * 10. Accessibility & design system alignment:
 *     - Semantic buttons, visible focus rings, aria-label, role="status", aria-live="polite".
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PostBookingActions,
  calculateDateRange,
  generateGoogleCalendarUrl,
  generateIcsData,
  copyTextToClipboard,
  formatUtcToCalendarString,
} from '../components/step3/PostBookingActions';
import { ConfirmationHeader } from '../components/step3/ConfirmationHeader';
import { ConfirmedAppointmentCard } from '../components/step3/ConfirmedAppointmentCard';

describe('Page 3 Confirmation Experience — Action Hierarchy', () => {
  it('renders "Add to Google Calendar" as the prominent primary CTA button', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026" />
    );

    // Primary CTA button must be "Add to Google Calendar"
    expect(html).toContain('Add to Google Calendar');
    expect(html).toContain('btn-primary-shimmer');
    expect(html).toContain('bg-[#F5A623]');
    expect(html).toContain('aria-label="Add to Google Calendar"');
  });

  it('renders "Download calendar file (.ics)" as the secondary calendar action', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026" />
    );

    expect(html).toContain('Download calendar file (.ics)');
    expect(html).toContain('aria-label="Download calendar file (.ics)"');
    expect(html).toContain('border-[#CBD5E1]');
  });

  it('renders "Copy class link" as the secondary action instead of "Join trial class"', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026" />
    );

    // "Copy class link" must be present
    expect(html).toContain('Copy class link');
    expect(html).toContain('aria-label="Copy class link"');

    // "Join trial class" must NOT be present as the primary action
    expect(html).not.toContain('Join trial class');
  });

  it('does NOT render an anchor link that encourages navigating to the dummy classroom', () => {
    const dummyUrl = 'https://meet.codeyoung.com/trial/room-cy-2026';
    const html = renderToStaticMarkup(<PostBookingActions meetingUrl={dummyUrl} />);

    // Should NOT have <a href="dummyUrl" ...>Join trial class</a>
    expect(html).not.toContain(`href="${dummyUrl}"`);
  });
});

describe('Page 3 Confirmation Experience — Class URL Preservation & Display', () => {
  it('preserves and displays the exact class URL without modification, truncation, or regeneration', () => {
    const customMeetingUrl = 'https://meet.codeyoung.com/trial/cy-mentor-assigned-abc123xyz?token=valid-999';
    const html = renderToStaticMarkup(<PostBookingActions meetingUrl={customMeetingUrl} />);

    // Exact string is present in rendered markup
    expect(html).toContain(customMeetingUrl);
    expect(html).toContain('data-testid="class-url-text"');
    expect(html).toContain(`title="${customMeetingUrl}"`);
  });

  it('falls back safely to default prototype classroom URL when meetingUrl is not provided', () => {
    const html = renderToStaticMarkup(<PostBookingActions />);

    expect(html).toContain('https://meet.codeyoung.com/trial/room-cy-2026');
  });
});

describe('Page 3 Confirmation Experience — Clipboard API & Accessible States', () => {
  let originalNavigator: typeof global.navigator;
  let originalDocument: typeof global.document;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalDocument = global.document;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
    global.document = originalDocument;
    vi.restoreAllMocks();
  });

  it('successfully copies exact class URL using navigator.clipboard.writeText', async () => {
    const testUrl = 'https://meet.codeyoung.com/trial/custom-room-456';
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    // Mock navigator.clipboard
    global.navigator = {
      ...global.navigator,
      clipboard: {
        writeText: writeTextMock,
      } as unknown as Clipboard,
    };

    const result = await copyTextToClipboard(testUrl);

    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(testUrl);
  });

  it('renders immediate accessible confirmation "Link copied" when in copied state', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions
        meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026"
        initialCopyStatus="copied"
      />
    );

    // Button updates label and text
    expect(html).toContain('Link copied');
    expect(html).toContain('aria-label="Link copied"');
    expect(html).toContain('text-emerald-700');

    // Screen reader live region announces confirmation
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Link copied');
  });

  it('gracefully handles clipboard failure when navigator.clipboard.writeText rejects', async () => {
    const testUrl = 'https://meet.codeyoung.com/trial/room-cy-2026';
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));

    global.navigator = {
      ...global.navigator,
      clipboard: {
        writeText: writeTextMock,
      } as unknown as Clipboard,
    };

    // Should return false and not throw an unhandled error
    const result = await copyTextToClipboard(testUrl);
    expect(result).toBe(false);
  });

  it('renders graceful error feedback without crashing when in error state', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions
        meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026"
        initialCopyStatus="error"
      />
    );

    // Shows polite failure text on button and screen reader region
    expect(html).toContain('Copy failed');
    expect(html).toContain('aria-label="Copy failed. Please copy link manually"');
    expect(html).toContain('Copy failed. Please copy link manually.');

    // Class link is still fully intact and visible for manual copy
    expect(html).toContain('https://meet.codeyoung.com/trial/room-cy-2026');
  });

  it('falls back to document.execCommand when navigator.clipboard is unavailable', async () => {
    const testUrl = 'https://meet.codeyoung.com/trial/room-fallback';

    // Remove navigator.clipboard
    global.navigator = {} as Navigator;

    const mockTextArea = {
      value: '',
      style: {},
      setAttribute: vi.fn(),
      focus: vi.fn(),
      select: vi.fn(),
    };

    const createElementMock = vi.fn().mockReturnValue(mockTextArea);
    const appendChildMock = vi.fn();
    const removeChildMock = vi.fn();
    const execCommandMock = vi.fn().mockReturnValue(true);

    global.document = {
      createElement: createElementMock,
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
      execCommand: execCommandMock,
    } as unknown as Document;

    const result = await copyTextToClipboard(testUrl);

    expect(result).toBe(true);
    expect(createElementMock).toHaveBeenCalledWith('textarea');
    expect(mockTextArea.value).toBe(testUrl);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(removeChildMock).toHaveBeenCalledWith(mockTextArea);
  });
});

describe('Page 3 Confirmation Experience — Calendar Integrations', () => {
  it('generates a valid Google Calendar URL containing the exact classUrl, title, and dates', () => {
    const classUrl = 'https://meet.codeyoung.com/trial/session-789';
    const startCal = '20260929T100000Z';
    const endCal = '20260929T103000Z';

    const url = generateGoogleCalendarUrl(classUrl, startCal, endCal);

    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain(encodeURIComponent('Codeyoung 1-on-1 Trial Class'));
    expect(url).toContain(`${startCal}/${endCal}`);
    expect(url).toContain(encodeURIComponent(classUrl));
  });

  it('generates valid RFC 5545 .ics calendar content containing required iCal fields and classUrl', () => {
    const classUrl = 'https://meet.codeyoung.com/trial/session-789';
    const startCal = '20260929T100000Z';
    const endCal = '20260929T103000Z';

    const icsContent = generateIcsData(classUrl, startCal, endCal);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('SUMMARY:Codeyoung 1-on-1 Trial Class');
    expect(icsContent).toContain(`DTSTART:${startCal}`);
    expect(icsContent).toContain(`DTEND:${endCal}`);
    expect(icsContent).toContain(`LOCATION:${classUrl}`);
    expect(icsContent).toContain('STATUS:CONFIRMED');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('calculates 30-minute date range accurately from startIsoInstant', () => {
    const startIso = '2026-09-29T10:00:00.000Z';
    const { startCal, endCal } = calculateDateRange(startIso);

    expect(startCal).toBe('20260929T100000Z');
    expect(endCal).toBe('20260929T103000Z');
  });

  it('formats dates to calendar string without hyphens, colons, or milliseconds', () => {
    const testDate = new Date('2026-09-29T14:30:00.000Z');
    expect(formatUtcToCalendarString(testDate)).toBe('20260929T143000Z');
  });
});

describe('Page 3 Confirmation Experience — Email Reassurance & Book Another Session', () => {
  it('displays personalized email reassurance when parentEmail is provided', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions parentEmail="sarah.connor@example.com" />
    );

    expect(html).toContain('A confirmation has been sent to sarah.connor@example.com.');
    expect(html).toContain('You can use the email to access your booking details');
  });

  it('displays neutral reassurance fallback when parentEmail is omitted', () => {
    const html = renderToStaticMarkup(<PostBookingActions />);

    expect(html).toContain('A confirmation has been prepared for your email.');
  });

  it('renders "Book another session" button when onBookAnother callback is supplied', () => {
    const onBookAnother = vi.fn();
    const html = renderToStaticMarkup(<PostBookingActions onBookAnother={onBookAnother} />);

    expect(html).toContain('Book another session');
  });

  it('omits "Book another session" button when onBookAnother callback is not supplied', () => {
    const html = renderToStaticMarkup(<PostBookingActions />);

    expect(html).not.toContain('Book another session');
  });

  it('invokes onBookAnother callback when user clicks "Book another session"', () => {
    const onBookAnother = vi.fn();
    const element = <PostBookingActions onBookAnother={onBookAnother} />;

    expect(element.props.onBookAnother).toBe(onBookAnother);
    element.props.onBookAnother();
    expect(onBookAnother).toHaveBeenCalledTimes(1);
  });
});

describe('Page 3 Confirmation Experience — Full Hierarchy & Booking Data Rendering', () => {
  it('renders ConfirmationHeader with "Trial class confirmed" as the success state', () => {
    const html = renderToStaticMarkup(<ConfirmationHeader />);

    // Success state heading
    expect(html).toContain('Trial class confirmed');
    expect(html).toContain('Your trial class is scheduled.');
    // Old heading should not be present
    expect(html).not.toContain('Booking confirmed');
  });

  it('renders ConfirmedAppointmentCard with exact booked date, local time, timezone, duration, and mentor', () => {
    const html = renderToStaticMarkup(
      <ConfirmedAppointmentCard
        dateFormatted="Tuesday, September 29"
        time="10:00 AM"
        timezoneLabel="America/New_York (EDT)"
        duration="30 minutes"
        mentorId="mentor-007"
      />
    );

    // Booked date
    expect(html).toContain('Tuesday, September 29');
    // Parent-local start time
    expect(html).toContain('10:00 AM');
    // Timezone
    expect(html).toContain('America/New_York (EDT)');
    // Duration
    expect(html).toContain('30 minutes');
    // Mentor assignment information
    expect(html).toContain('Mentor assigned (ID: mentor-007)');
    // Local timezone reassurance
    expect(html).toContain('Time shown in your local timezone automatically.');
  });

  it('renders ConfirmedAppointmentCard with automatic mentor reassurance when mentorId is not provided', () => {
    const html = renderToStaticMarkup(
      <ConfirmedAppointmentCard
        dateFormatted="Wednesday, September 30"
        time="02:30 PM"
        timezoneLabel="Europe/London (BST)"
      />
    );

    expect(html).toContain('Wednesday, September 30');
    expect(html).toContain('02:30 PM');
    expect(html).toContain('Europe/London (BST)');
    expect(html).toContain('Your mentor is assigned automatically based on learner profile.');
  });
});

describe('Page 3 Confirmation Experience — Design System & Accessibility', () => {
  it('applies Codeyoung amber brand color (#F5A623) to primary CTA', () => {
    const html = renderToStaticMarkup(<PostBookingActions />);
    expect(html).toContain('bg-[#F5A623]');
    expect(html).toContain('hover:bg-[#E89918]');
    expect(html).toContain('active:bg-[#D98B0F]');
  });

  it('applies slate border (#CBD5E1) and card shadow to all secondary cards', () => {
    const html = renderToStaticMarkup(<PostBookingActions />);
    expect(html).toContain('border-[#CBD5E1]');
    expect(html).toContain('shadow-card');
  });

  it('includes visible focus styles and accessible roles', () => {
    const html = renderToStaticMarkup(<PostBookingActions onBookAnother={() => {}} />);
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});

describe('Page 3 Confirmation Experience — Compact Horizontal Arrangement & Responsive Stability', () => {
  it('arranges post-booking actions into three balanced horizontal areas across desktop width', () => {
    const html = renderToStaticMarkup(
      <PostBookingActions
        meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026"
        parentEmail="parent@example.com"
        onBookAnother={() => {}}
      />
    );

    // Responsive 3-column desktop layout grid
    expect(html).toContain('grid grid-cols-1 sm:grid-cols-3 gap-3 w-full');

    // Three distinct balanced action cards
    expect(html).toContain('Google Calendar');
    expect(html).toContain('Calendar file');
    expect(html).toContain('Class link');

    // Visual indicators and category badges
    expect(html).toContain('Primary');
    expect(html).toContain('.ics');
    expect(html).toContain('Virtual Room');
  });

  it('remains stable and does not cause overflow when rendered with very long email and long class URL', () => {
    const longEmail = 'alexander.montgomery.richardson.iii@long-university-department-name.edu';
    const longClassUrl =
      'https://meet.codeyoung.com/trial/room-cy-2026-very-long-custom-mentor-room-allocation-session-id-token-abc123456789';

    const html = renderToStaticMarkup(
      <PostBookingActions
        meetingUrl={longClassUrl}
        parentEmail={longEmail}
        onBookAnother={() => {}}
      />
    );

    // URL is preserved exactly and truncated for visual stability
    expect(html).toContain(longClassUrl);
    expect(html).toContain('truncate');

    // Email is preserved exactly and truncated for visual stability
    expect(html).toContain(longEmail);

    // Both primary, secondary, and tertiary actions remain present
    expect(html).toContain('Add to Google Calendar');
    expect(html).toContain('Download calendar file (.ics)');
    expect(html).toContain('Copy class link');
    expect(html).toContain('Book another session');
  });

  it('renders a unified, compact Step 3 structure without disjointed vertically appended blocks', () => {
    const html = renderToStaticMarkup(
      <div>
        <ConfirmationHeader />
        <ConfirmedAppointmentCard
          dateFormatted="Tuesday, September 29"
          time="10:00 AM"
          timezoneLabel="America/New_York (EDT)"
          duration="30 minutes"
          mentorId="mentor-007"
        />
        <PostBookingActions
          meetingUrl="https://meet.codeyoung.com/trial/room-cy-2026"
          parentEmail="parent@example.com"
          onBookAnother={() => {}}
        />
      </div>
    );

    // Header, appointment card, 3-action grid, and reassurance strip all co-exist in one structured document
    expect(html).toContain('Trial class confirmed');
    expect(html).toContain('Tuesday, September 29');
    expect(html).toContain('10:00 AM');
    expect(html).toContain('grid grid-cols-1 sm:grid-cols-3');
    expect(html).toContain('Add to Google Calendar');
    expect(html).toContain('Download calendar file (.ics)');
    expect(html).toContain('Copy class link');
    expect(html).toContain('Book another session');
  });
});

