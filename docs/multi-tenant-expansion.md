# Multi-tenant expansion: what exists, what you can change, what’s missing

## Scope (what this doc is for)

**Target scale: roughly 1–10 tenants**, not “infinite SaaS.” **Manual admin** (`/dashboard/tenant` and related flows) is an acceptable way to create shops, approve them, and tweak settings. The goal is to know **what breaks or gets awkward** when you add a few more customers—which knobs already exist, which need a one-off code change, and which you can safely ignore until you feel pain.

This is **not** a roadmap for self-serve signup, billing automation, or multi-region scale unless you explicitly want that later.

Covers the codebase from a **multi-tenant** angle: tenant-scoped data, DB-configurable knobs, hard-coded public layouts. **Operational onboarding steps** are in **[`tenant-onboarding-checklist.md`](./tenant-onboarding-checklist.md)** (kept separate so this file stays architecture + gaps).

**Related docs:** **Roadmap hub** (bets, backlog, what’s shipped vs still open) → **[`PRODUCT.md`](../PRODUCT.md)** — start with *Roadmap consolidation (expansion status)*. Evidence and competitor context → **[`RESEARCH.md`](../RESEARCH.md)**.

### Status (baseline, not a mega-project)

For **~1–10 admin-managed tenants**, the **expansion baseline is in place**: tenant-scoped app data, subdomain public booking, manual tenant create/approve, plus the **[onboarding checklist](./tenant-onboarding-checklist.md)**. Further work is **ordinary product development** (see `PRODUCT.md` §3–4), not an unfinished “multi-tenant milestone.”

### Known pain: bespoke public layout = code today

A **fully custom** public booking shell still means editing [`tenant-layout.tsx`](../client/src/pages/subdomain/tenant-layout.tsx): new tenants use the **default** branch or you add another `tenantCode` branch (often plus companion components). That does **not** scale with tenant count the way DB-driven `themeKey`, logo, and CSS variables would. See **§3.1** and `PRODUCT.md` *Roadmap consolidation*.

---

## 1. Mental model today

| Layer | Model |
|--------|--------|
| **Data** | Most domain data is keyed by `tenantId` (appointments, resources, users, booking requests, etc.). Mongo collections are filtered server-side by the authenticated user’s tenant. |
| **Dashboard** | Logged-in users see **one** tenant (`user.tenantId` → `TenantProvider` loads `/api/tenants/get-by-id`). There is no in-app tenant switcher for a single login across shops. |
| **Public booking** | Hostname subdomain → `subdomain-config` → `tenantId` + `tenantCode` + optional `redirectUrl`, colors. **Layout and copy are partly bespoke per known codes** (see §3). |
| Intake form | One global Zod schema (`shared/schemas/booking-schema.ts`) and one React form; labels skew “motorcycle shop.” Not driven per tenant from the DB. |

So: **backend multi-tenancy for the dashboard is real**; **public-site presentation and intake are still “product defaults + a few named tenants.”**

---

## 2. What you can change today (without new features)

These knobs already exist in code or DB; they are the levers you have for each tenant.

### 2.1 Tenant record (`shared/tenant.ts`)

- **Identity:** `name`, `businessName`, `subdomain` (and generated / stored subdomain wiring).
- **Operations:** `shopHours` (`daysOpen`, `openHour`, `closeHour`) — drives calendar bounds, work-week math, placement logic.
- **Commercial / lifecycle:** `tier` (`global` \| `customer`), `trial`, `active`.
- **Contact:** `phone`, `email`.
- **Post-submit:** `redirectUrl` — after a successful public booking request, the browser can redirect here.

What you **cannot** change per tenant without code today: intake fields, validation rules, form copy (except indirectly via layout components), default “service” options, automated approval rules.

### 2.2 Subdomain config (`shared/subdomain.ts`)

- Links **subdomain code** → `tenantId`.
- Optional: `redirectUrl`, `backgroundColor` (and any other fields you persist in `subdomain-config`).

