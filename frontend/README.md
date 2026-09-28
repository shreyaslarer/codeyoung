# Codeyoung Trial-Class Scheduling Platform (Frontend)

Production-grade Next.js frontend for the Codeyoung Trial-Class Booking Platform, engineered according to the standards defined in [`SKILLS/coding-skill.md`](../SKILLS/coding-skill.md) and [`SKILLS/design-skill.md`](../SKILLS/design-skill.md).

---

## 🏛 Architecture & Engineering Principles

* **Parent Journey Flow**: Connected 3-step booking journey:
  1. `Step 1 (Time Selection)`: Timezone selector with auto-detection, 5-day paginated date strip, selected appointment preview, and slot grid.
  2. `Step 2 (Parent Details)`: Validated parent contact form (`Parent's name`, `Email address`), trial class summary card, and "Change time" back-navigation.
  3. `Step 3 (Confirmation)`: Verified schedule details, direct "Join trial class" CTA, dynamic Google Calendar and `.ics` iCalendar exports, and email status confirmation.
* **Component Modularity**: UI components have single, focused responsibilities grouped by flow step (`components/step1/`, `components/step2/`, `components/step3/`) and unified through a clean barrel export at `@/components`.
* **Accurate Timezone & Instant Model (Rule 221 & 223)**: Pure deterministic slot and instant conversion using `Intl.DateTimeFormat` projection across all global timezones.
* **Slot Lifecycle Safety (Rule 224 & Rule 95)**: Automatic slot invalidation on date/timezone shifts, and double-submit prevention guards.
* **Zero Dead Code**: Strict senior-engineer folder structure with zero unused files or duplicate abstractions.

---

## 📁 Directory Structure

```text
frontend/
├── __tests__/                         # Automated Vitest test suites
│   ├── api-client.test.ts             # API client network and error parsing tests
│   ├── slot-service.test.ts           # Slot generation & timezone instant tests
│   ├── timezone-utils.test.ts         # IANA detection & timezone configuration tests
│   └── validation.test.ts             # Parent details form validation tests
├── app/
│   ├── globals.css                    # Tailwind CSS 4 reset and custom tokens
│   ├── layout.tsx                     # Root layout with Inter font and metadata
│   └── page.tsx                       # Unified multi-step booking page
├── components/                        # Cleanly organized UI components
│   ├── step1/                         # Step 1: Time & Date Selection
│   │   ├── DatePickerStrip.tsx        # 5-day date strip with month-year pagination
│   │   ├── SelectedAppointmentCard.tsx# Live selected appointment preview
│   │   └── TimeSlotGrid.tsx           # Morning/afternoon slot grid with empty state
│   ├── step2/                         # Step 2: Parent Details
│   │   ├── ParentDetailsForm.tsx      # Validated parent name & email form
│   │   ├── Step2Progress.tsx          # 3-step indicator with back navigation
│   │   └── TrialClassSummaryCard.tsx  # Appointment schedule summary card
│   ├── step3/                         # Step 3: Confirmation
│   │   ├── ConfirmationHeader.tsx     # Soft green verified badge, title & subtitle
│   │   ├── ConfirmationStepper.tsx    # 3-step indicator with all steps completed
│   │   ├── ConfirmedAppointmentCard.tsx# Confirmed trial class details card
│   │   └── PostBookingActions.tsx     # Join link, Google Calendar, .ics, & email status
│   ├── Footer.tsx                     # Footer navigation & legal links
│   ├── Navbar.tsx                     # Header with timezone selector & user avatar
│   ├── TimezoneModal.tsx              # Searchable global timezone selector modal
│   └── index.ts                       # Clean barrel exports
├── constants/
│   ├── slots.constants.ts             # Morning & afternoon slot time definitions
│   └── timezones.constants.ts         # Curated global IANA timezones
├── hooks/
│   └── use-booking-flow.ts            # Domain booking hook managing state & transitions
├── lib/
│   ├── api-client.ts                  # Centralized REST API client
│   ├── api-config.ts                  # API endpoints and base URL configuration
│   ├── slot-service.ts                # Timezone instant conversion and slot generator
│   └── timezone-utils.ts              # Browser timezone auto-detection utility
└── types/
    ├── api.types.ts                   # Backend REST API contract and error types
    └── booking.types.ts               # Domain types (BookingStep, Slot, DateItem, etc.)
```

---

## 🚀 Quick Start

### 1. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Test Suite
```bash
npm test
```

### 3. Production Build & Verification
```bash
npm run build
npm start
```
