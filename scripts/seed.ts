import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import { products, prices, plugins } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });

const db = drizzle(neon(process.env.DATABASE_URL!));

/**
 * Seeds starter data. Monthly/yearly prices require STRIPE_PRICE_ID_MONTHLY /
 * STRIPE_PRICE_ID_YEARLY env vars (create the products in Stripe first).
 */
async function main() {
  const monthlyId = process.env.STRIPE_PRICE_ID_MONTHLY;
  const yearlyId = process.env.STRIPE_PRICE_ID_YEARLY;
  const monthlyUsd = Number(process.env.SEED_PRICE_MONTHLY_USD ?? "9.99");
  const yearlyUsd = Number(process.env.SEED_PRICE_YEARLY_USD ?? "99.99");

  const [membership] = await db
    .insert(products)
    .values({
      name: "BruLite Membership",
      slug: "brulite-membership",
      description: "Full client access, all plugins, Discord customer role.",
      category: "membership",
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();

  if (membership) {
    const rows = [];
    if (monthlyId)
      rows.push({
        productId: membership.id,
        stripePriceId: monthlyId,
        interval: "month",
        amountUsdCents: Math.round(monthlyUsd * 100),
      });
    if (yearlyId)
      rows.push({
        productId: membership.id,
        stripePriceId: yearlyId,
        interval: "year",
        amountUsdCents: Math.round(yearlyUsd * 100),
      });
    if (rows.length) {
      await db
        .insert(prices)
        .values(rows)
        .onConflictDoNothing({ target: prices.stripePriceId });
      console.log(`Seeded ${rows.length} price(s).`);
    } else {
      console.warn(
        "STRIPE_PRICE_ID_MONTHLY / _YEARLY not set — membership product created without prices."
      );
    }
  } else {
    console.log("Membership product already exists — skipping.");
  }

  const samplePlugins = [
    {
      name: "Ground Markers+",
      slug: "ground-markers-plus",
      description:
        "Enhanced ground marker tools with labels, colors and per-account profiles.",
      category: "QoL",
      sortOrder: 1,
    },
    {
      name: "Boss Timers",
      slug: "boss-timers",
      description:
        "Respawn and phase timers for all major bosses with customizable alerts.",
      category: "PvM",
      sortOrder: 2,
    },
    {
      name: "Loot Highlights",
      slug: "loot-highlights",
      description:
        "Never miss a drop — value-based highlighting with custom thresholds.",
      category: "QoL",
      sortOrder: 3,
    },
  ];

  for (const p of samplePlugins) {
    await db
      .insert(plugins)
      .values(p)
      .onConflictDoNothing({ target: plugins.slug });
  }
  console.log("Seeded sample plugins.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
