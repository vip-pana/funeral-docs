-- The shared password moves out of AUTH_PASSWORD_HASH and into the database, so
-- it can be changed from Impostazioni: a running app cannot rewrite its own
-- .env, and under Docker that file is mounted from outside and would be
-- restored on the next restart anyway.
--
-- Nothing is inserted here. The row is seeded on the first login from the
-- environment variable (see src/lib/password.ts), which keeps an existing
-- installation working without anyone having to do anything.
--
-- Hand-written, like 0008: a plain CREATE TABLE with no foreign key, so there
-- is nothing for drizzle-kit to misread, but also nothing worth prompting for.
CREATE TABLE `auth` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`password_hash` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
