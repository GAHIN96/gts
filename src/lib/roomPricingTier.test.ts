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

describe("pickRoomBand — request-driven (inclusive)", () => {
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

  it("6 rooms requested → bulk tier", () => {
    expect(pickRoomPrice(laQuintaRooms, "Double", 6, 0)).toBe(70);
    expect(pickRoomPrice(laQuintaRooms, "Single", 6, 0)).toBe(60);
  });
});