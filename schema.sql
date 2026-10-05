-- schema.sql: for a NEW database. (Already ran the first version? Run migration-pricing.sql instead.)
CREATE TABLE IF NOT EXISTS rooms (
  id           TEXT PRIMARY KEY,           -- short slug used in URLs, e.g. 'standard'
  name         TEXT NOT NULL,
  description  TEXT,                       -- optional one-liner shown on the room card
  nightly_rate INTEGER NOT NULL DEFAULT 0, -- price per night in whole rupees. 0 = no price shown
  sort         INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1
);

-- Fixed-length deals for one room, e.g. 3 nights, 7 nights, 30 nights. `price` is the TOTAL.
CREATE TABLE IF NOT EXISTS packages (
  id          TEXT PRIMARY KEY,            -- e.g. 'standard-7'
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  name        TEXT NOT NULL,               -- e.g. 'Weekly stay'
  nights      INTEGER NOT NULL CHECK (nights >= 1),
  price       INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_packages_room ON packages (room_id, active);

-- A stay occupies the NIGHTS from check_in up to (not including) check_out.
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT NOT NULL UNIQUE,
  room_id          TEXT NOT NULL REFERENCES rooms(id),
  check_in         TEXT NOT NULL,          -- YYYY-MM-DD
  check_out        TEXT NOT NULL,          -- YYYY-MM-DD
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','declined','cancelled','blocked')),
  guest_name       TEXT,
  guest_email      TEXT,
  guest_phone      TEXT,
  nationality      TEXT,
  guests           INTEGER,
  arrival_time     TEXT,
  special_requests TEXT,
  package_id       TEXT,                   -- set when a package was chosen
  total_price      INTEGER,                -- the estimate shown to the guest, in whole rupees
  price_note       TEXT,                   -- e.g. '7-night package' or '3 nights x Rs 2,000'
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings (room_id, check_in, check_out);

-- Rooms start with no price (nothing is shown to guests) until you set one.
INSERT OR IGNORE INTO rooms (id, name, sort) VALUES
  ('standard', 'Standard Room', 1),
  ('deluxe',   'Deluxe Suite',  2),
  ('retreat',  'Retreat Package', 3);

-- Admin security: password, two-factor, sign-in limits and password-reset links.
CREATE TABLE IF NOT EXISTS admin_settings (
  key   TEXT PRIMARY KEY,                  -- password_hash, session_epoch, totp_secret, ...
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_attempts (  -- failed sign-ins, used to lock guessing
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  at   INTEGER NOT NULL                    -- milliseconds since 1970
);
CREATE INDEX IF NOT EXISTS idx_admin_attempts ON admin_attempts (kind, at);
CREATE TABLE IF NOT EXISTS admin_reset_tokens (  -- one-time password reset links (stored hashed)
  hash       TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);
