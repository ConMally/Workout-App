// Single source of truth for the app version shown in feedback submissions
// (PART 2) and anywhere else it's useful to know which build a user is on.
// Kept as a plain constant (not read from package.json at runtime) since
// this needs to be usable from client components without bundling
// package.json into the client chunk.
export const APP_VERSION = "0.1.0";
