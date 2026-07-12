# Session Validation Report — Gruvfix Manufacturing Portal

> [!NOTE]
> This document logs the session validation testing results for the Gruvfix Manufacturing Portal, evaluating the state persistence, local cache lifetimes, deep-linking routing, and session recovery boundaries.

---

## 📊 Session Validation Overview
* **Test Cycle**: Session Run 1
* **Target Module**: `SessionManager.js` & `routeGuards.js`
* **Session Storage Method**: LocalStorage (`gruvfix_session`, `gruvfix_last_tab`)
* **Execution Status**: **PASSED** (100% Session Scenarios Verified)

---

## 🧪 Detailed Session Test Cases & Results

### [SES-01] Login Session Initialization
* **Steps**: Perform a standard employee login.
* **Observed Result**:
  * Upon successful credential matching, `SessionManager.saveSession(user)` writes the session object containing:
    `{ email, empid, name, role, loginTime }`
    to LocalStorage key `gruvfix_session`.
  * **Result**: **PASS**

### [SES-02] Logout Session Destruction
* **Steps**: Click the Logout button in the header sidebar.
* **Observed Result**:
  * `SessionManager.clearSession()` executes.
  * Keys `gruvfix_session` and `gruvfix_last_tab` are fully removed from LocalStorage.
  * Router intercepts the page hash change and redirects the view to `#/login`.
  * **Result**: **PASS**

### [SES-03] Browser Refresh Session Recovery
* **Steps**: Log in as Admin. Refresh the browser tab (`F5`).
* **Observed Result**:
  * On page reload, the router initializes.
  * `SessionManager.getSession()` parses the LocalStorage record, verifies that current time minus `loginTime` is less than 8 hours, and restores the global variables `window.isLoggedIn` and `window.loggedInUser`.
  * View is automatically restored to the last active tab (e.g., `#/admin/parts`).
  * **Result**: **PASS** (Zero loss of session info)

### [SES-04] 8-Hour Session Expiry Timeout
* **Steps**: Edit the `loginTime` value in LocalStorage to a timestamp 8.5 hours in the past. Attempt an action.
* **Observed Result**:
  * `SessionManager.getSession()` evaluates `Date.now() - session.loginTime > 8 hours`.
  * Triggers `clearSession()`, wipes the stored cache, and immediately redirects the user to the login screen.
  * **Result**: **PASS**

### [SES-05] Deep Linking Routing Verification
* **Steps**: Copy URL `https://gruvfix-portal.vercel.app/#/operator/new-entry`. Close browser. Open browser and paste URL.
* **Observed Result**:
  * If the session is still active in LocalStorage, the application bypasses the login view and routes the user directly to the deep-linked page.
  * If the session is expired or cleared, it redirects the user to the login view `#/login`.
  * **Result**: **PASS**

### [SES-06] Browser Back Button & Routing Stability
* **Steps**: Log in as Operator. Select some options. Click Browser Back Button.
* **Observed Result**:
  * The hash router detects the hash change. 
  * The session context remains completely active and untouched; the user is not logged out or returned to the login screen unless they explicitly back-navigate out of the authenticated domain.
  * **Result**: **PASS**

### [SES-07] Role Switching Context Isolation
* **Steps**: Log in as Operator. In the same tab, navigate manually to the Admin Login page and log in as Admin.
* **Observed Result**:
  * Logging in as Admin overwrites the LocalStorage key `gruvfix_session` with the new Admin role credentials.
  * Global variables (`window.currentRole`, `window.loggedInUser`) update reactively, preventing the operator context from persisting.
  * **Result**: **PASS**

---

## 🏁 Session Validation Verdict
The application maintains solid session state controls. Valid session credentials survive browser restarts and refreshes, while invalid/expired tokens are cleanly evicted, protecting client configurations.
