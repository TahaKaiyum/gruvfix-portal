# Specification: Dedicated Database Tables for Machines, Announcements, and Schedules

> [!NOTE]
> This specification outlines the architectural transition from storing serialized JSON metadata within the `customers` table to dedicated, fully normalized PostgreSQL tables for Machine configurations, System Announcements, and Shift Schedules.

---

## 📋 Feature Summary
Currently, the application stores dynamic master settings inside special rows in the `customers` table:
* `__MACHINES`: Serialized JSON array of machines inside the `notes` column.
* `__SYSTEM_SETTINGS`: Serialized JSON object containing `schedule` and `announcements` arrays inside the `notes` column.

This layout is a development-stage workaround that limits database query capability, constraints validation, and Supabase Row Level Security (RLS) fine-grained permissions. This feature will migrate these records into dedicated tables.

---

## 👥 User Journeys & Personas

### 1. Shift Operators (Employees)
* **Journey**: When loading the Operator Dashboard, the system queries the active `machines` list for the machine dropdown, active `announcements` for the alert board, and today's `schedules` for the timeline.

### 2. Administrators
* **Journey**: When visiting the Admin Console, the administrator can add/edit/delete records in the `machines` list, publish new `announcements`, and adjust schedule times/text. These CRUD operations must update dedicated tables immediately.

---

## ⚙️ Functional Requirements

### [FR-01] Database Schema Migration
Create three new tables on the Supabase PostgreSQL instance:
1. `machines`
2. `announcements`
3. `schedules`

### [FR-02] Legacy Data Extraction
Write and run a one-time database migration script to fetch the current serialized JSON strings from `customers` and insert the parsed objects into the newly created tables to prevent data loss.

### [FR-03] State Service Refactoring
Refactor backend services (`state.js`) to read and write database queries directly against the new tables:
* `syncFromSupabase()` -> Fetch `machines`, `announcements`, and `schedules` using direct SELECT queries.
* CRUD helper functions (`dbSaveMachine`, `dbDeleteMachine`, `dbSaveAnnouncement`, `dbDeleteAnnouncement`, `dbSaveSchedule`, etc.) should be implemented using direct Supabase queries on the respective tables.

### [FR-04] RLS Enforcement
Apply granular Row Level Security (RLS) policies to the new tables:
* `SELECT` allowed for all authenticated users (Employees and Admins).
* `INSERT`, `UPDATE`, `DELETE` allowed only for users with role `admin`.

---

## 🗄️ Database Schema Updates (SQL)

```sql
-- 1. Create machines table
CREATE TABLE public.machines (
    id text PRIMARY KEY,
    name text NOT NULL,
    condition text NOT NULL DEFAULT 'Good',
    years_of_use integer NOT NULL DEFAULT 0
);

-- 2. Create announcements table
CREATE TABLE public.announcements (
    id text PRIMARY KEY,
    text text NOT NULL,
    date text NOT NULL,
    type text NOT NULL DEFAULT 'bell'
);

-- 3. Create schedules table
CREATE TABLE public.schedules (
    id SERIAL PRIMARY KEY,
    time text NOT NULL,
    text text NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Allow public read access on machines" ON public.machines FOR SELECT USING (true);
CREATE POLICY "Allow admin write access on machines" ON public.machines FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public read access on announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow admin write access on announcements" ON public.announcements FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow public read access on schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Allow admin write access on schedules" ON public.schedules FOR ALL TO authenticated USING (true);
```

---

## 🔌 API / UI Contracts

### 1. Fetch State Response Map
```javascript
// Before
const dbMachines = JSON.parse(dbCustomers.find(c => c.name === '__MACHINES').notes);

// After
const { data: dbMachines } = await supabaseClient.from('machines').select('*');
const { data: dbAnnouncements } = await supabaseClient.from('announcements').select('*');
const { data: dbSchedules } = await supabaseClient.from('schedules').select('*');
```

### 2. Save Machine Signature
```javascript
// Before
async function dbSaveSystemSettings(...) {
    // updates customers table __MACHINES notes field
}

// After
async function dbSaveMachine(machineObj) {
    await supabaseClient
        .from('machines')
        .upsert(machineObj);
}
```
