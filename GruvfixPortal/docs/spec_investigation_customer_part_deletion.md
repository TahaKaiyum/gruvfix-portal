# Specification & Investigation Report: Disappearing Customers and Parts

> [!NOTE]
> This document logs the technical investigation into the issue where customers and parts created from the Employee Console are reported missing or deleted after some time or upon logging back in.

---

## 🔍 Investigation Findings & Evidence

### 1. Database Integrity Verification
We queried the active Supabase instance (`wrknmeifvyowuifompms`) directly via REST API using the anonymous public key.
* **Findings**: 
  * The customer `TEST Cust from employee` created during the user session **still exists** in the database.
  * The part `Part test` linked to `TEST Cust from employee` **still exists** in the database.
* **Conclusion**: The records are **not** being deleted by the Supabase database engine automatically.

### 2. Discovered Schema Anomalies
Comparing the active database state with the official `v2.2.0` Release Candidate Backup (`backup_2026-07-05T11-32-33-957Z`):
* **Customers Table**: The active database contains 10 customers (including `ORIENT HARDWARE`, `MAVITEC`, `ISMAT`, `ROT`, etc.) which do **not** match the backup file (which preserved `COIMBATORE PREMIER INDUSTRIES`, `TATA MOTORS`, and `RELIANCE INDUSTRIES`).
* **Parts Table**: The active database has **only 1 part** (the custom `Part test`), whereas the backup had 11 preserved manufacturing parts.
* **Analysis**: The database has been modified or replaced outside of the current code branch, leading to a mismatched master customer directory and the deletion of older parts.

### 3. Codebase Analysis (Deletions)
We performed a full search of the repository for delete operations:
* No cron jobs, github actions, or vercel schedules exist in the codebase.
* The only delete queries are:
  * `dbDeleteCustomer` and `dbDeletePart` inside `state.js`, which are bound strictly to manual click handlers inside the Admin dashboard.
* **Conclusion**: There is no code in the application that automatically deletes or truncates data.

---

## ⚠️ Potential Causes

### Suspect A: Environment/Branch Crosstalk (High Probability)
* **Description**: Since the Supabase credentials are hardcoded into the frontend client file (`src/js/services/supabase.js`), every branch, local server, and Vercel preview deployment points to the **same** Supabase project.
* **Scenario**: If the user is testing on a local server (`localhost:8000`) or a preview branch, and later logs into the main production URL which might have had its database reset or changed, the records will seem to have disappeared.

### Suspect B: CDN Script Load Failure & Silent Offline Fallback
* **Description**: The Supabase SDK is loaded via CDN: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` in `index.html`.
* **Scenario**: If the operator's network blocks JSDelivr, or the script fails to load, `window.supabase` is undefined, and the app silently switches to **offline/mock mode** without warning the user. Any new customer or part added in this state is saved in the browser's volatile in-memory array (`window.customers` and `window.parts`). Once they log out, log back in, or reload the page, the in-memory array resets, and the data disappears.

---

## 📋 Remediation Plan (Technical Spec)

### [FR-01] Move Configuration to Environment Variables
To prevent crosstalk, hardcoded credentials in `supabase.js` will be replaced with Vite environment variables.
* **SQL / Dev Separation**: 
  * Local development uses a separate Supabase project.
  * Production Vercel uses the live production Supabase project.

### [FR-02] Bundle Supabase SDK & Remove CDN Dependency
The Supabase client SDK should be installed via npm (`npm install @supabase/supabase-js`) and imported locally to avoid network load failures.

### [FR-03] Implement Offline / Sync Status Indicator in UI
Add a permanent status pill (e.g., `🟢 Connected` or `🔴 Offline Mode`) in both the Admin and Operator headers to ensure the user knows if their actions are successfully syncing to the database.
