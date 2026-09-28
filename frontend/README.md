# Codeyoung Trial-Class Scheduling Platform (Frontend)

Next.js frontend application for the Codeyoung Trial-Class Scheduling Platform. Built with Next.js App Router, React 19, and Tailwind CSS.

---

## Architecture & System Design

- **Parent Booking Journey**: 3-step scheduling workflow:
  1. `Step 1 (Date & Time Selection)`: Timezone auto-detection via `Intl.DateTimeFormat`, searchable timezone modal, 5-day paginated date strip with popover calendar picker, arbitrary preferred time input, morning/afternoon slot grid, and selected appointment card preview.
  2. `Step 2 (Parent Details)`: Validated parent contact form (`Parent's name`, `Email address`), trial class summary card with step back-navigation, and slot conflict modal handling `409 Conflict` responses.
  3. `Step 3 (Confirmation)`: Confirmed appointment card, direct "Join trial class" action, pre-filled Google Calendar export template, downloadable `.ics` iCalendar file, and email dispatch confirmation.
- **Operations Dashboard (`/dashboard`)**: Real-time administrative operations interface featuring metrics grid (total bookings, active mentors, utilization rate, conflict rate), invariant status strip, mentor allocation load breakdown with daily capacity limits (`0/2`, `1/2`, `2/2` cap in `Asia/Kolkata`), scheduling activity feed, and individual mentor schedule inspection modal.
- **Admin Access (`/admin`)**: Operations authentication interface for accessing protected administrative routes.
- **Next.js Route Handlers (`/app/api/`)**: Internal API proxy routes for `/api/bookings`, `/api/dashboard/stats`, and `/api/admin/login|logout`.
- **Timezone Safety**: Slot generation and time conversion rely on pure UTC instants and browser `Intl.DateTimeFormat` projection, ensuring seamless daylight saving time (DST) transitions.
- **Idempotency & Concurrency Handling**: Unique UUID idempotency keys generated per booking attempt to prevent double submissions.

---

## Directory Structure

