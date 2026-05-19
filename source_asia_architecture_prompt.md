# Source Asia Frontend Internship - Architecture Prompt
<!-- https://github.com/Kavish-Paraswar/Source-Asia.git -->
## Context

You are acting as a senior frontend architect and product-minded engineer. The goal is to design a production-like Flight Management web app for a frontend internship assignment. The app must be responsive, reliable under realtime updates, safe for concurrent seat booking, and polished enough for a public GitHub submission and a Vercel preview.

The assignment requires:
- Next.js 14+ with App Router
- Supabase for PostgreSQL, auth, and realtime
- Zustand with persist middleware
- Tailwind CSS
- optional PWA using next-pwa
- Supabase migrations, seed data, RLS, RPCs, and DB-level constraints
- booking, seat selection, rescheduling, cancellation, offline readiness, and mobile-friendly UX

## What the app must do

Design a flight booking experience with:
- flight search by origin, destination, date, and passenger count
- results listing flights with price, duration, and class options
- booking flow with passenger details and seat selection
- confirmation page with PNR, flight details, and seat assignment
- live seat map with availability updates from Supabase Realtime
- booking management with reschedule and cancellation
- offline-friendly behavior for saved state and cached booking data
- installable PWA as a bonus

## Requirements to respect

The architecture must explicitly address:
- server-side Supabase usage in Server Components and server actions only where appropriate, with no secret keys exposed to the browser
- RLS on every table, ensuring users can only access their own bookings
- an RPC-based seat reservation flow to prevent race conditions and double booking
- a DB-level cancellation rule that blocks cancellations within 2 hours of departure
- persistence in Zustand only for safe state, excluding sensitive fields like passport numbers
- optimistic seat selection in the UI, but final booking must depend on confirmed backend write
- realtime seat updates from the seats table
- responsive behavior across mobile, tablet, and desktop
- clean code structure, TypeScript throughout, and no use of any `any`
- documentation in README covering setup, architecture decisions, trade-offs, and incomplete features

## Thinking approach

Before proposing the solution, reason through:
1. data ownership and trust boundaries
2. how booking race conditions are prevented
3. how realtime seat updates affect UI state
4. which state belongs in Supabase, server cache, and Zustand
5. what should be persisted locally and what must never be persisted
6. how offline mode should behave without breaking correctness
7. how to structure the codebase so the app is easy to extend and review

## Deliverable format to generate

Produce a complete architecture plan with the following sections:

### 1. Executive summary
Summarize the product and the technical approach in 5 to 8 lines.

### 2. Key product flows
Map the user journey from search to booking, seat selection, confirmation, reschedule, cancel, and offline revisit.

### 3. System architecture
Describe the app layers:
- presentation layer
- routing and page structure
- server data layer
- client state layer
- realtime layer
- persistence layer
- error handling and fallback layer

Explain where each responsibility lives and why.

### 4. Recommended folder structure
Provide a practical Next.js App Router structure, including:
- app routes
- components
- features
- lib
- store
- types
- supabase
- hooks
- utils
- styles
- public assets
- migrations and seed files

### 5. Database and backend design
Design the Supabase schema for:
- flights
- seats
- bookings
- passengers
- reschedules

Also include:
- RLS policy strategy
- RPC seat lock / reservation flow
- cancellation safeguard at DB level
- reschedule update flow
- seed strategy for multiple routes and full seat maps
- what data should be public, private, or user-scoped

### 6. Frontend state architecture
Design Zustand stores:
- `useFlightStore`
- `useUserStore`

Explain:
- what each store contains
- what persists
- what is excluded using `partialize`
- how the store resets on logout or cancellation
- how optimistic seat selection works
- how cached search and in-progress booking are restored

### 7. Realtime architecture
Explain how Supabase Realtime should be used for:
- seat availability updates
- preventing stale seat maps
- syncing occupied seats across users
- updating the UI without full page refresh

Include how to unsubscribe, how to avoid duplicate listeners, and how to merge realtime events with local state.

### 8. UI and component architecture
Break down the main screens and their components:
- search page
- results page
- booking form
- seat map
- confirmation page
- my bookings page
- reschedule dialog
- cancellation dialog
- offline fallback page
- install banner for PWA

For each screen, explain:
- main purpose
- data required
- loading and empty states
- responsive layout strategy
- accessibility considerations

### 9. Booking correctness and concurrency
Describe the booking flow step by step with emphasis on:
- seat availability check
- RPC reservation
- atomic insert for booking and passenger records
- confirmation state
- rollback and error handling
- how to avoid double booking

### 10. Offline and PWA strategy
Specify:
- manifest fields
- caching strategy for search results and static assets
- offline fallback behavior
- what data can be shown offline
- how the bookings page should work when the network is unavailable
- how to keep offline mode honest about stale data

### 11. Validation and quality gates
Include:
- form validation strategy
- server-side validation
- UI validation
- TypeScript patterns
- linting and formatting
- smoke testing checklist
- basic e2e test ideas
- Lighthouse PWA checklist

### 12. Trade-offs and incomplete features
List the most likely trade-offs, such as:
- realtime complexity vs. implementation speed
- server caching vs. freshness
- local persistence vs. sensitive data exposure
- offline support vs. data correctness
- polish vs. breadth of features

### 13. README outline
Create a README outline covering:
- project overview
- tech stack
- setup instructions
- environment variables
- Supabase setup
- migration and seeding steps
- architecture decisions
- state management explanation
- trade-offs
- incomplete features
- deployment notes

## Output style requested from the model

The final answer should be practical, specific, and implementation-oriented. It should avoid generic advice and instead give a concrete blueprint that can be handed to an engineer for building the app.

Use clear headings, bullet points only where they improve readability, and include enough detail for an actual implementation kickoff.

## Suggested closing instruction

End by summarizing the highest-risk technical areas and the first implementation order that would reduce risk fastest.
