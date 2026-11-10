let allSettings = [];

$(document).ready(() => {
    loadSettings();

    $(document).on('click', '.settings-nav-item', function () {
        $('.settings-nav-item').removeClass('active');
        $('.settings-panel').removeClass('active');

        $(this).addClass('active');

        const targetId = $(this).data('target');
        $(`#${targetId}`).addClass('active');
    });

    $(document).on('click', '.btn-save, #btnGlobalSave', function () {
        const activePanel = $('.settings-panel.active');
        if (activePanel.length) {
            const key = activePanel.data('key');
            saveSetting(key);
        } else {
            showNotification("Please select a setting to save", "warning");
        }
    });
});

function loadSettings() {
    ajaxRequest({
        url: `${baseApiUrl}/api/Setting`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200) {
                allSettings = response.data;
                renderSettingsLayout(response.data);
            } else {
                showNotification("Failed to load settings", "error");
            }
        }
    });
}

function renderSettingsLayout(settings) {
    const $sidebar = $('#settingsSidebar');
    const $content = $('#settingsContent');

    $sidebar.empty();
    $content.empty();

    settings.forEach((setting, index) => {
        const isActive = index === 0;
        const key = setting.key;
        const cleanKey = key.replace(/\s+/g, '');
        const panelId = `settings-${cleanKey}`;
        const iconName = getIconForKey(key);

        $sidebar.append(`
            <button class="settings-nav-item ${isActive ? 'active' : ''}" data-target="${panelId}">
                <i data-lucide="${iconName}"></i>
                <span>${formatKeyName(key)}</span>
            </button>
        `);

        let value = setting.value;
        let isJson = false;
        let parsedValue = null;

        try {
            parsedValue = JSON.parse(value);
            if (Array.isArray(parsedValue) && parsedValue.length > 0 && typeof parsedValue[0] === 'object') {
                isJson = true;
            }
        } catch (e) {
            isJson = false;
        }

        let innerContentHtml = isJson ? renderDynamicTable(key, parsedValue) : renderSimpleInput(key, value);

        $content.append(`
            <div class="settings-panel ${isActive ? 'active' : ''}" 
                 id="${panelId}" 
                 data-key="${key}"
                 data-type="${isJson ? 'json-table' : 'simple'}">
                <h2 class="settings-title">${formatKeyName(key)}</h2>
                <div class="panel-body">
                    ${innerContentHtml}
                </div>
            </div>
        `);
    });

    lucide?.createIcons();
}

// --- Helpers ---

function getIconForKey(key) {
    const k = key.toLowerCase();
    if (k.includes('delivery')) return 'truck';
    if (k.includes('store') || k.includes('shop')) return 'store';
    if (k.includes('pay')) return 'credit-card';
    if (k.includes('notif')) return 'bell';
    if (k.includes('user') || k.includes('auth')) return 'users';
    if (k.includes('radius') || k.includes('map')) return 'map-pin';
    return 'sliders-horizontal';
}

function formatKeyName(key) {
    return key.replace(/([A-Z])/g, ' $1').trim();
}

// --- Rendering Logic ---

function renderSimpleInput(key, value) {
    return `
        <div class="form-group">
            <label>Value <span class="required">*</span></label>
            <textarea class="form-control" id="input-${key}" rows="4" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px;">${value || ''}</textarea>
        </div>
    `;
}

function renderDynamicTable(key, jsonArray) {
    if (!jsonArray || jsonArray.length === 0) return '<p>No data found.</p>';

    const columns = Object.keys(jsonArray[0]);

    let thead = '<thead><tr>';
    columns.forEach(col => thead += `<th>${formatKeyName(col).toUpperCase()} <span class="required">*</span></th>`);
    thead += '<th style="width:50px;"></th></tr></thead>';

    let tbody = `<tbody id="tbody-${key}">`;
    jsonArray.forEach(row => tbody += generateRowHtml(columns, row));
    tbody += '</tbody>';

    return `
        <div class="form-group">
            <div class="dynamic-table-wrapper table-container">
                <table class="dynamic-table data-table" id="table-${key}" data-columns='${JSON.stringify(columns)}'>
                    ${thead}
                    ${tbody}
                </table>
                <div style="background:#f8fafc; padding:10px; border-top:1px solid #e2e8f0;">
                    <button class="btn-outline" onclick="addTableRow('${key}')">
                        <i data-lucide="plus" style="width:14px;"></i> Add Row
                    </button>
                </div>
            </div>
        </div>
    `;
}

function generateRowHtml(columns, rowData = {}) {
    let tr = '<tr>';
    columns.forEach(col => {
        const val = rowData[col] !== undefined ? rowData[col] : '';
        tr += `<td><input type="text" data-col="${col}" value="${val}"></td>`;
    });

    tr += `<td>
           <button class="action-btn delete btn-remove-row" type="button" onclick="deleteRowWithConfirm(this)">
                <i style="width: 18px;" data-lucide="trash"></i>
           </button>
           </td></tr>`;
    return tr;
}

function addTableRow(key) {
    const $table = $(`#table-${key}`);
    const columns = $table.data('columns');
    $(`#tbody-${key}`).append(generateRowHtml(columns));
    lucide?.createIcons();
}

// --- Delete & Confirmation Logic ---

function deleteRowWithConfirm(btnElement) {
    $.confirmDialog({
        title: "Delete Value",
        message: "Are you sure you want to delete this value?",
        confirmText: "Delete",
        cancelText: "Cancel",
        onConfirm: function () {
            $(btnElement).closest('tr').remove();
        },
        onCancel: function () {
            console.log("Cancelled");
        }
    });
}


// --- Save Logic ---

function saveSetting(key) {
    const $panel = $(`.settings-panel[data-key="${key}"]`);
    const type = $panel.data('type');
    let finalValue = "";
    let hasError = false;

    $panel.find('input, textarea').css('border-color', '#ddd');

    if (type === 'simple') {
        const $input = $(`#input-${key}`);
        const rawVal = $input.val();

        if (!rawVal || rawVal.trim() === '') {
            $input.css('border-color', 'red');
            showNotification("Field is required!", "error");
            return;
        }

        finalValue = rawVal;
    } else {
        const data = [];

        $(`#tbody-${key} tr`).each(function () {
            let rowObj = {};

            $(this).find('input').each(function () {
                const $el = $(this);
                const col = $el.data('col');
                let val = $el.val();

                if (val === null || val.trim() === '') {
                    hasError = true;
                } else {
                    if (!isNaN(val) && val !== '') val = Number(val);
                    rowObj[col] = val;
                }
            });
            data.push(rowObj);
        });

        if (hasError) {
            showNotification("All fields in the table are required.", "error");
            return;
        }

        finalValue = JSON.stringify(data);
    }

    const url = `${baseApiUrl}/api/Setting?key=${encodeURIComponent(key)}&value=${encodeURIComponent(finalValue)}`;

    ajaxRequest({
        url: url,
        method: 'PUT',
        showMessage: true,
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update setting.";
            showNotification(msg, "error");
        }
    });
}