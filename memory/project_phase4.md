---
name: SubGenie Phase 4 Completion
description: Phase 4 implementation details — security, UI overhaul, testing, deployment
type: project
---

Phase 4 was completed in a single session. The app stack: Node.js/Express 5 + MongoDB + EJS + Tailwind CDN.

**Key decisions made:**
- httpOnly cookie fix required exposing token via `res.locals.authToken` (injected in `window._authToken` in main.ejs) since JS can't read httpOnly cookies
- `express-mongo-sanitize` had to be applied manually to `req.body` + `req.params` only (Express 5 makes `req.query` a read-only getter — using the middleware directly causes 500s)
- Sidebar layout uses `res.locals.isAppPage = true` set in `viewProtect` middleware to conditionally render app vs public layouts
- All users (not just admins) can now edit/delete their own subscriptions from the UI

**Why:** edit/delete was limited to admin in UI (bug) — API already allowed it for all users.
**How to apply:** if user asks about role-based UI bugs, this was fixed in Phase 4.
