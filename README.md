# Gruvfix Manufacturing Portal 🏭

A modern, responsive, and secure **Production Operations Platform** designed for shop-floor tracking at **Gruvfix Gaskets and Seals LLP**. This system empowers shop operators to log hourly production counts and request tooling, while providing administrators with live analytical dashboards, master catalogs, inventory control, and customizable portal updates.

Live Production URL: **[https://gruvfix-portal.vercel.app](https://gruvfix-portal.vercel.app)**

---

## 🌟 Key Features

### 1. Operations & Hourly Logging (Employee Console)
* **Hourly Production Log**: Shop operators select an hour slot, choose a customer, and add multiple part entries (quantities, processes, status, remarks, and file attachments).
* **Live Shift Log**: View logged operations in real-time directly on the main dashboard.
* **My History**: Filters historical logs by date range with immediate statistics summaries.

### 2. Tools & Inventory Management (Operator & Admin Workflow)
* **Request a Tool**: Operators can request tools from the current inventory. Condition is selected from pre-set statuses (`Good`, `OK`, `Broken`) instead of percentages.
* **Inventory Control & Add-New**: Ability to directly register new tooling types in the master catalog.
* **Automatic Inventory Balancing**:
  * When a tool request is **Approved** by an admin, the active inventory quantity is decremented.
  * When a tool request is **Closed** (marked returned), the tooling quantity is automatically added back to the inventory.

### 3. Homepage settings & Schedule Manager (Admin Only)
* **Today's Timeline**: Admins can customize the daily schedule from the configuration panel. Updates apply in real-time to the public landing page.
* **Announcements**: Broadcast portal notices with custom category icons (🔔 General, ⚙️ Maintenance, 🛡️ Safety). Clicking "View all announcements" opens a beautiful overlay modal.

### 4. Admin Management Consoles
* **Live Analytics**: Visualizes production trends and operator shift distributions using responsive Chart.js components.
* **User Directory**: Full CRUD interface to add, edit, sort, toggle active states, or delete system users (Employees and Administrators).
* **Customer & Parts Catalog**: Centralized databases containing codes, contact details, GST numbers, and part blueprints.
* **Reports Dashboard**: Custom filter parameters to export historical entry records to Excel (CSV) or compile printable PDF summaries.

---

## 🛠️ Technology Stack

* **Frontend**: HTML5, Vanilla CSS3 (Custom design system, glassmorphism, responsive grid layouts).
* **Programming Logic**: Vanilla JS (ES Modules).
* **Backend Database**: Supabase (PostgreSQL) client with real-time replication.
* **Build Tool**: Vite (Asset compilation and local development server).
* **Data Visualization**: Chart.js (Admin trend graphs).
* **Deployment**: Vercel (Automatic production deploys).

---

## 📂 Project Structure

```text
├── GruvfixPortal/
│   ├── .agents/                # Custom local workspaces and configs
│   ├── docs/                   # Specifications and portal design mockups
│   ├── public/                 # Static public assets (logos, background images)
│   │   ├── Logo.png
│   │   └── factory_bg.png
│   ├── src/
│   │   ├── js/
│   │   │   ├── components/     # Custom sidebar components
│   │   │   ├── routing/        # Router configuration and role guards
│   │   │   ├── services/       # Supabase and Session managers
│   │   │   ├── store/          # App state storage
│   │   │   ├── admin.js        # Admin console event handlers
│   │   │   ├── app.js          # App lifecycle and metrics rendering
│   │   │   ├── state.js        # Supabase sync mappings and actions
│   │   │   └── tools.js        # Tool requests and inventory workflow logic
│   │   └── styles/
│   │       └── style.css       # Unified style sheet (tokens, elements, layouts)
│   ├── index.html              # Main HTML entrypoint (Login, Dashboards, Modals)
│   ├── package.json            # Configuration and script manifests
│   └── vite.config.js          # Vite compilation config
└── README.md                   # This documentation file
```

---

## 🗄️ Supabase Database Schema

The portal persists all operations on Supabase. Below are the key tables and column schemas:

### 1. `users`
* `id` (uuid, primary key)
* `empid` (text, unique operator identifier)
* `name` (text, employee name)
* `email` (text, admin login email)
* `password` (text, encrypted login hash)
* `role` (text: `admin` or `employee`)
* `active` (boolean, accounts status control)
* `created_at` (timestamp)

### 2. `customers`
* `name` (text, primary key)
* `code` (text, unique lookup code)
* `contact` (text)
* `gst` (text, tax registry identifier)
* `notes` (text, *Note: used to store serialized JSON portal config under customer name `__SYSTEM_SETTINGS`*)

### 3. `parts`
* `id` (uuid, primary key)
* `part_number` (text, unique number)
* `customer` (text, foreign key mapping to customers)
* `component` (text)
* `process` (text)
* `machine` (text)
* `remarks` (text)

### 4. `entries` (Production Logs)
* `id` (uuid, primary key)
* `date` (text)
* `shift` (text)
* `hour` (text)
* `operator` (text, maps to operator ID)
* `customer` (text)
* `part_number` (text)
* `component` (text)
* `process` (text)
* `qty` (integer)
* `machine` (text)
* `status` (text)
* `remarks` (text)
* `file` (text, optional attachment path)

### 5. `tools_inventory`
* `id` (uuid, primary key)
* `name` (text, unique tool name)
* `quantity` (integer, available count)
* `created_at` (timestamp)

### 6. `tool_requests`
* `id` (uuid, primary key)
* `operator_id` (text)
* `tool_name` (text, maps to tools_inventory)
* `remarks` (text)
* `condition` (text: `Good`, `OK`, or `Broken`)
* `status` (text: `Pending`, `Approved`, `Rejected`, or `Closed`)
* `created_at` (timestamp)

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: Version 18.0 or newer.
* **Supabase Account**: A PostgreSQL database instance.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/TahaKaiyum/gruvfix-portal.git
   cd gruvfix-portal/GruvfixPortal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the `GruvfixPortal` directory and configure your Supabase endpoints:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run local development server:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Guard Rails
* **Route Protection**: The routing client verifies active sessions and role-specific permissions via [routeGuards.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/src/js/routing/routeGuards.js) prior to mounting dashboards.
* **Active Status Verification**: Sessions are checked against the Supabase database. If an administrator deactivates an account, the active operator session is terminated immediately.
