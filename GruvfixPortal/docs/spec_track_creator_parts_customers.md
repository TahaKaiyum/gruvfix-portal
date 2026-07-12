# Specification: Track Creator & Modifier Metadata for Customers and Parts

> [!NOTE]
> This specification document details the changes required to track who created or last modified Customer and Part records, and to render this auditing metadata inside the Admin dashboard directory tables.

---

## 📋 Feature Summary
Currently, the application allows both operator (employee) logins and administrator logins to create or edit Customers and Parts. However, there is no auditing metadata in the database to trace who initiated the record or who made the most recent change.

This enhancement will:
1. Add `created_by` and `updated_by` columns to both the `customers` and `parts` database tables on Supabase.
2. Capture the username/identity of the logged-in session (`window.loggedInUser`) during save events.
3. Add a "LAST MODIFIED BY" column to the Admin Customer Directory and Parts Master grids.

---

## 👥 User Journeys & Personas

### 1. Shift Operators (Employees) & Admins (Creators)
* **Journey**: When logged in as `EMP001` or `admin@gruvfix.com`, saving a new Customer or Part automatically stamps their identity (`EMP001` or `admin@gruvfix.com`) onto the record in the database.

### 2. Plant Managers (Auditors)
* **Journey**: When reviewing the Customer Directory or Parts Master on the Admin console, the manager can see a clear audit trail of who created the record or made the latest modification.

---

## ⚙️ Functional Requirements

### [FR-01] Supabase Database Schema Alterations
Add audit columns to the target tables:
* `customers` table: Add `created_by` (text) and `updated_by` (text).
* `parts` table: Add `created_by` (text) and `updated_by` (text).

### [FR-02] State Mapping & Sync Updates
Update the state mapping layer (`state.js`) inside `syncFromSupabase()` to map the new database columns:
* Customers: Map `c.created_by` to `createdBy` and `c.updated_by` to `updatedBy`.
* Parts: Map `p.created_by` to `createdBy` and `p.updated_by` to `updatedBy`.

### [FR-03] Active User Context Capture (CRUD)
During save operations inside `saveCustomerModal(e)` and `savePartModal(e)`:
* **Creation (`index === -1`)**:
  * Set `created_by` to the current user's name/ID (`window.loggedInUser.name || window.loggedInUser.empid || 'System'`).
  * Set `updated_by` to the same user's name/ID.
* **Modification (`index !== -1`)**:
  * Keep the existing `created_by` value.
  * Update `updated_by` to the currently logged-in user's name/ID.

### [FR-04] UI Column Rendering (Admin Console)
* **Customer Directory**: Add a "LAST MODIFIED BY" column to `#admin-customers-tbody` rendering `updatedBy || '—'`.
* **Parts Master**: Add a "LAST MODIFIED BY" column to `#admin-parts-tbody` rendering `updatedBy || '—'`.

---

## 🗄️ Database Schema Updates (SQL)

```sql
-- 1. Add auditing columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_by text;

-- 2. Add auditing columns to parts table
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS updated_by text;
```

---

## 🔌 API / UI Contracts

### Save Payload JSON Schema
```json
{
  "name": "Mavitec Gaskets",
  "code": "MV",
  "notes": "Industrial seals manufacturer",
  "contact": "John Doe",
  "gst": "33AAACM1234L1ZR",
  "created_by": "Ravi Kumar (EMP001)",
  "updated_by": "Adnan (admin@gruvfix.com)"
}
```
