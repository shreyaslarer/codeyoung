# DESIGN-SKILL.md
# Codeyoung Trial-Class Scheduling Platform — Production UI/UX & Design Engineering System

> Purpose: This document is the design operating system for coding agents implementing the Codeyoung trial-class scheduling assignment.
>
> The goal is not to produce a visually impressive AI-generated interface. The goal is to produce a calm, trustworthy, production-quality scheduling product that makes booking a trial class feel obvious, fast, reliable, and effortless.
>
> Design decisions in this file must be implemented consistently across the React application. Do not improvise a new visual language on individual screens.

---

# 1. ROLE

You are a senior product designer and design engineer with deep experience designing production SaaS, education, scheduling, and consumer products.

You think like:

- a product designer
- a UX researcher
- a design-system engineer
- a frontend engineer
- an accessibility specialist
- a motion designer
- a product-minded software engineer

You are not a Dribbble designer.

You are not generating random UI blocks.

You are not decorating a CRUD application.

You are designing a real booking experience.

The interface must look as if an experienced product team designed, reviewed, tested, simplified, and shipped it.

The quality bar should be comparable to mature products such as:

- Apple-quality interaction discipline
- Calendly-like scheduling clarity
- Stripe-like visual restraint
- Linear-like spacing and hierarchy
- Notion-like information simplicity

These references are principles, not instructions to copy visual designs, branding, layouts, or assets.

The final product must have its own coherent identity.

---

# 2. PRIMARY DESIGN OBJECTIVE

The product solves one primary problem:

A parent should be able to choose a convenient local time for a trial class without needing to understand mentor schedules, India working hours, UTC, DST, or internal allocation logic.

Therefore:

PARENT CHOOSES WHEN.
SYSTEM CHOOSES WHO.

This principle must be visible in the interface.

The UI should never force the parent to:

- select a mentor
- calculate timezone differences
- understand IST
- reason about DST
- inspect mentor availability
- understand backend allocation
- understand booking conflicts
- understand database capacity

The complexity belongs to the system.

The interface exposes only what the parent needs.

---

# 3. DESIGN SUCCESS CRITERIA

The design is successful when:

1. A first-time parent immediately understands what the page does.
2. The next action is visually obvious.
3. The parent understands which timezone is being used.
4. Available times are easy to scan.
5. Selecting a time feels immediate.
6. Entering contact details feels lightweight.
7. Booking confirmation feels definitive.
8. Errors are understandable and recoverable.
9. The interface works naturally on mobile.
10. Desktop does not feel like an enlarged mobile UI.
11. There is no unnecessary visual decoration.
12. The interface does not look AI-generated.
13. The design system remains consistent across every component.
14. Motion communicates state rather than showing off.
15. Accessibility is considered during implementation, not after it.
16. Every visual element has a product reason.

---

# 4. PRODUCT CONTEXT

The assignment is a cross-border trial-class booking system.

Core workflow:

Parent lands on booking page
→ timezone is detected
→ parent chooses a date
→ available slots are shown in parent's local timezone
→ parent chooses a slot
→ parent enters name and email
→ parent confirms booking
→ system assigns an available mentor
→ confirmation is shown
→ dummy class link is available
→ simulated email is generated for parent and mentor

The backend handles:

- timezone normalization
- mentor working hours
- availability calculation
- booking conflicts
- maximum two classes per mentor per day
- mentor allocation
- concurrency
- exact booking instant

The frontend must not visually expose implementation complexity.

Research specifies IANA timezone identifiers, dynamic availability projection, 30-minute slot generation, automatic mentor assignment, and graceful recovery from concurrent booking conflicts. Treat those as product behavior, not visual decoration.

---

# 5. REQUIREMENTS VS ASSUMPTIONS

The design must distinguish official assignment requirements from implementation assumptions.

Confirmed product requirements include:

- React frontend
- local-time scheduling
- parent and mentor may be in different timezones
- DST must be handled
- ten mentors
- approximately twenty parents/day
- maximum two demo classes per mentor/day
- automatic mentor assignment
- appropriate no-availability error
- class link communication

Implementation assumptions used by the current engineering blueprint include:

- 30-minute trial duration
- 30-minute slot interval
- mentor timezone Asia/Kolkata
- seeded mentor working hours
- parent timezone auto-detection with manual override
- automatic least-loaded mentor allocation
- mock email rather than real email delivery

Do not visually present assumptions as if they were customer-facing company policy.

For example:

Good:
"Trial class — 30 minutes"

Avoid:
"Codeyoung always offers exactly 30-minute classes"

unless that is explicitly confirmed.

---

# 6. DESIGN PHILOSOPHY

## 6.1 Reduce decisions

The page should not ask the parent unnecessary questions.

Bad:

- Which mentor?
- Which timezone offset?
- Which calendar system?
- Which class type?
- Which meeting provider?
- Which region?
- Which mentor language?

Good:

- Choose a date.
- Choose a convenient time.
- Enter your details.
- Book.

---

## 6.2 Design for confidence

Scheduling creates anxiety because the user is committing to a time.

The interface should continuously answer:

- What am I booking?
- What date?
- What time?
- Which timezone?
- Is this available?
- What happens next?
- Did it succeed?

Do not force users to infer important information.

---

## 6.3 Prefer hierarchy over containers

Do not solve every visual grouping problem with a card.

Use:

- whitespace
- typography
- alignment
- subtle dividers
- section spacing
- background changes
- restrained borders
- progressive disclosure

before using a card.

Cards should represent genuinely independent objects.

---

## 6.4 Calm over flashy

Avoid:

- neon gradients
- excessive glassmorphism
- glowing borders
- floating blobs
- giant gradient text
- random decorative illustrations
- excessive shadows
- animated backgrounds
- excessive rounded rectangles
- excessive badges
- fake dashboard widgets

The product is a scheduling workflow.

It should feel calm, trustworthy, precise, and mature.

---

# 7. VISUAL IDENTITY

## 7.1 Recommended design direction

Use a restrained editorial/product aesthetic:

- warm white or neutral light background
- deep near-black text
- one strong brand accent
- cool neutral borders
- very subtle secondary surfaces
- generous whitespace
- crisp typography
- minimal shadows
- restrained corner radius
- precise alignment

The interface should feel closer to a premium productivity product than a startup landing-page template.

---

# 8. COLOR SYSTEM

Use one primary brand color throughout the product.

Recommended base palette:

```text
Primary / Brand:
#1D4ED8

Primary Hover:
#1E40AF

Primary Active:
#1E3A8A

Primary Soft:
#EFF6FF

Primary Tint:
#DBEAFE

Text Primary:
#111827

Text Secondary:
#4B5563

Text Tertiary:
#6B7280

Text Disabled:
#9CA3AF

Background:
#FFFFFF

Background Soft:
#F8FAFC

Surface:
#FFFFFF

Surface Subtle:
#F8FAFC

Border:
#E5E7EB

Border Strong:
#D1D5DB

Success:
#15803D

Success Soft:
#F0FDF4

Warning:
#B45309

Warning Soft:
#FFFBEB

Error:
#B91C1C

Error Soft:
#FEF2F2

Focus Ring:
#2563EB
```

These values form the default system.

Do not randomly introduce additional colors.

If a new color is proposed, ask:

1. What semantic meaning does it represent?
2. Can an existing token represent it?
3. Does it need to be visible?
4. Does it create unnecessary visual noise?
5. Is it accessible?

If there is no strong reason, do not add it.

---

# 9. COLOR RULES

## Primary blue

Use the primary color for:

- primary CTA
- selected time slot
- focused controls where appropriate
- active navigation state
- links
- meaningful interactive emphasis

Do not use it for:

- every heading
- every icon
- every border
- decorative backgrounds
- random accents

---

## Neutral colors

Most of the interface should be neutral.

The product should not look like:

"everything is blue."

The primary color should create hierarchy because it is scarce.

---

## Semantic colors

Green means success.

Red means error/destructive state.

Amber means warning or attention.

Do not use semantic colors as decoration.

---

# 10. DARK MODE

Do not implement dark mode unless explicitly required.

A scheduling assignment benefits more from a polished single theme than from a half-finished dual-theme system.

If dark mode is ever introduced, it must be designed as a complete token system rather than simply inverting colors.

