-- migration-stay.sql
-- For a database you ALREADY have (run migration-guests.sql first). Adds room photos and amenities.
-- Run it ONCE per database (local and remote are separate). Running it twice shows a harmless
-- "duplicate column name" error and changes nothing.
--
-- Rooms start with no photos and no amenities. Fill them in on the admin page (Rooms and prices).
ALTER TABLE rooms ADD COLUMN photos    TEXT NOT NULL DEFAULT '[]';
ALTER TABLE rooms ADD COLUMN amenities TEXT NOT NULL DEFAULT '[]';
