// Activity Log page scripts — same pattern as the MenuOptics activity log:
// stat cards, filters (search / user / log level / endpoint / date range),
// a server-side table, and a details popup with the request payload and
// response. Data comes from the Carrito API's ActivityLog endpoints.

let activityLogTable;
let activityLogCache = {};
let activityLogSearchTimer = null;
// Default date range: last 7 days (same default as MenuOptics)
let activityRange = getActivityDefaultRange();

$(document).ready(() => {
    $('#filterActivityUser').customSelect({ placeholder: 'All Users', searchable: true, searchableThreshold: 0 });
    $('#filterActivityLevel').customSelect({ placeholder: 'All Log Levels' });
    $('#filterActivityRequestType').customSelect({ placeholder: 'All Endpoints', searchable: true, searchableThreshold: 0 });

    // Calendar range picker - the same component the Dashboard and
    // Customers pages use
    $('#activityDateRange').dateRangePicker({
        initialStart: activityRange.start,
        initialEnd: activityRange.end,
        onSelect: function (range) {
            activityRange = { start: range.start, end: range.end };
            if (activityLogTable) {
                activityLogTable.ajax.reload();
            }
        }
    });

    initializeActivityLogTable();
    loadActivityEndpoints();

    // Search with a small debounce, driven through the DataTable like the
    // Inventory page's search does
    $('#activityLogSearch').on('input', function () {
        clearTimeout(activityLogSearchTimer);
        const value = this.value;
        activityLogSearchTimer = setTimeout(() => {
            if (activityLogTable) {
                activityLogTable.search(value).draw();
            }
        }, 350);
    });

    $('#filterActivityUser, #filterActivityLevel, #filterActivityRequestType').on('change', function () {
        if (activityLogTable) {
            activityLogTable.ajax.reload();
        }
    });

    $('#btnClearActivityFilters').on('click', function () {
        $('#activityLogSearch').val('');
        $('#filterActivityUser').val('all');
        $('#filterActivityLevel').val('all');
        $('#filterActivityRequestType').val('all');
        activityRange = getActivityDefaultRange();
        setActivityRangeTriggerText();
        refreshActivityFilterSelects();
        if (activityLogTable) {
            activityLogTable.search('').draw();
        }
    });

    $(document).on('click', '.activity-log-details', function () {
        viewActivityLogDetails($(this).data('id'));
    });

    $(document).on('click', '.activity-copy-btn', function () {
        const targetId = $(this).data('target');
        const text = document.getElementById(targetId) ? document.getElementById(targetId).textContent : '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
            }).catch(() => {
                showNotification('Failed to copy.', 'error');
            });
        }
    });
});