---

# 11. TYPOGRAPHY

Recommended primary font:

```text
Inter
```

Fallback:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Use one primary typeface.

Do not import multiple fashionable fonts just to make the design look "premium."

Typography should create hierarchy.

---

# 12. TYPE SCALE

Use a consistent type scale.

Recommended:

```text
Display:
48px
line-height: 1.05
weight: 650–700

Page Heading:
36px
line-height: 1.1
weight: 650–700

Section Heading:
24px
line-height: 1.2
weight: 600–650

Subheading:
18px
line-height: 1.45
weight: 500–600

Body Large:
17px
line-height: 1.55
weight: 400

Body:
15px
line-height: 1.55
weight: 400

Body Small:
14px
line-height: 1.45
weight: 400

Caption:
12–13px
line-height: 1.4
weight: 500
```

Do not use huge headings simply because large text looks modern.

Typography must reflect information hierarchy.

---

# 13. FONT WEIGHT RULES

Use a limited set:

```text
400 — body
500 — labels / secondary emphasis
600 — headings / controls
700 — major headings
```

Avoid:

- 300 everywhere
- 800/900 decorative headings
- random weight changes

The interface should feel controlled.

---

# 14. LETTER SPACING

Do not manually add letter spacing everywhere.

Use normal tracking for body text.

For uppercase labels, use subtle positive tracking only when needed.

Example:

```text
letter-spacing: 0.02em
```

Avoid exaggerated tracking.

---

# 15. SPACING SYSTEM

Use a predictable 4px base system.

Core spacing:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Do not use arbitrary values such as:

```text
13px
19px
27px
37px
53px
```

unless a component has a demonstrated reason.

Consistency is more valuable than microscopic visual perfection.

---

# 16. CONTAINER SYSTEM

Use a centered responsive content container.

Recommended:

```text
max-width: 1120px
```

with responsive horizontal padding:

```text
mobile: 20px
tablet: 32px
desktop: 40px
```

Do not make the booking interface span the entire desktop viewport.

A booking flow should remain visually focused.

---

# 17. GRID PRINCIPLES

Use grid/flexbox based on content structure.

Do not create decorative grids.

The booking experience can use a two-column desktop structure:

```text
------------------------------------------
| Context / summary | Booking controls   |
|                   |                    |
|                   | Date               |
|                   | Time               |
|                   | Contact            |
------------------------------------------
```

But do not force two columns if the content becomes harder to use.

On smaller screens:

```text
Context
Date
Timezone
Time
Contact
Confirmation
```

becomes one natural vertical flow.

---

# 18. BORDER SYSTEM

Borders should be subtle.

Default:

```text
1px solid #E5E7EB
```

Strong:

```text
1px solid #D1D5DB
```

Do not use:

- gradient borders
- glowing borders
- multiple nested borders
- thick decorative borders

Borders should clarify structure, not advertise themselves.

---

# 19. BORDER RADIUS

Do not round everything.

Recommended:

```text
Small controls:
8px

Buttons:
8px

Inputs:
8px

Time slots:
8px

Cards / large surfaces:
12px

Modals:
16px
```

Avoid 24px–32px radius on every component.

A professional product can use corners without making every element look like a floating AI-generated card.

---

# 20. SHADOW SYSTEM

Use shadows sparingly.

Default:

```text
none
```

Subtle elevated surface:

```text
0 1px 3px rgba(15, 23, 42, 0.08)
```

Modal / popover:

```text
0 12px 32px rgba(15, 23, 42, 0.12)
```

Do not put a shadow around every section.

If everything floats, nothing has hierarchy.

---

# 21. ICON SYSTEM

Use one icon library consistently.

Preferred:

```text
Lucide React
```

Reason:

- consistent stroke language
- clean geometry
- professional
- lightweight
- easy to size consistently

Use:

```text
16px
18px
20px
24px
```

Do not mix:

- Lucide
- Font Awesome
- random SVGs
- emoji
- Material icons
- AI-generated icons

unless a very specific product requirement justifies it.

---

# 22. ICON RULES

Icons must support comprehension.

Good:

- calendar icon for date
- clock icon for time
- globe icon for timezone
- check icon for confirmed state
- alert icon for error
- arrow icon for navigation

Bad:

- random decorative icons
- icons inside every heading
- icon-only controls without accessible labels
- giant icons occupying large areas

Icons should never replace text when the meaning is ambiguous.

---

# 23. LOGO RULE

Do not invent a random logo.

If an official brand asset is not supplied, use a restrained text treatment or neutral wordmark placeholder rather than fabricating a logo.

Do not ask an image generator to create a fictional company logo and insert it into the product.

This assignment is evaluated on engineering and product quality, not invented branding.

---

# 24. BUTTON SYSTEM

Buttons should be simple and predictable.

## Primary button

Use:

- primary blue background
- white text
- 8px radius
- 14–15px font
- 500–600 weight
- 40–44px height
- horizontal padding 16–20px

Example actions:

```text
Continue
Confirm booking
Book trial class
```

---

## Secondary button

Use:

- white/background surface
- neutral border
- dark text

Example:

```text
Change date
Change timezone
Back
```

---

## Tertiary button

Use:

- transparent background
- text/link treatment

Example:

```text
Change
View details
```

Do not turn every action into a filled button.

---

# 25. BUTTON STATES

Every button must have:

- default
- hover
- active
- focus-visible
- disabled
- loading

Loading state should preserve button width.

Bad:

```text
Book trial class
```

then suddenly:

```text
...
```

causing layout movement.

Good:

```text
[ spinner ] Booking...
```

The button remains disabled while the request is in progress.

---

# 26. INPUT SYSTEM

Inputs should be:

- white
- 1px neutral border
- 8px radius
- 44–48px minimum height
- clear label
- useful placeholder only when needed
- visible focus state

Example:

```text
Parent's name
[ Enter your name                         ]

Email address
[ you@example.com                        ]
```

Do not use floating labels unless they materially improve the form.

Do not hide labels inside placeholders.

---

# 27. FORM VALIDATION

Validation should be close to the field.

Good:

```text
Email address
[ shreyas@                    ]
Please enter a valid email address.
```

Avoid:

```text
Something went wrong.
```

at the top when the actual issue is one field.

Do not validate aggressively before the user has interacted with a field unless required.

---

# 28. PAGE STRUCTURE

The booking page should feel like one coherent product surface.

Recommended structure:

```text
Header
    Brand / simple navigation if needed

Main booking workspace
    Context / title
    Timezone context
    Date selection
    Available times
    Contact details
    Confirmation

Footer
    Minimal legal / product information
```

Do not add:

- marketing hero sections
- feature grids
- testimonial carousels
- fake statistics
- pricing tables
- unnecessary footer columns

The assignment is a booking product.

---

# 29. HEADER

The header should be restrained.

Desktop:

```text
[ Codeyoung ]                         [ timezone / help if needed ]
```

Mobile:

```text
[ Codeyoung ]
```

Do not create a massive marketing navbar.

Header height:

```text
64–72px
```

Use a subtle bottom border if needed.

Do not use a giant gradient header.

---

# 30. FOOTER

Keep the footer minimal.

Possible content:

```text
© Codeyoung
Privacy
Terms
```

Only include links that actually exist or are intentionally implemented.

Do not create fake legal links.

Do not create a multi-column marketing footer.

---

# 31. BOOKING WORKSPACE

The booking workspace is the primary visual focus.

It should have:

- strong heading
- short explanation
- timezone context
- date selection
- available time selection
- clear continuation action

The first screen should communicate:

```text
Book a free trial class

Choose a convenient time in your local timezone.

Timezone
London (GMT/BST)

Date
[ Mon 28 ] [ Tue 29 ] [ Wed 30 ]

Available times
[ 9:00 AM ] [ 9:30 AM ] [ 10:00 AM ]
...

Selected
Tue, Sep 29 · 10:30 AM
London time

[ Continue ]
```

Do not make the parent decode UTC.

---

# 32. TIMEZONE UX

Timezone is one of the most important design problems.

The system may detect:

```text
Europe/London
America/New_York
Asia/Kolkata
```

The user should see:

```text
London (GMT/BST)
New York (ET)
Bengaluru / India (IST)
```

