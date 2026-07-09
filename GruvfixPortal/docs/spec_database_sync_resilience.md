# Specification: Supabase Database Synchronization Resilience Upgrades

> [!IMPORTANT]
> This specification documents the architectural upgrades required to resolve intermittent loading issues (where entries register as 0 or login fails due to empty in-memory state) by refactoring the database fetch sequence into a parallel, fault-tolerant execution model with automatic retry capabilities.

---

## 📋 Feature Summary
Currently, `syncFromSupabase()` sequentially performs 6 network calls to query Supabase tables:
1. `users`
2. `customers`
3. `parts`
4. `tools`
5. `tool_requests`
6. `logs`

If any of these queries fail (due to connection timeouts, transient CDN load failure, or Supabase rate-limits/gateway bottlenecks), the entire boot-sync function halts. The local variables are left empty, which displays `0` entries and causes operator logins to fail (since `window.users` remains unpopulated).

This upgrade implements:
* **Parallel Execution**: Fetching all tables concurrently to reduce total network delay.
* **Granular Fault Isolation**: Separating critical queries (`users`, `logs`) from non-critical metadata queries.
* **Automatic Retries**: Retrying requests that encounter transient network failures.

---

## 👥 User Journeys & Personas

### 1. Shift Operators (Employees) & Admins
* **Journey**: When visiting the portal URL, the system performs the initial sync. If a network drop occurs, the app retries automatically in the background rather than silently displaying empty metrics or refusing valid operator login credentials.

---

## ⚙️ Functional Requirements

### [FR-01] Concurrent Loading (`Promise.all`)
The fetch sequence must be executed concurrently. Instead of waiting for each request to finish before launching the next, all requests should be dispatched simultaneously.

### [FR-02] Resilient Fetch Utility with Exponential Backoff
Implement a generic helper function, `fetchWithRetry(queryPromise, retries, delay)`, that automatically catches network failures and retries the fetch with increasing intervals before rejecting the promise.

### [FR-03] Fail-Safe Scoping (Fault Isolation)
Isolate table sync failures:
* **Tier-1 (Critical)**: `users`, `logs`, `parts`. If any of these fail to resolve after retries, abort the sync and display a global warning banner.
* **Tier-2 (Non-Critical)**: `tools`, `tool_requests`, `announcements`, `schedules`. If any of these fail to load, proceed with the application initialization and display a fallback warning toast, rather than aborting the entire boot sequence.

---

## 🔌 API / JS Architectural Updates

### Proposed Refactored `syncFromSupabase()` Structure

```javascript
// Generic fetch-with-retry helper
async function fetchWithRetry(fetchFn, retries = 3, delay = 500) {
    try {
        return await fetchFn();
    } catch (err) {
        if (retries <= 0) throw err;
        console.warn(`Fetch failed. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, delay));
        return fetchWithRetry(fetchFn, retries - 1, delay * 2);
    }
}

async function syncFromSupabase() {
    toggleLoadingSkeletons(true);
    
    try {
        // Dispatch all queries in parallel
        const promises = {
            users: fetchWithRetry(() => supabaseClient.from('users').select('*')),
            customers: fetchWithRetry(() => supabaseClient.from('customers').select('*')),
            parts: fetchWithRetry(() => supabaseClient.from('parts').select('*')),
            tools: fetchWithRetry(() => supabaseClient.from('tools').select('*')),
            requests: fetchWithRetry(() => supabaseClient.from('tool_requests').select('*')),
            logs: fetchWithRetry(() => supabaseClient.from('logs').select('*').order('id', { ascending: false })),
            machines: fetchWithRetry(() => supabaseClient.from('machines').select('*')),
            announcements: fetchWithRetry(() => supabaseClient.from('announcements').select('*')),
            schedules: fetchWithRetry(() => supabaseClient.from('schedules').select('*'))
        };

        // Wait for all concurrent promises to settle
        const results = await Promise.allSettled(Object.values(promises));
        const keys = Object.keys(promises);
        
        const data = {};
        let criticalFailed = false;
        
        results.forEach((res, index) => {
            const key = keys[index];
            if (res.status === 'fulfilled') {
                if (res.value.error) {
                    console.error(`Error in table ${key}:`, res.value.error);
                    if (['users', 'logs', 'parts'].includes(key)) criticalFailed = true;
                } else {
                    data[key] = res.value.data;
                }
            } else {
                console.error(`Failed to fetch table ${key}:`, res.reason);
                if (['users', 'logs', 'parts'].includes(key)) criticalFailed = true;
            }
        });

        if (criticalFailed) {
            throw new Error("Critical database sync failed.");
        }

        // Map resolved data into state variables
        if (data.users) {
            window.users = data.users.map(u => ({ ...u }));
        }
        if (data.logs) {
            window.historicalEntries = data.logs.map(l => ({ ...l }));
        }
        // ... (Map remaining tables) ...

        console.log("Resilient parallel sync from Supabase complete!");
        toggleLoadingSkeletons(false);
        if (typeof window.updateHomepageMetrics === 'function') {
            window.updateHomepageMetrics();
        }
    } catch (err) {
        console.error("Error during parallel sync:", err);
        showToast("Critical database sync failed. Running in offline mode.", "error");
        toggleLoadingSkeletons(false);
    }
}
```
