let taxRatesTable;
let taxRatesCache = {};
let storekeepersCache = [];

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    const val = $('#filterStorekeeper').val();
    return val || AuthHelper.getStorekeeperId() || null;
}

$(document).ready(() => {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Managing tax rates for ${storeName}`);
        }
    }

    $('#taxRateSearch').on('input', function () {
        if (taxRatesTable) {
            taxRatesTable.search(this.value).draw();
        }
    });

    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        initializeDataTable();
    });

    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing tax rates for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        if (taxRatesTable) {
            taxRatesTable.ajax.reload();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        if (taxRatesTable) {
            taxRatesTable.ajax.reload();
        }
    });
});

function fetchStorekeepers() {
    return new Promise(resolve => {
        $.get(baseApiUrl + '/api/Storekeeper', { PageNumber: 1, PageSize: 100 }, (res) => {
            if (res && res.status === 200 && res.data && res.data.items) {
                storekeepersCache = res.data.items;
            }
            resolve();
        }).fail(() => resolve());
    });
}

function populateStorekeeperFilter() {
    const skSelect = $('#filterStorekeeper');
    skSelect.empty();

    if (AuthHelper.isStorekeeper()) {
        const skId = getActiveStorekeeperId() || '';
        const skName = AuthHelper.getStoreName() || 'My Store';
        skSelect.append(new Option(skName, skId, true, true));
        skSelect.closest('.custom-select-container, select').hide();
    } else {
        if (storekeepersCache.length === 0) {
            skSelect.append(new Option('No Storekeepers Found', ''));
        } else {
            storekeepersCache.forEach((sk, idx) => {
                const displayName = sk.storeName || sk.fullName || `Storekeeper #${sk.id}`;
                const isFirst = idx === 0;
                const opt = new Option(displayName, sk.id, isFirst, isFirst);
                skSelect.append(opt);
            });
        }
        if (typeof $.fn.customSelect === 'function') {
            $(skSelect).customSelect({ placeholder: 'Select Storekeeper', searchable: true, searchableThreshold: 0 });
        }
    }
}

function initializeDataTable() {
    taxRatesTable = $('#taxRatesTable').DataTable({
        processing: true,
        serverSide: false, // GetAll returns a flat array
        searching: true,
        ordering: true,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No tax rates found for selected storekeeper",
            zeroRecords: "No matching tax rates found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const storekeeperId = getActiveStorekeeperId();

            if (!storekeeperId) {
                callback({ data: [] });
                return;
            }

            ajaxRequest({
                url: `${baseApiUrl}/api/TaxRate/${storekeeperId}`,
                method: 'GET',
                showMessage: false,
                onSuccess: function (response) {
                    if (response && response.status === 200 && response.data) {
                        const items = Array.isArray(response.data) ? response.data : (response.data.items || []);
                        taxRatesCache = {};
                        items.forEach(t => {
                            taxRatesCache[t.id] = t;
                        });
                        callback({ data: items });
                    } else {
                        callback({ data: [] });
                    }
                },
                onError: function () {
                    callback({ data: [] });
                }
            });
        },
        columns: [
            {
                data: 'name',
                render: d => `<strong>${escapeHtml(d || 'N/A')}</strong>`
            },
            {
                data: 'rate',
                render: d => `<span class="badge" style="background: rgba(34, 197, 94, 0.1); color: #16a34a; font-weight: 600; padding: 4px 8px; border-radius: 6px;">${parseFloat(d || 0).toFixed(2)}%</span>`
            },
            {
                data: 'createdAt',
                render: d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
            },
            {
                data: 'updatedAt',
                render: d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '<span class="status-badge inactive">Never</span>'
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data, type, row) {
                    return `
                        <div class="action-btns">
                            <button type="button" class="action-btn edit" data-id="${row.id}" title="Edit Tax Rate">
                                <i style="width: 18px;" data-lucide="square-pen"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        drawCallback: function () {
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    });
}

// -----------------------------------------------------------------------------
// ADD TAX RATE
// -----------------------------------------------------------------------------
$('#btnAddNewTaxRate').click(function () {
    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "warning");
        return;
    }

    $.dynamicModal({
        title: "Add New Tax Rate",
        bodyHtml: $('#taxRateFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Tax Rate", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewTaxRate();
                return false;
            }
        }
    });
});

function addNewTaxRate() {
    const name = $('#taxName').val().trim();
    const rateVal = $('#taxRateValue').val().trim();

    if (!name) {
        showNotification("Tax rate name is required.", "error");
        $('#taxName').focus();
        return;
    }

    if (rateVal === '' || isNaN(rateVal) || Number(rateVal) < 0) {
        showNotification("Please enter a valid tax rate percentage.", "error");
        $('#taxRateValue').focus();
        return;
    }

    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "error");
        return;
    }

    const payload = {
        name: name,
        rate: parseFloat(rateVal)
    };

    showNotification("Creating tax rate...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/TaxRate?storekeeperId=${storekeeperId}`,
        method: 'POST',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200 || response.status === 201) {
                $.dynamicModal.close();
                showNotification(`Tax rate "${name}" created successfully!`, "success");
                if (taxRatesTable) {
                    taxRatesTable.ajax.reload(null, false);
                }
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create tax rate.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// EDIT TAX RATE
// -----------------------------------------------------------------------------
$(document).on('click', '#taxRatesTable .action-btn.edit', function () {
    const id = $(this).data('id');
    const tax = taxRatesCache[id] || {};

    const editFormHtml = `
        <form id="frmEditTaxRate">
            <div class="form-group">
                <label>Tax Name <span style="color: red;">*</span></label>
                <input type="text" id="editTaxName" value="${escapeHtml(tax.name || '')}" placeholder="e.g. GST, VAT" required>
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Rate (%) <span style="color: red;">*</span></label>
                <input type="number" id="editTaxRateValue" step="0.01" min="0" max="100" value="${tax.rate !== undefined ? tax.rate : ''}" placeholder="e.g. 5, 10, 16.5" required>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Edit Tax Rate",
        bodyHtml: editFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Tax Rate", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                updateTaxRate(id);
                return false;
            }
        }
    });
});

function updateTaxRate(id) {
    const name = $('#editTaxName').val().trim();
    const rateVal = $('#editTaxRateValue').val().trim();

    if (!name) {
        showNotification("Tax rate name is required.", "error");
        $('#editTaxName').focus();
        return;
    }

    if (rateVal === '' || isNaN(rateVal) || Number(rateVal) < 0) {
        showNotification("Please enter a valid tax rate percentage.", "error");
        $('#editTaxRateValue').focus();
        return;
    }

    const payload = {
        name: name,
        rate: parseFloat(rateVal)
    };

    showNotification("Updating tax rate...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/TaxRate/${id}`,
        method: 'PUT',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                showNotification("Tax rate updated successfully!", "success");
                if (taxRatesTable) {
                    taxRatesTable.ajax.reload(null, false);
                }
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update tax rate.";
            showNotification(msg, "error");
        }
    });
}

