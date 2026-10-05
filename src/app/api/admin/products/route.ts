import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { prices, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

const productSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(60).default("membership"),
  /** Stripe Price ID (price_...) created in the Stripe dashboard. */
  stripePriceId: z.string().regex(/^price_/, "must be a Stripe price_ ID"),
  interval: z.enum(["month", "year", "one_time"]),
  amountUsdCents: z.number().int().positive(),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** GET /api/admin/products — all products with their prices. */
export async function GET() {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }
  const prods = await db.select().from(products).orderBy(asc(products.name));
  const allPrices = await db.select().from(prices);
  return NextResponse.json({
    products: prods.map((p) => ({
      ...p,
      prices: allPrices.filter((pr) => pr.productId === p.id),
    })),
  });
}

/**
 * POST /api/admin/products — create a product + bind a Stripe price.
 * Create the product/price in Stripe first, then paste the price_ ID here.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const parsed = productSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { stripePriceId, interval, amountUsdCents, ...prod } = parsed.data;

  const [product] = await db
    .insert(products)
    .values({ ...prod, slug: slugify(prod.name) })
    .returning();

  const [price] = await db
    .insert(prices)
    .values({ productId: product.id, stripePriceId, interval, amountUsdCents })
    .returning();

  return NextResponse.json({ product, price }, { status: 201 });
}

/** PATCH /api/admin/products?id=&active= — toggle a product on/off. */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
  } catch (r) {
    return r as Response;
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const active = url.searchParams.get("active");
  if (!id || active === null) {
    return NextResponse.json({ error: "id_and_active_required" }, { status: 400 });
  }

  const [product] = await db
    .update(products)
    .set({ active: active === "true" })
    .where(eq(products.id, id))
    .returning();

  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ product });
}
