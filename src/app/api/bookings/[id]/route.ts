import type { NextRequest } from "next/server";

import { handleRouteError, json } from "@/lib/booking/http";
import { getManagedBooking } from "@/lib/booking/service";
import { bookingIdFromSlug } from "@/lib/private-ids";

/** GET /api/bookings/[id]?token=… → { booking, canCancel, cancellationPolicy } (signed link). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.nextUrl.searchParams.get("token");
  try {
    const id = bookingIdFromSlug((await params).id);
    return json(await getManagedBooking(id, token, new Date()));
  } catch (error) {
    return handleRouteError(error, "GET /api/bookings/[id]");
  }
}
