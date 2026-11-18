import type { NextRequest } from "next/server";

import { getDayAvailability } from "@/lib/booking/availability-service";
import { enforceRateLimit, handleRouteError, json } from "@/lib/booking/http";
import { getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/availability?service=<slug>&date=YYYY-MM-DD → AvailabilityResponse.
 * Always computed at request time from uncached data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    enforceRateLimit(`availability:${getClientIp(request.headers)}`, 120, 60_000);
    const availability = await getDayAvailability(
      { service: searchParams.get("service"), date: searchParams.get("date") },
      new Date(),
    );
    return json(availability);
  } catch (error) {
    return handleRouteError(error, "GET /api/availability");
  }
}
