const steps = [
  {
    title: 'Customer fills out your booking page',
    description:
      'You give them a link. They say what’s wrong and when they’d like to come in. The page has your shop on it—not a generic widget.',
  },
  {
    title: 'You read the list and decide',
    description:
      'Requests show up in one inbox. You call back, move the time, or decline. Nothing hits the calendar until you put it there.',
  },
  {
    title: 'Confirmed work goes on the calendar',
    description:
      'When you’re happy with it, it becomes an appointment on the shared schedule—same view for whoever needs to see the day.',
  },
];

export function HowItWorks() {
  return (
    <section
      className="border-y border-border bg-muted/40 py-16 sm:py-20"
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <p className="text-base font-semibold uppercase tracking-wide text-primary">How it works</p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
          >
            Request → you say yes → it’s on the calendar
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            No magic. A customer asks online, you handle it like any other lead, and the job ends up on
            the same calendar everyone uses. That’s the whole product.
          </p>
        </div>

        <ol className="mt-12 grid list-none gap-8 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl bg-card p-6 shadow-sm ring-1 ring-border/60"
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold tabular-nums text-primary-foreground"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold leading-snug text-foreground">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
