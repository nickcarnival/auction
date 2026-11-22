import { CTA } from './cta';
import { Features } from './features';
import { Hero } from './hero';
import { HowItWorks } from './how-it-works';
import { LandingFaq } from './landing-faq';
import { MarketingPageHead } from './marketing-page-head';
import { ShopFit } from './shop-fit';

/** Public marketing homepage: SEO head, hero, funnel sections, FAQ, and conversion CTA. */
export function MarketingHome() {
  return (
    <>
      <MarketingPageHead />
      <div className="h-full w-full">
        <Hero />
        <HowItWorks />
        <Features />
        <ShopFit />
        <LandingFaq />
        <CTA />
      </div>
    </>
  );
}