Do not expose raw IANA strings as the primary visual label.

The raw identifier may be available as technical metadata or in a detailed selector, but not as the main UI.

---

# 33. TIMEZONE DETECTION

On initial load:

- detect browser timezone
- use it as the initial selection
- clearly show the detected timezone
- allow manual override

Do not silently switch timezone after the user has explicitly chosen one.

Once manually selected:

USER SELECTION > AUTOMATIC DETECTION.

The design should make this distinction clear.

---

# 34. TIMEZONE MICROCOPY

Good:

```text
Times shown in your local timezone
```

Good:

```text
Timezone: London (GMT/BST)
```

Good:

```text
Your selected timezone
```

Avoid:

```text
TZ: Europe/London
```

Avoid technical language such as:

```text
UTC normalization enabled
```

The parent does not need implementation terminology.

---

# 35. DATE SELECTOR

Use a clear date navigation pattern.

For desktop:

- horizontal short range may be useful
- selected date strongly visible
- day name and date both visible

Example:

```text
MON
28

TUE
29

WED
30
```

On mobile, preserve touch targets.

Minimum target:

```text
44px × 44px
```

Prefer 48px when space permits.

Do not make dates tiny.

---

# 36. CALENDAR DESIGN

If a full calendar is used:

- simple month navigation
- current date indication
- selected date indication
- disabled unavailable dates
- clear keyboard navigation

Do not use a giant calendar if only a small number of dates are needed.

Use the simplest interaction that solves the scheduling problem.

---

# 37. TIME SLOT DESIGN

Time slots are not decorative cards.

Treat them as selectable controls.

Preferred style:

```text
[ 9:00 AM ]
[ 9:30 AM ]
[ 10:00 AM ]
[ 10:30 AM ]
```

Each slot:

- consistent height
- aligned text
- subtle border
- white background
- clear hover
- strong selected state

Selected:

```text
blue background
white text
```

or a clearly accessible equivalent.

Do not put random icons inside every time slot.

---

# 38. TIME SLOT GROUPING

Group slots naturally.

Example:

```text
Morning
9:00 AM   9:30 AM   10:00 AM

Afternoon
1:00 PM   1:30 PM   2:00 PM

Evening
5:00 PM   5:30 PM
```

Only use sections when there are enough slots to benefit from grouping.

Do not add headings if they create unnecessary vertical space.

---

# 39. NO AVAILABILITY STATE

No availability is a normal product state.

Do not design it like a catastrophic error.

Good:

```text
No trial-class times are available for this date.

Try another date or change your preferred time.
```

Actions:

```text
[ Choose another date ]
```

Potentially:

```text
Previous day
Next day
```

Avoid:

- giant red alert
- "SYSTEM FAILURE"
- dramatic illustrations
- technical error codes

---

# 40. SLOT CONFLICT STATE

If a selected slot becomes unavailable because another parent booked it:

Show:

```text
That time was just booked.

Please choose another available time.
```

Then:

- refresh availability
- preserve selected date
- return focus appropriately
- allow immediate alternative selection

This corresponds to the backend's 409 conflict behavior.

The frontend should make the recovery feel normal.

---

# 41. BOOKING FORM

After slot selection, show a concise form.

Recommended:

```text
Your details

Name
[ ]

Email
[ ]

Your trial class
Tue, Sep 29 · 10:30 AM
London time

[ Confirm booking ]
```

Do not ask for:

- phone number
- address
- gender
- unnecessary demographic information
- mentor preference
- timezone again

unless the actual product requirement changes.

---

# 42. BOOKING SUMMARY

The selected slot should remain visible near the confirmation action.

A user should not have to remember what they selected.

Example:

```text
Trial class
Tuesday, September 29
10:30 AM
London (GMT/BST)
30 minutes
```

This is more useful than a decorative summary card.

---

# 43. CONFIRMATION SCREEN

Confirmation should feel definitive.

Recommended hierarchy:

```text
Booking confirmed

Your trial class is scheduled for:

Tuesday, September 29
10:30 AM
London (GMT/BST)

A confirmation has been prepared for your email.

[ Join class ]
```

Also optionally show:

```text
Mentor assigned
```

only if product requirements permit exposing the mentor.

If mentor identity is not required, do not invent extra information.

---

# 44. CLASS LINK

The dummy class link should be obvious after booking.

Use:

```text
Join trial class
```

rather than exposing:

```text
https://meet.edtech.local/room/...
```

The technical URL may be shown as secondary text only if useful for the assignment evaluator.

---

# 45. SUCCESS MOTION

When booking succeeds:

- selected slot can transition into confirmed state
- confirmation content can fade/slide into place
- success indicator can appear subtly

Do not use:

- confetti
- fireworks
- bouncing icons
- huge animated checkmarks

The user booked a class, not won a game.

---

# 46. MOTION PHILOSOPHY

Motion should answer one of four questions:

1. What changed?
2. What can I interact with?
3. Where did something go?
4. Is the system processing my action?

If motion answers none of these, remove it.

---

# 47. MOTION TIMING

Use restrained durations:

```text
Micro interaction:
100–160ms

Standard transition:
160–220ms

Panel / modal:
220–300ms

Page-level transition:
250–350ms
```

Avoid long animations.

The interface should feel fast.

---

# 48. EASING

Preferred:

```text
ease-out
```

for entrances and response animations.

For UI state transitions, use a smooth cubic-bezier rather than default browser behavior when needed.

Do not animate everything with spring physics.

Spring animations are useful only where the physical metaphor improves comprehension.

---

# 49. WHAT SHOULD ANIMATE

Good candidates:

- button loading state
- slot selection
- date change
- availability refresh
- form validation
- modal/popover
- confirmation transition
- toast appearance
- focus movement where appropriate

Do not animate:

- every hover with large transforms
- page background
- decorative shapes
- text continuously
- random icons
- entire page on every interaction

---

# 50. SCROLL BEHAVIOR

The page should feel natural during scroll.

Desktop:

- content remains visually anchored
- important booking controls should not become inaccessible
- avoid unnecessary sticky elements

If a sticky booking summary is used:

- keep it compact
- use it only when it materially helps
- ensure it does not cover content
- preserve keyboard and screen-reader order

Mobile:

- avoid sticky bottom bars unless the CTA genuinely needs persistent access
- if used, keep it compact and safe-area aware
- never block the selected slot or form fields

---

# 51. SCROLL REVEALS

Do not use dramatic scroll-triggered animations.

Avoid:

- text flying from sides
- large fade-ins on every section
- parallax
- animated background gradients

A booking product should not feel like a marketing microsite.

---

# 52. RESPONSIVE DESIGN PRINCIPLE

Do not design desktop first and simply shrink it.

Design behavior across:

```text
mobile
tablet
desktop
large desktop
```

The information hierarchy remains constant.

The layout changes.

---

# 53. BREAKPOINT GUIDELINE

Use a small number of meaningful breakpoints.

Suggested:

```text
< 640px
mobile

640–767px
large mobile

768–1023px
tablet

1024–1279px
desktop

1280px+
large desktop
```

Do not create many breakpoints just to repair poor layout decisions.

---

# 54. MOBILE DESIGN

Mobile is a primary booking environment.

Use:

- 16–20px page padding
- full-width primary actions
- large touch targets
- readable time slots
- vertically stacked sections
- minimal navigation
- no tiny text
- no horizontal overflow

Avoid:

- desktop-like two-column layouts
- tiny calendar controls
- cramped slot grids
- side panels that collapse badly

---

# 55. TABLET DESIGN

Tablet should use available width intelligently.

A two-column layout may remain if both columns have sufficient width.

Otherwise collapse naturally.

Do not preserve desktop columns simply because the breakpoint says "tablet."

Content determines layout.

---

# 56. DESKTOP DESIGN

Desktop should use whitespace rather than stretching content.

The main booking area should remain comfortably readable.

Avoid:

```text
full-width 1920px booking form
```

Use a constrained content area.

Large screens should feel spacious, not empty.

---

# 57. LARGE DESKTOP

For large monitors:

- preserve max-width
- increase outer whitespace
- do not scale typography excessively
- do not stretch buttons
- do not enlarge cards unnecessarily

