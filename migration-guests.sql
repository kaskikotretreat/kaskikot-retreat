-- migration-guests.sql
-- For a database you ALREADY have. Adds the guest limit and the extra-guest price to every room.
-- Run it ONCE per database (local and remote are separate). Running it twice shows a harmless
-- "duplicate column name" error and changes nothing.
--
-- Existing rooms start at: up to 4 guests, 2 included in the price, extra guests free (Rs 0).
-- Nothing changes for guests until you set the extra price in the admin page (Rooms and prices).
ALTER TABLE rooms ADD COLUMN max_guests       INTEGER NOT NULL DEFAULT 4;
ALTER TABLE rooms ADD COLUMN included_guests  INTEGER NOT NULL DEFAULT 2;
ALTER TABLE rooms ADD COLUMN extra_guest_rate INTEGER NOT NULL DEFAULT 0;
