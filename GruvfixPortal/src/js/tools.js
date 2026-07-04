/**
 * @file tools.js
 * @description Controller for Tools master list and employee/admin Tool Request flow actions.
 * @project GruvfixPortal
 */

// ==========================================
// 1. TOOLS MASTER INVENTORY CONTROL
// ==========================================

function renderToolsTable() {
    const tbody = document.getElementById('admin-tools-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchEl = document.getElementById('admin-search-tools');
    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const filtered = tools.filter(t => t.name.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-table-state">No tools found.</td></tr>`;
        return;
    }
    
    filtered.forEach((tool) => {
        const mainIndex = tools.findIndex(t => t.name === tool.name);
        const tr = document.createElement('tr');
        
        let color = '#10b981'; // green
        if (tool.condition < 50) {
            color = '#ef4444'; // red
        } else if (tool.condition < 80) {
            color = '#f59e0b'; // amber
        }
        
        const conditionMeter = `
            <div class="tool-condition-meter-wrapper" style="display: flex; align-items: center; gap: 8px;">
                <div class="progress-bar-bg" style="width: 80px; height: 10px; background-color: #e5e7eb; border-radius: 9999px; overflow: hidden; border: 1px solid #d1d5db;">
                    <div class="progress-bar-fill" style="width: ${tool.condition}%; height: 100%; background-color: ${color}; transition: width 0.3s ease;"></div>
                </div>
                <span style="font-size: 12px; font-weight: 600; color: var(--text-dark);">${tool.condition}%</span>
            </div>
        `;
        
        const editIcon = `
            <button type="button" class="btn-edit-entry" onclick="openEditToolModal(${mainIndex})" title="Edit tool" style="background: none; border: none; padding: 6px; cursor: pointer; color: #4b5563; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        `;
        const deleteIcon = `
            <button type="button" class="btn-delete-entry" onclick="deleteTool(${mainIndex})" title="Delete tool" style="background: none; border: none; padding: 6px; cursor: pointer; color: #b91c1c; transition: color 0.15s;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        
        tr.innerHTML = `
            <td><strong>${tool.name}</strong></td>
            <td><code>${tool.dia}</code></td>
            <td><code>${tool.fluteLen}</code></td>
            <td><code>${tool.toolLen}</code></td>
            <td><code>${tool.toolDia}</code></td>
            <td>${tool.qty}</td>
            <td>${conditionMeter}</td>
            <td style="text-align: right; width: 100px;">
                ${editIcon}
                ${deleteIcon}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddToolModal() {
    const title = document.getElementById('modal-tool-title');
    const idx = document.getElementById('modal-tool-index');
    const name = document.getElementById('modal-tool-name');
    const dia = document.getElementById('modal-tool-dia');
    const toolDia = document.getElementById('modal-tool-tooldia');
    const flute = document.getElementById('modal-tool-flutelen');
    const len = document.getElementById('modal-tool-toollen');
    const qty = document.getElementById('modal-tool-qty');
    const cond = document.getElementById('modal-tool-condition');
    
    if (title) title.textContent = 'Add New Tool';
    if (idx) idx.value = '-1';
    if (name) name.value = '';
    if (dia) dia.value = '';
    if (toolDia) toolDia.value = '';
    if (flute) flute.value = '';
    if (len) len.value = '';
    if (qty) qty.value = '1';
    if (cond) cond.value = '100';
    
    openModal('modal-tool');
}

function openEditToolModal(index) {
    const tool = tools[index];
    if (!tool) return;
    
    const title = document.getElementById('modal-tool-title');
    const idx = document.getElementById('modal-tool-index');
    const name = document.getElementById('modal-tool-name');
    const dia = document.getElementById('modal-tool-dia');
    const toolDia = document.getElementById('modal-tool-tooldia');
    const flute = document.getElementById('modal-tool-flutelen');
    const len = document.getElementById('modal-tool-toollen');
    const qty = document.getElementById('modal-tool-qty');
    const cond = document.getElementById('modal-tool-condition');
    
    if (title) title.textContent = 'Edit Tool';
    if (idx) idx.value = index;
    if (name) name.value = tool.name;
    if (dia) dia.value = tool.dia;
    if (toolDia) toolDia.value = tool.toolDia;
    if (flute) flute.value = tool.fluteLen;
    if (len) len.value = tool.toolLen;
    if (qty) qty.value = tool.qty;
    if (cond) cond.value = tool.condition;
    
    openModal('modal-tool');
}

async function saveToolModal(e) {
    e.preventDefault();
    
    const idxEl = document.getElementById('modal-tool-index');
    const nameEl = document.getElementById('modal-tool-name');
    const diaEl = document.getElementById('modal-tool-dia');
    const toolDiaEl = document.getElementById('modal-tool-tooldia');
    const fluteEl = document.getElementById('modal-tool-flutelen');
    const lenEl = document.getElementById('modal-tool-toollen');
    const qtyEl = document.getElementById('modal-tool-qty');
    const condEl = document.getElementById('modal-tool-condition');
    
    const index = idxEl ? parseInt(idxEl.value) : -1;
    const name = nameEl ? nameEl.value.trim() : '';
    const dia = diaEl ? diaEl.value.trim() : '';
    const toolDia = toolDiaEl ? toolDiaEl.value.trim() : '';
    const fluteLen = fluteEl ? fluteEl.value.trim() : '';
    const toolLen = lenEl ? lenEl.value.trim() : '';
    const qty = qtyEl ? (parseInt(qtyEl.value) || 0) : 0;
    const condition = condEl ? Math.min(100, Math.max(0, parseInt(condEl.value) || 0)) : 100;
    
    const newToolObj = { name, dia, fluteLen, toolLen, toolDia, qty, condition };
    
    if (index === -1) {
        if (typeof dbSaveTool !== 'undefined' && supabaseClient) {
            try {
                await dbSaveTool(newToolObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error saving tool:", err);
                showToast("Failed to save tool to database.", "error");
                return;
            }
        } else {
            tools.push(newToolObj);
        }
        showToast('Tool added successfully.');
    } else if (tools[index]) {
        const oldName = tools[index].name;
        if (typeof dbSaveTool !== 'undefined' && supabaseClient) {
            try {
                if (oldName !== name) {
                    await dbDeleteTool(oldName);
                }
                await dbSaveTool(newToolObj);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error updating tool:", err);
                showToast("Failed to update tool in database.", "error");
                return;
            }
        } else {
            tools[index] = newToolObj;
        }
        showToast('Tool updated successfully.');
    }
    
    closeModal('modal-tool');
    renderToolsTable();
}

async function deleteTool(index) {
    const tool = tools[index];
    if (confirm(`Are you sure you want to delete tool "${tool.name}"?`)) {
        if (typeof dbDeleteTool !== 'undefined' && supabaseClient) {
            try {
                await dbDeleteTool(tool.name);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error deleting tool:", err);
                showToast("Failed to delete tool from database.", "error");
                return;
            }
        } else {
            tools.splice(index, 1);
        }
        renderToolsTable();
        showToast(`Tool "${tool.name}" deleted.`);
    }
}

function exportToolsToExcel() {
    const today = new Date().toISOString().split('T')[0];
    let csv = 'Tool Name,Dia (Shank),Flute Length,Tool Length,Tool Dia,Quantity,Condition (%)\n';
    
    const searchEl = document.getElementById('admin-search-tools');
    const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
    const filtered = tools.filter(t => t.name.toLowerCase().includes(query));
    
    filtered.forEach(t => {
        csv += `"${t.name}","${t.dia}","${t.fluteLen}","${t.toolLen}","${t.toolDia}","${t.qty}","${t.condition}%"\n`;
    });
    
    downloadCSV(csv, `gruvfix_tools_inventory_${today}.csv`);
    showToast('Tools inventory downloaded successfully.');
}

// ==========================================
// 2. EMPLOYEES & ADMINS TOOL REQUESTS
// ==========================================

function renderEmployeeToolRequests() {
    // Populate employee name field (readonly)
    const empNameInput = document.getElementById('tool-req-empname');
    if (empNameInput && loggedInUser) {
        empNameInput.value = loggedInUser.name || loggedInUser.empid;
    }
    
    // Populate Customer dropdown
    const custSelect = document.getElementById('tool-req-customer');
    if (custSelect) {
        custSelect.innerHTML = '<option value="" disabled selected>Select customer</option>';
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            custSelect.appendChild(opt);
        });
        const customOpt = document.createElement('option');
        customOpt.value = 'Other / Custom Customer';
        customOpt.textContent = 'Other / Custom Customer';
        custSelect.appendChild(customOpt);
    }
    
    // Render My Requests Table
    const tbody = document.getElementById('emp-tool-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const empRequests = toolRequests.filter(r => r.employeeId === loggedInUser?.empid);
    
    if (empRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-table-state">You have not submitted any tool requests.</td></tr>`;
        return;
    }
    
    empRequests.forEach(req => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        let actionBtn = '—';
        
        if (req.status === 'Pending Approval') {
            statusBadge = '<span class="status-badge pending" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Pending Approval</span>';
            actionBtn = `<span style="font-size: 11px; color: var(--text-light); font-style: italic;">Awaiting Approval</span>`;
        } else if (req.status === 'Approved' || req.status === 'Requested') {
            statusBadge = '<span class="status-badge completed" style="background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">Approved</span>';
            actionBtn = `<button type="button" class="btn-reset" onclick="openReturnToolModal('${req.id}')" style="padding: 6px 12px; font-size: 11px; font-weight: 700; color: #b91c1c; border-color: #fca5a5; background-color: #fef2f2;">Return & Close</button>`;
        } else if (req.status === 'Rejected') {
            statusBadge = '<span class="status-badge danger" style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;">Rejected</span>';
            actionBtn = `—`;
        } else if (req.status === 'Pending Close') {
            statusBadge = '<span class="status-badge in-progress" style="background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">Pending Close</span>';
            actionBtn = `<span style="font-size: 11px; color: var(--text-light); font-style: italic;">Awaiting Admin</span>`;
        } else {
            statusBadge = '<span class="status-badge completed" style="background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;">Closed</span>';
            actionBtn = `—`;
        }
        
        const returnCond = req.conditionOnClose !== null ? `${req.conditionOnClose}%` : '—';
        
        tr.innerHTML = `
            <td><strong>${req.toolName}</strong></td>
            <td>${req.customer}</td>
            <td><span style="font-size: 12px; color: var(--text-medium);">${req.requirements}</span></td>
            <td>${statusBadge}</td>
            <td><strong>${returnCond}</strong></td>
            <td style="text-align: right;">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

function handleCustomerSelectChange(val) {
    const customGroup = document.getElementById('tool-req-customcust-group');
    if (customGroup) {
        customGroup.style.display = val === 'Other / Custom Customer' ? 'block' : 'none';
        
        const customInput = document.getElementById('tool-req-customcust');
        if (customInput && val !== 'Other / Custom Customer') {
            customInput.value = '';
        }
    }
}

async function submitToolRequest(e) {
    e.preventDefault();
    if (!loggedInUser) return;
    
    const toolNameInput = document.getElementById('tool-req-name');
    const custSelect = document.getElementById('tool-req-customer');
    const customCustInput = document.getElementById('tool-req-customcust');
    const specsText = document.getElementById('tool-req-specs');
    
    const toolName = toolNameInput ? toolNameInput.value.trim() : '';
    
    let customer = custSelect ? custSelect.value : '';
    if (customer === 'Other / Custom Customer' && customCustInput) {
        customer = customCustInput.value.trim();
        if (!customer) {
            showToast('Please specify the custom customer name.', 'error');
            return;
        }
    }
    
    const requirements = specsText ? specsText.value.trim() : '';
    
    if (!toolName || !customer || !requirements) {
        showToast('Please fill out all request details.', 'error');
        return;
    }
    
    const newReq = {
        id: `req-${Date.now()}`,
        employeeId: loggedInUser.empid,
        employeeName: loggedInUser.name || loggedInUser.empid,
        customer: customer,
        toolName: toolName,
        requirements: requirements,
        status: 'Pending Approval',
        conditionOnClose: null
    };
    
    if (typeof dbSaveToolRequest !== 'undefined' && supabaseClient) {
        try {
            await dbSaveToolRequest(newReq);
            await syncFromSupabase();
        } catch (err) {
            console.error("Error saving tool request:", err);
            showToast("Failed to submit tool request to database.", "error");
            return;
        }
    } else {
        toolRequests.push(newReq);
    }
    showToast('Tool request submitted successfully.');
    
    // Clear forms
    if (toolNameInput) toolNameInput.value = '';
    if (custSelect) custSelect.selectedIndex = 0;
    if (customCustInput) customCustInput.value = '';
    const customGroup = document.getElementById('tool-req-customcust-group');
    if (customGroup) customGroup.style.display = 'none';
    if (specsText) specsText.value = '';
    
    renderEmployeeToolRequests();
}

function openReturnToolModal(reqId) {
    const idInput = document.getElementById('modal-return-req-id');
    if (idInput) idInput.value = reqId;
    
    const condInput = document.getElementById('modal-return-condition');
    if (condInput) condInput.value = '90';
    
    openModal('modal-return-tool');
}

async function submitReturnTool(e) {
    e.preventDefault();
    
    const idInput = document.getElementById('modal-return-req-id');
    const condInput = document.getElementById('modal-return-condition');
    
    const reqId = idInput ? idInput.value : '';
    const condition = condInput ? (parseInt(condInput.value) || 0) : 90;
    
    const req = toolRequests.find(r => r.id === reqId);
    if (req) {
        const updatedReq = {
            ...req,
            status: 'Pending Close',
            conditionOnClose: Math.min(100, Math.max(0, condition))
        };
        
        if (typeof dbSaveToolRequest !== 'undefined' && supabaseClient) {
            try {
                await dbSaveToolRequest(updatedReq);
                await syncFromSupabase();
            } catch (err) {
                console.error("Error saving return request:", err);
                showToast("Failed to submit return request to database.", "error");
                return;
            }
        } else {
            req.status = 'Pending Close';
            req.conditionOnClose = Math.min(100, Math.max(0, condition));
        }
        showToast('Return submitted. Tool work is over and pending admin closure.');
    }
    
    closeModal('modal-return-tool');
    renderEmployeeToolRequests();
}

function renderAdminToolRequestsTable() {
    const tbody = document.getElementById('admin-tool-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (toolRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-table-state">No tool requests registered in system.</td></tr>`;
        return;
    }
    
    toolRequests.forEach(req => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        let actionBtn = '—';
        
        if (req.status === 'Pending Approval') {
            statusBadge = '<span class="status-badge pending" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Pending Approval</span>';
            actionBtn = `
                <button type="button" class="btn-save" onclick="processToolRequestApproval('${req.id}', true)" style="padding: 6px 12px; font-size: 11px; font-weight: 700; margin-right: 6px; background-color: var(--primary-dark); border-color: var(--primary-dark);">Approve</button>
                <button type="button" class="btn-reset" onclick="processToolRequestApproval('${req.id}', false)" style="padding: 6px 12px; font-size: 11px; font-weight: 700; color: #b91c1c; border-color: #fca5a5; background-color: #fef2f2;">Reject</button>
            `;
        } else if (req.status === 'Approved' || req.status === 'Requested') {
            statusBadge = '<span class="status-badge pending" style="background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe;">In Use</span>';
            actionBtn = `<span style="font-size: 11px; color: var(--text-light); font-style: italic;">Active (In Use)</span>`;
        } else if (req.status === 'Rejected') {
            statusBadge = '<span class="status-badge danger" style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;">Rejected</span>';
            actionBtn = `—`;
        } else if (req.status === 'Pending Close') {
            statusBadge = '<span class="status-badge in-progress" style="background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">Work Over</span>';
            actionBtn = `<button type="button" class="btn-save" onclick="approveToolReturn('${req.id}')" style="padding: 6px 12px; font-size: 11px; font-weight: 700; background-color: var(--primary-dark); border-color: var(--primary-dark);">Close Request</button>`;
        } else {
            statusBadge = '<span class="status-badge completed" style="background-color: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;">Closed</span>';
            actionBtn = `—`;
        }
        
        const returnCond = req.conditionOnClose !== null ? `${req.conditionOnClose}%` : '—';
        
        tr.innerHTML = `
            <td><strong>${req.employeeName}</strong> <span style="font-size:11px; color:var(--text-light);">(${req.employeeId})</span></td>
            <td>${req.customer}</td>
            <td><strong>${req.toolName}</strong></td>
            <td><span style="font-size: 12px; color: var(--text-medium);">${req.requirements}</span></td>
            <td>${statusBadge}</td>
            <td><strong>${returnCond}</strong></td>
            <td style="text-align: right;">${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function processToolRequestApproval(reqId, isApproved) {
    const req = toolRequests.find(r => r.id === reqId);
    if (!req) return;

    const actionText = isApproved ? 'approve' : 'reject';
    if (confirm(`Are you sure you want to ${actionText} this tool request?`)) {
        const updatedReq = {
            ...req,
            status: isApproved ? 'Approved' : 'Rejected'
        };

        if (typeof dbSaveToolRequest !== 'undefined' && supabaseClient) {
            try {
                await dbSaveToolRequest(updatedReq);

                // Update quantity in master inventory if the tool matches by name and is approved
                if (isApproved) {
                    const masterTool = tools.find(t => t.name.toLowerCase().trim() === req.toolName.toLowerCase().trim());
                    if (masterTool) {
                        const updatedTool = {
                            ...masterTool,
                            qty: Math.max(0, masterTool.qty - 1)
                        };
                        await dbSaveTool(updatedTool);
                        showToast(`Request approved. Tool "${masterTool.name}" quantity decreased by 1 in inventory.`);
                    } else {
                        showToast('Request approved successfully (no matching tool in inventory).');
                    }
                } else {
                    showToast('Request rejected successfully.');
                }

                await syncFromSupabase();
            } catch (err) {
                console.error(`Error processing ${actionText}:`, err);
                showToast(`Failed to ${actionText} request in database.`, "error");
                return;
            }
        } else {
            req.status = isApproved ? 'Approved' : 'Rejected';
            if (isApproved) {
                const masterTool = tools.find(t => t.name.toLowerCase().trim() === req.toolName.toLowerCase().trim());
                if (masterTool) {
                    masterTool.qty = Math.max(0, masterTool.qty - 1);
                    showToast(`Request approved. Tool "${masterTool.name}" quantity decreased by 1 in inventory.`);
                } else {
                    showToast('Request approved successfully.');
                }
            } else {
                showToast('Request rejected successfully.');
            }
        }

        renderAdminToolRequestsTable();
        renderToolsTable(); // Sync tools table in background
    }
}

async function approveToolReturn(reqId) {
    const req = toolRequests.find(r => r.id === reqId);
    if (!req) return;
    
    // Confirm closure
    if (confirm(`Approve return of "${req.toolName}" from ${req.employeeName} and mark request as closed?`)) {
        const updatedReq = {
            ...req,
            status: 'Closed'
        };
        
        if (typeof dbSaveToolRequest !== 'undefined' && supabaseClient) {
            try {
                await dbSaveToolRequest(updatedReq);
                
                // Update condition and increment quantity in master inventory if the tool matches by name
                const masterTool = tools.find(t => t.name.toLowerCase().trim() === req.toolName.toLowerCase().trim());
                if (masterTool) {
                    const updatedTool = {
                        ...masterTool,
                        qty: masterTool.qty + 1,
                        condition: req.conditionOnClose !== null ? req.conditionOnClose : masterTool.condition
                    };
                    await dbSaveTool(updatedTool);
                    showToast(`Request closed. Tool "${masterTool.name}" returned to inventory (Qty +1) and condition updated to ${req.conditionOnClose !== null ? req.conditionOnClose : masterTool.condition}%.`);
                } else {
                    showToast('Request closed successfully.');
                }
                
                await syncFromSupabase();
            } catch (err) {
                console.error("Error approving return:", err);
                showToast("Failed to approve tool return in database.", "error");
                return;
            }
        } else {
            req.status = 'Closed';
            const masterTool = tools.find(t => t.name.toLowerCase().trim() === req.toolName.toLowerCase().trim());
            if (masterTool) {
                masterTool.qty = masterTool.qty + 1;
                if (req.conditionOnClose !== null) {
                    masterTool.condition = req.conditionOnClose;
                }
                showToast(`Request closed. Tool "${masterTool.name}" returned to inventory (Qty +1) and condition updated.`);
            } else {
                showToast('Request closed successfully.');
            }
        }
        
        renderAdminToolRequestsTable();
        renderToolsTable(); // Sync tools table in background
    }
}

// Export functions for ESM imports
export {
    renderToolsTable, openAddToolModal, openEditToolModal, saveToolModal, deleteTool,
    exportToolsToExcel, renderEmployeeToolRequests, handleCustomerSelectChange,
    submitToolRequest, openReturnToolModal, submitReturnTool,
    renderAdminToolRequestsTable, approveToolReturn, processToolRequestApproval
};

// Bind functions to window for backward compatibility
window.renderToolsTable = renderToolsTable;
window.openAddToolModal = openAddToolModal;
window.openEditToolModal = openEditToolModal;
window.saveToolModal = saveToolModal;
window.deleteTool = deleteTool;
window.exportToolsToExcel = exportToolsToExcel;
window.renderEmployeeToolRequests = renderEmployeeToolRequests;
window.handleCustomerSelectChange = handleCustomerSelectChange;
window.submitToolRequest = submitToolRequest;
window.openReturnToolModal = openReturnToolModal;
window.submitReturnTool = submitReturnTool;
window.renderAdminToolRequestsTable = renderAdminToolRequestsTable;
window.approveToolReturn = approveToolReturn;
window.processToolRequestApproval = processToolRequestApproval;