function initializeActivityLogTable() {
    activityLogTable = $('#activityLogTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No activity logs found",
            zeroRecords: "No matching activity logs found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const params = {
                PageNumber: (data.start / data.length) + 1,
                PageSize: data.length,
                draw: data.draw
            };

            const searchValue = (data.search.value || '').trim();
            if (searchValue) {
                params.Search = searchValue;
            }

            const userId = $('#filterActivityUser').val();
            if (userId && userId !== 'all') {
                params.userId = userId;
            }

            const logLevel = $('#filterActivityLevel').val();
            if (logLevel && logLevel !== 'all') {
                params.logLevel = logLevel;
            }

            const requestType = $('#filterActivityRequestType').val();
            if (requestType && requestType !== 'all') {
                params.requestType = requestType;
            }

            if (activityRange.start) {
                params.startDate = formatActivityRangeBoundary(activityRange.start, false);
            }

            if (activityRange.end) {
                params.endDate = formatActivityRangeBoundary(activityRange.end, true);
            }

            $.ajax({
                url: `${baseApiUrl}/api/ActivityLog/GetActivityLogs`,
                type: 'GET',
                data: params,
                success: function (response) {
                    if (response && response.status === 200 && response.data) {
                        const result = response.data;
                        const logs = result.data || [];

                        // Cache rows for the details popup, and grow the
                        // Users filter with the users seen in the results
                        // (same approach as MenuOptics)
                        logs.forEach(log => {
                            activityLogCache[log.logId] = log;
                            addActivityUserOption(log);
                        });

                        updateActivityStats(result);

                        callback({
                            draw: result.draw || data.draw,
                            recordsTotal: result.recordsTotal || 0,
                            recordsFiltered: result.recordsFiltered || 0,
                            data: logs
                        });
                    } else {
                        callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    }
                },
                error: function () {
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                }
            });
        },
        columns: [
            {
                data: null,
                render: function (data, type, row) {
                    const name = escapeActivityHtml(row.fullName || 'Unknown');
                    const username = row.username ? ` <span style="font-size: 12px; color: #64748b;">(${escapeActivityHtml(row.username)})</span>` : '';
                    const email = row.email ? `<div style="font-size: 11px; color: #94a3b8;">${escapeActivityHtml(row.email)}</div>` : '';
                    return `<div><strong style="color: #0f172a;">${name}</strong>${username}${email}</div>`;
                }
            },
            {
                data: 'ipAddress',
                render: function (data) {
                    return data
                        ? `<code style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155;">${escapeActivityHtml(data)}</code>`
                        : 'N/A';
                }
            },
            {
                data: 'deviceId',
                render: function (data) {
                    return data
                        ? `<code style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155;">${escapeActivityHtml(data)}</code>`
                        : 'N/A';
                }
            },
            {
                data: 'requestType',
                render: function (data) {
                    const parsed = parseActivityRequestType(data);
                    if (!parsed.method) {
                        return escapeActivityHtml(data || 'N/A');
                    }
                    return `<div style="display: flex; align-items: center; gap: 6px;">
                                <span class="badge ${getActivityMethodBadgeClass(parsed.method)}">${parsed.method}</span>
                                <span style="font-family: monospace; font-size: 12px; color: #1e293b;">${escapeActivityHtml(parsed.action)}</span>
                            </div>`;
                }
            },
            {
                data: 'logLevel',
                render: function (data) {
                    return getActivityStatusBadge(data);
                }
            },
            {
                data: 'timeStamp',
                render: function (data) {
                    return `<span style="font-size: 12px; color: #64748b;">${formatActivityDateTime(data)}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data, type, row) {
                    return `
                        <div class="action-btns">
                            <button class="action-btn view activity-log-details" data-id="${row.logId}" title="View details">
                                <i style="width: 18px;" data-lucide="eye"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        drawCallback: function () {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    });
}

function updateActivityStats(result) {
    $('#statTotalLogs').text((result.recordsTotal || 0).toLocaleString());
    $('#statSuccessLogs').text((result.totalSuccessCount || 0).toLocaleString());
    $('#statErrorLogs').text((result.totalErrorCount || 0).toLocaleString());
    $('#statWarningLogs').text((result.totalWarningCount || 0).toLocaleString());
}

// The API has no combined users list, so the Users filter is built from the
// users that appear in the loaded log rows (same approach as MenuOptics,
// which also adds users from incoming rows)
function addActivityUserOption(log) {
    if (!log || !log.userId) return;

    const $filter = $('#filterActivityUser');
    if ($filter.find(`option[value="${log.userId}"]`).length > 0) return;

    const label = log.fullName && log.username
        ? `${log.fullName} (${log.username})`
        : (log.fullName || log.username || `User #${log.userId}`);
    $filter.append(new Option(label, log.userId));

    if ($filter.data('customSelect')) {
        $filter.customSelect('refresh');
    }
}

function loadActivityEndpoints() {
    ajaxRequest({
        url: `${baseApiUrl}/api/ActivityLog/GetEndpoints`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            const endpoints = (response && response.data) || [];
            const $filter = $('#filterActivityRequestType');
            const currentValue = $filter.val();

            // Stored request types can carry a concrete id at the end
            // ("PUT /api/Inventory/12") - filter on the id-less form,
            // exactly like MenuOptics does
            const unique = new Map();
            endpoints.forEach(endpoint => {
                if (!endpoint) return;
                const value = String(endpoint).trim().replace(/\/\d+$/, '');
                if (value && !unique.has(value)) {
                    unique.set(value, parseActivityRequestType(value).label);
                }
            });

            $filter.empty().append(new Option('All Endpoints', 'all'));
            Array.from(unique.entries())
                .sort((a, b) => a[1].localeCompare(b[1]))
                .forEach(([value, label]) => $filter.append(new Option(label, value)));

            if (currentValue && currentValue !== 'all') {
                $filter.val(currentValue);
            }
            if ($filter.data('customSelect')) {
                $filter.customSelect('refresh');
            }
        },
        onError: () => { }
    });
}

