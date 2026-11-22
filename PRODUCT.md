# Product planning

Scratchpad for **what we ship vs what we say**, **strategic bets**, and **backlog**—not a committed roadmap.

---

## Documentation map

| Doc | Role |
| --- | --- |
| **This file (`PRODUCT.md`)** | **Single roadmap hub:** marketing vs shipped, SaaS baseline, product bets, backlog. |
| **[`RESEARCH.md`](./RESEARCH.md)** | Evidence and context: forums, competitors, 2026 trade notes—**why** bets might matter; not the task list. |
| **[`docs/tenant-onboarding-checklist.md`](./docs/tenant-onboarding-checklist.md)** | **Operations:** numbered runbook for a new shop (tenant row, DNS, smoke test, layout/legal)—no architecture prose. |
| **[`docs/multi-tenant-expansion.md`](./docs/multi-tenant-expansion.md)** | **Reference + runbook:** tenant model in code, layout/intake constraints, known pains (e.g. per-tenant `tenant-layout.tsx`). §5 is a *residual capability menu*—prioritization is **here** (§3–4 and below). |

**How to use this file:** (1) keep **marketing vs shipped** accurate; (2) list gaps you actually want to close; (3) park speculative bets so they do not scatter—pick one bet when you have a reason.

---

## Roadmap consolidation (expansion status)

**Multi-tenant expansion** (supporting a small portfolio of shops on one deployment with manual admin) is largely **complete** as a baseline: data and dashboard are tenant-scoped, public booking resolves tenants by subdomain, and you can onboard additional shops with **[`docs/tenant-onboarding-checklist.md`](./docs/tenant-onboarding-checklist.md)**.

**Main remaining multi-tenant friction:** **bespoke public layouts** still require **code**—typically a new branch (and sometimes components) in [`tenant-layout.tsx`](./client/src/pages/subdomain/tenant-layout.tsx), not DB-only branding. Pushing “unique layout per tenant” without that refactor keeps shipping cost high. The mitigation path is default shell + premium custom work, or **theme/layout from config** (see `docs/multi-tenant-expansion.md` §3.1 and §5.3).

What remains beyond that is **product evolution** (bets §3, backlog §4) and **optional platform depth** (self-serve signup, webhooks, …) when pain or revenue justifies it—not a blocking “expansion project.”

### Shipped alongside that baseline (operator & intake)

These support the same scheduling + requests wedge; they are **done**, not backlog.

- **Motorcycles:** Settings → **Motorcycles** ([`motorcycles-settings-page.tsx`](./client/src/pages/dashboard/settings/pages/motorcycles-settings-page.tsx))—searchable index derived from appointments; **MotorcycleField** autocomplete on public booking, appointments, and manual request flows.
- **Return visitor:** After a successful public booking submit, **localStorage** prefills name, email, phone, and vehicle on the next visit ([`shared/booking-return-visitor.ts`](./shared/booking-return-visitor.ts), client storage helper).
- **Requests & customers:** Merging customers updates **booking-request** denormalized contact fields so the inbox matches the kept record; inbox UI avoids duplicate vehicle noise where the header already shows the bike.

### Where open ideas still live

| Kind | Where |
| --- | --- |
| Strategic directions (one primary bet per season) | **§3 Product bets** |
| Small experiments, polish, integrations | **§4 Small experiments / backlog** |
| Tenant/platform capability menu (intake builder, DB theme, self-serve, webhooks, …) | **[`docs/multi-tenant-expansion.md`](./docs/multi-tenant-expansion.md) §5**—for discovery only; **do not** treat as an ordered roadmap |

---

## 1. Marketing vs what we ship (source of truth)

Copy on the site is plain-language for shop owners (no “subdomain” / “tenant” on the landing). **If you change the site, update this section.**

### Themes (see `client/src/pages/landing/`)

