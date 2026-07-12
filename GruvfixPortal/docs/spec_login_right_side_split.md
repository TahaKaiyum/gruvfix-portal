# Specification: Split Login page snapshot into Dashboard and Announcements panels

> [!NOTE]
> This specification documents the architectural layout and CSS enhancements required to restructure the right-hand panel of the portal landing page, separating operations metrics from system announcements and removing the timeline schedule.

---

## 📋 Feature Summary
The right-hand panel on the portal login screen ("Production Snapshot") currently features a metrics grid stacked on top of a split timeline schedule and announcements box. 

This enhancement will:
1. Completely remove the **Today's Schedule** timeline component.
2. Restructure the right-hand panel into **two vertical columns**:
   * **Dashboard Panel (Left)**: Contains the Production Snapshot header and the 6 metrics cards.
   * **Announcements Panel (Right)**: Contains the Latest Announcements, expanded to full height.
3. Optimize the metrics grid to display in 2 columns (instead of 3) to adapt to the narrower column width.
4. Ensure full responsive design (the panels stack vertically on screen widths < 1024px).

---

## 👥 User Journeys & Personas

### 1. Shift Operators & Admins (Logging In)
* **Journey**: When visiting the portal URL, users see a well-organized landing layout. The left side holds the login form, the middle column displays key plant performance statistics (produced parts, active personnel, running machinery), and the right column houses the latest announcement boards. The timeline schedule is no longer displayed.

---

## ⚙️ Functional Requirements

### [FR-01] Timeline Schedule Removal
* Remove the `.snapshot-sub-card` containing `"Today's Schedule"` and all inner `.timeline-item` nodes from the HTML.

### [FR-02] Split Pane HTML Structure
* Wrap the metrics dashboard (header + grid) inside `.snapshot-dash-panel`.
* Wrap the announcements card inside `.snapshot-ann-panel`.
* Assign a `.split-layout` class modifier to `.live-snapshot-content` to trigger the two-column display.

### [FR-03] Dashboard Grid Layout Refactoring
* The metrics grid `.snapshot-grid` within the split panel must be adjusted to `grid-template-columns: repeat(2, 1fr)` (instead of 3 columns) to fit cleanly.

### [FR-04] Responsive Page Boundaries
* At media breakpoint `@media (max-width: 1024px)`, the `.split-layout` flex direction must shift to `column`, allowing components to stack vertically on tablets and mobile screens.

---

## 🔌 UI / CSS Contracts

### Proposed CSS Modifications (`style.css`)
```css
/* Split Layout Pane */
.live-snapshot-content.split-layout {
    display: flex;
    flex-direction: row;
    gap: 30px;
    height: 100%;
}

.snapshot-dash-panel {
    flex: 1.25;
    display: flex;
    flex-direction: column;
}

.snapshot-ann-panel {
    flex: 0.75;
    display: flex;
    flex-direction: column;
}

.snapshot-ann-panel .announcements-sub-card.full-height {
    height: 100%;
    display: flex;
    flex-direction: column;
    margin: 0;
}

.snapshot-ann-panel .announcements-list {
    flex-grow: 1;
    overflow-y: auto;
}

/* Adjust Dashboard Grid to 2 columns on Desktop */
.live-snapshot-content.split-layout .snapshot-grid {
    grid-template-columns: repeat(2, 1fr);
    margin: 20px 0;
}

/* Media Query Stack */
@media (max-width: 1024px) {
    .live-snapshot-content.split-layout {
        flex-direction: column;
        gap: 20px;
    }
}
```

### Proposed HTML Layout (`index.html`)
```html
<div class="image-side">
    <div class="live-snapshot-content split-layout">
        
        <!-- Column 1: Operations Dashboard -->
        <div class="snapshot-dash-panel">
            <div class="snapshot-header">...</div>
            <div class="snapshot-grid">...</div>
        </div>

        <!-- Column 2: Announcements -->
        <div class="snapshot-ann-panel">
            <div class="snapshot-sub-card announcements-sub-card full-height">
                <h3 class="sub-card-title">Latest Announcements</h3>
                <div class="announcements-list">...</div>
            </div>
        </div>

    </div>
</div>
```
