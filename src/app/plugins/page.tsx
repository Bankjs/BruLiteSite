import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plugins } from "@/lib/db/schema";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Puzzle } from "lucide-react";

export const metadata = { title: "Plugins" };
export const dynamic = "force-dynamic";

export default async function PluginsPage({
  searchParams,
}: PageProps<"/plugins">) {
  const { category } = await searchParams;

  const all = await db
    .select()
    .from(plugins)
    .where(eq(plugins.published, true))
    .orderBy(asc(plugins.sortOrder), asc(plugins.name));

  const categories = [...new Set(all.map((p) => p.category))];
  const filtered =
    typeof category === "string" && category
      ? all.filter((p) => p.category === category)
      : all;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader
        title="Plugin showcase"
        subtitle="Every plugin ships with BruLite membership."
      />

      {categories.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <a href="/plugins">
            <Badge tone={!category ? "purple" : "default"}>All</Badge>
          </a>
          {categories.map((c) => (
            <a key={c} href={`/plugins?category=${encodeURIComponent(c)}`}>
              <Badge tone={category === c ? "purple" : "default"}>{c}</Badge>
            </a>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted">
          <Puzzle className="mx-auto mb-4 h-10 w-10 opacity-50" />
          No plugins published yet — check back soon.
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="flex flex-col">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="mb-4 h-40 w-full rounded-lg border border-border object-cover"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{p.name}</h3>
                <Badge tone="purple">{p.category}</Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{p.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
