# Gruvfix Production Monitor Portal

We have recreated the exact split-screen login page from the design files for the **Gruvfix Production Monitor** application, and went a step further by building a **fully interactive, high-fidelity prototype** of the entire employee shop-floor console.

---

## 🛠️ Files Created & Configured

All the source files are located in your workspace:
* **HTML Structure**: [index.html](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/index.html)
* **Custom Stylesheet**: [style.css](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/style.css)
* **Interactive Logic**: [app.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/app.js)
* **Background Image**: [factory_bg.png](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/factory_bg.png) (A professionally generated industrial background matching the design)

---

## 🎨 Design & Aesthetic Elements Recreated

1. **Brand Identity**:
   * Replicated the exact square "Gruvfix Gaskets and Seals LLP" logo using pure CSS and HTML to guarantee crisp text rendering on high-DPI screens.
   * Utilized the correct typography (`Inter` from Google Fonts).
   * Used the exact deep forest green palette (`#10321c` / `#154726`) alongside vibrant grass-green accents (`#2e7d32`).
2. **Split-Screen Layout**:
   * **Left (Form)**: High-fidelity login interface with clean selectors, precise input sizing, and a dash-bordered credentials helper box.
   * **Right (Live Status Panel)**: High-tech industrial monitoring dashboard showing a live shift clock, pulsing status indicators for active machines (`CNC-01`, `CNC-02`, etc.), overall floor metrics (OEE average, production volume), and a live terminal log scrolling floor activity from simulated operators in real-time.
3. **Responsive Design**:
   * On desktop screens, it displays as a sleek `50/50` split panel.
   * On mobile screens, the image side collapses and the form stretches to full-screen. The dashboard sidebar switches into a top-mounted swipe menu for touch comfort.

---

## ⚡ Interactive Prototype Features

To make this a production-grade prototype, we added the following dynamic features:

1. **Tab Switcher**: Clicking between **Admin** and **Employee** tabs shifts form contexts dynamically (updating instruction texts, labels, and placeholders).
2. **Default Credentials Helper**: Clicking on the credentials box auto-fills the login form.
3. **Role-Specific Navigation**:
   * **Admin Login** (`admin@gruvfix.com` / `Admin123`) loads the **Admin Console** where you can view overall metrics and live shop logs.
   * **Employee Login** (`EMP001` / `Emp@12345`) loads **Ravi Kumar's Shop Floor Dashboard**.
4. **Interactive Hourly Logging**:
   * **Customer-Part Sync**: Part list dropdowns change dynamically based on the selected customer. Choosing a Part # auto-fills the Component description (e.g., selecting `PT-A` fills `Acme Primary Gasket`).
   * **Dynamic Part Row Management**: Operators can click `+ Add part` to append multiple parts under the same hour slot. They can also delete rows (with a red bin transition).
   * **Simulated Attachment**: Clicking `Attach` triggers a file-selection window. Once a file is picked, the button updates to show the file name.
   * **Live Summary & Stats**: The form footer calculates rows and quantities dynamically. Saving entries increments `Today's Entries` and `Today's Qty` counters.
5. **Historical Ledger**:
   * Successfully logs and renders entries in the "Today's entries" table.
   * "My History" tab shows pre-populated historical entries (as seen in the screenshots) which are locked for editing, and incorporates any newly added entries.
6. **Toast System**: Beautiful success/error alerts notify the operator of form validations, log completions, or login issues.

---

## 🚀 How to Preview the Application

The application is currently being served locally. 

> [!IMPORTANT]
> To preview the portal, open your browser and navigate to:
> **[http://localhost:8000](http://localhost:8000)**

### Testing Guide:
1. **Login**: Click on the Employee credentials in the bottom box to auto-fill, then click **Sign in**.
2. **Select hour/customer**: Choose an hour (e.g. `09:00 - 10:00`) and a customer (e.g. `Acme Test`).
3. **Add multiple parts**: Click **+ Add part**, select a part code, input quantities, and click **Attach** to upload a test file.
4. **Save**: Click **Save 2 entries**. You will see a success toast and the new records will instantly append to **Today's entries**.
5. **View Ledger**: Go to the **My History** tab in the sidebar to review the combined historical records.
