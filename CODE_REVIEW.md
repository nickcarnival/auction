# Code review notes

Internal review snapshot: **tests (first)**, **split candidates**, **antipatterns**, and **performance**. Prioritize by impact and team capacity; not every item needs immediate action.

---

## 0. Testing: what we actually want (and what we skip)

**Prefer**

- **`shared/` pure logic** — deterministic inputs/outputs (parsers, expansion rules, merge eligibility, date math). No React, no network.
- **Contract checks at boundaries** — Zod `safeParse` tables for payloads that hit the API; one happy path + a few invalid shapes is enough.
- **Thin server integration tests** — real router + supertest (or your harness) with a **minimal** DB stub only where unavoidable: assert status code + stable error shape + one field on success. Skip re-testing framework behavior.
- **Refactors that enable tests** — extract 30 lines of calendar/dyno aggregation into a pure function, then test **that** instead of mounting `<Schedule />` with seventeen mocks.

**Skip / deprioritize (low signal)**

- **“Component renders without crashing”** with `vi.mock` on every import — doesn’t prove behavior; breaks on any prop rename.
- **Snapshot walls** of huge DOM trees — noise in reviews, rarely catch real regressions.
- **Mocking the entire world** to assert `useMutation` was “called” — you’re testing your mock wiring, not production code.
- **E2E for every variant** — reserve for checkout-tier flows; don’t duplicate what a shared unit test already proves.
- **100% coverage targets** as a goal in themselves — use coverage to find **untested critical paths**, not badges.

**Policy (practical)**

- New **pure** helpers in `shared/` → add or extend tests in the same PR.
- New **tenant-facing API behavior** → prefer one integration test over five shallow unit tests with mocks.
- **Client UI** → add tests only after extracting logic or when fixing a confirmed bug (regression test with real user flow data).

---

## 1. Files that should be split up

| Area | File | Lines (approx.) | Why split |
|------|------|------------------|-----------|
| Customers | `client/src/components/customers/customer-merge-suggestions.tsx` | ~1,230+ | Single module mixes data fetching, merge policy, dialogs, forms, and grid UI. High cognitive load and painful PRs. Extract: API hooks, “group card” presentational pieces, instant-merge dialog, filters. |
| Settings | `client/src/pages/dashboard/settings/tabs/operations/recurring-block-dialog.tsx` | ~700 | Form schema builders, duration/stop-slot math, layout, and footer are interleaved. Candidates: `recurring-block-form-schema.ts`, `recurring-block-time-fields.tsx`, `use-recurring-block-form.ts`. |
| Schedule | `client/src/components/schedule/appointment-context.tsx` | ~390 | Provider owns query window, live SSE-ish updates, mutations, navigation helpers, and UI-adjacent state. Splitting “data layer” (fetch + cache) from “UI session” (current appointment, highlight) would clarify boundaries. |
| Schedule | `client/src/components/manage-appointment/appointment-modal.tsx` | ~490 | Already uses field components; could move submit/delete/remind flows and hydration effects into hooks (`use-appointment-modal-actions.ts`). |
| Schedule | `client/src/components/schedule/schedule-calendar.tsx` | ~330 | Compose: recurring merge, dyno status aggregation, and DnD wiring. `hasSpecialStatus` alone is a good extract for testability. |
| Schedule | `client/src/components/schedule/use-schedule-calendar.tsx` | ~320 | Drag/drop, slot selection, and view state could be two hooks: `useScheduleView` vs `useAppointmentDnD`. |
| Server | `server/src/api/customer/customer-service.ts` | ~910+ | God-module risk. Typical split: read paths, merge/write paths, validation helpers, and email/adapters. |
| Server | `server/src/api/tenant/tenant-service.ts` | ~580+ | Merge/patch logic, normalization, and Stripe-adjacent bits can move into smaller modules with focused tests. |
| Shared | `shared/src/customer-merge.ts` | ~338 | Pure logic is test-heavy (good); file could still split “grouping” vs “payload build” vs “eligibility” if it keeps growing. |

**Smaller but repeated:** `operations-tab.tsx`, `operations-holidays-card.tsx`, `auth-provider.tsx`, `notification-context.tsx` are at the upper end of “still OK” but are merge-conflict hot spots when features land fast.

---

## 2. Tests that are missing (high value only)

**Inventory:** **16** shared, **9** server, **2** client test files (re-run `find` after big refactors). Shared adds **`bookingSchema` safeParse** alongside recurring, **`appointmentSchema`**, tenant/shop-hours/holidays/customer-merge. Server adds **`appointment-routes`** (create/update/delete/nudge/get-by-customer) and **`tenant-routes`**, plus auth + middleware suites.

### Recently landed (don’t duplicate)