function viewActivityLogDetails(logId) {
    const log = activityLogCache[logId];
    if (!log) return;

    const parsed = parseActivityRequestType(log.requestType);

    const chips = [
        `<span class="activity-chip"><strong>Log:</strong> #${log.logId}</span>`,
        `<span class="activity-chip"><strong>User:</strong> ${escapeActivityHtml(log.fullName || '')} (${escapeActivityHtml(log.username || '')})</span>`
    ];
    if (log.email) {
        chips.push(`<span class="activity-chip">${escapeActivityHtml(log.email)}</span>`);
    }
    if (log.ipAddress) {
        chips.push(`<span class="activity-chip"><strong>IP:</strong> ${escapeActivityHtml(log.ipAddress)}</span>`);
    }
    if (log.deviceId) {
        chips.push(`<span class="activity-chip"><strong>Device:</strong> ${escapeActivityHtml(log.deviceId)}</span>`);
    }
    chips.push(`<span class="activity-chip"><strong>Action:</strong> ${escapeActivityHtml(parsed.label || 'N/A')}</span>`);
    chips.push(getActivityStatusBadge(log.logLevel));

    const bodyHtml = `
        <style>
            .activity-chip { display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; color: #334155; border-radius: 999px; padding: 4px 11px; font-size: 12px; }
            .activity-json-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
            .activity-json-title { font-size: 13px; font-weight: 600; color: #0f172a; }
            .activity-json { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; max-height: 300px; overflow: auto; margin: 0; }
            .activity-copy-btn { background: none; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 10px; font-size: 12px; cursor: pointer; color: #374151; }
            .activity-copy-btn:hover { background: #f1f5f9; }
        </style>
        <p style="margin: 0 0 14px; color: #6b7280; font-size: 13px;">${formatActivityDateTime(log.timeStamp)}</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px;">
            ${chips.join('')}
        </div>
        <div style="margin-bottom: 18px;">
            <div class="activity-json-header">
                <span class="activity-json-title">Request Payload</span>
                <button type="button" class="activity-copy-btn" data-target="activityLogPayload">Copy Payload</button>
            </div>
            <pre class="activity-json" id="activityLogPayload"></pre>
        </div>
        <div>
            <div class="activity-json-header">
                <span class="activity-json-title">Response Output</span>
                <button type="button" class="activity-copy-btn" data-target="activityLogResponse">Copy Response</button>
            </div>
            <pre class="activity-json" id="activityLogResponse"></pre>
        </div>
    `;

    $.dynamicModal({
        title: "Activity Log Details",
        // Reusable centred layout from the shared modal component
        centered: true,
        bodyHtml: bodyHtml,
        buttons: [
            { text: "Close", class: "btn-primary", action: "close" }
        ]
    });

    // Set as text (not HTML) so payload markup can never break the popup
    $('#activityLogPayload').text(formatActivityJson(log.payload));
    $('#activityLogResponse').text(formatActivityJson(log.response));
}

// "POST /api/Inventory/12" -> { method: "POST", action: "Inventory", label: "POST Inventory" }
function parseActivityRequestType(requestType) {
    const text = String(requestType || '').trim();
    if (!text) return { method: '', action: '', label: '' };

    const parts = text.split(/\s+/);
    const method = (parts[0] || '').toUpperCase();
    const path = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const segments = path.split('/').filter(Boolean);
    const action = segments.slice().reverse().find(segment => !/^\d+$/.test(segment)) || path || 'N/A';

    return {
        method: method,
        action: action,
        label: method ? `${method} ${action}` : action
    };
}

function getActivityMethodBadgeClass(method) {
    switch ((method || '').toUpperCase()) {
        case 'GET': return 'badge-light-info';
        case 'POST': return 'badge-light-primary';
        case 'PUT':
        case 'PATCH': return 'badge-light-warning';
        case 'DELETE': return 'badge-light-danger';
        default: return 'badge-light-secondary';
    }
}

function getActivityStatusBadge(level) {
    const lvl = (level || 'Info').trim();
    const l = lvl.toLowerCase();
    const cls = l === 'success' ? 'badge-light-primary'
        : l === 'error' ? 'badge-light-danger'
        : l === 'warning' ? 'badge-light-warning'
        : 'badge-light-secondary';
    return `<span class="badge ${cls}">${escapeActivityHtml(lvl)}</span>`;
}

function refreshActivityFilterSelects() {
    ['#filterActivityUser', '#filterActivityLevel', '#filterActivityRequestType'].forEach(selector => {
        const $select = $(selector);
        if ($select.data('customSelect')) {
            $select.customSelect('refresh');
        }
    });
}

function getActivityDefaultRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { start: start, end: end };
}

function formatActivityRangeBoundary(date, isEnd) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T${isEnd ? '23:59:59' : '00:00:00'}`;
}

// The picker has no reset API, so Clear restores its label the same way
// the picker's own updateTrigger renders it (the Dashboard's Reset keeps
// its range in its own state the same way)
function setActivityRangeTriggerText() {
    const fmt = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    $('#activityDateRange').html(`📅 <span class="date-text">${fmt(activityRange.start)} - ${fmt(activityRange.end)}</span>`);
}

function formatActivityDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        return new Date(dateStr).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function formatActivityJson(raw) {
    if (!raw) return 'No data recorded.';
    try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(raw);
    }
}

function escapeActivityHtml(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
