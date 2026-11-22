import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-background bg-gradient-to-b from-primary/8 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
      <div className="relative z-10 pb-12 pt-6 sm:pb-16 sm:pt-8 md:pb-20 lg:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
            <div className="text-left md:text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Plandry</p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                A calendar for small motorcycle service shops.
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg md:mx-auto md:max-w-2xl lg:mx-0 lg:max-w-xl md:text-xl">
                That&apos;s it. You run appointments off a shared schedule—techs, bays, and the front desk
                see the same day. Customers can ask for work through a link you give them; those asks land
                in a list, and you only put a job on the calendar when you&apos;re ready. Names, numbers,
                and what they wanted are next to the slot—no separate mystery spreadsheet.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-center lg:justify-start">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  One schedule for the whole shop
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Online requests—you approve before it&apos;s booked
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  Customers and jobs in the same place
                </li>
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button asChild size="lg" variant="marketing-body-solid">
                  <Link to="/signup">Start your free trial</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary/40 bg-background/80">
                  <a href="/#how-it-works">See how it works</a>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground md:text-center lg:text-left">
                Already using Plandry?{' '}
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

            <div
              className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
              aria-hidden
            >
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl ring-1 ring-black/5 backdrop-blur-sm dark:ring-white/10">
                <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Team schedule
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    Today
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground sm:text-xs">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d}>{d}</div>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2 rounded-lg bg-muted/80 p-2">
                    <div className="w-1 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        Service — confirm tire &amp; brake inspection
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">9:00 AM · Bay 2</p>
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-lg bg-muted/50 p-2">
                    <div className="w-1 shrink-0 rounded-full bg-amber-500/80" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        Request pending — custom exhaust consult
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">Awaiting approval</p>
                    </div>
                  </div>
                  <div className="flex gap-2 rounded-lg bg-muted/50 p-2">
                    <div className="w-1 shrink-0 rounded-full bg-emerald-600/80" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                        Pickup — tune &amp; fluid service
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">3:30 PM · Front desk</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-[10px] text-muted-foreground sm:text-xs">
                  Example only—yours shows your hours, bays, and jobs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
