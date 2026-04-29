

## Enhance Agency Dashboard — Centered Search & Premium Layout

The agency `Dashboard.tsx` currently puts the search inside the hero overlay using `items-end pb-12`, which makes it sit at the bottom-left of the cinematic image (as shown in your screenshot). I'll re-center the search and tighten the dashboard into a more premium, useful agency hub.

### 1. Hero — Center the Search Properly
File: `src/pages/Dashboard.tsx` (AgencyDashboard hero block, ~line 681)

- Change overlay from `items-end pb-12` to `items-center justify-center` so the title + search are vertically and horizontally centered.
- Increase hero min-height (`min-h-[420px]`) for a more cinematic feel.
- Strengthen gradient overlay to `from-black/80 via-black/40` so text reads cleanly over any image.
- Make the search a single unified pill (input + button merged) at `max-w-2xl mx-auto`, centered under the headline.
- Add a small chip row under the search ("Dubai · Istanbul · Malaysia · Thailand") that deep-links to `/packages?city=…` for quick discovery.
- Personalize the headline: "Welcome back, {agency name} — Find Your Next Trip".

### 2. Quick-Action Strip (new)
A new row directly under the hero with 4 compact action tiles:
- **Browse Packages** → `/packages`
- **Build Custom Group** → `/packages/build-custom-group`
- **Book a Flight** → `/flights/book`
- **My Bookings** → `/bookings`

Each tile: icon in a tinted square, label, subtle hover lift. Replaces the visual gap left by removed Quick-Book shortcuts.

### 3. Smart Stats Row (new, agency-scoped)
Three lightweight KPI cards above the existing widgets:
- **Active Bookings** (count of agency's confirmed/pending)
- **Pending Payments** ($ owed by agency)
- **Available Credit** (limit − used, if credit_limit set)

Pulls from existing `useDashboardStats` and the `agencyCredit` state already fetched.

### 4. Reorder & Polish Existing Sections
- Keep **Departing Soon alert** (highest priority) at top.
- Move **Credit Usage card** into the new stats row (avoid duplication).
- Keep **Upcoming Departures** and **Featured Packages** as-is, but unify card radii (`rounded-2xl`) and spacing (`space-y-8`) for consistency with the Admin dashboard.

### Layout sketch

```text
┌─────────────────────────────────────────────────┐
│  [Departing Soon alert — if any]                │
├─────────────────────────────────────────────────┤
│ ╔═══════════ HERO (centered) ═══════════════╗  │
│ ║       Welcome back, {Agency}              ║  │
│ ║       Find Your Next Trip                 ║  │
│ ║   [ 🔍 Search packages…   ][ Search ]     ║  │
│ ║   Dubai · Istanbul · KL · Bangkok          ║  │
│ ╚═══════════════════════════════════════════╝  │
├─────────────────────────────────────────────────┤
│ [Browse] [Custom Group] [Flight] [Bookings]    │
├─────────────────────────────────────────────────┤
│ [Active Bookings] [Pending $] [Credit]         │
├─────────────────────────────────────────────────┤
│  Upcoming Departures (grid)                     │
├─────────────────────────────────────────────────┤
│  Featured Packages (grid)                       │
└─────────────────────────────────────────────────┘
```

### Files Modified
- `src/pages/Dashboard.tsx` — only the `AgencyDashboard` component (admin dashboard untouched).

No DB, routing, or hook changes required.

