import { createServerFn } from "@tanstack/react-start";

import { gatewayFetch, type PaddleEnv } from "@/lib/paddle.server";

/** Resolves a human-readable price ID to the Paddle internal price ID. */
export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .validator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = await response.json();
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0].id as string;
  });
