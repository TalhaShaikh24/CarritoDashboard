const PermissionManager = (function () {
    let permissions = [];

    function load() {
        try {
            const data = sessionStorage.getItem("userPermissions");
            permissions = data ? JSON.parse(data) : [];
        } catch {
            permissions = [];
        }
    }

    function normalizeModuleName(name) {
        if (!name) return "";
        let s = name.toLowerCase().trim();
        if (s === "coupons") s = "offers";
        if (s === "coupon") s = "offer";
        if (s.endsWith("ies")) s = s.slice(0, -3) + "y";
        else if (s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
        return s;
    }

    function hasPermission(moduleName, action) {
        // If no restrictive permissions are loaded, default to true for superadmin
        if (!permissions || permissions.length === 0) {
            return true;
        }
        const normModule = normalizeModuleName(moduleName);
        const normAction = (action || '').toLowerCase().trim();

        return permissions.some(p => {
            if (!p.moduleName || !p.name) return false;
            return normalizeModuleName(p.moduleName) === normModule &&
                   p.name.toLowerCase().trim() === normAction;
        });
    }

    function hasModule(moduleName) {
        if (!permissions || permissions.length === 0) {
            return true;
        }
        const normModule = normalizeModuleName(moduleName);
        return permissions.some(p => p.moduleName && normalizeModuleName(p.moduleName) === normModule);
    }

    load();

    return {
        load,
        hasPermission,
        hasModule
    };
})();

// Permissions Page Controller
$(document).ready(function () {
    if ($('#module-permissions').length === 0) return;

    let permissionsList = [];
    let rolesList = [];
    let modulesList = [];

    function init() {
        loadData();

        $('#permissionSearch').on('input', renderTable);
        $('#moduleFilterSelect').on('change', renderTable);
    }

    function loadData() {
        // Fetch permissions and roles in parallel
        $.when(
            $.ajax({ url: `${baseApiUrl}/api/Permission`, method: 'GET' }),
            $.ajax({ url: `${baseApiUrl}/api/Role`, method: 'GET' })
        ).done(function (permRes, roleRes) {
            const permData = permRes[0]?.data || permRes?.data || [];
            const roleData = roleRes[0]?.data || roleRes?.data || [];

            permissionsList = Array.isArray(permData) ? permData : [];
            rolesList = Array.isArray(roleData) ? roleData : [];

            // Extract distinct modules
            const modMap = new Map();
            permissionsList.forEach(p => {
                if (p.moduleId && !modMap.has(p.moduleId)) {
                    modMap.set(p.moduleId, p.moduleName);
                }
            });
            modulesList = Array.from(modMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

            populateModuleFilter();
            renderTable();
        }).fail(function () {
            $('#permissionsTableBody').html(`<tr><td colspan="7" class="text-center text-danger" style="padding: 24px;">Failed to load permissions from API.</td></tr>`);
        });
    }

    function populateModuleFilter() {
        let options = `<option value="">All Modules (${modulesList.length})</option>`;
        modulesList.forEach(m => {
            options += `<option value="${m.name}">${m.name}</option>`;
        });
        $('#moduleFilterSelect').html(options);
    }

    function renderTable() {
        const query = ($('#permissionSearch').val() || '').trim().toLowerCase();
        const selectedModule = ($('#moduleFilterSelect').val() || '').toLowerCase();

        const filtered = permissionsList.filter(p => {
            const matchesQuery = !query ||
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.moduleName && p.moduleName.toLowerCase().includes(query)) ||
                (String(p.id).includes(query));

            const matchesModule = !selectedModule ||
                (p.moduleName && p.moduleName.toLowerCase() === selectedModule);

            return matchesQuery && matchesModule;
        });

        if (filtered.length === 0) {
            $('#permissionsTableBody').html(`<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No permissions matching your filter.</td></tr>`);
            return;
        }

        let html = "";
        filtered.forEach(p => {
            // Find which roles have this permission
            const assignedRoleNames = [];
            rolesList.forEach(r => {
                if (r.moduleNames) {
                    const mods = r.moduleNames.split(',').map(m => m.trim().toLowerCase());
                    if (mods.includes(p.moduleName.toLowerCase())) {
                        assignedRoleNames.push(r.name);
                    }
                }
            });

            const rolesBadge = assignedRoleNames.length > 0
                ? assignedRoleNames.map(rn => `<span class="permission-tag active" style="font-size: 11px;">${rn}</span>`).join(' ')
                : `<span class="text-muted" style="font-size: 11px; font-style: italic;">None</span>`;

            // Action color badge
            let actionClass = "inactive";
            const act = (p.name || '').toLowerCase();
            if (act === 'view') actionClass = "info";
            else if (act === 'create') actionClass = "active";
            else if (act === 'update') actionClass = "warning";
            else if (act === 'delete') actionClass = "danger";

            html += `
                <tr>
                    <td style="font-weight: 600; color: #64748b;">#${p.id}</td>
                    <td style="font-weight: 600; color: #1e293b;">
                        <span style="display: flex; align-items: center; gap: 6px;">
                            <i style="width: 15px; color: var(--primary, #4c9b0e);" data-lucide="package"></i>
                            ${p.moduleName}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge active" style="font-size: 11.5px; font-weight: 600;">
                            ${p.name}
                        </span>
                    </td>
                    <td style="font-family: monospace; font-size: 11.5px; color: #475569;">
                        ${p.moduleName.toLowerCase()}:${p.name.toLowerCase()}
                    </td>
                    <td>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${rolesBadge}
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="status-badge active" style="font-size: 11px;">Active</span>
                    </td>
                    <td class="text-center">
                        <a href="/Role" class="btn-outline btn-sm" style="font-size: 11.5px; padding: 4px 8px;" title="Manage role permissions">
                            <i style="width: 13px; vertical-align: middle; margin-right: 3px;" data-lucide="shield-check"></i> Assign
                        </a>
                    </td>
                </tr>
            `;
        });

        $('#permissionsTableBody').html(html);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    init();
});
