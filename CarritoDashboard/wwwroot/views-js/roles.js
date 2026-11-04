let rolesData = [];
let allPermissions = [];
let modules = [];
let actionColumns = ["View", "Create", "Update", "Delete"];

const STANDARD_ACTION_ORDER = ["View", "Create", "Update", "Delete"];

$(document).ready(() => {
    loadAllPermissions(() => {
        loadRoles();
    });
});

$('#btnAddNewRole').click(() => openCreateModal());
$(document).on('click', '#btnRefreshMatrix', () => {
    loadAllPermissions(() => {
        loadRoles();
        showNotification("Permission matrix refreshed", "success");
    });
});

function loadAllPermissions(callback) {
    ajaxRequest({
        url: `${baseApiUrl}/api/Permission`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                allPermissions = response.data;

                // Dynamically extract modules
                const uniqueModulesMap = new Map();
                allPermissions.forEach(perm => {
                    if (perm.moduleId && !uniqueModulesMap.has(perm.moduleId)) {
                        uniqueModulesMap.set(perm.moduleId, {
                            id: perm.moduleId,
                            name: perm.moduleName
                        });
                    }
                });
                modules = Array.from(uniqueModulesMap.values()).sort((a, b) => a.id - b.id);

                // Dynamically extract action types (View, Create, Update, Delete, etc.)
                const distinctActions = [...new Set(allPermissions.map(p => p.name))];
                if (distinctActions.length > 0) {
                    actionColumns = distinctActions.sort((a, b) => {
                        const ia = STANDARD_ACTION_ORDER.indexOf(a);
                        const ib = STANDARD_ACTION_ORDER.indexOf(b);
                        if (ia !== -1 && ib !== -1) return ia - ib;
                        if (ia !== -1) return -1;
                        if (ib !== -1) return 1;
                        return a.localeCompare(b);
                    });
                }

                if (typeof callback === 'function') callback();
            }
        }
    });
}

function loadRoles() {
    ajaxRequest({
        url: `${baseApiUrl}/api/Role`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                rolesData = response.data;
                renderRoleCards();
                renderPermissionMatrix();
            }
        }
    });
}