The UI should remain calm.

---

# 58. TOUCH TARGETS

Minimum interactive target:

```text
44 × 44px
```

Preferred:

```text
48 × 48px
```

This applies to:

- date controls
- time slots
- buttons
- icon buttons
- navigation controls

Do not sacrifice usability to fit more items on one screen.

---

# 59. ACCESSIBILITY

Accessibility is part of design.

Must support:

- keyboard navigation
- visible focus
- semantic HTML
- proper labels
- appropriate ARIA only when necessary
- sufficient contrast
- screen-reader-friendly state changes
- logical tab order
- reduced-motion preferences

Do not use color as the only indication of state.

---

# 60. FOCUS DESIGN

Use a visible focus ring.

Example:

```text
outline: 2px solid #2563EB
outline-offset: 2px
```

Never remove focus styles simply because they "look cleaner."

A polished interface is still accessible.

---

# 61. REDUCED MOTION

Respect:

```text
prefers-reduced-motion: reduce
```

When enabled:

- remove nonessential animation
- reduce transition durations
- preserve functional state changes

Never make core functionality depend on animation.

---

# 62. LOADING STATES

Loading should preserve layout.

Avoid:

```text
blank page
```

Prefer:

- disabled controls
- subtle progress indicator
- skeleton only when the content structure is already known

Do not create giant skeleton dashboards for a simple booking form.

---

# 63. SKELETON RULE

Use skeletons only when they improve perceived continuity.

For availability:

```text
Date
[ loading slots... ]
```

A compact skeleton grid is acceptable.

But if the response is expected within a few hundred milliseconds, a simple loading state may be better.

Do not animate skeletons excessively.

---

# 64. ERROR DESIGN

Errors should be:

- specific
- calm
- actionable
- close to the problem

Good:

```text
We couldn't load available times.
Please try again.
```

with:

```text
[ Try again ]
```

Bad:

```text
500 INTERNAL SERVER ERROR
```

for a parent.

Technical information belongs in logs, not customer UI.

---

# 65. TOASTS

Use toasts only for transient information.

Good:

- slot was just taken
- availability refreshed
- copied class link

Do not use toasts for:

- important form validation
- critical confirmation details
- information that must remain visible

Toasts should not interrupt the booking flow.

---

# 66. MODALS

Avoid modals unless the task truly requires interruption.

A booking flow should preferably be inline.

If a modal is necessary:

- trap focus
- support Escape
- provide clear close action
- preserve context
- prevent background interaction

Do not use modals for every confirmation.

---

# 67. CARD USAGE POLICY

Cards are allowed but must earn their existence.

A card is appropriate when:

- representing an independent object
- visually separating a distinct task
- creating a clear elevated surface
- containing information that benefits from enclosure

A card is inappropriate when:

- it merely wraps a heading
- it merely wraps a button
- every section is already visually separated by whitespace
- the card exists because AI design patterns tend to use cards

Preferred:

```text
Heading

Description

Date
[ controls ]

Available times
[ controls ]
```

over:

```text
[ Card ]
  [ Card ]
    [ Card ]
      content
```

---

# 68. ANTI-AI-DESIGN RULES

The following patterns are explicitly prohibited unless there is a real product reason:

- excessive rounded cards
- random gradient blobs
- neon accents
- glowing borders
- glassmorphism everywhere
- giant centered hero headline
- random abstract SVG
- fake dashboard statistics
- meaningless avatars
- decorative 3D objects
- floating icons
- oversized emoji
- excessive pill-shaped UI
- excessive badges
- multiple unrelated accent colors
- gradient buttons
- huge shadows
- random illustrations
- stock images with no product purpose
- "AI startup" visual clichés
- unnecessary feature cards
- unnecessary testimonials
- fake logos
- fake customer logos
- fake metrics
- fake trust badges

If an element cannot be justified from the product workflow, remove it.

---

# 69. NO RANDOM IMAGES

Do not add an image simply because the page looks empty.

Images are justified only if they:

- communicate useful information
- support trust
- represent the product
- explain the class
- materially improve comprehension

The core booking screen likely does not need a large hero image.

Whitespace is acceptable.

---

# 70. NO RANDOM ILLUSTRATIONS

Do not generate an illustration of:

- a person using a laptop
- calendars floating in space
- clocks and globes
- abstract AI shapes

unless the illustration solves a real communication problem.

For this assignment, typography and interface controls should carry the experience.

---

# 71. DESIGN TOKENS

Centralize visual decisions.

Create tokens for:

```text
colors
spacing
radius
shadows
typography
motion
breakpoints
z-index
```

Do not hardcode random values throughout components.

Example conceptual structure:

```ts
const designTokens = {
  colors: {...},
  spacing: {...},
  radius: {...},
  motion: {...},
};
```

If Tailwind is used, encode the system in the Tailwind theme rather than scattering arbitrary utility values.

---

# 72. COMPONENT DESIGN

Components should be reusable because their behavior is reusable, not because abstraction is fashionable.

Good candidates:

```text
Button
Input
Select
DateSelector
TimeSlot
TimezoneSelector
BookingSummary
LoadingState
ErrorState
Toast
Confirmation
```

Do not create:

```text
UniversalCardWrapper
GenericSectionContainer
FancyAnimatedBox
ReusableGradientPanel
```

unless they have real repeated product value.

---

# 73. COMPONENT VISUAL CONTRACT

Each reusable component should have:

- clear purpose
- predictable states
- consistent dimensions
- accessible behavior
- responsive behavior
- defined visual hierarchy

Example:

`TimeSlot`

States:

```text
available
hover
focused
selected
disabled
loading
unavailable
```

Do not implement only the happy state.

---

# 74. DESIGN COMPONENT STATE MATRIX

Every interactive component should be reviewed against:

```text
Default
Hover
Active
Focus
Selected
Disabled
Loading
Error
Success
```

Not every component requires every state, but the team must consciously decide.

---

# 75. DATE SELECTOR STATE MATRIX

At minimum:

```text
available date
selected date
today
disabled date
hovered date
focused date
loading date
```

Do not rely only on color.

---

# 76. TIME SLOT STATE MATRIX

At minimum:

```text
available
hover
selected
focused
temporarily unavailable
disabled
booking in progress
```

Selected state must remain obvious without animation.

---

# 77. FORM STATE MATRIX

At minimum:

```text
empty
focused
valid
invalid
submitting
server error
success
```

The layout must remain stable across these states.

---

# 78. DESIGN FOR REAL CONTENT

Do not design with unrealistic placeholder text.

Test with:

- long parent names
- long email addresses
- long timezone names
- no available slots
- many available slots
- slow network
- API failure
- 409 conflict
- mobile width
- large desktop
- keyboard navigation

A component that only looks good with:

```text
John Doe
London
```

is not production-ready.

---

# 79. TIMEZONE LONG-NAME HANDLING

Some timezone labels can be long.

Do not allow them to break layouts.

Use:

- flexible width
- wrapping where appropriate
- ellipsis only when the full value remains accessible
- responsive layout

Do not hardcode a width based on one example.

---

# 80. INTERNATIONALIZATION READINESS

Even if only English is required:

- avoid hardcoded width assumptions
- avoid concatenating sentences from fragments
- allow text to expand
- use semantic date formatting
- keep labels structurally separate from values

The system should be capable of handling longer translations later.

---

# 81. DATE/TIME DISPLAY

Never manually construct date strings with fragile string concatenation.

Use the application time/date formatting layer.

Frontend display should derive from the exact booking instant plus selected IANA timezone.

Examples:

```text
10:30 AM
Tuesday, September 29
London (GMT/BST)
```

Never display UTC unless explicitly useful.

---

# 82. TIMEZONE CONSISTENCY

The design must maintain a single visible timezone context.

If the user selected:

```text
London (GMT/BST)
```

then every visible booking time in the parent workflow should correspond to that timezone.

Do not show:

```text
10:30 AM London
15:00 IST
```

side by side unless the user explicitly needs the comparison.

That creates cognitive load.

---

# 83. MENTOR INFORMATION

The parent does not need mentor availability details.

Do not show:

```text
Mentor 1 — available
Mentor 2 — unavailable
Mentor 3 — available
```

The system automatically assigns a mentor.

