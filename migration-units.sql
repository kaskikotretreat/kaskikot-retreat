-- Lets one room type stand for several identical rooms (e.g. two Garden Rooms).
-- Run ONCE per database. Existing rooms stay at 1, so nothing changes until you raise the number in the admin page.
--   Local : npx wrangler d1 execute <your-db-name> --local  --file=migration-units.sql
--   Live  : npx wrangler d1 execute <your-db-name> --remote --file=migration-units.sql
ALTER TABLE rooms ADD COLUMN units INTEGER NOT NULL DEFAULT 1;