function renderRoleCards() {
    let html = "";
    rolesData.forEach(role => {
        let permTags = "";
        let distinctModules = [];
        if (role.moduleNames) {
            distinctModules = [...new Set(
                role.moduleNames.split(',').map(name => name.trim()).filter(name => name !== "")
            )];
            permTags = distinctModules.map(modName => {
                return `<span class="permission-tag active">${modName}</span>`;
            }).join("");
        }

        const isFullAccess = distinctModules.length >= modules.length && modules.length > 0;
        const tagsDisplay = isFullAccess
            ? `<span class="permission-tag active" style="background:#dcfce7; color:#15803d; font-weight:700;"><i style="width:13px; vertical-align:middle; margin-right:3px;" data-lucide="shield-check"></i> Full Access (${distinctModules.length} Modules)</span>`
            : (permTags || `<span style="font-size:0.8em; color:#cbd5e1; font-style:italic;">No active permissions</span>`);

        html += `
            <div class="role-card">
                <div class="role-card-header">
                    <div>
                        <h3 class="role-name">${role.name}</h3>
                        <p class="role-description text-muted">${role.description || 'No description provided.'}</p>
                    </div>
                    <div class="role-card-actions">
                        <button class="action-btn edit" data-id="${role.id}" title="Edit Role & Permissions">
                            <i style="width: 18px;" data-lucide="square-pen"></i>
                        </button>
                        <button class="action-btn delete" data-id="${role.id}" title="Delete Role">
                            <i style="width: 18px;" data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
                
                <div class="role-permissions mt-3">
                    <p class="permissions-label" style="font-size: 0.75rem; text-transform:uppercase; color:#94a3b8; font-weight:700; letter-spacing:0.5px;">Access Modules (${distinctModules.length} of ${modules.length})</p>
                    <div class="permission-tags">
                        ${tagsDisplay}
                    </div>
                </div>

                <button class="btn-manage-perms edit-perms" data-id="${role.id}">
                    <i data-lucide="shield-check"></i>
                    Configure Permissions
                </button>
            </div>
        `;
    });
    $("#rolesGrid").html(html);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderPermissionMatrix() {
    if (!modules || modules.length === 0) {
        $("#permissionMatrixHeader").html(`<th class="sticky-col">Role</th><th class="text-center">No modules found</th>`);
        $("#permissionMatrixBody").html(`<tr><td colspan="2" class="text-center text-muted" style="padding: 24px;">No permissions data available</td></tr>`);
        return;
    }

    $("#matrixModulesCountBadge").text(`${modules.length} Modules`);

    // Dynamic Headers based on all modules in database
    let headerHtml = `<th class="sticky-col">Role</th>`;
    modules.forEach(mod => {
        headerHtml += `<th class="text-center" title="${mod.name} Module">${mod.name}</th>`;
    });
    headerHtml += `<th class="text-center sticky-actions">Actions</th>`;
    $("#permissionMatrixHeader").html(headerHtml);

    // Dynamic Body based on each role's module access
    let bodyHtml = "";
    rolesData.forEach(role => {
        const accessibleModules = role.moduleNames
            ? role.moduleNames.split(',').map(m => m.trim().toLowerCase())
            : [];

        bodyHtml += `<tr>`;
        bodyHtml += `<td class="sticky-col">
            <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${role.name}</div>
            <div style="font-size: 11px; color: #64748b;">${role.description || ''}</div>
        </td>`;

        modules.forEach(mod => {
            const hasAccess = accessibleModules.includes(mod.name.toLowerCase());
            if (hasAccess) {
                bodyHtml += `<td class="text-center">
                    <span class="matrix-check active" title="${role.name} has ${mod.name} access">
                        <i style="width: 13px; height: 13px;" data-lucide="check"></i>
                    </span>
                </td>`;
            } else {
                bodyHtml += `<td class="text-center">
                    <span class="matrix-check inactive" title="No access">—</span>
                </td>`;
            }
        });

        bodyHtml += `<td class="text-center sticky-actions">
            <button class="btn-outline btn-sm edit-perms" data-id="${role.id}" style="padding: 4px 10px; font-size: 12px; white-space: nowrap;">
                <i style="width: 13px; vertical-align: middle; margin-right: 2px;" data-lucide="shield-check"></i> Edit
            </button>
        </td>`;
        bodyHtml += `</tr>`;
    });

    $("#permissionMatrixBody").html(bodyHtml || `<tr><td colspan="100" class="text-center text-muted" style="padding: 24px;">No roles found</td></tr>`);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildPermissionMatrixRows(assignedPermissions = []) {
    return modules.map(mod => {
        const checkBoxes = actionColumns.map(colName => {
            const permObj = allPermissions.find(p => p.moduleId === mod.id && p.name.toLowerCase() === colName.toLowerCase());

            if (permObj) {
                const isChecked = assignedPermissions && assignedPermissions.some(p =>
                    (p.id === permObj.id) || (p.permissionId === permObj.id) || (p === permObj.id)
                );

                return `
                    <td class="text-center" style="padding: 8px 6px;">
                        <input type="checkbox" class="perm-check perm-check-mod-${mod.id}" 
                               style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--primary, #4c9b0e);"
                               value="${permObj.id}" 
                               ${isChecked ? 'checked' : ''}
                               title="${mod.name} - ${colName}">
                    </td>`;
            } else {
                return `<td class="text-center" style="padding: 8px 6px;"><span class="text-muted" style="color: #cbd5e1;">-</span></td>`;
            }
        }).join("");

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="font-weight: 600; color: #334155; white-space: nowrap; padding: 10px 14px;">
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0;">
                        <input type="checkbox" class="module-row-toggle" data-module-id="${mod.id}" title="Toggle all ${mod.name} permissions" style="accent-color: var(--primary, #4c9b0e); width: 15px; height: 15px;">
                        <span>${mod.name}</span>
                    </label>
                </td>
                ${checkBoxes}
            </tr>`;
    }).join("");
}

function bindMatrixControls() {
    // Row toggle event
    $(document).off('change', '.module-row-toggle').on('change', '.module-row-toggle', function () {
        const modId = $(this).data('module-id');
        const isChecked = $(this).is(':checked');
        $(`.perm-check-mod-${modId}`).prop('checked', isChecked);
    });

    // Update row toggle when individual checkboxes change
    $(document).off('change', '.perm-check').on('change', '.perm-check', function () {
        const modIdClass = $(this).attr('class').split(' ').find(c => c.startsWith('perm-check-mod-'));
        if (modIdClass) {
            const modId = modIdClass.replace('perm-check-mod-', '');
            const allBoxes = $(`.perm-check-mod-${modId}`);
            const checkedBoxes = $(`.perm-check-mod-${modId}:checked`);
            $(`.module-row-toggle[data-module-id="${modId}"]`).prop('checked', allBoxes.length > 0 && allBoxes.length === checkedBoxes.length);
        }
    });

    // Select All / Deselect All
    $(document).off('click', '#btnMatrixSelectAll').on('click', '#btnMatrixSelectAll', function () {
        $('.perm-check').prop('checked', true);
        $('.module-row-toggle').prop('checked', true);
    });

    $(document).off('click', '#btnMatrixDeselectAll').on('click', '#btnMatrixDeselectAll', function () {
        $('.perm-check').prop('checked', false);
        $('.module-row-toggle').prop('checked', false);
    });
}

function openCreateModal() {
    if (modules.length === 0 || allPermissions.length === 0) {
        showNotification("Permissions data is loading, please try again in a moment.", "warning");
        return;
    }

    const matrixRows = buildPermissionMatrixRows([]);

    const bodyHtml = `
        <form id="frmCreateRole">
            <div class="row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="flex: 1;">
                    <label style="font-weight: 600; font-size: 13px;">Role Name <span style="color: red;">*</span></label>
                    <input type="text" id="roleName" placeholder="e.g. Moderator" class="form-control" required>
                </div>
                <div class="form-group" style="flex: 1.5;">
                    <label style="font-weight: 600; font-size: 13px;">Description</label>
                    <input type="text" id="roleDescription" placeholder="Brief description of responsibilities..." class="form-control">
                </div>
            </div>

            <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h5 class="m-0" style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">Module Permissions Matrix</h5>
                    <p class="text-muted m-0" style="font-size: 0.8rem;">Select permissions to assign to this new role (${modules.length} Modules available).</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-outline btn-sm" id="btnMatrixSelectAll" style="font-size: 11px; padding: 4px 10px;">Select All</button>
                    <button type="button" class="btn-outline btn-sm" id="btnMatrixDeselectAll" style="font-size: 11px; padding: 4px 10px;">Clear All</button>
                </div>
            </div>

            <div class="permission-matrix-container mt-3" style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="permission-table" style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 2;">
                        <tr>
                            <th style="text-align: left; padding: 10px 14px;">Module</th>
                            ${actionColumns.map(a => `<th class="text-center" style="padding: 10px 6px;">${a}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixRows}
                    </tbody>
                </table>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Create New Role",
        bodyHtml: bodyHtml,
        size: 'lg',
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Role", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => {
            if (action === "save") {
                createRoleWithPermissions();
                return false;
            }
        }
    });

    bindMatrixControls();
}

function createRoleWithPermissions() {
    const name = $('#roleName').val().trim();
    const description = $('#roleDescription').val().trim();

    if (!name) {
        showNotification("Role Name is required", "error");
        return;
    }

    let selectedPermissionIds = [];
    $('.perm-check:checked').each(function () {
        selectedPermissionIds.push(parseInt($(this).val()));
    });
    const permissionIds = [...new Set(selectedPermissionIds)];

    showNotification("Creating role...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Role`,
        method: 'POST',
        data: { name, description },
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200) {
                const newRoleId = response.data.roleId || response.data.id;
                if (permissionIds.length > 0) {
                    assignPermissions(newRoleId, permissionIds, "Role created and permissions assigned successfully!");
                } else {
                    showNotification("Role created successfully!", "success");
                    loadRoles();
                    $.dynamicModal.close();
                }
            }
        }
    });
}

function openEditModal(role) {
    if (modules.length === 0 || allPermissions.length === 0) {
        showNotification("Permissions data is loading, please try again in a moment.", "warning");
        return;
    }

    const matrixRows = buildPermissionMatrixRows(role.permissions || []);

    const bodyHtml = `
        <form id="frmEditRole">
            <div class="row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div class="form-group" style="flex: 1;">
                    <label style="font-weight: 600; font-size: 13px;">Role Name <span style="color: red;">*</span></label>
                    <input type="text" id="editRoleName" value="${role.name}" required placeholder="Enter Role Name">
                </div>
                <div class="form-group" style="flex: 1.5;">
                    <label style="font-weight: 600; font-size: 13px;">Description</label>
                    <input type="text" id="editRoleDesc" value="${role.description || ''}" placeholder="Brief role description...">
                </div>
            </div>

            <div style="background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h5 class="m-0" style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">Module Permissions Matrix</h5>
                    <p class="text-muted m-0" style="font-size: 0.8rem;">Check or uncheck individual actions, or click a module checkbox to toggle entire row (${modules.length} Modules).</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn-outline btn-sm" id="btnMatrixSelectAll" style="font-size: 11px; padding: 4px 10px;">Select All</button>
                    <button type="button" class="btn-outline btn-sm" id="btnMatrixDeselectAll" style="font-size: 11px; padding: 4px 10px;">Clear All</button>
                </div>
            </div>

            <div class="permission-matrix-container mt-3" style="max-height: 420px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="permission-table" style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #f1f5f9; z-index: 2;">
                        <tr>
                            <th style="text-align: left; padding: 10px 14px;">Module</th>
                            ${actionColumns.map(a => `<th class="text-center" style="padding: 10px 6px;">${a}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixRows}
                    </tbody>
                </table>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: `Configure Role: ${role.name}`,
        bodyHtml: bodyHtml,
        size: 'lg',
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Save Changes", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => {
            if (action === "save") {
                updateRoleAndPermissions(role.id);
                return false;
            }
        }
    });

    bindMatrixControls();

    // Initialize row toggles based on checked status
    modules.forEach(mod => {
        const allBoxes = $(`.perm-check-mod-${mod.id}`);
        const checkedBoxes = $(`.perm-check-mod-${mod.id}:checked`);
        if (allBoxes.length > 0 && allBoxes.length === checkedBoxes.length) {
            $(`.module-row-toggle[data-module-id="${mod.id}"]`).prop('checked', true);
        }
    });
}

