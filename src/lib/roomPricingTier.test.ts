import { describe, expect, it } from "vitest";
import { pickRoomBand, pickRoomPrice } from "./roomPricingTier";

const doubleBands = [
  {
    id: "bulk",
    room_type: "Double",
    room_to: 6,
    room_from: 10,
    price_per_night: 70,
    is_active: true,
  },
  {
    id: "last-six",
    room_type: "Double",
    room_to: 1,
    room_from: 6,
    price_per_night: 95,
    is_active: true,
  },
];

describe("pickRoomBand — request-driven (legacy, inclusive)", () => {
  it('uses the "last 6" tier on the shared boundary value 6 (request 6)', () => {
    const picked = pickRoomBand(doubleBands, "Double", 6);
    expect(picked?.id).toBe("last-six");
    expect(picked?.price_per_night).toBe(95);
  });

  it("keeps higher request counts in the bulk tier", () => {
    const picked = pickRoomBand(doubleBands, "Double", 7);
    expect(picked?.id).toBe("bulk");
    expect(picked?.price_per_night).toBe(70);
  });

  it("returns the tier price for the exact selector band", () => {
    expect(pickRoomPrice(doubleBands, "Double", 5, 0)).toBe(95);
    expect(pickRoomPrice(doubleBands, "Double", 9, 0)).toBe(70);
  });
});

describe("pickRoomBand — availability-driven (escalating)", () => {
  // La Quinta bands: 10→6 ($60/$70) and 5→1 ($100/$110)
  const bands = [
    { id: "single-bulk", room_type: "Single", room_from: 10, room_to: 6, price_per_night: 60, is_active: true },
    { id: "double-bulk", room_type: "Double", room_from: 10, room_to: 6, price_per_night: 70, is_active: true },
    { id: "single-last", room_type: "Single", room_from: 5,  room_to: 1, price_per_night: 100, is_active: true },
    { id: "double-last", room_type: "Double", room_from: 5,  room_to: 1, price_per_night: 110, is_active: true },
  ];

  it("remaining 10..7 → bulk tier ($60/$70)", () => {
    expect(pickRoomPrice(bands, "Single", 1, 0, 10)).toBe(60);
    expect(pickRoomPrice(bands, "Double", 1, 0, 7)).toBe(70);
  });

  it("remaining = 6 (admin band lower bound) escalates to last-five tier", () => {
    // 6 rooms left = 4 already booked → user expects price to have flipped.
    expect(pickRoomPrice(bands, "Single", 1, 0, 6)).toBe(100);
    expect(pickRoomPrice(bands, "Double", 1, 0, 6)).toBe(110);
  });

  it("remaining 5..2 → last-five tier", () => {
    expect(pickRoomPrice(bands, "Single", 1, 0, 5)).toBe(100);
    expect(pickRoomPrice(bands, "Double", 1, 0, 2)).toBe(110);
  });

  it("remaining = 1 (last room) still in last-five tier", () => {
    expect(pickRoomPrice(bands, "Double", 1, 0, 1)).toBe(110);
  });
});

/**
 * La Quinta by Wyndham Istanbul Gunesli — real default-price config.
 * Two bands per room type:
 *   bulk      → ROOMS FROM 10 → ROOMS TO 6  (selector 6–10)
 *   last-five → ROOMS FROM 5  → ROOMS TO 1  (selector 1–5)
 *
 * Regression guard: a 3-room booking MUST land in the 1–5 band
 * (Single $100, Double $110, Double+Extra Bed $120, Triple $130) and
 * never silently drop back to the $60/$70/$80/$90 bulk tier.
 */
