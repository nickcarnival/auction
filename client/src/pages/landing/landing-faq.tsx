const faqs: { question: string; answer: string }[] = [
  {
    question: 'What is Plandry, in one sentence?',
    answer:
      'A shared calendar for your service shop, plus a page where customers can request work, plus a simple customer list—nothing more.',
  },
  {
    question: 'Is this only for motorcycle shops?',
    answer:
      'We designed it for small motorcycle service shops first, but if you book jobs on a calendar—bicycle, light mechanical—it’s the same problem. It’s not for huge multi-location operations or for shops that need full repair-order software.',
  },
  {
    question: 'Does a web request automatically book a slot?',
    answer:
      'No. It shows up as a request. You decide whether to put it on the calendar, move it, or say no.',
  },
  {
    question: 'Can my techs see the same schedule?',
    answer:
      'Yes. That’s the point—one calendar for the shop instead of a whiteboard, a group chat, and three different memories of what’s going on.',
  },
  {
    question: 'Where do customer details live?',
    answer:
      'Next to the appointment in the app. Phone, email, what they asked for—so you’re not matching a calendar slot to a random phone number in your call log.',
  },
];

export function LandingFaq() {
  return (
    <section className="bg-background py-16 sm:py-20" id="faq" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-base font-semibold uppercase tracking-wide text-primary">FAQ</p>
          <h2
            id="faq-heading"
            className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
          >
            Questions people actually ask
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No investor deck. Just what the product is.
          </p>
        </div>
        <div className="mt-12 space-y-4">
          {faqs.map(item => (
            <details
              key={item.question}
              className="group rounded-lg border border-border bg-card px-5 py-4 shadow-sm open:pb-4"
            >
              <summary className="cursor-pointer list-none font-semibold text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {item.question}
                  <span className="text-muted-foreground transition group-open:rotate-180">▼</span>
                </span>
              </summary>
              <p className="mt-3 border-t border-border/60 pt-3 text-muted-foreground">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