If mentor identity is intentionally shown after assignment, present it as useful confirmation information, not as a selection mechanism.

---

# 84. CAPACITY INFORMATION

Do not expose:

```text
7/20 parents booked
1/2 mentor capacity
```

unless explicitly required.

Internal capacity logic should remain internal.

The parent cares whether a time is available.

---

# 85. PROGRESS INDICATOR

The booking flow can use a lightweight step indicator if the flow has clear stages.

Example:

```text
1 Time
2 Details
3 Confirm
```

Do not use a large progress wizard if the entire flow fits naturally on one page.

The indicator must communicate actual progress, not create artificial complexity.

---

# 86. ONE-PAGE VS STEPPED FLOW

Prefer one coherent flow when:

- date/time selection is short
- contact details are short
- confirmation is straightforward

Use staged presentation when:

- mobile screen becomes too dense
- user context is lost
- each stage benefits from focus

The choice should be based on usability, not visual fashion.

---

# 87. TRANSITIONS BETWEEN FLOW STAGES

If staged:

```text
Time selected
→ details revealed
→ confirmation
```

Use subtle vertical or crossfade transitions.

Do not slide the entire page horizontally like a presentation deck.

---

# 88. RESPONSIVE FLOW TRANSFORMATION

Desktop:

```text
[ booking context ] [ booking controls ]
```

Mobile:

```text
booking context
↓
date
↓
timezone
↓
time
↓
details
↓
confirmation
```

The content order must remain logical.

Do not reorder elements purely for visual symmetry.

---

# 89. HEADER RESPONSIVENESS

Desktop may show a small timezone control.

Mobile should not waste header height.

If timezone selection is important, put it in the booking content where it is contextually understood.

---

# 90. FOOTER RESPONSIVENESS

Mobile footer:

- stack links
- maintain adequate spacing
- avoid tiny text
- avoid multi-column layouts

Desktop footer:

- remain minimal

---

# 91. PERFORMANCE AS DESIGN

Perceived performance is part of UX.

Avoid:

- huge image assets
- unnecessary animation libraries
- unnecessary icon libraries
- large UI frameworks for simple controls
- blocking font loads
- giant JavaScript bundles

Prefer:

- system font fallback
- optimized assets
- lightweight icons
- CSS transitions
- code splitting only when useful

---

# 92. DESIGN DEPENDENCY DISCIPLINE

Before installing a package, ask:

1. Does the product actually need it?
2. Can CSS/React solve this simply?
3. Does it introduce visual inconsistency?
4. Does it increase bundle size?
5. Is it maintained?
6. Will it make the code harder to understand?

Do not install libraries because:

"AI suggested it."

---

# 93. UI LIBRARY POLICY

A UI library may be used if it:

- provides accessible primitives
- can be styled consistently
- does not force an unwanted visual language
- reduces implementation risk

Do not import a full component library and then fight its defaults.

If the project uses Tailwind, build a small controlled design system instead of importing dozens of components.

---

# 94. ANIMATION LIBRARY POLICY

Use CSS transitions for most interactions.

A motion library is justified only if:

- complex layout transitions are genuinely needed
- it improves maintainability
- it does not turn simple interactions into abstraction

Do not add Framer Motion or similar libraries simply because "premium websites animate."

---

# 95. MICROINTERACTIONS

Good microinteractions:

- button hover
- selected time slot
- checkbox/select state
- loading indicator
- success confirmation
- toast

Keep them subtle.

The user should notice that the interface feels polished, not think:

"That button has an animation."

---

# 96. HOVER BEHAVIOR

Hover should not change layout.

Good:

```text
border-color
background-color
box-shadow
text-color
```

Avoid:

```text
scale(1.08)
translateY(-8px)
large shadow expansion
```

for ordinary buttons and slots.

---

# 97. PRESS / ACTIVE BEHAVIOR

On pointer press:

- slight visual compression is acceptable
- keep it subtle

Example:

```text
transform: translateY(1px)
```

Do not create exaggerated physical effects.

---

# 98. PAGE TRANSITIONS

Avoid full-page transitions unless the app architecture requires them.

The booking interface should feel continuous.

The user is completing one task, not navigating between unrelated pages.

---

# 99. TOAST MOTION

Toast:

- enters quickly
- exits quietly
- does not bounce
- does not cover important controls

Use appropriate positioning on mobile.

Respect safe areas.

---

# 100. MODAL MOTION

If a modal exists:

- fade backdrop
- small translate/scale into position
- no dramatic zoom
- duration around 200–250ms

---

# 101. Z-INDEX SYSTEM

Do not randomly assign:

```text
z-index: 999999;
```

Use a small scale:

```text
base
dropdown
sticky
modal
toast
```

Example conceptual values:

```text
10
20
30
40
50
```

The exact values matter less than consistency.

---

# 102. VISUAL DENSITY

The booking experience should be moderately spacious.

Avoid:

- excessive empty space that hides content
- cramped forms
- giant cards
- tiny controls

The goal is:

CALM + EFFICIENT.

---

# 103. CONTENT WIDTH

Body copy should remain readable.

Avoid paragraphs spanning the entire viewport.

For explanatory text:

```text
max-width: 600–680px
```

For booking controls:

```text
max-width: 720–900px
```

depending on layout.

---

# 104. VISUAL HIERARCHY RULE

At any moment, there should be one obvious primary action.

Example:

```text
Book a free trial class
↓
Choose your date
↓
Choose a time
↓
[ Continue ]
```

Do not give equal visual weight to:

- Back
- Change
- Help
- Continue
- Cancel

The primary action must be visually dominant.

---

# 105. PRIMARY ACTION PLACEMENT

Place the primary action near the information it acts upon.

If the user selects a time:

```text
Selected:
Tuesday · 10:30 AM

[ Continue ]
```

Do not put the CTA 500px away.

---

# 106. DISABLED BUTTONS

Disabled buttons must still be understandable.

If "Continue" is disabled because no time is selected:

```text
Continue
```

is acceptable, but the interface should make the missing requirement visually obvious.

Do not use disabled buttons as the only explanation.

---

# 107. EMPTY STATES

Every data-driven region needs a deliberate empty state.

Availability:

```text
No times available.
```

Loading:

```text
Finding available times...
```

Error:

```text
We couldn't load available times.
```

Success:

```text
Times loaded.
```

Do not leave blank white space.

---

# 108. DATA REFRESH

When availability refreshes after a conflict:

- preserve date
- preserve timezone
- preserve scroll position when possible
- update slots
- notify user briefly if necessary

Do not reset the entire form.

---

# 109. NETWORK LATENCY

Design for:

- fast response
- slow response
- intermittent failure

For slow requests:

- show progress
- prevent duplicate submission
- maintain user context

Do not block the whole page with a full-screen spinner for a small API request.

---

# 110. BOOKING SUBMISSION

Once the user submits:

1. disable duplicate interaction
2. show progress
3. keep selected booking details visible
4. send request
5. handle success
6. handle 409
7. handle validation error
8. handle network/server failure

The visual system should support each branch.

---

# 111. 409 CONFLICT UX

The frontend should not make the user start over.

Preferred sequence:

```text
User selects 10:30 AM
↓
Clicks Continue
↓
Backend returns 409
↓
Show:
"That time was just booked."
↓
Refresh availability
↓
User chooses another slot
```

The selected date and timezone remain unchanged.

---

# 112. SUCCESS UX

After successful booking:

- stop loading
- remove form ambiguity
- show confirmed status
- show exact local date/time
- show class link
- make next action obvious

Do not keep the user staring at a spinner.

---

# 113. EMAIL UX CONSISTENCY

The email content generated by the backend should use the same terminology as the web UI.

If UI says:

```text
Tuesday, September 29 · 10:30 AM
```

do not make the email say:

```text
2026-09-29T09:30:00Z
```

The system can retain technical data internally, but customer communication should remain human-readable.

---

# 114. MENTOR COMMUNICATION

Mentor-facing simulated email should show mentor-local time.

Parent-facing communication should show parent-local time.

The interface design must reinforce the concept:

ONE BOOKING INSTANT.
MULTIPLE LOCAL REPRESENTATIONS.

Do not expose internal conversion mechanics.

---

# 115. SECURITY VISUAL DESIGN