function updateRoleAndPermissions(roleId) {
    const name = $('#editRoleName').val().trim();
    const description = $('#editRoleDesc').val().trim();

    if (!name) {
        showNotification("Role Name is required", "error");
        return;
    }

    let selectedPermissionIds = [];
    $('.perm-check:checked').each(function () {
        selectedPermissionIds.push(parseInt($(this).val()));
    });

    const permissionIds = [...new Set(selectedPermissionIds)];

    showNotification("Saving role permissions...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Role/${roleId}`,
        method: 'PUT',
        data: { name, description },
        showMessage: false,
        onSuccess: (res) => {
            assignPermissions(roleId, permissionIds, "Permissions assigned successfully!");
        }
    });
}

function assignPermissions(roleId, permIds, customSuccessMsg) {
    ajaxRequest({
        url: `${baseApiUrl}/api/Role/AssignPermissions?roleId=${roleId}`,
        method: 'PUT',
        data: permIds,
        contentType: 'application/json',
        onSuccess: (response) => {
            showNotification(customSuccessMsg || "Permissions assigned successfully!", "success");
            loadRoles();
            $.dynamicModal.close();
        }
    });
}

$(document).on('click', '.action-btn.edit, .edit-perms', function () {
    const id = $(this).data('id');
    ajaxRequest({
        url: `${baseApiUrl}/api/Role/${id}`,
        method: 'GET',
        showMessage: false,
        onSuccess: (res) => {
            if (res.status === 200) {
                openEditModal(res.data);
            }
        }
    });
});

$(document).on('click', '.action-btn.delete', function () {
    const id = $(this).data('id');
    $.showConfirm({
        title: "Delete Role",
        message: "Are you sure? Users assigned to this role will lose their permission access.",
        confirmBtnText: "Yes, Delete",
        confirmClass: "btn-danger",
        onConfirm: () => {
            ajaxRequest({
                url: `${baseApiUrl}/api/Role/${id}`,
                method: 'DELETE',
                onSuccess: (res) => {
                    if (res.status === 200) {
                        showNotification("Role deleted successfully", "success");
                        loadRoles();
                    } else {
                        showNotification("Unable to delete role", "error");
                    }
                }
            });
        }
    });
});