import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

// Untyped client: the generated Database types lag behind migrations, and the
// subscriptions row shape is defined by this handler anyway.
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

function table() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getSupabase() as any).from("subscriptions");
}

interface SubscriptionItem {
  price?: { id?: string; productId?: string; importMeta?: { externalId?: string } };
  product?: { id?: string; importMeta?: { externalId?: string } };
}

function readExternalIds(items: SubscriptionItem[] | undefined) {
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  return { priceId, productId };
}

async function upsertSubscriptionRow(row: Record<string, unknown>) {
  const { error } = await table().upsert(row, { onConflict: "paddle_subscription_id" });
  if (error) throw new Error(`Subscription upsert failed: ${error.message}`);
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("No userId in customData");
    return;
  }
  const { priceId, productId } = readExternalIds(items);
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId");
    return;
  }
  await upsertSubscriptionRow({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  });
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange } = data;
  const { error } = await table()
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);
  if (error) throw new Error(`Subscription update failed: ${error.message}`);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  const { error } = await table()
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
  if (error) throw new Error(`Subscription cancellation update failed: ${error.message}`);
}

/**
 * One-time purchases arrive as completed transactions, not subscriptions.
 * Record them as a permanent active row so the same access checks work for
 * both subscription and one-time purchase models.
 */
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const { id, customerId, items, customData, subscriptionId } = data;
  if (subscriptionId) return; // recurring billing is handled by subscription events

  const userId = customData?.userId;
  if (!userId) {
    console.error("Transaction completed without userId in customData", id);
    return;
  }
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.price?.productId ?? item?.product?.importMeta?.externalId;
  if (!priceId) {
    console.warn("Skipping transaction: missing price externalId", id);
    return;
  }
  await upsertSubscriptionRow({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId ?? "itpath_pro",
    price_id: priceId,
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: null,
    environment: env,
    updated_at: new Date().toISOString(),
  });
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      console.log("Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const requestedEnv = url.searchParams.get("env") || "sandbox";
        if (requestedEnv !== "sandbox" && requestedEnv !== "live") {
          return new Response("Invalid payment environment", { status: 400 });
        }
        const env = requestedEnv as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
