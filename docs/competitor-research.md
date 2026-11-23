# Auction SaaS — Competitor Research

> Research pass 1. Sources are the live marketing pages (captured 2026).
> - PledgePal — `https://pledgepal.live/auctioneers`
> - GiveButter — `https://givebutter.com/` + `https://givebutter.com/auctions`

Purpose: document what these tools actually do so we can pick a wedge and avoid
rebuilding their table stakes. Two very different players — see the split below.

---

## The two-player landscape

| | **PledgePal** | **GiveButter** |
|---|---|---|
| **Who it's for** | Professional **benefit auctioneers** (service providers) + the nonprofits' development teams | **Nonprofits** directly (in-house fundraising) |
| **What it is** | Live **Fund-a-Need (FAN) tallying** + reporting niche | All-in-one **fundraising platform** (donations, events, CRM, marketing, wallet) with a strong **online silent auction** module |
| **Moment it owns** | "The ten loudest minutes of the night" (live in-room appeal) | The whole online event, days before → after |
| **Monetization** | $99/mo or $799/yr, unlimited events (agency pricing available) | Free for nonprofits, 0% fees, paid "Plus" tier |
| **Pricing angle** | Sells premium positioning for the auctioneer | Sells "free, 0% fees, 2.5% APY on your funds" |

**Key insight:** they target different seats in the same room.
PledgePal sells to the *person holding the mic*; GiveButter sells to the *org hosting the event*.
The open gap is a tool that unifies **live in-room bidding/pledging** with **item + bid management**,
sold to professional auctioneers as an **agency / white-label** platform.

---

## PledgePal — feature sheet

**Positioning:** "Fundraising Intelligence for Benefit Auctioneers." Built *by* an auctioneer.

### Core loop
1. Set your **Fund-a-Need levels** and an overall goal (count **and** dollars) — totals auto-compute as you type.
2. Share **one QR code** with the tally person → their phone pairs straight to the event.
3. Watch pledges, totals, and goal progress update **in real time** across three screens.
4. Download a **client-ready Post-Event Report** the morning after.

### Three screens, one number
- **Tally phone** — no app store, no account for the tally person. Big buttons, **one-tap undo**, calculator keypad for "fishing above" amounts. QR-code pairing.
- **Auctioneer View** — read-only tablet/laptop: running total, level in play, progress toward every goal, updates instantly.
- **Audience View** — branded big screen: client logo, colors, custom frame. Choose what the room sees: overall total, total at level, or both.

### Goal model
- **Basic / Stretch / Dream** goal levels per FAN.
- Overall goal by **count and dollars**; customizable.

### Reporting
- **Post-Event Report** (one page): total raised, results by level, goal attainment, matching challenge, pace of the appeal; participation rate + dollars-per-guest (once guest count entered).
- Export: **PDF** (board packet) + **CSV** (donor database).
- **Auctioneer Performance Report**: roll any set of events into one cross-event report with charts + key insights ("what works across your calendar").
- **Saved events + event history.**

### Privacy stance (trust differentiator)
- Client data stays the client's. **No donor names ever collected.**
- Other auctioneers can't see your events.
- Only **anonymized aggregates** inform platform benchmarks.

### Pricing / GTM
- **Professional:** $799/yr (unlimited events) or $99/mo, cancel anytime.
- Per-event effective cost drops with volume (20 → $39.95, 40 → $19.98, 60 → $13.32).
- **Free trial:** one live FAN at your next event (event within 2 months) + unlimited practice runs + post-event report.
- Agency pricing available. No card required to start.

---

## GiveButter — feature sheet (auction module + platform)

**Positioning:** "#1 free fundraising software for nonprofits." 0% fees, 2.5% APY on settled funds, Stripe-verified, mobile app.

### Online auction — bidder experience
- Browse, **favorite**, and **track** items; bidding is one click.
- **Real-time** auto-updating auction pages — new bids/items appear **without refresh**.
- **Mobile bidding notifications**: item opened, you won, **you've been outbid** → "increase your max bid before time expires."
- **Proxy / automated bidding**: set a **max bid**, system bids in **configurable increments** up to your max.
- Built for **scale** — hundreds of items, high-volume real-time bidding.

### Organizer / team tooling
- **Item management:** add, categorize, manage auction + **buy-now** items; track bids, winners, payments, fulfillment, and donor data in one place.
- **Fully customizable items:** individual starting prices, start/end times, buy-now, photos, videos.
- **Custom categories** + sorting (Art, Travel, Live Events, Food & Drink, Jewelry, …).
- **Auction packages / bundles** (e.g. 7-night stay, top-golf party).
- **Auction travel packages** via partner providers (reserve-priced, high-value).

### "More ways to raise" (live-room features we should note)
- **Paddle raise** — capture live pledges.
- **Popcorn bidding** — extend bidding when competition heats up.

### Checkout & money
- **Easy checkout:** auto-charge after win **or** send payment reminders; receipts; line items for item + shipping + processing fees.
- Never miss a payment.

### Broader platform (context, not our core)
- Donation forms (claims 47% conversion, "4x industry avg"), fundraising pages, events, widgets, payment processing.
- **Built-in CRM / donor management** (track every transaction + donor activity, share reports).
- **Marketing & engagement** (email / text / direct mail at the right moment).
- **GiveButter Wallet** (2.5% APY, Spend Cards) + **GiveButter Magic** (AI tools) + **Plus** (automation/analytics/advanced marketing).
- 24/7 support, #1 on G2 for fundraising / CRM / auctions.

---

## Gap analysis → our wedges

1. **Live-in-room + online unified.** GiveButter is online-first; PledgePal is in-room-first but FAN-only (no item bidding). No one cleanly unifies a **live auctioneer console** (bidding + FAN + popcorn + paddle) with a **persistent online item catalog**. That's the natural product.
2. **Agency / white-label for auctioneers.** PledgePal validates auctioneers will pay for polish + reports, but it's narrow. An auctioneer-facing platform (branded screens, client roster, per-event billing, cross-client analytics) is a bigger, stickier seat.
3. **Reporting as the moat.** Both lean on post-event reports. Cross-event performance analytics ("what works across your calendar") is the retention hook — build it first-class.
4. **Trust.** No-donor-name capture + anonymized benchmarks (PledgePal) is a differentiator for a multi-client (agency) model. Worth adopting as a stance, not just a feature.
5. **Table stakes we must match** (from GiveButter): real-time no-refresh bidding, proxy/max-bid + increments, buy-now, favorites/track, outbid notifications, checkout + reminders + receipts, categories, scale.

---

## Open questions (next research pass)
- [ ] Actual **pricing pages** (GiveButter Plus tiers; PledgePal agency tier) — numbers, not positioning.
- [ ] **API / integration** posture of both (can auctioneers embed, webhooks, SSO, Stripe Connect).
- [ ] **Live-auction console** depth: does GiveButter have an in-room "paddle/popcorn" console or just online? (Our wedge depends on this being weak.)
- [ ] **Multi-tenant / white-label**: does either support a service provider reselling under their own brand?
- [ ] Hardware: do they assume a specific tally device, or is any phone enough?
