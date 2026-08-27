# Technical Specification: Mobile Responsiveness Enhancement

* **Feature Name**: Mobile Responsiveness Enhancement
* **Status**: Proposed / Under Review
* **Author**: Antigravity (AI System Architect)
* **Date**: August 1, 2026
* **GitHub Issue Reference**: [#68](https://github.com/TahaKaiyum/gruvfix-portal/issues/68)

---

## 1. Feature Summary
Currently, the Gruvfix Shift Production Portal is optimized primarily for desktop screens. Shop Floor Employees log hourly entries from shop floor machines, and Administrators review KPIs, rosters, and schedules. 

To improve efficiency, employees must be able to log work, submit tool requests, and view log history directly from their mobile web browsers (on personal or company-issued smartphones). Similarly, administrators require mobile access to review dashboards, all entries, and registers on the go.

This enhancement introduces a mobile-first responsive layout that:
* Replaces the horizontal-scrolling navigation header with a slick, collapsible **Drawer Navigation (Burger Menu)**.
* Restructures complex **tables into responsive card layouts** on viewports under `768px`.
* Introduces **inline field labels** for stacked forms (such as `.part-row` inputs).
* Scales **SVG Charts** dynamically using viewport boxes.
* Ensures **Modals** remain comfortable and fully scrollable on smaller vertical viewports.

---

## 2. User Journeys & Personas

### 🧑‍🔧 Shop Floor Employee (Mobile Web Browser)
1. **Authentication**: The employee opens `https://gruvfix-portal.vercel.app/` on their phone. The split-screen login fits cleanly vertically; they log in using quick-fill buttons or credentials.
2. **Tab Navigation**: They tap a burger menu icon in the header. A smooth drawer slides out from the left. Tapping **"New Entry"** closes the drawer and changes the view.
3. **Adding Work Entries**: The employee fills date/hour. In the parts section, each part row displays as a styled card with vertical inputs and explicit labels (`PART #`, `CUSTOMER`, `QTY`, etc.). They can easily tap and select options, fill text, attach files, and save.
4. **Checking History**: On the "My History" tab, logs are displayed as a list of scrollable or card-format logs showing details and lock icons.

### 👑 Administrator (Mobile Web Browser)
1. **Overview**: The admin logs in. KPIs stack vertically. SVG charts scale to fit 100% of the viewport width. The live shop floor monitor scales down gracefully.
2. **Roster / Parts Management**: Modals for editing parts, employees, or customers occupy 92% of the viewport width, with save/cancel actions anchored to the bottom.

---

## 3. Functional Requirements

### `[FR-01]` Collapsible Drawer Navigation (Mobile Menu)
* For screen viewports `< 768px`, the left-anchored vertical sidebar shall transform into a hidden off-canvas drawer.
* A header bar containing a hamburger menu button (SVG) shall display at the top of the viewport.
* Tapping the hamburger button shall slide the drawer into view from the left (`transform: translateX(0)`).
* Tapping a menu link or anywhere outside the open drawer shall automatically close the drawer (`transform: translateX(-100%)`).

### `[FR-02]` Table-to-Card Responsive Refactoring
* The system shall convert wide HTML `<table>` structures on mobile screens (`< 768px`) into flexible card lists using CSS Grid and pseudo-element data bindings.
* Specifically, the following tables shall be refactored:
  - **Today's Entries** (`#today-entries-table`)
  - **My History** (`#history-entries-table`)
  - **My Tool Requests** (`#emp-tool-requests-table`)
  - **Admin All Entries** (`#admin-entries-table`)
  - **Rosters/Registers** (Employees, Customers, Parts, Tools)
* Headers (`<thead>`) shall be visually hidden. Table rows (`<tr>`) shall display as separate block cards with shadows, padding, and subtle borders.
* Table cells (`<td>`) shall transform into key-value grids using CSS `:before` pseudo-elements loaded with `data-label` attributes.

### `[FR-03]` Part Row Mobile Form Labels
* On desktop, the `.parts-table-header` provides column headers above text inputs. On mobile, this header is hidden.
* The system shall show explicit, compact titles/labels above the dropdown triggers, selectors, and number inputs inside the `.part-row` container on mobile layouts to ensure operators understand what each input represents.

### `[FR-04]` Responsive Modals & Overlay Layouts
* All modals (`.modal-content`) shall scale to a width of `92%` on viewports `< 768px`.
* Modals shall have a maximum height of `90vh`. If content exceeds this limit, the modal body shall scroll independently (`overflow-y: auto`) while keeping action buttons anchored.

### `[FR-05]` Dynamic SVG Charts
* The SVG trend and comparison charts in the admin dashboard shall use `viewBox` attributes and CSS `width: 100%; height: auto;` to scale fluidly without distortion.

---

## 4. UI & Styling Blueprint (Proposed CSS)

### Mobile Viewport Structure (Breakpoints: 768px and 480px)

```css
/* Sidebar Drawer Trigger (Hamburger) */
.mobile-header-bar {
    display: none;
    align-items: center;
    justify-content: space-between;
    background-color: var(--primary-dark);
    padding: 12px 16px;
    color: white;
}

@media (max-width: 768px) {
    .mobile-header-bar {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 100;
    }

    /* Transform Sidebar to Off-Canvas Drawer */
    .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        width: 280px;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 4px 0 15px rgba(0, 0, 0, 0.2);
    }

    .sidebar.open {
        transform: translateX(0);
    }

    .sidebar-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.5);
        z-index: 150;
    }
    
    .sidebar-overlay.active {
        display: block;
    }
}
```

### Table-to-Card CSS Rule Pattern

```css
@media (max-width: 768px) {
    /* Hide table headers */
    .data-table table, 
    .data-table thead, 
    .data-table tbody, 
    .data-table th, 
    .data-table td, 
    .data-table tr { 
        display: block; 
    }
    
    .data-table tr {
        border: 1px solid var(--border-color);
        margin-bottom: 12px;
        border-radius: 8px;
        padding: 12px;
        background: var(--bg-white);
        box-shadow: var(--shadow-sm);
    }
    
    .data-table td { 
        border: none;
        position: relative;
        padding-left: 45% !important; 
        text-align: right;
        margin-bottom: 8px;
    }
    
    .data-table td:before { 
        position: absolute;
        top: 50%;
        left: 12px;
        transform: translateY(-50%);
        width: 40%; 
        padding-right: 10px; 
        white-space: nowrap;
        text-align: left;
        font-weight: 700;
        color: var(--text-medium);
        content: attr(data-label);
        font-size: 11px;
        text-transform: uppercase;
    }
}
```

---

## 5. Implementation Roadmap
1. **Add Sidebar Overlay & Hamburger Markup** to `index.html`.
2. **Add Toggle Event Listeners** in `app.js` to handle opening/closing of drawer and overlay clicks.
3. **Refactor HTML Tables** in `index.html` by appending corresponding `data-label` attributes to every `<td>` tag.
4. **Append Responsive CSS Rules** to `style.css` (drawer styles, table-to-card transformations, modal scaling, responsive form padding).
5. **Validation Testing** on Google Chrome Device Emulator (iPhone SE, iPhone 14 Pro, iPad Mini, and generic Android profiles).
