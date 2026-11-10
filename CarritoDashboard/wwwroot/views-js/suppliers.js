let suppliersTable;
let suppliersCache = {};
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
            $('.page-subtitle').text(`Managing suppliers for ${storeName}`);
        }
    }

    $('#supplierSearch').on('input', function () {
        if (suppliersTable) {
            suppliersTable.search(this.value).draw();
        }
    });

    // Load Storekeepers then initialize DataTable (matching Categories module sequence)
    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        initializeDataTable();
    });

    // Handle storekeeper ready event
    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing suppliers for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        if (suppliersTable) {
            suppliersTable.ajax.reload();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        if (suppliersTable) {
            suppliersTable.ajax.reload();
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
        // Hide select container for storekeepers
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
    suppliersTable = $('#suppliersTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No suppliers found for selected storekeeper",
            zeroRecords: "No matching suppliers found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const pageSize = data.length;
            const pageNumber = (data.start / data.length) + 1;
            const searchValue = data.search.value;
            const storekeeperId = getActiveStorekeeperId();

            if (!storekeeperId) {
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                return;
            }

            $.ajax({
                url: baseApiUrl + '/api/Supplier',
                type: 'GET',
                data: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                    Search: searchValue,
                    storekeeperId: storekeeperId
                },
                success: function (response) {
                    if (response.status === 200 && response.data) {
                        suppliersCache = {};
                        (response.data.items || []).forEach(s => {
                            suppliersCache[s.id] = s;
                        });
                        callback({
                            draw: data.draw,
                            recordsTotal: response.data.totalRecords || 0,
                            recordsFiltered: response.data.totalRecords || 0,
                            data: response.data.items || []
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
                data: 'name',
                render: d => `<strong>${escapeHtml(d || 'N/A')}</strong>`
            },
            {
                data: 'phone',
                render: d => d ? `<a href="tel:${escapeHtml(d)}" style="color: inherit; text-decoration: none;">${escapeHtml(d)}</a>` : '<span style="color: #94a3b8;">-</span>'
            },
            {
                data: 'email',
                render: d => d ? `<a href="mailto:${escapeHtml(d)}" style="color: inherit; text-decoration: none;">${escapeHtml(d)}</a>` : '<span style="color: #94a3b8;">-</span>'
            },
            {
                data: 'address',
                render: d => d ? escapeHtml(d) : '<span style="color: #94a3b8;">-</span>'
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
                            <button type="button" class="action-btn edit" data-id="${row.id}" title="Edit Supplier">
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
// ADD NEW SUPPLIER
// -----------------------------------------------------------------------------
$('#btnAddNewSupplier').click(function () {
    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "warning");
        return;
    }

    $.dynamicModal({
        title: "Add New Supplier",
        bodyHtml: $('#supplierFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Supplier", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewSupplier();
                return false;
            }
        }
    });
});

function addNewSupplier() {
    const name = $('#supName').val().trim();
    const phone = $('#supPhone').val().trim();
    const email = $('#supEmail').val().trim();
    const address = $('#supAddress').val().trim();

    if (!name) {
        showNotification("Supplier name is required.", "error");
        $('#supName').focus();
        return;
    }

    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "error");
        return;
    }

    const payload = {
        storekeeperId: parseInt(storekeeperId, 10),
        name: name,
        phone: phone || null,
        email: email || null,
        address: address || null
    };

    showNotification("Creating supplier...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Supplier`,
        method: 'POST',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 201 || response.status === 200) {
                $.dynamicModal.close();
                showNotification(`Supplier "${name}" created successfully!`, "success");
                if (suppliersTable) {
                    suppliersTable.ajax.reload(null, false);
                }
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create supplier.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// EDIT SUPPLIER
// -----------------------------------------------------------------------------
$(document).on('click', '#suppliersTable .action-btn.edit', function () {
    const id = $(this).data('id');
    const sup = suppliersCache[id] || {};

    const editFormHtml = `
        <form id="frmEditSupplier">
            <div class="form-group">
                <label>Supplier Name <span style="color: red;">*</span></label>
                <input type="text" id="editSupName" value="${escapeHtml(sup.name || '')}" placeholder="Enter Supplier Name" required>
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Phone Number</label>
                <input type="tel" id="editSupPhone" value="${escapeHtml(sup.phone || '')}" placeholder="e.g. +92 300 1234567">
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Email Address</label>
                <input type="email" id="editSupEmail" value="${escapeHtml(sup.email || '')}" placeholder="e.g. supplier@domain.com">
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label>Address</label>
                <textarea id="editSupAddress" rows="2" placeholder="e.g. Shop #12, Wholesale Market, Karachi" style="width: 100%; resize: vertical;">${escapeHtml(sup.address || '')}</textarea>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Edit Supplier",
        bodyHtml: editFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Supplier", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                updateSupplier(id);
                return false;
            }
        }
    });
});

function updateSupplier(id) {
    const name = $('#editSupName').val().trim();
    const phone = $('#editSupPhone').val().trim();
    const email = $('#editSupEmail').val().trim();
    const address = $('#editSupAddress').val().trim();

    if (!name) {
        showNotification("Supplier name is required.", "error");
        $('#editSupName').focus();
        return;
    }

    const payload = {
        name: name,
        phone: phone || null,
        email: email || null,
        address: address || null
    };

    showNotification("Updating supplier...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Supplier/${id}`,
        method: 'PUT',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                showNotification("Supplier updated successfully!", "success");
                if (suppliersTable) {
                    suppliersTable.ajax.reload(null, false);
                }
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update supplier.";
            showNotification(msg, "error");
        }
    });
}
