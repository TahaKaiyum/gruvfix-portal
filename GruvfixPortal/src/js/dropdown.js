/**
 * @file dropdown.js
 * @description Custom searchable combobox and dropdown logic for Customer and Part # selection.
 * @project GruvfixPortal
 */

// No-op to prevent errors since we no longer use native HTML datalists
function populateDatalists() {}

/**
 * Toggles the open/collapsed state of a custom dropdown list inside a part logging row.
 * @param {string} type - 'customer' or 'part'
 * @param {number} rowId - Row index identifier
 * @param {Event} event - Mouse click event
 */
function toggleCustomDropdown(type, rowId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // Close other dropdowns first
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    dropdowns.forEach(d => {
        if (d.id !== `${type}-dropdown-${rowId}`) {
            d.classList.remove('open');
        }
    });
    
    const dropdown = document.getElementById(`${type}-dropdown-${rowId}`);
    if (!dropdown) return;
    
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        dropdown.classList.remove('open');
    } else {
        dropdown.classList.add('open');
        // Render/refresh options list
        if (type === 'customer') {
            renderCustDropdownOptions(rowId);
            setTimeout(() => {
                const searchInput = document.getElementById(`cust-search-${rowId}`);
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
            }, 50);
        } else {
            renderPartDropdownOptions(rowId);
            setTimeout(() => {
                const searchInput = document.getElementById(`part-search-${rowId}`);
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
            }, 50);
        }
    }
}

/**
 * Renders the customer dropdown list filter matches.
 */
function renderCustDropdownOptions(rowId, filter = '') {
    const container = document.getElementById(`cust-options-${rowId}`);
    if (!container) return;
    container.innerHTML = '';
    
    const query = filter.toLowerCase().trim();
    const filtered = customers.filter(c => c.name.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="custom-dropdown-empty">No customers found</div>`;
        return;
    }
    
    const row = partRows.find(r => r.id === rowId);
    const selectedCust = row ? row.customer : '';
    
    filtered.forEach(c => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-dropdown-option';
        if (c.name === selectedCust) {
            optionDiv.classList.add('selected');
        }
        optionDiv.textContent = c.name;
        optionDiv.onclick = (e) => {
            e.stopPropagation();
            selectCustOption(rowId, c.name);
        };
        container.appendChild(optionDiv);
    });
}

/**
 * Selects a customer option and updates the row details.
 */
function selectCustOption(rowId, custName) {
    const row = partRows.find(r => r.id === rowId);
    if (row) {
        row.customer = custName;
    }
    
    const label = document.getElementById(`cust-label-${rowId}`);
    if (label) {
        label.textContent = custName;
        label.style.color = 'var(--text-dark)';
    }
    
    const dropdown = document.getElementById(`cust-dropdown-${rowId}`);
    if (dropdown) {
        dropdown.classList.remove('open');
    }
    
    updateSummary();
}

function filterCustDropdown(rowId, query) {
    renderCustDropdownOptions(rowId, query);
}

/**
 * Renders the part dropdown list filter matches.
 */
function renderPartDropdownOptions(rowId, filter = '') {
    const container = document.getElementById(`part-options-${rowId}`);
    if (!container) return;
    container.innerHTML = '';
    
    const query = filter.toLowerCase().trim();
    const filtered = parts.filter(p => p.partNo.toLowerCase().includes(query) || p.component.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        container.innerHTML = `<div class="custom-dropdown-empty">No parts found</div>`;
        return;
    }
    
    const row = partRows.find(r => r.id === rowId);
    const selectedPart = row ? row.partNo : '';
    
    filtered.forEach(p => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'custom-dropdown-option';
        if (p.partNo === selectedPart) {
            optionDiv.classList.add('selected');
        }
        optionDiv.innerHTML = `<strong>${p.partNo}</strong> - <span style="font-size: 11px; color: var(--text-light);">${p.component}</span>`;
        optionDiv.onclick = (e) => {
            e.stopPropagation();
            selectPartOption(rowId, p.partNo);
        };
        container.appendChild(optionDiv);
    });
}

/**
 * Selects a part option, autofills the associated component text and default process.
 */
function selectPartOption(rowId, partNo) {
    const row = partRows.find(r => r.id === rowId);
    if (!row) return;
    
    row.partNo = partNo;
    
    const partObj = parts.find(p => p.partNo.toLowerCase() === partNo.toLowerCase());
    if (partObj) {
        row.component = partObj.component;
        
        const procSelect = document.getElementById(`proc-select-${rowId}`);
        if (procSelect && partObj.process) {
            procSelect.value = partObj.process;
        }
        
        if (!row.customer && partObj.customer) {
            selectCustOption(rowId, partObj.customer);
        }
    }
    
    const label = document.getElementById(`part-label-${rowId}`);
    if (label) {
        label.textContent = partNo;
        label.style.color = 'var(--text-dark)';
    }
    
    const dropdown = document.getElementById(`part-dropdown-${rowId}`);
    if (dropdown) {
        dropdown.classList.remove('open');
    }
    
    updateSummary();
}

function filterPartDropdown(rowId, query) {
    renderPartDropdownOptions(rowId, query);
}

/**
 * Redirects the Add Customer button inside dropdown to trigger the creation modal.
 */
function openAddCustModalFromDropdown(rowId, event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById(`cust-dropdown-${rowId}`);
    if (dropdown) dropdown.classList.remove('open');
    
    activeRowIdForCustomerDropdown = rowId;
    openAddCustomerModal();
}

/**
 * Redirects the Add Part button inside dropdown to trigger the creation modal.
 */
function openAddPartModalFromDropdown(rowId, event) {
    if (event) {
        event.stopPropagation();
    }
    const dropdown = document.getElementById(`part-dropdown-${rowId}`);
    if (dropdown) dropdown.classList.remove('open');
    
    activeRowIdForPartDropdown = rowId;
    openAddPartModal();
    
    // Auto-select customer in the modal if customer is selected in this row
    const row = partRows.find(r => r.id === rowId);
    if (row && row.customer) {
        const select = document.getElementById('modal-part-customer');
        if (select) {
            select.value = row.customer;
        }
    }
}

// Export functions for ESM imports
export {
    toggleCustomDropdown, selectCustOption, filterCustDropdown,
    selectPartOption, filterPartDropdown, openAddCustModalFromDropdown, openAddPartModalFromDropdown,
    renderCustDropdownOptions, renderPartDropdownOptions
};

// Bind functions to window for backward compatibility
window.toggleCustomDropdown = toggleCustomDropdown;
window.selectCustOption = selectCustOption;
window.filterCustDropdown = filterCustDropdown;
window.selectPartOption = selectPartOption;
window.filterPartDropdown = filterPartDropdown;
window.openAddCustModalFromDropdown = openAddCustModalFromDropdown;
window.openAddPartModalFromDropdown = openAddPartModalFromDropdown;
window.renderCustDropdownOptions = renderCustDropdownOptions;
window.renderPartDropdownOptions = renderPartDropdownOptions;