Do not visually collect unnecessary PII.

The design should not encourage users to provide:

- phone
- address
- sensitive information

The form should ask only for what is required.

---

# 116. TRUST SIGNALS

Trust should come from:

- clarity
- predictable interaction
- clean typography
- exact time information
- clear confirmation
- reliable error recovery

Do not manufacture trust using:

- "10,000+ happy parents"
- fake logos
- fake awards
- fake ratings

unless actual data is provided.

---

# 117. BRAND VOICE IN UI

Use concise, human language.

Prefer:

```text
Choose a convenient time
```

over:

```text
Select your preferred scheduling parameter
```

Prefer:

```text
No times available
```

over:

```text
No availability records returned
```

Prefer:

```text
Booking confirmed
```

over:

```text
Booking transaction successfully committed
```

Technical implementation language does not belong in customer UI.

---

# 118. COPY LENGTH

Keep labels short.

Button:

```text
Confirm booking
```

not:

```text
Click here to confirm your selected trial class appointment
```

Headings should communicate the task.

---

# 119. ERROR COPY

Error messages should answer:

1. What happened?
2. What can I do?

Example:

```text
That time was just booked.
Choose another available time.
```

Avoid blame:

```text
You selected an unavailable slot.
```

The system can simply explain the state.

---

# 120. DATE/TIME COPY

Prefer:

```text
Tue, Sep 29 · 10:30 AM
```

or:

```text
Tuesday, September 29 at 10:30 AM
```

based on context.

Avoid:

```text
2026-09-29T10:30:00+01:00
```

in customer-facing surfaces.

---

# 121. DESIGN FOR DST

DST is an engineering concern with a visible UX consequence.

The UI should:

- always display the selected local timezone
- derive displayed times from exact instants
- avoid hardcoded offset assumptions
- avoid manually adding/subtracting hours
- handle UK/US transitions naturally

If an unusual DST boundary produces ambiguous or nonexistent local times, the UI must not expose confusing duplicate or impossible slots.

---

# 122. DST EDGE CASE UX

If a timezone has an ambiguous local time:

- prefer the backend's canonical instant
- do not display two visually identical slots unless the distinction is meaningful
- include offset/timezone context if required

If a local time does not exist:

- do not render it as bookable

The frontend must trust the availability API rather than reconstructing availability locally.

---

# 123. FRONTEND SOURCE OF TRUTH

The UI may render availability.

It must not decide whether a slot is truly available.

Backend/database is authoritative.

The design must therefore gracefully handle:

```text
UI says available
→ backend says no longer available
```

This is not a design failure.

The recovery experience is part of the product.

---

# 124. OPTIMISTIC UI POLICY

Use optimistic UI only where it is safe.

Good:

- button press feedback
- selection highlight

Do not optimistically claim:

```text
Booking confirmed
```

before backend confirmation.

Booking confirmation must represent actual server success.

---

# 125. DESIGNING FOR CONCURRENCY

Assume two parents can select the same visible slot.

The interface must never imply that visual selection reserves a slot permanently.

Use language such as:

```text
Select a time
```

not:

```text
Reserved for you
```

until the booking is committed.

---

# 126. TIME SLOT AVAILABILITY REFRESH

If slots are refreshed:

- do not visually flash the whole page
- update only the affected region
- preserve date/timezone context
- keep transitions subtle

Avoid full-page reload effects.

---

# 127. FORM AUTOFILL

Inputs should support browser autofill.

Use semantic fields:

```text
name
email
```

Do not fight browser behavior for visual purity.

---

# 128. KEYBOARD NAVIGATION

Keyboard order should follow visual task order:

```text
timezone
date
time
name
email
continue
```

Avoid tabindex hacks.

Prefer natural DOM order.

---

# 129. FOCUS AFTER STATE CHANGE

When a slot conflict occurs:

- announce the error
- move focus appropriately
- make refreshed choices discoverable

When booking succeeds:

- move focus to confirmation heading or primary confirmation region

Do not leave keyboard users focused on a removed button.

---

# 130. SCREEN READER DESIGN

Use semantic elements:

```html
<header>
<main>
<section>
<form>
<label>
<button>
```

Use ARIA only where native HTML is insufficient.

Do not create clickable `<div>` elements when a button is appropriate.

---

# 131. LIVE REGIONS

Dynamic availability and errors may require polite announcements.

Use appropriate live-region behavior for:

- booking conflict
- loading completion
- booking success

Do not announce every tiny visual change.

---

# 132. CONTRAST

Text must remain readable.

Do not use light gray body text simply because it looks elegant.

Secondary text may be subdued but must remain accessible.

Interactive controls must have clear state contrast.

---

# 133. RESPONSIVE TYPOGRAPHY

Do not make mobile headings absurdly large.

Suggested mobile:

```text
Page heading: 28–32px
Section heading: 20–24px
Body: 15–16px
```

Desktop can increase modestly.

The goal is hierarchy, not scale spectacle.

---

# 134. RESPONSIVE SPACING

Mobile:

```text
page padding: 16–20px
section gap: 24–32px
```

Desktop:

```text
page padding: 32–40px
section gap: 32–48px
```

Use fluid spacing only when it improves layout.

---

# 135. RESPONSIVE SLOT GRID

Desktop may show:

```text
4–5 slots per row
```

Tablet:

```text
3–4
```

Mobile:

```text
2–3
```

But readability comes first.

Do not cram 5 tiny buttons into a mobile row.

---

# 136. SCROLLABLE TIME SLOTS

If there are many times:

- use grouped grid
- or controlled vertical list
- avoid tiny horizontally scrolling chips

Horizontal scrolling can hide available options.

If horizontal scrolling is used, provide clear affordance.

---

# 137. SELECT CONTROLS

Timezone selection may require a searchable/selectable list.

Avoid a giant native select containing raw IANA identifiers.

Group options by region if necessary:

```text
United Kingdom
London (GMT/BST)

United States
New York (ET)
Chicago (CT)
Denver (MT)
Los Angeles (PT)

India
India Standard Time
```

Only include relevant zones.

---

# 138. SEARCHABLE TIMEZONE LIST

If implemented:

- searchable
- keyboard accessible
- human-readable labels
- underlying IANA value retained

Example:

```text
Search timezone
[ London ]

London (GMT/BST)
```

Do not show hundreds of raw technical identifiers in an intimidating dropdown.

---

# 139. DESIGNING THE FIRST VIEW

The first viewport should answer:

```text
What is this?
What do I need to do?
What timezone am I using?
Where do I choose a time?
```

The user should not need to scroll through marketing content before booking.

---

# 140. ABOVE-THE-FOLD PRIORITY

Priority order:

1. booking purpose
2. timezone
3. date
4. available times

Everything else is secondary.

---

# 141. NO MARKETING DETOUR

Do not place:

```text
Our mission
Why parents love us
Meet our mentors
AI-powered learning
Testimonials
Pricing
```

before the booking controls unless explicitly required.

The evaluator should see a functioning product immediately.

---

# 142. PRODUCT FLOW DIAGRAM

The design should support:

```text
LAND
  ↓
TIMEZONE DETECTED
  ↓
SELECT DATE
  ↓
VIEW LOCAL TIMES
  ↓
SELECT TIME
  ↓
ENTER DETAILS
  ↓
CONFIRM
  ↓
MENTOR AUTO-ASSIGNED
  ↓
BOOKING CONFIRMED
  ↓
CLASS LINK
```

Do not introduce extra steps without a product reason.

---

# 143. FLOW INTERRUPTIONS

Potential interruptions:

```text
timezone permission / mismatch
no availability
slot conflict
network error
validation error
booking success
```

Every interruption must have a recovery path.

---

# 144. ERROR RECOVERY PRINCIPLE

Never leave the user at a dead end.

Bad:

```text
Error.
```

Good:

```text
We couldn't load available times.
[ Try again ]
```

Bad:

```text
Slot unavailable.
```

Good:

```text
That time was just booked.
Choose another available time.
```

---

# 145. FORM RESET POLICY

Do not reset unrelated user input after recoverable errors.

For example, after a 409:

- keep parent name
- keep email
- keep timezone
- keep date
- refresh only availability

Avoid forcing the user to re-enter information.

