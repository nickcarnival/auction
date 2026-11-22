import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MarketingDocumentMeta } from './marketing-document-meta';

const FEEDBACK_TITLE = 'Feedback';
const FEEDBACK_DESCRIPTION =
  'Bug reports and ideas for Plandry—the calendar product for small service shops.';

export function FeedbackPage() {
  return (
    <div className="w-full bg-background py-12 px-4 sm:px-6 lg:px-8">
      <MarketingDocumentMeta title={FEEDBACK_TITLE} description={FEEDBACK_DESCRIPTION} path="/feedback" />
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">Feedback</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Something broken or missing? Tell us. We read these.
          </p>
        </div>

        <form className="mt-12 space-y-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" name="name" type="text" required placeholder="John Smith" />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="john@example.com" />
            </div>

            <div>
              <Label>What type of feedback do you have?</Label>
              <RadioGroup defaultValue="feature" className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="feature" id="feature" />
                  <Label htmlFor="feature">Feature Request</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bug" id="bug" />
                  <Label htmlFor="bug">Bug Report</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="message">Your Feedback</Label>
              <Textarea
                id="message"
                name="message"
                rows={4}
                required
                placeholder="Tell us what you think..."
              />
            </div>
          </div>

          <div>
            <Button type="submit" variant="solid" className="w-full">
              Submit Feedback
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