- **Hero:** Plain statement—calendar for small motorcycle service shops; paragraph explains shared schedule, booking link + request list, customer info on the job.
- **How it works:** Request → shop approves → appointment on shared calendar; three concrete steps.
- **Features (“What it does”):** Booking page, hours/techs, calendar, inbox, customers, settings—described in plain English; honest “not a full suite” in who-it’s-for.
- **Who it’s for:** Small appointment-based shops; explicit **not** parts/RO/accounting.
- **SEO / meta:** [`marketing-page-head.tsx`](./client/src/pages/landing/marketing-page-head.tsx).

### Shipped (supports the claims)

| Area | Notes |
| --- | --- |
| Booking side branding | Per-tenant layouts / styling on the public booking experience. |
| Hours & closed days | Shop and resource (bay/tech) scheduling rules. |
| Internal calendar | Schedule, techs/resources, appointments. |
| Requests | Inbox; confirm / adjust / decline before commit; merge keeps request contact fields aligned with customers. |
| Customers | Records in the app next to scheduling (not a separate “CRM” product). |
| Settings & team | Business profile, operations, roles. |
| Motorcycles (fleet index) | Settings → **Motorcycles**; motorcycle model autocomplete on booking and internal intake. |
| Return visitor (booking) | Prefill booking form from prior successful submit (localStorage). |
| Multi-shop onboarding | Admin tenant + subdomain config + **[`docs/tenant-onboarding-checklist.md`](./docs/tenant-onboarding-checklist.md)**. Custom public layouts still = code branches in `tenant-layout.tsx` today. |
| Billing | Stripe Checkout + Billing Portal — not spelled out on the marketing grid. |
| Data export | Settings → **Data** → CSV: customers + appointments ([`data-settings-page.tsx`](./client/src/pages/dashboard/settings/pages/data-settings-page.tsx)). |

### Do not imply unless built

- External calendar sync (Google / iCal, two-way) — **not shipped**.
- Full shop management (invoices, parts, payroll, etc.) — **out of scope** unless strategy changes.

---

## 2. Universal SaaS baseline (when you are not chasing a feature bet)

Rough priority for credibility: clear auth/session behavior; password reset; team roles and revoke access; billing state end users understand + failed-payment path; honest errors (not raw API strings); help/contact path; backups/restores you have tested; rate limits on auth and public booking where needed.

**Defer until forced:** SSO, audit trail, webhooks/API keys, heavy multi-tier commercial plumbing—listed for discovery in [`docs/multi-tenant-expansion.md`](./docs/multi-tenant-expansion.md) §5 (including **layout/theme from DB** to escape per-tenant `tenant-layout` branches); prioritize against §3–4 only when a real customer forces it.

---

## 3. Product bets (at most one “primary” per season)

Ideas that add new primitives—validate with a few shops before building deep.

| Direction | One-line |
| --- | --- |
| Constraint-aware scheduling | Who can do what / bay or resource rules beyond a pretty calendar. |
| Honest queue & lead-time | Truth about backlog before riders invest emotionally. |
| Lightweight job status | Requested → confirmed → in shop → ready (stay out of invoicing). |
| Tenant-owned intake fields | Per-shop fields and job types vs one default form. |
| Inbox ↔ calendar as system of record | Clear linkage + activity, not only badge counts. |
| Waitlist & slot reclaim | Offer freed slots with fair rules. |

North-star one-liners to stress-test (pick one): *calendar that doesn’t lie about backlog*; *customer sees line position without building Shopmonkey*; *right tech/bay for the job*.

---

## 4. Small experiments / backlog (not commitments)

Scheduler polish (staff email on request, calendar navigation, blackouts), mobile-friendly requests links, push/SMS, QuickBooks, deep integrations—record here so ideas do not sprawl; ship only with a buyer or loud pain.

Per-tenant **booking page** beyond colors: still mostly `tenant-layout.tsx` branches—see [`docs/multi-tenant-expansion.md`](./docs/multi-tenant-expansion.md) §3.1 and *Roadmap consolidation* above.

**Wedge:** honest scheduling + controlled intake + baseline SaaS hygiene; sharp bets live in §3.