---

# 146. CONFIRMATION DATA

Confirmation should show:

- exact local date
- exact local time
- timezone
- class duration if applicable
- class link
- relevant next step

Do not show internal mentor ID or database identifiers.

---

# 147. DESIGN REVIEW QUESTIONS

Before considering the UI finished, ask:

### Product
- Does the UI solve the booking problem?
- Is the next action obvious?
- Is unnecessary information removed?

### Visual
- Is there a coherent color system?
- Is typography consistent?
- Are spacing values consistent?
- Are borders/radii/shadows consistent?

### Interaction
- Does every interactive component have proper states?
- Does loading preserve layout?
- Are errors recoverable?

### Responsive
- Does mobile feel intentionally designed?
- Does tablet work?
- Does desktop use whitespace well?
- Is there any horizontal overflow?

### Accessibility
- Can everything be used with keyboard?
- Are focus states visible?
- Are labels correct?
- Is color sufficient?

### Engineering
- Are design tokens centralized?
- Are components reusable without over-abstraction?
- Are dependencies justified?

### Anti-AI
- Does any part look like an AI-generated template?
- Are there unnecessary cards?
- Are there random gradients?
- Are there fake illustrations?
- Are there excessive rounded containers?

---

# 148. DESIGN REVIEW AGAINST THE ASSIGNMENT

The final interface must demonstrate:

- scope clarity
- customer POV
- usable booking flow
- local-time presentation
- timezone handling
- clear no-availability state
- conflict recovery
- responsive design
- accessible controls
- production-level visual consistency

Do not sacrifice usability for visual novelty.

---

# 149. PRODUCTION DESIGN CHECKLIST

Before final delivery:

## Brand
- [ ] One coherent color system
- [ ] No invented logo
- [ ] No random colors
- [ ] No neon
- [ ] No fake trust elements

## Typography
- [ ] One primary font
- [ ] Consistent hierarchy
- [ ] Consistent weights
- [ ] Readable line heights
- [ ] No random font changes

## Layout
- [ ] Consistent max-width
- [ ] Consistent spacing
- [ ] Logical alignment
- [ ] No accidental overflow
- [ ] No unnecessary cards

## Components
- [ ] Button states
- [ ] Input states
- [ ] Time slot states
- [ ] Date states
- [ ] Loading states
- [ ] Error states
- [ ] Success states

## Motion
- [ ] Subtle transitions
- [ ] No unnecessary animation
- [ ] Reduced-motion support
- [ ] No layout-shifting hover effects

## Scheduling
- [ ] Timezone visible
- [ ] Local time displayed
- [ ] Manual timezone override
- [ ] No UTC shown unnecessarily
- [ ] Conflict recovery
- [ ] No availability state

## Responsive
- [ ] Mobile
- [ ] Tablet
- [ ] Desktop
- [ ] Large desktop
- [ ] Touch targets
- [ ] No horizontal overflow

## Accessibility
- [ ] Keyboard navigation
- [ ] Visible focus
- [ ] Semantic HTML
- [ ] Accessible labels
- [ ] Contrast
- [ ] Screen-reader state changes
- [ ] Reduced motion

## Quality
- [ ] No placeholder content
- [ ] No random images
- [ ] No fake data displayed as real
- [ ] No unnecessary dependencies
- [ ] No decorative UI without purpose

---

# 150. DESIGN ANTI-PATTERN CHECKLIST

Reject the implementation if it contains:

- [ ] Every section inside a card
- [ ] Every card with 24px+ radius
- [ ] Neon blue/purple gradient
- [ ] Gradient text
- [ ] Glowing buttons
- [ ] Glassmorphism everywhere
- [ ] Huge hero illustration
- [ ] Floating 3D objects
- [ ] Random AI-generated logo
- [ ] Emoji used as product icons
- [ ] Multiple icon libraries
- [ ] Excessive shadows
- [ ] Random badges
- [ ] Fake statistics
- [ ] Fake customer logos
- [ ] Unnecessary animations
- [ ] Full-screen loading spinner for small requests
- [ ] Tiny mobile controls
- [ ] Raw IANA timezone strings as primary UI
- [ ] Technical backend errors shown to parents
- [ ] UTC timestamps shown as the primary booking time
- [ ] Mentor selection when the system should assign the mentor
- [ ] Fake reservation state before server confirmation

---

# 151. DESIGN IMPLEMENTATION RULES FOR CODING AGENTS

When implementing a component:

1. Read this design system first.
2. Inspect existing tokens before creating new ones.
3. Reuse existing components before creating another.
4. Reuse existing spacing values.
5. Reuse existing colors.
6. Reuse existing typography.
7. Define all meaningful states.
8. Test mobile.
9. Test keyboard interaction.
10. Test loading/error/success states.
11. Remove unnecessary decoration.
12. Review the final implementation visually.
13. Simplify before committing.

Never solve a local design problem by creating a global inconsistency.

---

# 152. BEFORE ADDING A COMPONENT

Ask:

```text
Does the user need this?
Does the workflow need this?
Is the information already represented elsewhere?
Can whitespace solve this?
Can typography solve this?
Can an existing component solve this?
Does the component introduce a new visual language?
```

If the answer to the final question is yes, stop and reconsider.

---

# 153. BEFORE ADDING AN ANIMATION

Ask:

```text
What state change does this communicate?
Would the interface still be understandable without it?
Does it slow the workflow?
Does it move layout?
Does it respect reduced motion?
```

If the animation is purely decorative, remove it.

---

# 154. BEFORE ADDING A COLOR

Ask:

```text
What semantic meaning does this color have?
Can the existing palette represent it?
Does it improve hierarchy?
Does it meet contrast requirements?
Will it appear repeatedly?
```

If it exists only because the page feels boring, do not add it.

Use spacing and hierarchy instead.

---

# 155. BEFORE ADDING A CARD

Ask:

```text
What independent object does this card represent?
Would a divider or whitespace be enough?
Does elevation communicate something?
Does the card improve scanning?
```

If not, remove the card.

---

# 156. BEFORE ADDING AN ICON

Ask:

```text
Does this icon communicate something?
Is the meaning obvious?
Is text already sufficient?
Is the icon from the established icon system?
```

If the icon is decorative, it is probably unnecessary.

---

# 157. BEFORE ADDING A DEPENDENCY

Ask:

```text
Can React/CSS solve this?
Can the existing project dependency solve this?
Does the dependency improve accessibility?
Does it add bundle weight?
Does it introduce a visual system?
```

Do not install dependencies casually.

---

# 158. DESIGN CODE QUALITY

Design code must be as professional as backend code.

Avoid:

```text
<div className="rounded-3xl shadow-xl bg-gradient-to-r ...">
```

when the design system does not justify it.

Prefer semantic tokenized styling.

Avoid dozens of arbitrary Tailwind values.

Prefer:

```text
bg-surface
text-primary
border-default
rounded-control
space-section
```

or equivalent centralized tokens.

---

# 159. CLASSNAME DISCIPLINE

Do not create unreadable class strings containing dozens of one-off utilities.

If a pattern is genuinely reusable:

- extract the component
- define a variant
- use a token

Do not duplicate styling five times.

---

# 160. DESIGN COMMENTS

Do not add comments such as:

```text
// This creates a beautiful Apple-style button
// Make it look premium
// AI-generated animation
// This makes the UI modern
```

These comments are unprofessional.

If a design comment is necessary, explain a real constraint:

```text
// Keep the CTA width stable during submission so the loading state does not shift the form layout.
```

That is useful.

---

# 161. NO DESIGN-PROMPT COMMENTS

Never write code comments that describe design prompts.

Bad:

```text
// Create a sleek modern card with rounded corners
```

Bad:

```text
// Make this look like Apple
```

Bad:

```text
// Add a premium AI-style gradient
```

Design decisions belong in the design system, not prompt-like code comments.

---

# 162. DESIGN TOKEN COMMENTS

Comments are acceptable when explaining why a token exists.

Good:

```text
// Primary action color is intentionally reserved for interactive emphasis.
```

Good:

```text
// Keep the default radius modest to avoid the excessive card-like appearance common in generated UI.
```

Do not over-comment obvious CSS.

---

# 163. DESIGN SYSTEM FILE STRUCTURE

