import type { NextRequest } from "next/server";

import { assertSameOrigin, handleRouteError, json, readJsonBody } from "@/lib/booking/http";
import { createBooking } from "@/lib/booking/service";
import { getClientIp } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 10 * 1024;

/**
 * POST /api/bookings — BookingRequest JSON → 201 CreateBookingResponse.
 * Re-validates the slot server-side and creates the booking under a per-day
 * lock, then emails the owner and the client.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    const result = await createBooking(body, { ip: getClientIp(request.headers), now: new Date() });
    return json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/bookings");
  }
}
