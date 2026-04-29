/**
 * Shared-pool hotel availability calculator.
 *
 * Single source of truth used by:
 *  - the agency-facing search calendar (HotelSearchSection)
 *  - the admin insights calendar (HotelAvailabilityInsightsCalendar)
 *  - the admin reconciliation screen (HotelAvailabilityReconciliation)
 *
 * Model: each `hotel_available_dates` row defines a window with a fixed pool
 * of rooms shared across the whole window. A booking that overlaps the window
 * is counted ONCE (not per night). Every day inside the window therefore shows
 * the same remaining count.
 */
import { eachDayOfInterval, format, parseISO, startOfDay } from "date-fns";

export interface AvailabilityWindow {
  hotel_id: string;
  from_date: string;
  to_date: string;
  available_rooms: number;
}

export interface BookingOverlapInput {
  hotel_id: string | null;
  check_in: string | null;
  check_out: string | null;
  rooms: number;
}

const ms = (d: Date) => startOfDay(d).getTime();

/** Sum rooms booked whose stay overlaps [windowFrom..windowTo] inclusive. */
export function getBookedRoomsForWindow(
  bookings: BookingOverlapInput[],
  hotelId: string,
  windowFrom: Date,
  windowTo: Date,
): number {
  const wf = ms(windowFrom);
  const wt = ms(windowTo);
  let booked = 0;
  for (const b of bookings) {
    if (b.hotel_id !== hotelId || !b.check_in || !b.check_out) continue;
    const ci = ms(parseISO(b.check_in));
    const co = ms(parseISO(b.check_out)) - 86400000; // last occupied night
    if (Number.isNaN(ci) || Number.isNaN(co)) continue;
    if (co >= wf && ci <= wt) booked += b.rooms;
  }
  return booked;
}

/** Per-window shared-pool remaining for a hotel. */
export function computeWindowRemaining(
  windows: AvailabilityWindow[],
  bookings: BookingOverlapInput[],
  hotelId: string,
): { from: Date; to: Date; capacity: number; sold: number; remaining: number }[] {
  return windows
    .filter((w) => w.hotel_id === hotelId && w.from_date && w.to_date)
    .map((w) => {
      const from = parseISO(w.from_date);
      const to = parseISO(w.to_date);
      const sold = getBookedRoomsForWindow(bookings, hotelId, from, to);
      return {
        from,
        to,
        capacity: w.available_rooms || 0,
        sold,
        remaining: Math.max(0, (w.available_rooms || 0) - sold),
      };
    });
}

/** Per-day remaining map (yyyy-MM-dd → { remaining, sold, capacity }). */
export function buildDayDetails(
  windows: AvailabilityWindow[],
  bookings: BookingOverlapInput[],
  hotelId: string,
): Record<string, { remaining: number; sold: number; capacity: number }> {
  const details: Record<string, { remaining: number; sold: number; capacity: number }> = {};
  computeWindowRemaining(windows, bookings, hotelId).forEach(
    ({ from, to, capacity, sold, remaining }) => {
      eachDayOfInterval({ start: from, end: to }).forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        const prev = details[key];
        if (!prev || capacity > prev.capacity) {
          details[key] = { remaining, sold, capacity };
        }
      });
    },
  );
  return details;
}

/**
 * Single source of truth for "how many rooms remain for THIS stay".
 *
 * Rules (matches the admin "Available Hotel Dates" + "Default Prices" model):
 *
 *  1. Find every inventory window for this hotel that **fully contains** the
 *     stay [checkIn .. checkOut-1]. The price tier the user sees must come
 *     from the period that actually covers the trip — not from a neighbouring
 *     period that merely brushes the edge.
 *  2. If no period fully contains it, fall back to the periods that overlap.
 *     This keeps partial-coverage stays priced (instead of returning null and
 *     dropping back to the "1 room" tier in `pickRoomBand`).
 *  3. For each candidate window: `remaining = available_rooms - SUM(rooms of
 *     non-cancelled bookings whose stay overlaps the window)`. Each booking
 *     is counted ONCE per window (shared-pool model), via
 *     `getBookedRoomsForWindow`.
 *  4. Return the MIN remaining across the candidate windows — this is the
 *     bottleneck the booking has to pass through.
 *  5. Return `null` only when no period at all touches the stay (no inventory
 *     defined). Callers treat this as "sold out / not bookable" the same way
 *     they treat 0.
 *
 * Used by:
 *  - `HotelSearchSection` to compute card prices and to hide sold-out hotels.
 *  - `HotelBookingModal` to compute summary prices and to block submission.
 */
export function getStayWindowRemaining(
  hotelId: string,
  checkIn: Date,
  checkOut: Date,
  windows: AvailabilityWindow[],
  bookings: BookingOverlapInput[],
): number | null {
  const ci = ms(checkIn);
  const co = ms(checkOut) - 86400000; // last occupied night
  if (co < ci) return null;

  const forHotel = windows.filter(
    (w) => w.hotel_id === hotelId && w.from_date && w.to_date,
  );
  if (forHotel.length === 0) return null;

  // Pre-parse window bounds once.
  const parsed = forHotel.map((w) => ({
    w,
    from: parseISO(w.from_date),
    to: parseISO(w.to_date),
  }));
  const fromMs = (x: { from: Date }) => ms(x.from);
  const toMs = (x: { to: Date }) => ms(x.to);

  // Prefer windows that FULLY contain the stay.
  let candidates = parsed.filter((x) => fromMs(x) <= ci && toMs(x) >= co);

  // Fallback: any window that OVERLAPS the stay.
  if (candidates.length === 0) {
    candidates = parsed.filter((x) => toMs(x) >= ci && fromMs(x) <= co);
  }

  if (candidates.length === 0) return null;

  let minRemaining: number | null = null;
  for (const x of candidates) {
    const sold = getBookedRoomsForWindow(bookings, hotelId, x.from, x.to);
    const remaining = Math.max(0, (x.w.available_rooms || 0) - sold);
    minRemaining = minRemaining === null ? remaining : Math.min(minRemaining, remaining);
  }
  return minRemaining;
}

