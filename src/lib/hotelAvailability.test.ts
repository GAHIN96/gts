/**
 * Shared-pool availability invariants.
 *
 * Core rule: each booking that overlaps an inventory window is counted EXACTLY
 * ONCE against that window's pool — not once per night. These tests pin the
 * behavior so the model can't silently regress to per-night allocation.
 */
import { describe, it, expect } from "vitest";
import {
  AvailabilityWindow,
  BookingOverlapInput,
  buildDayDetails,
  computeWindowRemaining,
  getBookedRoomsForWindow,
  getStayWindowRemaining,
} from "./hotelAvailability";

const HOTEL = "hotel-1";
const OTHER = "hotel-2";

const window18AprTo31May: AvailabilityWindow = {
  hotel_id: HOTEL,
  from_date: "2026-04-18",
  to_date: "2026-05-31",
  available_rooms: 6,
};

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("getBookedRoomsForWindow — shared pool invariants", () => {
  it("counts a multi-night booking once, not per night", () => {
    // 3 rooms for 12 nights — must count as 3, not 36.
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: "2026-05-02", rooms: 3 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(3);
  });

  it("sums multiple overlapping bookings (each counted once)", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: "2026-04-25", rooms: 2 },
      { hotel_id: HOTEL, check_in: "2026-05-01", check_out: "2026-05-04", rooms: 1 },
      { hotel_id: HOTEL, check_in: "2026-05-15", check_out: "2026-05-20", rooms: 4 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(7);
  });

  it("ignores bookings that do not overlap the window", () => {
    const bookings: BookingOverlapInput[] = [
      // Ends the day before the window opens
      { hotel_id: HOTEL, check_in: "2026-04-15", check_out: "2026-04-18", rooms: 5 },
      // Starts the day after the window closes
      { hotel_id: HOTEL, check_in: "2026-06-01", check_out: "2026-06-04", rooms: 5 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(0);
  });

  it("includes a booking that touches only the first night (check-out on day 2)", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-18", check_out: "2026-04-19", rooms: 2 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(2);
  });

  it("ignores bookings for other hotels", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: OTHER, check_in: "2026-04-20", check_out: "2026-04-25", rooms: 9 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(0);
  });

  it("ignores bookings with malformed dates instead of throwing", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "not-a-date", check_out: "2026-04-20", rooms: 5 },
      { hotel_id: HOTEL, check_in: null, check_out: "2026-04-20", rooms: 5 },
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: null, rooms: 5 },
    ];
    expect(
      getBookedRoomsForWindow(bookings, HOTEL, d("2026-04-18"), d("2026-05-31")),
    ).toBe(0);
  });
});

describe("computeWindowRemaining — pool subtraction", () => {
  it("subtracts overlapping bookings from the window's pool exactly once each", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: "2026-04-23", rooms: 3 },
    ];
    const result = computeWindowRemaining([window18AprTo31May], bookings, HOTEL);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ capacity: 6, sold: 3, remaining: 3 });
  });

  it("clamps remaining at 0 when oversold", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: "2026-04-23", rooms: 4 },
      { hotel_id: HOTEL, check_in: "2026-05-10", check_out: "2026-05-12", rooms: 5 },
    ];
    const result = computeWindowRemaining([window18AprTo31May], bookings, HOTEL);
    expect(result[0].sold).toBe(9);
    expect(result[0].remaining).toBe(0);
  });
});