You still need **DNS / hosting** to point the hostname at your app (see §4).

### 2.3 Dashboard settings (routes under `/dashboard/settings`)

| Area | Purpose |
|------|--------|
| **Business** | Tenant profile / business info (and related API updates). |
| **Operations** | Operational settings (shop-centric; aligns with `shopHours` / workflows in code). |

**Team** (main nav → `/dashboard/technicians`): technician resources on the schedule and **User accounts** (workspace logins) on the same **Overview** page—not in Settings tabs.

### 2.3a Legacy settings URLs

`/dashboard/settings/team/technicians` still redirects into `/dashboard/technicians`. `/dashboard/settings/team/users` and `/dashboard/technicians/users` redirect to `/dashboard/technicians` (overview).

### 2.4 Schedule product

- Calendar views, drag-drop, resources: **tenant-scoped** via context and APIs.
- Duration / slot step, work-week range: tied to **`shopHours`** and shared constants (e.g. `CALENDAR_SLOT_STEP_MINUTES` in schedule code).

---

## 3. Hard-coded or awkward spots (matter more as N grows past ~1)

At **1–10 customers**, you can often dodge these with the **default** public layout and the admin screen. They become worth fixing when bespoke themes or copy per shop eat your time.

### 3.1 Public tenant layout switcher

**File:** `client/src/pages/subdomain/tenant-layout.tsx`

Layouts are chosen by **lowercased `tenantCode`** with explicit branches:

- `maurersmotors`, `onedownfourup`, `solowcycles`, `admintest`
- Everyone else falls through to a **default** shell.

**Product angle (upsell):** Treat the **default** branch as the **standard / out-of-the-box** public booking shell—fast onboarding, consistent support. The **named layouts** (`if (layoutCode === '…')`) can be positioned as a **premium or custom onboarding** SKU: bespoke hero, imagery, or layout without every tenant inheriting engineering cost. At small N you still implement those branches by hand; the pitch is “off-the-shelf vs. we match your brand.”

**Operations:** A handful of hard-coded branches is workable while you only have a few custom shops. If custom landers become frequent, move to a DB **`themeKey` / `publicLayoutId`** on `subdomain-config` (or tenant) so you map one place—or one shell driven by **CSS variables + logo** so “custom” is mostly data, not new components.

**Direction (when you’re tired of editing `tenant-layout.tsx`):** Same as above: centralize layout selection on stored config instead of growing unbounded `if` chains; optional tier field or flag in admin (“standard theme” vs “custom theme”) can mirror pricing.

### 3.2 Intake form

**Files:** `client/src/components/booking/booking-form.tsx`, `shared/src/schemas/booking-schema.ts`

- Single schema and fixed fields; motorcycle-oriented labels in JSX.
- Same validation for all tenants.

**Direction:** Intake definition per tenant (JSON + dynamic renderer) or at minimum **tenant-owned copy + optional field toggles** (see ideation in product discussions).

### 3.3 Admin tenant screen (`/dashboard/tenant`)

- **Admin-role** CRUD, approve, delete (with cascade)—this is the right control surface for **1–10 tenants**: manual is fine.
- **Caveat:** No billing gate on delete/approve; at small scale you just use discipline. Add constraints only if you start selling seats or need safer fat-finger protection.

### 3.4 Environment / secrets

- reCAPTCHA, API base URL, OAuth if any — **per deployment**, not per tenant.
- If customer 2 needs separate analytics or captcha keys, you need either env-per-tenant metadata or separate deploys.

### 3.5 Support and observability (optional until you feel pain)

For a **few** shops, a personal runbook + logs may be enough. Consider later:

- **Audit log** if multiple people touch tenant settings.
- **Per-tenant rate limits** on public booking if spam becomes real.
- **Status / runbook** if DNS or email flakes often.

---

## 4. Onboarding runbook (operations)

