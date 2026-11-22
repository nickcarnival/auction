import { CalendarDays, Globe, Inbox } from 'lucide-react';

const points = [
  {
    title: 'Fewer “did they call?” moments',
    description:
      'Requests land in the app instead of only in someone’s pocket. You still control what gets booked.',
    icon: Inbox,
  },
  {
    title: 'A booking page that isn’t embarrassing',
    description:
      'Customers see your shop, not a blank corporate form. Small thing, but it matters when you’re asking people to trust you with their bike.',
    icon: Globe,
  },
  {
    title: 'One place for the day',
    description:
      'If the calendar is wrong, the shop is wrong. This keeps techs, bays, and the desk on the same page.',
    icon: CalendarDays,
  },
];

/** Honest fit / outcomes—no fabricated quotes or attributions. */
export function ShopFit() {
  return (
    <section
      className="bg-muted/60 py-16 sm:py-24"
      id="shop-fit"
      aria-labelledby="shop-fit-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2
            id="shop-fit-heading"
            className="text-base font-semibold uppercase tracking-wide text-primary"
          >
            Who this is for
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-foreground sm:text-4xl">
            Small shops that run on appointments
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            We built it around motorcycle service, but it works for any small shop that books work in
            advance—cycle, light mechanical, whatever. It is{' '}
            <strong className="font-semibold text-foreground">not</strong> a full shop management
            suite: no parts catalog, no RO writer, no accounting. Just scheduling, requests, and
            customer context.
          </p>
        </div>
        <ul className="mt-12 grid list-none gap-8 md:grid-cols-3 md:gap-8">
          {points.map(item => (
            <li
              key={item.title}
              className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-base text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
