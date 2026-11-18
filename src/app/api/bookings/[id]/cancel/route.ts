import type { NextRequest } from "next/server";

import { assertSameOrigin, handleRouteError, json, readJsonBody } from "@/lib/booking/http";
import { cancelBookingByClient } from "@/lib/booking/service";
import { getClientIp } from "@/lib/rate-limit";
import { bookingIdFromSlug } from "@/lib/private-ids";

const MAX_BODY_BYTES = 2 * 1024;

/** POST /api/bookings/[id]/cancel { token } → { booking } (client self-service cancel). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const id = bookingIdFromSlug((await params).id);
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    const result = await cancelBookingByClient(id, body, {
      ip: getClientIp(request.headers),
      now: new Date(),
    });
    return json(result);
  } catch (error) {
    return handleRouteError(error, "POST /api/bookings/[id]/cancel");
  }
}
