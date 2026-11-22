import { Clock, Globe, Users, Inbox, UserCircle, Settings2 } from 'lucide-react';

const features = [
  {
    name: 'Booking page (your name on it)',
    description:
      'You share one link. Customers type what they need. It’s tied to your shop so it doesn’t look like some random SaaS signup form.',
    icon: Globe,
  },
  {
    name: 'Shop hours and who’s working',
    description:
      'Set when you’re open, when you’re closed, and hours per bay or tech so the calendar matches how you actually run the floor.',
    icon: Clock,
  },
  {
    name: 'The calendar',
    description:
      'One board for the day: who’s in which bay, what’s getting done, drag to reschedule. Everyone looks at the same thing.',
    icon: Users,
  },
  {
    name: 'Request inbox',
    description:
      'Stuff from the web doesn’t auto-book. It waits in a list until you confirm or change it—so you don’t promise what you can’t do.',
    icon: Inbox,
  },
  {
    name: 'Customer records',
    description:
      'Name, phone, email, and what they booked—stored with the appointment so you’re not digging through texts to figure out who’s who.',
    icon: UserCircle,
  },
  {
    name: 'Settings',
    description:
      'Business details, billing if you use it, and which staff can log in. It’s in one place.',
    icon: Settings2,
  },
];

export function Features() {
  return (
    <section className="bg-background py-16 sm:py-20" id="features" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <p className="text-base font-semibold uppercase tracking-wide text-primary">What it does</p>
          <h2
            id="features-heading"
            className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
          >
            The pieces, in plain English
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground lg:mx-auto">
            It’s a calendar with a public booking form and a customer list. Your data is only yours—other
            shops on Plandry don’t see your schedule or your customers.
          </p>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(feature => (
            <article
              key={feature.name}
              className="relative rounded-xl border border-border/70 bg-card/50 p-5 shadow-sm transition hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <feature.icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-snug text-foreground">{feature.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground md:text-base">{feature.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