- `shared/src/recurring-schedule-block-calendar.test.ts` — range edges, monthly clamp, `daysOpen`, multi-resource, notes, merged weekly+monthly.
- `shared/src/recurring-schedule-block.test.ts` — `normalizeRecurringScheduleBlocks`, array max, interval refinements.
- `shared/src/schemas/appointment-schema.test.ts` — happy path + invalid customer/resource/duration/phone/email.
- `server/src/api/tenant/tenant-routes.test.ts` — update route auth and `updateTenant` delegation.
- `shared/src/schemas/booking-schema.test.ts` — happy path + invalid name/phone/email/year.
- `server/src/api/appointment/appointment-routes.test.ts` — create/update/delete/nudge/get-by-customer status and delegation.

### Worth adding next (in order)

1. **`/appointments/get-all`** (range query + list) or **`/bookings`** — supertest with minimal `getDb` / service mocks when those paths churn.
2. **Shared** — extend recurring or other rules only when behavior changes.
3. **Regression tests** — when a bug ships, smallest non-mocked reproduction (shared parse or route).

### Explicitly not a priority (unless extracting logic first)

- Mounting **`schedule-calendar`** / **`appointment-context`** with full React Query + router mocks — **low ROI** per §0.
- **`operations-tab` debounce/autosave** — only test after extracting a pure “build PATCH payload” helper; don’t mock `useDebounce` to assert timers.
- **RTL on `appointment-modal`** — only after form submit pipeline is a thin function + schema test (shared schema tests already cover field rules).

---

## 3. Antipatterns / consistency

1. **Duplicated `useMinWidthMd`** in `appointment-modal.tsx` and `recurring-block-dialog.tsx` — identical hook; should live in `client/src/hooks/use-min-width-md.ts` (or reuse an existing breakpoint hook).

2. **`as unknown as` casts** around react-big-calendar event types — practical but masks drift. A narrow branded type or adapter (`toCalendarEvent(appointment)`) would centralize assumptions.

3. **`form (date-form-field)`** uses `name={name as any}` — conflicts with project “no `any`” guideline; prefer typed field paths or a generic helper that satisfies `react-hook-form` without `any`.

4. **`appointment-context`**: local `appointments` state synced from React Query duplicates source of truth; works but makes “loading vs placeholder vs real empty” easy to get wrong. Document the intended flow or collapse to query-only with derived UI state.

5. **Large components** mixing **data fetching + UI + business rules** (`customer-merge-suggestions`, `operations-tab`) — harder to test and reason about than containers + dumb children.

6. **Inline magic strings** (e.g. status `'RecurringBlock'`, `'Vacation'`) — already centralized for recurring in shared; keep routing/settings paths and status checks consistent to avoid typos.

---

## 4. Performance / scalability

1. **`schedule-calendar` `hasSpecialStatus`** — walks all `calendarEvents` and, for Dyno appointments, loops day-by-day with `movePastNonWorkingDays`. Complexity grows with **events × span**. If Dyno volume grows, consider pre-indexing by date or computing only for **visible range** explicitly (not just implicit via `calendarEvents` size).

2. **Recurring block expansion** — materialized client-side for ±30 days per fetch anchor. Fine at current limits; if `recurringScheduleBlocks` max or technician count jumps, watch **merge + sort** cost before paint. Server-side “instances” API would be the escape hatch.

3. **`operations-tab` debounced autosave** — many `useWatch` + debounce dependencies; acceptable, but avoid widening the watched surface (e.g. watch whole `form` unnecessarily) to limit re-renders on large forms.

4. **EventSource / live updates** invalidating broad query keys (`get-all-appointments`) — can cause full calendar refetch storms if message rate is high. Optional: debounce invalidation or patch cache.

5. **Lists without virtualization** — customer grid, notification grid, large merge UI: monitor scroll performance on low-end devices; introduce windowing if row counts routinely exceed ~200 visible.

6. **Bundle / lazy loading** — several dashboard pages are lazy-routed already; keep heavy admin-only modules (merge suggestions, large forms) out of the hot path for booking/subdomain surfaces.

---

## 5. Suggested next steps (order of operations)

1. **Tests:** next wins are **`/appointments/get-all`** (optional), **`/bookings`** route smoke tests, or other high-churn APIs. **`booking-schema`**, **`appointment` mutations**, tenant update, and recurring coverage are in place.
2. Extract **pure** pieces from calendar/dyno/operations **only when** it unlocks tests or shrinks a bug surface — then test the extracted function.
3. Extract **`useMinWidthMd`** (duplication) when touching those files anyway.
4. **`customer-merge-suggestions.tsx`** mechanical split only when a feature demands it; don’t split for “architecture points” alone.

---

*Re-run line counts and test inventory after major refactors.*
