/*
# Add quantity columns for closing add-ons to service_reports

1. Modified Tables
- `service_reports`
  - Added `return_plug_qty` (integer, nullable) — number of return plugs used
  - Added `gizmo_qty` (integer, nullable) — number of gizmos used
  - Added `yellow_cover_picks_qty` (integer, nullable) — number of yellow cover picks used

2. Why
- When technicians select "Return Plug", "Gizmo", or "Yellow Cover Picks" as
  pool closing add-ons, they need to record how many were installed. These
  columns store those quantities so the info reaches the report email.

3. Security
- No RLS or policy changes — service_reports already has its policies.
*/

ALTER TABLE service_reports
  ADD COLUMN IF NOT EXISTS return_plug_qty integer,
  ADD COLUMN IF NOT EXISTS gizmo_qty integer,
  ADD COLUMN IF NOT EXISTS yellow_cover_picks_qty integer;
