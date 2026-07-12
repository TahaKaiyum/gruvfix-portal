# QA Test Cases — Gruvfix Manufacturing Portal

> [!NOTE]
> This document lists the exhaustive test case matrix for verification of the Gruvfix Manufacturing Portal, covering all modules, RLS rules, and validation boundary limits.

---

## 🔒 1. Authentication & Session Management (AUTH)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **AUTH-01** | Admin Login | High | Active internet connection; user is on `#/login`. | 1. Choose "Admin Login" tab.<br>2. Input email: `admin@gruvfix.com`.<br>3. Input password.<br>4. Click "Sign in". | Redirects to `#/admin/dashboard`; loads admin dashboard stats; displays success toast. | Critical | Yes |
| **AUTH-02** | Operator Login | High | User is on `#/login`. | 1. Choose "Employee Login" tab.<br>2. Input Employee ID: `EMP001`.<br>3. Input password.<br>4. Click "Sign in". | Redirects to `#/operator/new-entry`; displays operator dashboard grid; sets shift schedule. | Critical | Yes |
| **AUTH-03** | Route Guarding | High | User is unauthenticated. | 1. Navigate directly to `#/admin/dashboard` or `#/operator/new-entry` via URL bar. | Redirects automatically back to `#/login` view; shows access restricted warning. | Major | Yes |
| **AUTH-04** | Session Expiry | Medium | Session active in `SessionManager`. | 1. Simulate 8-hour expiry by changing `loginTime` timestamp in LocalStorage.<br>2. Click any action link. | Logs out automatically; clears LocalStorage sessions; redirects to `#/login`. | Major | Yes |

---

## 👥 2. Customer Directory CRUD (CUST)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **CUST-01** | Create Customer | High | Admin logged in; on `#/admin/customers`. | 1. Click "Add New Customer".<br>2. Input name: `NEW CUST`.<br>3. Input valid 15-char GST.<br>4. Click "Save Customer". | Modal closes; new customer is displayed in the directory; success toast shown. | Major | Yes |
| **CUST-02** | Validation Errors | Medium | Admin logged in. | 1. Open customer modal.<br>2. Input invalid GST format.<br>3. Click "Save Customer". | Modal stays open; red validation warning prints inline inside the modal body. | Minor | No |
| **CUST-03** | Mapped Parts Cascade | High | Customer exists with mapped parts. | 1. Open customer edit modal.<br>2. Rename customer.<br>3. Click "Save Customer". | Customer is renamed; all associated parts update their customer field automatically (cascade). | Major | Yes |
| **CUST-04** | Delete Customer | High | Customer directory active. | 1. Click "Delete" icon on customer row.<br>2. Click "OK" on cascade warning. | Customer and all associated parts are deleted from database; directory grid updates. | Major | Yes |

---

## 👤 3. Employees Directory CRUD (EMP)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **EMP-01** | Add Employee | High | Admin on `#/admin/employees`. | 1. Click "+ Add Employee".<br>2. Fill ID, Name, Password.<br>3. Save. | Employee is saved; listed in user grid; employee credentials immediately work on login. | Major | Yes |
| **EMP-02** | Status Toggle | High | Employee exists. | 1. Click "Active" switch to turn "Deactive".<br>2. Log out.<br>3. Try logging in as that employee. | Account is locked; login is blocked with "Account deactivated" warning message. | Major | Yes |

---

## 🔩 4. Parts Master CRUD (PART)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **PART-01** | Create Part | High | Admin on `#/admin/parts`. | 1. Click "Add New Part".<br>2. Fill Part #, Component, select Customer, select Process.<br>3. Save. | Part is added; listed in parts grid table; syncs to database. | Major | Yes |
| **PART-02** | Shortcut Customer Add | Medium | Inside "Add New Part" modal. | 1. Click "+ Add New Customer" link.<br>2. Fill customer details & save.<br>3. Verify Part Modal is restored. | Customer modal closes; Part modal re-opens retaining inputs; new customer is pre-selected. | Medium | No |

---

## 📝 5. Production Entries Logging (LOG)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **LOG-01** | Day Shift Hours | High | Employee logged in; Day Shift active. | 1. Inspect hour slots dropdown. | Displays only Day Shift ranges: `08:00 - 20:00`. | Major | Yes |
| **LOG-02** | Night Shift Hours | High | Employee selects "Night Shift". | 1. Verify hour slots dropdown. | Dropdown updates instantly to display Night Shift ranges: `20:00 - 08:00`. | Major | Yes |
| **LOG-03** | Dynamic Combobox | Medium | Employee is logging work. | 1. Click "Select Customer".<br>2. Type query. | Options filter in real-time matching query characters. | Minor | No |
| **LOG-04** | Process Restrict | Medium | Work entry row active. | 1. Inspect "Process" dropdown. | Displays only 2 options: `Cutting` and `Machining`. | Minor | Yes |
| **LOG-05** | Save Log Entry | High | Row details filled. | 1. Click "Submit Shift Entries". | Entries save to Supabase; Today's Entries list updates; counters increase. | Critical | Yes |

---

## 🛠️ 6. Tool Requests Workflow (TOOL)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **TOOL-01** | Request Tool | High | Operator logged in. | 1. Fill Tool Request Form.<br>2. Click "Submit Request". | Request is saved in database with status `Requested`. | Major | Yes |
| **TOOL-02** | Admin Approval | High | Admin dashboard active. | 1. Click "Approve" on pending request.<br>2. Check stock qty in Tools list. | Request status shifts to `Approved`; tool stock quantity decreases by requested amount. | Critical | Yes |
| **TOOL-03** | Return & Close | High | Operator has approved tools. | 1. Click "Return & Close" on tool card. | Request status shifts to `Pending Close`. | Major | Yes |
| **TOOL-04** | Broken Tool Reason | Medium | Return click. | 1. Check "Broken" option.<br>2. Fill description.<br>3. Verify Admin list. | "Broken Reason" field displays; admin sees reason on their terminal. | Medium | No |

---

## 📊 7. Reports & Analytics (REP)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **REP-01** | Parameter Filters | High | Admin logged in; on Reports tab. | 1. Choose Date Range.<br>2. Choose Customer.<br>3. Click "Generate Report". | Data grid filters matching selected parameters. | Major | Yes |
| **REP-02** | Chart Render | Medium | Data generated. | 1. Inspect SVG trends. | Line graph plots coordinates matching hourly quantities. | Medium | No |
| **REP-03** | Excel CSV Export | High | Query matches populated. | 1. Click "Export Excel". | Initiates download of structured CSV file containing accurate matching records. | Major | Yes |

---

## ⚡ 8. Database & Synchronization (SYS)

| ID | Feature / Flow | Priority | Preconditions | Test Steps | Expected Result | Severity | Auto |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **SYS-01** | Parallel Fetching | High | DomContentLoaded. | 1. Trace browser network tab. | Queries to `logs`, `parts`, `customers` execute concurrently (no serial blocking). | High | No |
| **SYS-02** | RLS Security checks | High | Direct HTTP queries. | 1. Post mock customer insert anonymously. | Denied with 401/403 or RLS Violation error. | Critical | Yes |
| **SYS-03** | Offline Fallback | High | Network disconnected mid-session. | 1. Log work.<br>2. Save. | App does not crash; falls back to offline state; updates local grid in-memory. | Critical | No |

---

## 📝 Test Execution Record Status

> [!NOTE]
> All test cases currently hold a status of `PENDING` until the verification cycle is initiated by the QA Lead.
