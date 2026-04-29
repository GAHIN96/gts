/**
 * Room pricing tier resolver — REQUEST-DRIVEN (matches group package logic).
 *
 * Multiple `hotel_rooms` rows may share the same `room_type` (e.g. "Double") but
 * define different inventory bands via `room_to` (min in band) and `room_from`
 * (max in band).
 *
 * The band is selected purely by the NUMBER OF ROOMS THE GUEST IS REQUESTING —
 * NOT by current available inventory. This mirrors how group package default
 * rates work (count vs. capacity).
 *
 * Example: "6–10" band = $65, "1–6" band = $70.
 *  - Selector 7 → falls in 6–10 → $65
 *  - Selector 3 → falls in 1–6  → $70
 *  - Selector 6 → boundary goes to 1–6 (the lower-inventory / last-rooms tier)
 *
 * Falls back to cheapest matching-type row if no band matches.
 */
export interface RoomLike {
  id?: string;
  room_type?: string | null;
  price_per_night?: number | null;
  price_adult?: number | null;
  is_active?: boolean | null;
  room_from?: number | null;       // max in band
  room_to?: number | null;         // min in band
  available_rooms?: number | null; // current remaining inventory for this row
  total_rooms?: number | null;     // total inventory for this row
}

const norm = (s: string | null | undefined) => (s || "").trim().toLowerCase();

const rowPrice = (r: RoomLike) =>
  Number(r.price_per_night) || Number(r.price_adult) || 0;

/**
 * Pick the best hotel_rooms row for a requested room type and quantity.
 * @param rooms       All hotel_rooms rows for the hotel
 * @param roomType    Requested room type label (e.g. "Double")
 * @param requested   Number of rooms the guest is booking (default 1)
 */
/**
 * Pick the best hotel_rooms row for a requested room type, based purely on
 * the REQUESTED ROOM COUNT (request-driven, like group package rates).
 * Inventory (`available_rooms` / `total_rooms`) is intentionally ignored.
 *
 * @param rooms      All hotel_rooms rows for the hotel
 * @param roomType   Requested room type label (e.g. "Double")
 * @param requested  Number of rooms being booked (default 1)
 */
export function pickRoomBand<T extends RoomLike>(
  rooms: T[] | undefined | null,
  roomType: string | null | undefined,
  requested: number = 1,
  /**
   * Currently available rooms for the searched dates (from
   * hotel_available_dates minus overlapping bookings). When provided, the band
   * is selected by AVAILABILITY rather than by the user's requested count —
   * this matches the admin "default rates" model where the price tier is keyed
   * to how many rooms remain in the inventory window.
   */
  available?: number | null,
): T | null {
  const active = (rooms || []).filter((r) => r.is_active !== false);
  if (active.length === 0) return null;

  const wanted = norm(roomType);
  const sameType = wanted
    ? active.filter((r) => norm(r.room_type) === wanted)
    : active;

  const candidates = sameType.length > 0 ? sameType : active;

  // Prefer availability-driven selection when caller supplies it; otherwise
  // fall back to the requested room count (group-package style).
  const availNum =
    available === null || available === undefined ? null : Number(available);
  const useAvail = availNum !== null && Number.isFinite(availNum) && availNum > 0;
  const req = useAvail
    ? Math.max(1, Math.floor(availNum as number))
    : Math.max(1, Math.floor(Number(requested) || 1));

  // Escalating-tier rule (matches admin "Default Prices" intent):
  //   Each band [room_to..room_from] applies while remaining inventory is
  //   STRICTLY GREATER than its lower bound (`room_to`). The moment remaining
  //   touches `room_to`, pricing escalates to the next (lower-inventory,
  //   higher-price) band.
  //
  //   Example: bands "10→6" ($60) and "5→1" ($100), capacity 10:
  //     remaining 10..7 → band "10→6" ($60)
  //     remaining 6..1  → band "5→1"  ($100)   ← boundary flips at 6
  //
  // When `available` is not supplied we fall back to inclusive matching on the
  // requested room count (legacy group-package behaviour).
  const inBand = (r: RoomLike, n: number, lowerExclusive: boolean) => {
    const a = Number(r.room_to ?? 1);
    const b = Number(r.room_from ?? Number.MAX_SAFE_INTEGER);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return lowerExclusive ? n > lo && n <= hi : n >= lo && n <= hi;
  };

  let matches = candidates.filter((r) => inBand(r, req, useAvail));

  // Availability path: if remaining sits exactly on a band's lower bound,
  // escalate DOWN to the next-smaller band (last-rooms pricing). E.g. with
  // bands 10→6 and 5→1, remaining=6 should land on the 5→1 band, not 10→6.
  if (matches.length === 0 && useAvail) {
    // Pick the band whose upper bound is the LARGEST value still < req.
    // That's the "next tier down" in inventory.
    const below = candidates
      .map((r) => ({
        r,
        hi: Math.max(Number(r.room_to ?? 1), Number(r.room_from ?? 0)),
      }))
      .filter((x) => x.hi < req)
      .sort((a, b) => b.hi - a.hi);
    if (below.length > 0) return below[0].r;
    // Nothing below — fall back to the smallest band overall.
    const smallest = [...candidates].sort((a, b) => {
      const aHi = Math.max(Number(a.room_to ?? 1), Number(a.room_from ?? 0));
      const bHi = Math.max(Number(b.room_to ?? 1), Number(b.room_from ?? 0));
      return aHi - bHi;
    });
    if (smallest.length > 0) return smallest[0];
  }

  if (matches.length > 0) {
    // Multiple bands matched — prefer the lower-inventory / higher-price tier
    // (more conservative pricing).
    matches.sort((a, b) => {
      const aHi = Math.max(Number(a.room_to ?? 1), Number(a.room_from ?? 0));
      const bHi = Math.max(Number(b.room_to ?? 1), Number(b.room_from ?? 0));
      if (aHi !== bHi) return aHi - bHi; // smallest upper bound first
      return rowPrice(b) - rowPrice(a);  // tie → higher price
    });
    return matches[0];
  }

  // No band matches → cheapest of the same room type.
  return candidates.reduce(
    (min, r) => (rowPrice(r) < rowPrice(min) ? r : min),
    candidates[0],
  );
}

/** Convenience: resolved per-night price for a tier pick, with fallback. */
export function pickRoomPrice(
  rooms: RoomLike[] | undefined | null,
  roomType: string | null | undefined,
  requested: number = 1,
  fallback: number = 0,
  available?: number | null,
): number {
  const picked = pickRoomBand(rooms, roomType, requested, available);
  if (!picked) return fallback;
  return rowPrice(picked) || fallback;
}
