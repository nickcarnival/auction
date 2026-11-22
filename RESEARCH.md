# Research (shop ops & scheduling)

**Context for product bets:** problems shops feel, what all-in-one competitors bundle, and forum-sourced patterns for **small motorcycle shops**—so Plandry stays intentional (intake + calendar + light CRM), not a second Shopmonkey.

**Actionable list:** table-stakes backlog, **bigger strategic bets**, and **roadmap / expansion status** live in [`PRODUCT.md`](./PRODUCT.md) (see *Roadmap consolidation (expansion status)* there).

---

## Research snapshot

### What full shop-management suites emphasize (Shopmonkey, AutoLeap, Tekmetric-class)

These tools sell an **end-to-end bay**: digital vehicle inspections (photo/video), canned jobs & labor guides, estimates → e-sign → invoice → payments/BNPL, parts & POs & inventory, two-way SMS for approvals and reminders, technician mobile apps, time clocks/commissions, QuickBooks sync, multi-location reporting, marketing/review asks, fleet records. Scheduling is one slice inside that stack; the rest is revenue capture and parts workflow.

### Small motorcycle shops: what people actually say (forums & Reddit)

**Who we mean:** mostly **independent service + parts** (a few lifts/bays, maybe performance or custom work), not a full multi-rooftop dealer DMS rollout—though rider pain threads still matter for **post-booking comms**.

