import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "FAQ" };

const faqs = [
  {
    q: "How do I get access to BruLite?",
    a: "Sign in with your Discord account (you'll automatically join our server), pick a membership on the Pricing page, and download the client from your Dashboard.",
  },
  {
    q: "How does the client verify my membership?",
    a: "When you launch BruLite it opens your browser to link with your Discord account. The client receives a short-lived token and checks your membership against our API — the Discord role alone doesn't grant access.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes, anytime from your Dashboard via Manage Billing. Your access continues until the end of the paid billing period.",
  },
  {
    q: "What happens if my payment fails?",
    a: "Your subscription enters a past-due state and Stripe retries the payment. Access continues until the paid period ends; keep an eye on your billing emails.",
  },
  {
    q: "What is the refund policy?",
    a: "Once you've received access, purchases are generally non-refundable except where required by law or authorised by staff. See the Terms of Service for full details including digital-content rights.",
  },
  {
    q: "Is BruLite affiliated with Jagex?",
    a: "No. BruLite is a third-party client and is not affiliated with or endorsed by Jagex Ltd. Use of third-party clients is at your own risk.",
  },
  {
    q: "Where do I report a bug or request a feature?",
    a: "Use the Support page after signing in — tickets go straight to the team via Discord.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader title="Frequently asked questions" />
      <div className="space-y-4">
        {faqs.map((f) => (
          <Card key={f.q}>
            <h3 className="font-semibold">{f.q}</h3>
            <p className="mt-2 text-sm text-muted">{f.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
