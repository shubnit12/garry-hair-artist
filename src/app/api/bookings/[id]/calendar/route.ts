import type { NextRequest } from "next/server";

import { handleRouteError } from "@/lib/booking/http";
import { getBookingCalendar } from "@/lib/booking/service";
import { bookingIdFromSlug } from "@/lib/private-ids";

/** GET /api/bookings/[id]/calendar?token=… → .ics download (signed link). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.nextUrl.searchParams.get("token");
  try {
    const id = bookingIdFromSlug((await params).id);
    const { filename, ics } = await getBookingCalendar(id, token, new Date());
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/bookings/[id]/calendar");
  }
}
