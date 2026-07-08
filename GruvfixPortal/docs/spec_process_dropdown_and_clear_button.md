# Technical Specification: Process Dropdown Refinement & Clear Button Removal

* **Feature Name**: Process Dropdown Refinement & Clear Button Removal
* **Status**: Draft / Proposed
* **Author**: Antigravity (AI System Architect)
* **Date**: July 8, 2026
* **GitHub Issue Reference**: [#61](https://github.com/TahaKaiyum/gruvfix-portal/issues/61)

---

## 1. Feature Summary
To simplify operator logging actions and prevent accidental mass deletions:
1. **Process List Simplification**: The **Process** dropdown in the "New Work Entry" parts grid currently lists 5 industrial processes. It shall be simplified to contain only the two primary active processes on the shop floor: **Cutting** and **Machining**.
2. **Clear All Today Button Removal**: The red **Clear All Today** button in the employee console's "Today's entries" list shall be removed. This removes the risk of operators deleting logged data, keeping all daily entries protected until admin review.

---

## 2. User Journeys & Personas

### 🧑‍🔧 Shop Floor Operator (Employee)
1. **Logging Parts**: The operator logs a part in a row. When selecting the process default, they click the dropdown and see only two options: `Cutting` and `Machining`.
2. **Reviewing Today's Entries**: The operator looks at their "Today's entries" list. They can see all logged slots, but the "Clear All Today" button is no longer present, so entries cannot be bulk-deleted.

---

## 3. Functional Requirements

### `[FR-01]` Process Dropdown Options
* The system shall restrict options inside the `<select id="proc-select-${rowId}">` element in the parts entry row to:
  * `Cutting` (default)
  * `Machining`
* All other processes (`Punching`, `Molding`, `Curing`, `Trimming`) shall be removed from the options list.

### `[FR-02]` Clear Button Removal
* The button element with ID `btn-clear-today-entries` (labeled "Clear All Today") shall be completely removed from the DOM under the operator dashboard.
* The `clearAllTodayEntries()` controller function shall be retained in `employee.js` to prevent references breaking but shall have no bindings in the UI.

---

## 4. Data Models & Schemas
No database migrations or schema adjustments are required. The `logs` table in Supabase stores the process column as a plain string (`text`), which fully accommodates `Cutting` or `Machining`.

---

## 5. UI & Logic Components

### Core Files
* **Markup**: [index.html](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/index.html#L506)
* **Controller**: [employee.js](file:///C:/Taha%20-%20Personal/Gruvfix%20Project/GruvfixPortal/src/js/employee.js#L130-L137)

### Changes Planned

#### Markup (`index.html`):
Remove:
```html
<button type="button" class="btn-reset" id="btn-clear-today-entries" onclick="clearAllTodayEntries()" style="...">
    ...
    Clear All Today
</button>
```

#### JS Logic (`employee.js`):
Update the process dropdown options within `addPartRow()`:
```javascript
        <div class="col-proc">
            <select id="proc-select-${rowId}" required>
                <option value="Cutting" selected>Cutting</option>
                <option value="Machining">Machining</option>
            </select>
        </div>
```
