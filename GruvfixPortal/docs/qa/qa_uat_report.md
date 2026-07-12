# User Acceptance Testing (UAT) Report — Gruvfix Manufacturing Portal

> [!NOTE]
> This document logs the User Acceptance Testing (UAT) run, simulating daily operator logging shifts and admin configuration workflows to evaluate overall usability, UX intuitiveness, and business logic mapping.

---

## 👥 UAT Personas & Journeys

### Persona A: Shop Floor Operator (Ravi Kumar — `EMP001`)

#### Scenario 1: Start of Shift & Work Logging
1. **Action**: Ravi logs in using his Employee ID `EMP001` on his mobile tablet.
2. **Usability Check**: Login screen loads instantly. Role select tabs are clearly marked. 
3. **Action**: He arrives at the Operator Console. Since he is on Night Shift tonight, he selects **Night Shift** from the dropdown. He opens the "Hour Slot" selection.
4. **Usability Check**: The hour slots dropdown updates instantly to show `20:00 - 08:00` ranges. He does not need to scroll through invalid daytime hours. This is highly intuitive and reduces error rates.
5. **Action**: In the work entry row, he clicks "Select Customer", types `TATA`, and presses Enter. He chooses `TATA MOTORS` from the options list.
6. **Usability Check**: Searchable combobox matches query characters in real-time, making customer selection smooth even on a small touchscreen keyboard.
7. **Action**: He picks the Part number `TM-GASK-04`.
8. **Usability Check**: The system automatically pulls in the component description `Tata Manifold Gasket` and sets the process to `Punching`, saving him from typing them manually.
9. **Action**: He selects machine `CNC-01` (retrieved dynamically from the database), sets quantity to `25`, and clicks **Submit Shift Entries**.
10. **Usability Check**: Logs save instantly. Success toast appears. The "Today's Entries" list updates in the table below. Ravi notes that there is no "Clear All Today" button on the screen, preventing him from accidentally deleting his previous hours' logs.

#### Scenario 2: Requesting a Tool
1. **Action**: Ravi needs a new drill bit. He navigates to the **Tool Request Form** on the dashboard.
2. **Action**: He fills in the tool name, diameter, and requested quantity (`1`), and clicks **Submit**.
3. **Usability Check**: Form is simple. He is returned to the dashboard showing a pending status card for the tool.

---

### Persona B: Plant Manager & Admin (Adnan — `admin@gruvfix.com`)

#### Scenario 3: Inventory & Request Approval
1. **Action**: Adnan logs in as Administrator.
2. **Usability Check**: KPI cards display overall plant output (quantities, employees online, etc.) directly synced with Supabase.
3. **Action**: He sees Ravi's pending tool request. He reviews the current tool inventory stock in the Tools master table.
4. **Action**: He clicks **Approve** on the request.
5. **Usability Check**: The pending card moves to `Approved` list. The tool inventory stock level decreases automatically, ensuring accurate inventory records.

#### Scenario 4: Master Data Configuration
1. **Action**: A new customer `MAVITEC` needs to be added. Adnan navigates to **Customer Directory** and clicks **Add Customer**.
2. **Usability Check**: The modal opens. He inputs name and details. Click Save. The record is written successfully. 
3. **Action**: Later, he wants to add a new Part for `MAVITEC`. He opens the **Parts Master**, clicks **Add Part**, and notices he can trigger a new customer shortcut link directly inside this modal if he forgot to add them first. This shortcut reduces navigation clicks.

---

## 🔍 Confusing / Unintuitive Behaviors Identified

While the overall portal UX feels highly responsive and easy to navigate, we noted one minor area of confusion:
* **Feedback [UAT-01] (Cascade Warnings)**: When deleting a customer, a popup warns that all their associated parts will also be deleted. However, there is no preview showing *which* specific parts are going to be removed.
  * *Recommendation*: In future design sprints, list the count of mapped parts within the delete confirmation popup (e.g. `Are you sure? This will delete 4 associated parts`).

---

## 🏁 UAT Sign-off Verdict
All core user journeys are highly intuitive. The portal reduces input steps for operator shifts and provides administrators with a direct view of floor productivity. The application is **Approved** for delivery.
