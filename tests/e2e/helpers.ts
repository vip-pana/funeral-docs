export const PASSWORD = process.env.TEST_PASSWORD ?? "sviluppo123";

/** For the tests that start logged out, whatever the project gives them. */
export const LOGGED_OUT = { cookies: [], origins: [] };
