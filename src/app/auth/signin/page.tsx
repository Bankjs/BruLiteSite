import { Card } from "@/components/ui";
import { DiscordMark } from "@/components/nav";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  oauth_denied: "Discord sign-in was cancelled.",
  oauth_failed: "Discord sign-in failed — please try again.",
  guild_required:
    "We couldn't add you to the BruLite Discord server. Please try again or join manually first.",
};

export default async function SignInPage({
  searchParams,
}: PageProps<"/auth/signin">) {
  const { error, next, pair } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : null;

  const params = new URLSearchParams();
  if (typeof next === "string") params.set("next", next);
  if (typeof pair === "string") params.set("pair", pair);
  const href = `/api/auth/discord${params.size ? `?${params}` : ""}`;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 sm:px-6">
      <Card className="w-full text-center">
        <h1 className="text-xl font-bold">Sign in to BruLite</h1>
        <p className="mt-2 text-sm text-muted">
          We use your Discord account — you&apos;ll join the BruLite server
          automatically.
        </p>
        {message && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {message}
          </p>
        )}
        <a
          href={href}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-bright"
        >
          <DiscordMark className="h-5 w-5" />
          Continue with Discord
        </a>
      </Card>
    </div>
  );
}