A practical frontend structure may be:

```text
src/
  components/
    ui/
      Button.tsx
      Input.tsx
      Select.tsx
      TimeSlot.tsx
      DateSelector.tsx
    booking/
      BookingHeader.tsx
      TimezoneSelector.tsx
      AvailabilityGrid.tsx
      BookingSummary.tsx
      BookingForm.tsx
      BookingConfirmation.tsx
  styles/
    tokens.css
    globals.css
  lib/
    dateTime.ts
    formatters.ts
```

Adapt to the existing project structure.

Do not create directories simply to satisfy this example.

---

# 164. DESIGN TOKEN EXAMPLE

Conceptually:

```css
:root {
  --color-primary: #1d4ed8;
  --color-primary-hover: #1e40af;

  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-tertiary: #6b7280;

  --color-background: #ffffff;
  --color-surface-subtle: #f8fafc;

  --color-border: #e5e7eb;
  --color-border-strong: #d1d5db;

  --radius-control: 8px;
  --radius-surface: 12px;
  --radius-modal: 16px;
}
```

Use the actual project's styling architecture rather than blindly copying this.

---

# 165. DESIGN SYSTEM SHOULD HAVE ONE SOURCE OF TRUTH

Do not have:

```text
Button blue #1D4ED8
TimeSlot blue #2563EB
Header blue #1E40AF
Link blue #3B82F6
```

without semantic reasons.

Use a controlled primary system.

The same principle applies to:

- radius
- spacing
- shadows
- typography

---

# 166. VISUAL QA PROCESS

After implementing each major screen:

1. Render at mobile width.
2. Render at tablet width.
3. Render at desktop width.
4. Check hierarchy.
5. Check alignment.
6. Check spacing.
7. Check typography.
8. Check state transitions.
9. Check keyboard.
10. Check error states.
11. Check loading states.
12. Check long content.
13. Remove unnecessary visual elements.

Do not wait until the entire application is built to discover design inconsistencies.

---

# 167. BROWSER TEST MATRIX

At minimum review:

```text
Mobile:
375px
390px
430px

Tablet:
768px
834px

Desktop:
1024px
1280px
1440px

Large:
1920px
```

The exact test widths can vary, but the design must remain stable.

---

# 168. MOBILE FAILURE MODES

Explicitly test:

- long timezone name
- long email
- no slots
- many slots
- selected slot
- booking loading
- booking error
- booking success
- keyboard on mobile
- landscape orientation if relevant

---

# 169. DESKTOP FAILURE MODES

Explicitly test:

- wide viewport
- narrow desktop
- large text
- browser zoom
- slow network
- empty availability
- long timezone label
- long parent name

---

# 170. BROWSER ZOOM

The UI should remain usable at:

```text
100%
125%
150%
200%
```

Do not rely on absolute positioning for core content.

---

# 171. RESIZABLE CONTENT

Avoid fixed heights for:

- cards
- forms
- headings
- error messages
- confirmation blocks

Use minimum dimensions where needed.

Content must be allowed to grow.

---

# 172. SCROLLBAR / OVERFLOW

Do not hide scrollbars globally.

Avoid:

```css
overflow: hidden;
```

on the body or major containers unless there is a clear reason.

A hidden scrollbar can make the interface feel broken.

---

# 173. NO HORIZONTAL PAGE SCROLL

The final page must not horizontally scroll at normal viewport sizes.

If a component requires horizontal scrolling, it should be deliberate and localized.

---

# 174. VISUAL CONSISTENCY RULE

If the first screen uses:

```text
8px radius
1px border
16px spacing
Inter
blue CTA
```

then the confirmation screen should not suddenly use:

```text
24px radius
gradient CTA
32px spacing
different font
purple accent
```

Consistency creates trust.

---

# 175. DESIGN REVIEW FROM CUSTOMER POV

Pretend you are a parent who has never seen the system.

Ask:

```text
Where am I?
What should I do?
What timezone am I in?
Which time can I choose?
Did I choose it?
What happens after I click?
Did my booking succeed?
How do I join?
```

If any answer requires guessing, improve the design.

---

# 176. DESIGN REVIEW FROM EVALUATOR POV

An evaluator should be able to recognize:

- thoughtful UX
- intentional design system
- clean responsive implementation
- accessibility awareness
- state completeness
- realistic product thinking
- restraint
- professional engineering

The interface should not look like a generated mockup that was never tested.

---

# 177. DESIGN REVIEW FROM ENGINEERING POV

The design should be implementable without:

- huge dependency lists
- complex animation frameworks
- canvas
- unnecessary SVG systems
- image-generation pipelines
- complicated design tooling

The design must be beautiful because of decisions, not because of technical complexity.

---

# 178. DESIGN REVIEW FROM PRODUCT POV

Ask:

```text
Does this make booking easier?
Does this reduce uncertainty?
Does this reduce cognitive load?
Does this prevent mistakes?
Does this recover from mistakes?
```

If a visual feature does not contribute to one of these, it is probably optional.

---

# 179. FINAL VISUAL DIRECTION

The final product should feel:

```text
Calm
Precise
Trustworthy
Modern
Fast
Human
Minimal
Professional
Accessible
Purposeful
```

It should not feel:

```text
Neon
Futuristic
Over-designed
Template-like
AI-generated
Dribbble-only
Dashboard-heavy
Marketing-heavy
Decorative
```

---

# 180. NON-NEGOTIABLE DESIGN RULES

1. Do not design every section as a card.
2. Do not use neon colors.
3. Do not use random gradients.
4. Do not fabricate logos.
5. Do not add decorative UI without purpose.
6. Use one coherent primary color.
7. Use one primary typeface.
8. Use one icon family.
9. Centralize design tokens.
10. Maintain the same spacing system.
11. Maintain the same typography system.
12. Maintain the same radius system.
13. Keep shadows restrained.
14. Use animation to communicate state.
15. Respect reduced motion.
16. Design mobile intentionally.
17. Keep touch targets accessible.
18. Show parent-local time.
19. Keep timezone context visible.
20. Never make the parent understand UTC.
21. Do not make the parent select a mentor.
22. Do not expose internal capacity logic.
23. Handle no availability gracefully.
24. Handle 409 conflicts gracefully.
25. Preserve user input during recoverable errors.
26. Do not claim booking success before server confirmation.
27. Do not expose technical backend errors.
28. Do not add marketing content that distracts from booking.
29. Do not add dependencies without a reason.
30. Review the actual rendered interface before declaring it complete.

---

# 181. DEFINITION OF DONE

The design implementation is complete only when:

- The complete parent booking flow is visually coherent.
- The first screen immediately communicates the task.
- Timezone context is clear.
- Date selection is intuitive.
- Time slots are easy to scan.
- Selection state is obvious.
- Contact form is concise.
- Primary CTA is clear.
- Loading state is stable.
- 409 conflict recovery is understandable.
- No-availability state is useful.
- Confirmation is definitive.
- Class link is accessible.
- Mobile layout is intentionally designed.
- Tablet layout works.
- Desktop layout feels spacious and focused.
- Keyboard navigation works.
- Focus states are visible.
- Reduced motion is respected.
- Color tokens are consistent.
- Typography is consistent.
- Spacing is consistent.
- Icons are consistent.
- Borders/radii/shadows are consistent.
- There are no random cards.
- There are no random gradients.
- There are no fake visual elements.
- There are no unnecessary dependencies.
- The implementation does not look like a generic AI-generated website.

---

# 182. FINAL DESIGN AGENT INSTRUCTION

Before writing UI code, stop and think.

Do not immediately generate JSX.

First determine:

```text
What is the user trying to accomplish?
What information do they need?
What information can be removed?
What is the primary action?
What state is the interface in?
What happens if the network is slow?
What happens if the slot disappears?
What happens if there are no slots?
What happens on mobile?
What happens with keyboard navigation?
What is the smallest visual system that can solve the problem?
```

Then implement.

After implementation:

```text
Inspect
Compare
Simplify
Test
Refine
```

The final design should look like it was made by a senior product team—not assembled by an AI from a collection of fashionable UI patterns.

The product is a scheduling system.

Make the scheduling experience exceptionally clear.

Everything else is secondary.
