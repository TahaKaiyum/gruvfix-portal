# Technical Specification: Session Persistence and Route Recovery

* **Feature Name**: Session Persistence and Route Recovery
* **Status**: Proposed / Approved
* **Author**: AI Solutions Architect
* **Date**: 2026-06-28
* **Reference**: GitHub Issue #2

---

## 1. Current Architecture
The current Gruvfix Portal architecture operates as a Single Page Application (SPA).
* **State Declaration**: All application state (the logged-in user `currentUser`, master user data, tool status, active panel IDs) is declared in `js/state.js` as in-memory global variables.
* **View Navigation**: Transitions are handled dynamically in `js/app.js` by toggling DOM visibility classes (e.g. `active`, `hidden`) on elements based on the panel to render.
* **Authentication**: Login is processed in `js/auth.js`, which sets `currentUser` in memory and shows the user dashboard.

## 2. Root Cause Analysis
Because session and view states are held exclusively in-memory:
1. Reloading the page or performing a browser refresh deletes the active JavaScript context and re-downloads all files.
2. The global `currentUser` variable defaults to `null` on script execution.
3. The initialization logic renders the Login pane, forcing the user to re-authenticate and re-navigate, leading to operational friction on the shop floor.

## 3. Proposed Solution
Implement client-side storage persistence using the browser's `localStorage` API:
* **Session Cache**: On login success, serialize the session state (`email`, `empid`, `name`, `role`, `loginTime`) and store it as a JSON string under the key `gruvfix_session`.
* **Route Cache**: On navigation, write the current panel ID to `localStorage` under `gruvfix_last_view`.
* **Initialization Restore**: On page load (`DOMContentLoaded` hook), intercept the boot flow. If a valid `gruvfix_session` is found, populate `currentUser` in `state.js`, bypass the login panel, and transition immediately to `gruvfix_last_view`.
* **Cache Expiry**: Set a session expiration (e.g., 8 hours). If current time minus `loginTime` exceeds 8 hours, ignore the cache.
* **Sign Out**: Clear both local storage keys to ensure clean state and secure logout.

## 4. Supabase Impact
No database schemas require modifications. On app load, before restoring the cached session, a quick REST verification call will be sent to the Supabase `users` endpoint to ensure the user still exists and is marked `active === true`.

## 5. Authentication Impact
* Shift from volatile state to persistent storage-based caching.
* Enhanced login security: No password hashes will be cached; only the identity tuple (`email`, `empid`, `name`, `role`) and authentication timestamp are persisted.

## 6. UI Impact
* Prevent visual flickering: When restoring a cached session, hide the login screen immediately and load the dashboard directly.
* Ensure navigation tabs and header linkages reflect the correct active state of the restored view.

## 7. JavaScript Files to Modify
* **[js/state.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/js/state.js)**: Include helper functions to set, fetch, and destroy the cached session.
* **[js/auth.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/js/auth.js)**: Hook into `handleLogin` to cache sessions and update logout handlers to clear state.
* **[js/app.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/js/app.js)**: Modify the initialization routine on load to restore session/view, and hook navigation triggers to store current view paths.

## 8. Database Impact
Create a new metadata table `technical_specifications` to log architecture files and specifications.
```sql
CREATE TABLE IF NOT EXISTS technical_specifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## 9. API Impact
An additional verify GET request is sent to `/rest/v1/users?email=eq.user_email` to check user validity on startup.

## 10. Error Handling
* **Corrupt JSON Cache**: If `JSON.parse` fails on the cache string, clear local storage and redirect to login.
* **Status verify failure**: If the database query returns that the user is no longer active, delete the cached session and log out.
* **Offline mode**: If the internet connection is lost, allow offline access using the cached session metadata but display a warning.

## 11. Security Considerations
* Protect cached variables: Only store identification data.
* Clear cache on browser window close if requested (using `sessionStorage` fallback or explicit page close handlers).
* Guard against XSS by ensuring session values are treated as text and never evaluated or written directly as HTML.

## 12. Testing Strategy
* **Unit Verification**: Test serialization of session objects and expiry thresholds.
* **Manual UAT Verification**:
  1. Log in, transition to "Master Data", refresh -> expect restoration to "Master Data".
  2. Log out, refresh -> expect login page.
  3. Modify database to set operator status to inactive, refresh -> expect automatic logout.

## 13. Rollback Strategy
If persistence introduces bugs, setting `window.ENABLE_PERSISTENCE = false;` in `supabase.js` will immediately bypass local storage restoration and fall back to standard in-memory behavior.
