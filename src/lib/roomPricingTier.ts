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
  price_child?: number | null;
  price_child_6?: number | null;
  price_infant?: number | null;
}

export interface SpecialPriceLike {
  room_id?: string | null;
  from_date?: string;
  to_date?: string;
  room_rate?: number | null;
  price_adult?: number | null;
  price_child_6_12?: number | null;
  price_child_2_6?: number | null;
  price_infant?: number | null;
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
 *
 * @param rooms      All hotel_rooms rows for the hotel
 * @param roomType   Requested room type label (e.g. "Double")
 * @param requested  Number of rooms being booked (default 1)
 */
export function pickRoomBand<T extends RoomLike>(
  rooms: T[] | undefined | null,
  roomType: string | null | undefined,
  requested: number = 1,
): T | null {
  const active = (rooms || []).filter((r) => r.is_active !== false);
  if (active.length === 0) return null;

  const wanted = norm(roomType);
  const sameType = wanted
    ? active.filter((r) => norm(r.room_type) === wanted)
    : active;

  const candidates = sameType.length > 0 ? sameType : active;

  // DEBUG LOG
  console.log(`[pickRoomBand] type=${roomType} req=${requested}`);

  const req = Math.max(1, Math.floor(Number(requested) || 1));

  // The inBand check is inclusive on both ends [lo..hi].
  const inBand = (r: RoomLike, n: number) => {
    const a = Number(r.room_to ?? 1);
    const b = Number(r.room_from ?? Number.MAX_SAFE_INTEGER);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return n >= lo && n <= hi;
  };

  let matches = candidates.filter((r) => inBand(r, req));

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
): number {
  const picked = pickRoomBand(rooms, roomType, requested);
  if (!picked) return fallback;
  return rowPrice(picked) || fallback;
}

/**
 * PHASE 2 & 3: Resolve dynamic price based on remaining inventory.
 * Following the "Manual Dynamic Pricing" system logic:
 * 1. Find the tier where current inventory fits.
 * 2. Check for special prices first (Special Prices priority).
 * 3. Fall back to default tier price.
 */
export function resolveRoomPrice(
  rooms: RoomLike[] | undefined | null,
  roomType: string | null | undefined,
  inventoryRemaining: number,
  specials: SpecialPriceLike[] | undefined | null,
  night: Date,
): { adult: number; child6: number; child2: number; infant: number } | null {
  // Step 5 & 6: Filter by Room Type and match Inventory Remaining to From/To band
  const picked = pickRoomBand(rooms, roomType, inventoryRemaining);
  if (!picked) return null;

  const y = night.getFullYear();
  const m = String(night.getMonth() + 1).padStart(2, '0');
  const d = String(night.getDate()).padStart(2, '0');
  const nightStr = `${y}-${m}-${d}`;

  // Step 4: Special Prices Priority
  const special = (specials || []).find((s) => {
    if (s.room_id && picked.id && s.room_id !== picked.id) return false;
    const from = (s.from_date || "0000-00-00").split('T')[0];
    const to = (s.to_date || "9999-99-99").split('T')[0];
    return nightStr >= from && nightStr <= to;
  });

  if (special) {
    return {
      adult: Number(special.room_rate || special.price_adult || picked.price_adult || picked.price_per_night || 0),
      child6: Number(special.price_child_6_12 || picked.price_child_6 || 0),
      child2: Number(special.price_child_2_6 || picked.price_child || 0),
      infant: Number(special.price_infant || picked.price_infant || 0),
    };
  }

  // Phase 3: Final Output (Default Prices)
  return {
    adult: Number(picked.price_adult || picked.price_per_night || 0),
    child6: Number(picked.price_child_6 || 0),
    child2: Number(picked.price_child || 0),
    infant: Number(picked.price_infant || 0),
  };
}

