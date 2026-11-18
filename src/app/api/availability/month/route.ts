import type { NextRequest } from "next/server";

import { getMonthAvailability } from "@/lib/booking/availability-service";
import { enforceRateLimit, handleRouteError, json } from "@/lib/booking/http";
import { getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/availability/month?service=<slug>&month=YYYY-MM → MonthAvailabilityResponse.
 * Always computed at request time from uncached data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  try {
    enforceRateLimit(`availability-month:${getClientIp(request.headers)}`, 120, 60_000);
    const availability = await getMonthAvailability(
      { service: searchParams.get("service"), month: searchParams.get("month") },
      new Date(),
    );
    return json(availability);
  } catch (error) {
    return handleRouteError(error, "GET /api/availability/month");
  }
}