describe("buildDayDetails — every day in a window shows the SAME remaining", () => {
  it("3 rooms booked → all 44 days in the window report remaining = 3", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-04-20", check_out: "2026-04-23", rooms: 3 },
    ];
    const details = buildDayDetails([window18AprTo31May], bookings, HOTEL);
    const days = Object.keys(details);
    // 18 Apr → 31 May inclusive = 44 days
    expect(days).toHaveLength(44);

    // Pick a sample of days from across the window — they must all match.
    const samples = ["2026-04-18", "2026-04-22", "2026-05-01", "2026-05-15", "2026-05-31"];
    for (const key of samples) {
      expect(details[key]).toEqual({ capacity: 6, sold: 3, remaining: 3 });
    }

    // And the FULL set should be uniform (no per-night drift).
    const uniqueRemainings = new Set(Object.values(details).map((d) => d.remaining));
    expect(uniqueRemainings).toEqual(new Set([3]));
  });

  it("does not double-count the same booking across overlapping windows", () => {
    // Two overlapping windows; the same 2-room booking falls inside both.
    // Each window subtracts independently — but within a single window the
    // booking still counts ONCE.
    const w1: AvailabilityWindow = { ...window18AprTo31May, available_rooms: 6 };
    const w2: AvailabilityWindow = {
      hotel_id: HOTEL,
      from_date: "2026-05-10",
      to_date: "2026-06-15",
      available_rooms: 4,
    };
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-05-12", check_out: "2026-05-14", rooms: 2 },
    ];
    const result = computeWindowRemaining([w1, w2], bookings, HOTEL);
    expect(result.find((r) => r.capacity === 6)).toMatchObject({ sold: 2, remaining: 4 });
    expect(result.find((r) => r.capacity === 4)).toMatchObject({ sold: 2, remaining: 2 });
  });
});

describe("getStayWindowRemaining — period-driven price + sold-out resolution", () => {
  // Two adjacent inventory periods for the SAME hotel — mirrors the admin
  // "Available Hotel Dates" UI where each period has its own pool and the
  // matching default-price band (e.g. 10–6 vs 6–1 in `hotel_rooms`).
  const periodA: AvailabilityWindow = {
    hotel_id: HOTEL,
    from_date: "2026-06-01",
    to_date: "2026-06-30",
    available_rooms: 10,
  };
  const periodB: AvailabilityWindow = {
    hotel_id: HOTEL,
    from_date: "2026-07-01",
    to_date: "2026-07-31",
    available_rooms: 4,
  };

  it("returns the remaining of the period that fully contains the stay", () => {
    // Stay sits entirely inside periodA → uses periodA's pool (10 - 2 = 8),
    // not periodB's smaller pool.
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-06-05", check_out: "2026-06-10", rooms: 2 },
    ];
    expect(
      getStayWindowRemaining(HOTEL, d("2026-06-03"), d("2026-06-12"), [periodA, periodB], bookings),
    ).toBe(8);
  });

  it("returns 0 when the covering period is fully booked (search will hide hotel)", () => {
    const bookings: BookingOverlapInput[] = [
      { hotel_id: HOTEL, check_in: "2026-07-05", check_out: "2026-07-08", rooms: 4 },
    ];
    expect(
      getStayWindowRemaining(HOTEL, d("2026-07-10"), d("2026-07-15"), [periodA, periodB], bookings),
    ).toBe(0);
  });

  it("returns null when no period touches the stay (no inventory defined)", () => {
    expect(
      getStayWindowRemaining(HOTEL, d("2026-09-01"), d("2026-09-05"), [periodA, periodB], []),
    ).toBeNull();
  });

  it("falls back to overlapping periods when no single period fully covers the stay", () => {
    // Stay spans the boundary between periodA (10 left) and periodB (4 left).
    // Bottleneck = MIN(10, 4) = 4.
    expect(
      getStayWindowRemaining(HOTEL, d("2026-06-28"), d("2026-07-05"), [periodA, periodB], []),
    ).toBe(4);
  });

  it("ignores other hotels' inventory windows", () => {
    const otherWindow: AvailabilityWindow = {
      hotel_id: OTHER,
      from_date: "2026-06-01",
      to_date: "2026-06-30",
      available_rooms: 99,
    };
    expect(
      getStayWindowRemaining(HOTEL, d("2026-06-03"), d("2026-06-10"), [otherWindow], []),
    ).toBeNull();
  });
});