There is **less** public “compare my scheduling stack” chatter for moto than for general auto repair, so this mixes **operator threads** with **high-signal adjacent** discussions. Several links are **2024–2025** first-hand posts (still the best open primary quotes we found); **time-stamped 2026** trade and market context is in [§2026 context](#2026-context-industry-values-seasonality) below.

#### What operators ask for / like

- **One place for repairs + history + parts** — on [Motorcycle Forum (Sep 2024)](https://motorcycleforum.com/threads/motorcycle-repair-software-question.255057/), a shop owner asks for repair tracking, customer history, and inventory, wants **easy-but-strong** tooling, and calls out **custom bikes** as a constraint. Replies point to **Shopmonkey / Torque360 / Tekmetric** (and “used Excel for years”)—i.e. they gravitate to **auto-style all-in-ones** when they outgrow spreadsheets, not boutique “booking only” apps.
- **Fitment-aware inventory thinking** — in [r/InventoryManagement — motorbike / automotive](https://www.reddit.com/r/InventoryManagement/comments/1ha0x0e/inventory_app_for_motorbike_shops_automotive/), the pain is **year/make/model and compatibility**: plain category-based stock doesn’t match how parts move for mixed marques. (Implication for you: **don’t pretend to solve the stock room**; optionally link out or stay intake-only.)

#### What operators struggle with / dislike

- **Who owns the schedule & service writing** — [r/BikeMechanics — service manager control](https://www.reddit.com/r/BikeMechanics/comments/1lp2a70/): a promoted lead still gets **no real authority**; the owner pulls scheduling and writing “on a whim.” That’s a **human/process** problem, but software only helps if **one calendar + inbox is obviously the system of record** so “whim” doesn’t fork into side channels.
- **Brutal lead times** — [r/MotoIRELAND — bike mechanics](https://www.reddit.com/r/MotoIRELAND/comments/1l5qgrs/bike_mechanics/): mechanics **booked weeks out**; some shops turn work away. Small shops need tools that **set honest expectations at intake** (real availability, closures, skill/bay limits) more than slick marketing.
- **Customer-side: long holds + radio silence** — threads like [r/Triumph — dealer/repair ordeal](https://www.reddit.com/r/Triumph/comments/1nnsf4y/absolute_nightmare_story_2016_st_and_local_dealer/) are **rider** rants, not shop owners, but the pattern is constant: **multi-week waits + poor updates + billing surprises**. Indie shops that answer faster and **confirm drop-off/pick-up in writing** win word-of-mouth; that supports **confirmed appointment + reminder** UX without building full RO.

#### Borrowed from general indie repair (apply carefully)

- **Phone as a tax** — [r/AskMechanics — time on the phone](https://www.reddit.com/r/AskMechanics/comments/1q3l6iu/car_repair_shop_owners_how_much_time_do_you_spend/) (auto context): owners report **large daily minutes** on customers, vendors, and parts runs. For a 2–3 person moto shop, **async booking + clear “request vs confirmed” messaging** is still the right wedge.

#### How to use this for Plandry

**Lean into:** predictable intake, honest capacity, **confirmed** times, staff alerts, and customer acknowledgement—so the calendar isn’t fighting DMs, sticky notes, and three spreadsheets.

**Stay narrow unless intentional:** parts catalogs, full RO, labor guides, DVI photos—because that’s what Shop Boss / Mitchell / Shopmonkey buyers are explicitly shopping for in the threads above.

---

## 2026 context (industry, values, seasonality)

**Scope:** Dated **2026** (and late-2025 outlook pieces explicitly framed as “entering 2026”) from **trade press and market data**, not vendor feature pages. The **forum bullets** in the section above are still useful qualitatively but mostly **pre-2026**; this block is what you can cite when someone asks *what’s true this year*.

### Dealership & economic backdrop (U.S. powersports)

[Powersports Business — “2026 market outlook: Protect cash, pick your moment, proactively plan ahead”](https://powersportsbusiness.com/latest-news/2025/12/10/2026-market-outlook-protect-cash-pick-your-moment-and-proactively-plan-ahead/) (Dec 2025 issue; **outlook into 2026**) — Advisory piece aimed at dealer principals: **tactical, not reactive** planning; **slower growth** and a **normalized** market after post-pandemic highs; **softening new-unit sales** and **lingering import delays** alongside **strong used inventory**; Morgan Stanley–style macro cited there includes **~1% U.S. real GDP** drag factors (tariffs, **labor constraints**, fading stimulus) and **Fed easing into 2026** but **elevated borrowing costs in the near term**. **Implication for indies:** when big-ticket buyers get selective, **schedule discipline and predictable customer comms** are defensive value—fewer no-shows and fewer “surprise” promise dates.

### Motorcycle / powersports values & consumer caution

[Black Book — Q1 2026 Motorcycle & Powersports Market Update](https://www.blackbook.com/market-insights/q1-2026-motorcycle-powersports-market-update/) (**Feb 2026** insight; Hearst / Black Book) — Market commentator summary for year-end **2025** into **2026**: powersports closed the year under **continued pressure** from **elevated interest rates**, **cautious consumer spending**, and **normalization from post-pandemic pricing**; report walks Q4 softness by segment (e.g. seasonal/discretionary categories weaker). **Implication:** service departments and independents often stay busy on **repair and used churn** even when **new unit glamour** fades—booking tools should reflect **real turnaround**, not marketing optimism.

### Technician depth vs. headcount (automotive repair parallel)

[MOTOR — “Tech Shortage or Skills Gap in Shops”](https://www.motor.com/2026/03/technician-skills-gap-auto-shops/) (**Mar 2026**) — Argues the binding constraint is often **diagnostic and systems capability** (modern drivetrains, networks, hybrids), not only applicant volume; contrasts shallow “parts swapping” with disciplined **data-led diagnosis**; shops that win treat **ongoing training as operational infrastructure**. **Implication for scheduling:** **effective bay throughput** per qualified tech may be **lower than the org chart suggests**—capacity features should encode **who** can run **which** work, not only slot count.

### Labor scarcity structure (heavy-duty benchmark)

[Yahoo Finance — summary of Fullbay’s 2026 industry findings](https://finance.yahoo.com/sectors/technology/articles/fullbay-2026-report-heavy-duty-203508444.html) — **Heavy-duty commercial repair** (not motorcycles): majority of shops report **understaffing**; hiring **harder** year over year; workforce **skew older**. Use only as a **structural analogy**: **technician time** remains the constrained resource; software that **overbooks** breeds the same **trust failures** riders complain about in forums.

### Seasonal surge pattern (2026 rider-facing content)

[MotorManage — “Spring Motorcycle Prep Checklist 2026”](https://motormanage.app/blog/spring-motorcycle-prep-checklist-2026) (**2026-01-18**; **vendor blog**—use as cultural timing, not peer-reviewed data) — Narrates the usual **winter lull vs. spring rush**: easy booking and parts availability **before** March; by March, **multi-week shop waits**, back-orders, and rushed jobs. **Implication:** **blackout dates**, **honest lead times**, and **request vs. confirmed** messaging matter most when the spike hits.

### Forum / Reddit coverage in 2026

Ad-hoc searches for **2026-dated** “small motorcycle **shop owner**” threads did **not** yield a dense new corpus (rider subs still produce one-off **service wait / quality** posts). **Refresh** this doc periodically with targeted searches; until then, treat **2026 trade sources** above as the **time-stamped** layer and **older forum links** as **persistent pain patterns**.

---

## Already covered in this codebase (don’t duplicate as net-new ideas)

- Public **branded booking** (subdomain), **booking request inbox**, confirm/reject, link requests to **appointments**.
- **Team calendar** with resources (techs/bays), drag/resize, work week / month / day (day view has a **quick month strip**).
- **Customer records** and **manual reminder email** to the customer from an appointment.
- **Email to the customer** when they submit a booking request (acknowledgement—not a confirmed time).
- **Shop closed days** on the schedule: federal catalog + custom dates tint headers/month cells; **appointment duration math** uses **weekly business hours only** (closed days do not block scheduling or wrap multi-day hours).

---

## What we are *not* trying to be (unless scope changes)

Full **estimates, invoices, payments, parts room, DVI, technician payroll exports**—that is the Shopmonkey/AutoLeap core. Compete on **fast, honest scheduling + intake + notifications** or partner/embed instead of rebuilding that stack.
