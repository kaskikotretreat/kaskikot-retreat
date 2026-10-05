-- prices.sql: nightly rates and packages for every room.
-- !! These numbers are EXAMPLES. Replace them with your real prices before using on the live site. !!
-- Safe to run again after editing: rooms are updated, packages are replaced by their id.
-- Room ids (standard, deluxe, retreat) must match the ids in your `rooms` table.
-- A package price is the TOTAL for the whole stay, in whole rupees.

-- Nightly rates (shown for "Choose your own dates")
UPDATE rooms SET nightly_rate = 2500 WHERE id = 'standard';
UPDATE rooms SET nightly_rate = 4000 WHERE id = 'deluxe';
UPDATE rooms SET nightly_rate = 5500 WHERE id = 'retreat';

-- Packages: id (must be unique), room, name, nights, total price, sort order
INSERT OR REPLACE INTO packages (id, room_id, name, nights, price, sort) VALUES
  ('standard-3',  'standard', 'Weekend getaway',  3,   6800, 1),
  ('standard-7',  'standard', 'Weekly stay',      7,  14000, 2),
  ('standard-30', 'standard', 'Monthly stay',    30,  48000, 3),

  ('deluxe-3',    'deluxe',   'Weekend getaway',  3,  11000, 1),
  ('deluxe-7',    'deluxe',   'Weekly stay',      7,  22400, 2),
  ('deluxe-30',   'deluxe',   'Monthly stay',    30,  78000, 3),

  ('retreat-3',   'retreat',  'Retreat weekend',  3,  15000, 1),
  ('retreat-7',   'retreat',  'Retreat week',     7,  33000, 2);