const laQuintaRooms = [
  // Bulk tier (6–10)
  { id: "single-bulk",    room_type: "Single",            room_from: 10, room_to: 6, price_per_night: 60,  is_active: true },
  { id: "double-bulk",    room_type: "Double",            room_from: 10, room_to: 6, price_per_night: 70,  is_active: true },
  { id: "dblxb-bulk",     room_type: "Double + Extra Bed",room_from: 10, room_to: 6, price_per_night: 80,  is_active: true },
  { id: "triple-bulk",    room_type: "Triple",            room_from: 10, room_to: 6, price_per_night: 90,  is_active: true },
  // Last-five tier (1–5)
  { id: "single-last",    room_type: "Single",            room_from: 5,  room_to: 1, price_per_night: 100, is_active: true },
  { id: "double-last",    room_type: "Double",            room_from: 5,  room_to: 1, price_per_night: 110, is_active: true },
  { id: "dblxb-last",     room_type: "Double + Extra Bed",room_from: 5,  room_to: 1, price_per_night: 120, is_active: true },
  { id: "triple-last",    room_type: "Triple",            room_from: 5,  room_to: 1, price_per_night: 130, is_active: true },
];

describe("La Quinta tier-boundary regression", () => {
  it("3 rooms requested → all types resolve to the 1–5 (last-five) tier", () => {
    expect(pickRoomPrice(laQuintaRooms, "Single", 3, 0)).toBe(100);
    expect(pickRoomPrice(laQuintaRooms, "Double", 3, 0)).toBe(110);
    expect(pickRoomPrice(laQuintaRooms, "Double + Extra Bed", 3, 0)).toBe(120);
    expect(pickRoomPrice(laQuintaRooms, "Triple", 3, 0)).toBe(130);
  });

  it("1 room requested → still the 1–5 tier (never bulk)", () => {
    expect(pickRoomPrice(laQuintaRooms, "Single", 1, 0)).toBe(100);
    expect(pickRoomPrice(laQuintaRooms, "Double", 1, 0)).toBe(110);
  });

  it("5 rooms (top of last-five band) stays in the 1–5 tier", () => {
    expect(pickRoomPrice(laQuintaRooms, "Double", 5, 0)).toBe(110);
    expect(pickRoomPrice(laQuintaRooms, "Double + Extra Bed", 5, 0)).toBe(120);
  });

  it("6 rooms requested → bulk tier (La Quinta bands 1–5 and 6–10 do not overlap)", () => {
    // La Quinta's two bands meet edge-to-edge (1–5 and 6–10), so 6 belongs
    // exclusively to the bulk band. This guards against accidental off-by-one
    // shifts that would re-price 6 rooms at the last-five tier.
    expect(pickRoomPrice(laQuintaRooms, "Double", 6, 0)).toBe(70);
    expect(pickRoomPrice(laQuintaRooms, "Single", 6, 0)).toBe(60);
  });

  it("7+ rooms requested → falls into the bulk (6–10) tier", () => {
    expect(pickRoomPrice(laQuintaRooms, "Single", 7, 0)).toBe(60);
    expect(pickRoomPrice(laQuintaRooms, "Double", 7, 0)).toBe(70);
    expect(pickRoomPrice(laQuintaRooms, "Double + Extra Bed", 8, 0)).toBe(80);
    expect(pickRoomPrice(laQuintaRooms, "Triple", 10, 0)).toBe(90);
  });

  it("regression: screenshot scenario (1 Single + 1 Double + 1 Double+Extra Bed = 3 rooms total) never returns $60/$70/$80", () => {
    // Mirrors the booking modal: selector = total requested rooms per type.
    const requestedByType = { "Single": 1, "Double": 1, "Double + Extra Bed": 1 };
    const totalRequested = Object.values(requestedByType).reduce((a, b) => a + b, 0);
    expect(totalRequested).toBe(3);

    // Even though each individual type only has 1 room, the booking-level
    // selector (total rooms = 3) MUST keep everything in the 1–5 band.
    for (const [type, _count] of Object.entries(requestedByType)) {
      const price = pickRoomPrice(laQuintaRooms, type, totalRequested, 0);
      expect(price).toBeGreaterThanOrEqual(100); // never bulk ($60/$70/$80)
    }
    expect(pickRoomPrice(laQuintaRooms, "Single", totalRequested, 0)).toBe(100);
    expect(pickRoomPrice(laQuintaRooms, "Double", totalRequested, 0)).toBe(110);
    expect(pickRoomPrice(laQuintaRooms, "Double + Extra Bed", totalRequested, 0)).toBe(120);
  });
});