```text
frontend/
├── __tests__/                         # Automated Vitest test suites (142 tests across 12 suites)
│   ├── admin-auth.test.ts             # Admin authentication logic tests
│   ├── api-client.test.ts             # REST client network, header, and error parsing tests
│   ├── booking-conflict.test.tsx      # Conflict notice modal behavior tests
│   ├── calendar-popover.test.ts       # Calendar popover date selection tests
│   ├── class-link-consistency.test.tsx# Canonical class link consistency & retrieval tests
│   ├── dashboard.test.ts              # Dashboard metrics computation and stats tests
│   ├── post-booking-actions.test.tsx  # Google Calendar URL and .ics export tests
│   ├── preferred-time-picker.test.tsx # Custom preferred time selector tests
│   ├── slot-service.test.ts           # Slot projection & instant conversion tests
│   ├── timezone-detection.test.ts     # Timezone detection and fallback tests
│   ├── timezone-utils.test.ts         # IANA detection & timezone configuration tests
│   └── validation.test.ts             # Form validation unit tests
├── app/
│   ├── admin/                         # Admin portal
│   │   ├── layout.tsx                 # Admin layout shell
│   │   └── page.tsx                   # Admin login screen
│   ├── api/                           # Internal API route handlers
│   │   ├── admin/
│   │   │   ├── login/route.ts         # Admin authentication route
│   │   │   └── logout/route.ts        # Admin session termination route
│   │   ├── bookings/route.ts          # Backend booking proxy route
│   │   └── dashboard/stats/route.ts   # Backend dashboard statistics proxy route
│   ├── dashboard/                     # Scheduling operations dashboard
│   │   ├── layout.tsx                 # Dashboard layout shell
│   │   └── page.tsx                   # Operations metrics and mentor schedule table
│   ├── globals.css                    # Tailwind CSS reset and global styles
│   ├── layout.tsx                     # Root HTML layout and font definitions
│   └── page.tsx                       # Main 3-step parent booking flow
├── components/                        # UI components by domain
│   ├── dashboard/                     # Operations dashboard components
│   │   ├── DashboardHeader.tsx        # Dashboard header with date selector & live refresh
│   │   ├── DashboardSidebar.tsx       # Navigation sidebar with invariant indicators
│   │   ├── InvariantStatusStrip.tsx   # Visual invariant verification banner
│   │   ├── MentorAllocationSection.tsx# Mentor utilization and capacity progress bars
│   │   ├── MentorScheduleModal.tsx    # Daily schedule modal for specific mentors
│   │   ├── MetricsGrid.tsx            # KPI metric cards
│   │   ├── SchedulingActivityTable.tsx# Recent booking activity and audit log
│   │   ├── VerificationFootnote.tsx   # Implementation verification details
│   │   └── index.ts                   # Dashboard barrel export
│   ├── step1/                         # Step 1: Time & Date Selection
│   │   ├── CalendarDatePickerPopover.tsx # Popover calendar for arbitrary date picking
│   │   ├── DatePickerStrip.tsx        # 5-day date strip with month pagination
│   │   ├── PreferredTimePicker.tsx    # Arbitrary preferred start time input
│   │   ├── SelectedAppointmentCard.tsx# Live selected appointment preview
│   │   └── TimeSlotGrid.tsx           # Morning and afternoon slot grid
│   ├── step2/                         # Step 2: Parent Details & Validation
│   │   ├── BookingConflictNotice.tsx  # 409 Conflict notification modal
│   │   ├── ParentDetailsForm.tsx      # Parent name & email form
│   │   ├── Step2Progress.tsx          # Progress stepper with back-navigation
│   │   └── TrialClassSummaryCard.tsx  # Appointment schedule summary card
│   ├── step3/                         # Step 3: Booking Confirmation
│   │   ├── ConfirmationHeader.tsx     # Confirmation badge and summary header
│   │   ├── ConfirmationStepper.tsx    # Completed progress stepper
│   │   ├── ConfirmedAppointmentCard.tsx# Confirmed trial class details card
│   │   └── PostBookingActions.tsx     # Join link CTA, Google Calendar & .ics export
│   ├── Footer.tsx                     # Platform footer
│   ├── Navbar.tsx                     # Header with timezone selector & brand identity
│   ├── PageBackground.tsx             # Background layout styling
│   ├── TimezoneModal.tsx              # Searchable global timezone selector modal
│   └── index.ts                       # Component barrel export
├── constants/
│   ├── dashboard.constants.ts         # Metric constants and operational parameters
│   ├── slots.constants.ts             # Standard slot interval definitions
│   └── timezones.constants.ts         # Curated global IANA timezones
├── hooks/
│   └── use-booking-flow.ts            # State machine hook managing booking steps and API calls
├── lib/
│   ├── api-client.ts                  # Centralized REST client with error parsing
│   ├── api-config.ts                  # Base URL and API endpoint configuration
│   ├── slot-service.ts                # Timezone instant conversion and slot generator
│   ├── timezone-detection.ts          # Browser timezone detection with fallback
│   └── timezone-utils.ts              # Timezone formatting utilities
├── public/                            # Static assets
│   ├── primary_logo.png               # Codeyoung brand logo
│   └── images/
│       └── primary_logo.png           # Fallback logo asset
├── types/
│   ├── api.types.ts                   # Backend API response and error contract types
│   ├── booking.types.ts               # Domain types (BookingStep, Slot, DateItem)
│   └── dashboard.types.ts             # Dashboard metrics and mentor allocation types
├── .env.example                       # Environment template
├── .env.local                         # Local environment configuration
├── eslint.config.mjs                  # ESLint configuration
├── next.config.ts                     # Next.js configuration
├── package.json                       # Dependencies and scripts
├── postcss.config.mjs                 # PostCSS Tailwind plugins
├── tsconfig.json                      # TypeScript configuration
└── vitest.config.mjs                  # Vitest test runner configuration
```

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- Running Codeyoung Backend service (port 3001)

### Environment Configuration
Copy `.env.example` to `.env.local` if not already present:
```bash
cp .env.example .env.local
```
Ensure `NEXT_PUBLIC_API_URL` points to the running backend service:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Installation
```bash
npm install
```

### Local Development
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the parent booking portal.
Access [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for the operations dashboard.
Access [http://localhost:3000/admin](http://localhost:3000/admin) for admin access.

### Production Build
```bash
npm run build
npm start
```

### Running Tests
Execute the Vitest test suite (12 test suites, 142 tests):
```bash
npm test
```
Run tests in watch mode:
```bash
npm run test:watch
```

### Linting
```bash
npm run lint
```
