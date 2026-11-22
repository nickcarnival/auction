# Tenant onboarding checklist (operations)

Step-by-step runbook for bringing **another shop** live on the same deployment: create tenant data, wire subdomain, validate booking, and decide public branding. Technical background (what is tenant-scoped in code, layout switcher, gaps) lives in **[`multi-tenant-expansion.md`](./multi-tenant-expansion.md)**.

---

## Checklist

1. **Tenant row** — Create tenant (name, business, `shopHours`, `active`, `tier`, contacts).
2. **Subdomain config** — `tenantCode` + `tenantId`, optional `redirectUrl` / `backgroundColor`.
3. **DNS** — CNAME or A record so `customer2.yourdomain.com` hits the same app that reads subdomain from host.
4. **Users** — At least one dashboard user with `tenantId` = new tenant; invites if you use that flow.
5. **Technicians / resources** — So the schedule is usable.
6. **Public smoke test** — Submit booking request on subdomain; confirm request appears in **Requests** and `tenantId` is correct.
7. **Layout** — Default shell (standard offer) vs **custom** branch in [`tenant-layout.tsx`](../client/src/pages/subdomain/tenant-layout.tsx) (**upsell**); document which they bought so support matches expectations. *Today, a bespoke public look still means a code change—see multi-tenant doc §3.1.*
8. **Legal / content** — Privacy, terms, “who we are” on public layout (often still manual per brand).

---

## After onboarding

Append **one line** per shop in [`multi-tenant-expansion.md`](./multi-tenant-expansion.md) §7 / your internal notes if there are quirks (custom domain only, special layout branch name, etc.).