Use **[`tenant-onboarding-checklist.md`](./tenant-onboarding-checklist.md)** as the literal step list for “customer 2” (tenant row → DNS → smoke test → layout/legal). It is maintained separately so operators can follow it without wading through §1–3.

---

## 5. Residual features & platform gaps (discovery menu, not a checklist)

Below is a **capability catalog** for when a shop or revenue asks for depth—not a list of incomplete expansion work. **Ordering and bets** live in [`PRODUCT.md`](../PRODUCT.md) §3–4 and *Roadmap consolidation*. At 1–10 tenants, **admin + default layout + shared intake** is often enough until something here clearly hurts.

### 5.1 Product / customer-facing

| Item | Notes |
|------|--------|
| Configurable intake | Fields, labels, required/optional, industries beyond “bike.” |
| Service catalog | Per-tenant services with duration hints; feeds copy and maybe auto-duration. |
| Public availability | Pick slot vs “we’ll call you”; reduces manual placement. |
| Multi-language | No tenant-level locale in schema today. |
| Theming | Logo + colors from DB for everyone; **custom public layout** as a **premium tier** vs default shell (see §3.1). |

### 5.2 Operations / admin

| Item | Notes |
|------|--------|
| Self-serve signup → live tenant | **Optional at 1–10**; manual create + approve matches your stated goal. |
| Billing / plans | `tier` / `trial` exist; wire Stripe (etc.) only when you’re invoicing inside the product. |
| Usage limits | Enforced quotas usually **not** needed until you productize plans. |
| Impersonation / support login | Nice when you support many users; small portfolio often uses shared admin access. |
| Export / GDPR | `deleteTenant` cascade exists; deeper export when a customer asks or regulations require. |

### 5.3 Engineering / platform

| Item | Notes |
|------|--------|
| Layout / theme from DB | Remove hard-coded `tenantCode` layout map. |
| Feature flags | Roll intake v2 per tenant without branching on name. |
| Migrations | Backfill new fields on all tenants safely. |
| Integration webhooks | “Booking created” → Zapier / SMS provider per tenant. |

---

## 6. Practical path for customer 2…10 (admin-managed)

**Goal:** Each new shop runs on the **same deployment**; you use the **admin tenant screen** + [`tenant-onboarding-checklist.md`](./tenant-onboarding-checklist.md). You do **not** need full “platform” automation at this scale.

1. **Default public shell** — Use the fallback layout in `tenant-layout.tsx` unless they pay for a custom branch.
2. **Admin:** tenant row + subdomain config + approve as you do today.
3. **DNS + smoke test** — [Onboarding checklist](./tenant-onboarding-checklist.md); repeat the same DNS pattern per shop.
4. **Branding (when asked)** — Optional `logoUrl` / colors on tenant or `subdomain-config` feeding the default layout—before growing the `if (layoutCode)` list.
5. **Intake copy** — Shared form is fine for a few shops in the same vertical; per-tenant labels only when a shop’s brand really diverges.
6. **Defer:** Full form builder, self-serve signup, slot pickers, billing—add when volume or revenue asks for it.

---

## 7. How to maintain this doc

- When you add a **tenant-scoped** setting, note it in §2 and link the route or API.
- When you add a **hard-coded** branch (layout, copy, feature), note it in §3.
- When **customer N** joins, append one line in internal notes (see checklist *After onboarding*) with quirks (custom domain only, etc.).
- When you **ship** something that used to look like a “gap” in §5, either remove or annotate that row—or rely on [`PRODUCT.md`](../PRODUCT.md) *Roadmap consolidation* / marketing-vs-shipped as the source of truth so §5 does not duplicate a checklist.

---

*Generated from repository survey (dashboard routes, `tenant` / `subdomain` shared types, `tenant-layout.tsx`, `booking-form`, `TenantProvider`, server `tenant-service`). Update as the codebase evolves.*
