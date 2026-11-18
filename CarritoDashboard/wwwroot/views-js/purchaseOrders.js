let poTable;
let poCache = {};
let storekeepersCache = [];
let suppliersCache = [];
let inventoryItemsCache = [];
let taxRatesCache = [];

const PO_STATUS_MAP = {
    1: { text: "Draft", class: "status-badge new", color: "#64748b", bg: "#f1f5f9" },
    2: { text: "Sent", class: "status-badge preparing", color: "#0284c7", bg: "#e0f2fe" },
    3: { text: "Partial", class: "status-badge delivery", color: "#d97706", bg: "#fef3c7" },
    4: { text: "Received", class: "status-badge completed", color: "#16a34a", bg: "#dcfce7" },
    5: { text: "Cancelled", class: "status-badge inactive", color: "#dc2626", bg: "#fee2e2" }
};

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
            $('.page-subtitle').text(`Managing purchase orders for ${storeName}`);
        }
    }

    $('#poSearch').on('input', function () {
        if (poTable) {
            poTable.search(this.value).draw();
        }
    });

    $('#filterStatus, #filterSupplier').on('change', function () {
        if (poTable) {
            poTable.ajax.reload();
        }
    });

    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        loadStorekeeperDependencies().then(() => {
            initializeDataTable();
        });
    });

    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing purchase orders for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        loadStorekeeperDependencies().then(() => {
            if (poTable) poTable.ajax.reload();
        });
    });

    $('#filterStorekeeper').on('change', function () {
        loadStorekeeperDependencies().then(() => {
            if (poTable) poTable.ajax.reload();
        });
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

function loadStorekeeperDependencies() {
    const skId = getActiveStorekeeperId();
    if (!skId) return Promise.resolve();

    return Promise.all([
        // Suppliers
        new Promise(resolve => {
            $.get(`${baseApiUrl}/api/Supplier`, { storekeeperId: skId, PageNumber: 1, PageSize: 200 }, (res) => {
                suppliersCache = (res && res.status === 200 && res.data && res.data.items) ? res.data.items : [];
                const suppSelect = $('#filterSupplier');
                suppSelect.empty().append('<option value="">All Suppliers</option>');
                suppliersCache.forEach(s => {
                    suppSelect.append(new Option(s.name, s.id));
                });
                resolve();
            }).fail(() => resolve());
        }),
        // Inventory Items
        new Promise(resolve => {
            $.get(`${baseApiUrl}/api/Inventory/storekeeper/${skId}`, { PageNumber: 1, PageSize: 500 }, (res) => {
                inventoryItemsCache = (res && res.status === 200 && res.data && res.data.items) ? res.data.items : [];
                resolve();
            }).fail(() => resolve());
        }),
        // Tax Rates
        new Promise(resolve => {
            $.get(`${baseApiUrl}/api/TaxRate/${skId}`, (res) => {
                if (res && res.status === 200 && res.data) {
                    taxRatesCache = Array.isArray(res.data) ? res.data : (res.data.items || []);
                } else {
                    taxRatesCache = [];
                }
                resolve();
            }).fail(() => resolve());
        })
    ]);
}

function initializeDataTable() {
    poTable = $('#purchaseOrdersTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No purchase orders found",
            zeroRecords: "No matching purchase orders found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const storekeeperId = getActiveStorekeeperId();
            if (!storekeeperId) {
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                return;
            }

            const pageSize = data.length;
            const pageNumber = (data.start / data.length) + 1;
            const searchValue = data.search.value;
            const statusVal = $('#filterStatus').val();
            const supplierVal = $('#filterSupplier').val();

            const params = {
                storekeeperId: storekeeperId,
                PageNumber: pageNumber,
                PageSize: pageSize,
                Search: searchValue
            };
            if (statusVal) params.status = parseInt(statusVal, 10);
            if (supplierVal) params.supplierId = parseInt(supplierVal, 10);

            ajaxRequest({
                url: `${baseApiUrl}/api/PurchaseOrder`,
                method: 'GET',
                data: params,
                isQuery: true,
                showMessage: false,
                onSuccess: function (response) {
                    if (response && response.status === 200 && response.data) {
                        poCache = {};
                        const items = response.data.items || [];
                        items.forEach(po => {
                            poCache[po.id] = po;
                        });
                        callback({
                            draw: data.draw,
                            recordsTotal: response.data.totalRecords || 0,
                            recordsFiltered: response.data.totalRecords || 0,
                            data: items
                        });
                    } else {
                        callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    }
                },
                onError: function () {
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                }
            });
        },
        columns: [
            {
                data: 'supplierName',
                render: d => `<strong>${escapeHtml(d || 'N/A')}</strong>`
            },
            {
                data: 'supplierInvoiceNo',
                render: d => d ? escapeHtml(d) : '<span style="color: #94a3b8;">-</span>'
            },
            {
                data: 'subtotal',
                render: d => `Rs. ${parseFloat(d || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            },
            {
                data: 'tax',
                render: d => `Rs. ${parseFloat(d || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            },
            {
                data: 'grandTotal',
                render: d => `<strong style="color: #0f172a;">Rs. ${parseFloat(d || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>`
            },
            {
                data: 'status',
                render: function (data) {
                    const s = PO_STATUS_MAP[data] || { text: 'Unknown', color: '#64748b', bg: '#f1f5f9' };
                    return `<span class="badge" style="background: ${s.bg}; color: ${s.color}; font-weight: 600; padding: 4px 10px; border-radius: 6px;">${s.text}</span>`;
                }
            },
            {
                data: 'invoiceFilePath',
                render: function (d) {
                    if (!d) return '<span style="color: #94a3b8;">None</span>';
                    const url = d.startsWith('http') ? d : `${baseApiUrl}/${d}`;
                    return `<a href="${url}" target="_blank" class="action-btn view" title="View Invoice" style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: #e0f2fe; color: #0284c7; text-decoration: none;"><i style="width: 15px;" data-lucide="file-text"></i></a>`;
                }
            },
            {
                data: 'createdAt',
                render: d => d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '-'
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data, type, row) {
                    const isDraftOrSent = row.status === 1 || row.status === 2;
                    const canReceive = row.status === 1 || row.status === 2 || row.status === 3;
                    return `
                        <div class="action-btns">
                            <button type="button" class="action-btn view btn-view-po" data-id="${row.id}" title="View Details">
                                <i style="width: 18px;" data-lucide="eye"></i>
                            </button>
                            ${isDraftOrSent ? `
                            <button type="button" class="action-btn edit btn-edit-po" data-id="${row.id}" title="Edit PO">
                                <i style="width: 18px;" data-lucide="square-pen"></i>
                            </button>` : ''}
                            ${canReceive ? `
                            <button type="button" class="action-btn btn-receive-po" data-id="${row.id}" title="Receive Goods" style="color: #16a34a; background: rgba(34, 197, 94, 0.1);">
                                <i style="width: 18px;" data-lucide="package-check"></i>
                            </button>` : ''}
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
// VIEW PURCHASE ORDER DETAILS
// -----------------------------------------------------------------------------
$(document).on('click', '.btn-view-po', function () {
    const id = $(this).data('id');
    const po = poCache[id];
    if (!po) return;

    showNotification("Loading PO details...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/PurchaseOrder/purchaseOrderId`,
        method: 'GET',
        data: { purchaseOrderId: id },
        isQuery: true,
        showMessage: false,
        onSuccess: function (res) {
            const details = (res && res.status === 200 && res.data) ? res.data : po;
            renderPoDetailsModal(details);
        },
        onError: function () {
            renderPoDetailsModal(po);
        }
    });
});

function renderPoDetailsModal(po) {
    const s = PO_STATUS_MAP[po.status] || { text: 'Unknown', color: '#64748b', bg: '#f1f5f9' };
    const dateFormatted = po.createdAt ? new Date(po.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';

    const modalHtml = `
        <div style="padding: 10px 0;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 16px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div>
                    <h3 style="margin: 0 0 4px; color: #0284c7; font-size: 17px;">Purchase Order #PO-${po.id}</h3>
                    <p style="margin: 0 0 2px; font-size: 13px;"><strong>Supplier:</strong> ${escapeHtml(po.supplierName || 'N/A')}</p>
                    <p style="margin: 0; font-size: 13px;"><strong>Invoice No:</strong> ${escapeHtml(po.supplierInvoiceNo || 'N/A')}</p>
                    ${po.invoiceFilePath ? `<p style="margin: 4px 0 0; font-size: 13px;"><a href="${po.invoiceFilePath.startsWith('http') ? po.invoiceFilePath : `${baseApiUrl}/${po.invoiceFilePath}`}" target="_blank" style="color: #0284c7; font-weight: 500;">View Invoice Attachment</a></p>` : ''}
                </div>
                <div style="text-align: right;">
                    <span class="badge" style="background: ${s.bg}; color: ${s.color}; font-weight: 600; padding: 5px 12px; border-radius: 6px; font-size: 13px;">${s.text}</span>
                    <p style="margin: 6px 0 0; color: #64748b; font-size: 12px;">${dateFormatted}</p>
                </div>
            </div>

            <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: flex-end;">
                <div style="width: 280px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Subtotal:</span>
                        <strong>Rs. ${parseFloat(po.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Delivery Charges:</span>
                        <strong>Rs. ${parseFloat(po.deliveryCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Discount:</span>
                        <strong>Rs. ${parseFloat(po.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>Tax:</span>
                        <strong>Rs. ${parseFloat(po.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #cbd5e1; margin-top: 6px; font-size: 15px; color: #0f172a;">
                        <strong>Grand Total:</strong>
                        <strong style="color: #0284c7;">Rs. ${parseFloat(po.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    $.dynamicModal({
        title: `PO #${po.id} Details`,
        centered: true,
        bodyHtml: modalHtml,
        buttons: [
            { text: "Close", class: "btn-outline", action: "close" }
        ]
    });
}

// -----------------------------------------------------------------------------
// ADD NEW PURCHASE ORDER
// -----------------------------------------------------------------------------
let createPoItems = [];

$('#btnAddNewPO').click(function () {
    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "warning");
        return;
    }

    if (suppliersCache.length === 0) {
        showNotification("Please create at least one supplier first.", "warning");
        return;
    }

    if (inventoryItemsCache.length === 0) {
        showNotification("No inventory items found to order. Please add inventory items first.", "warning");
        return;
    }

    createPoItems = [];
    addBlankPoItem();

    const formHtml = `
        <form id="frmCreatePO" style="max-height: calc(92vh - 170px); overflow-y: auto; padding-right: 8px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 14px;">
                <div class="form-group">
                    <label>Supplier <span style="color: red;">*</span></label>
                    <select id="createPoSupplier" class="form-control" required>
                        <option value="">Select Supplier</option>
                        ${suppliersCache.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Supplier Invoice No</label>
                    <input type="text" id="createPoInvoiceNo" class="form-control" placeholder="e.g. INV-9874">
                </div>
                <div class="form-group">
                    <label>Initial Status</label>
                    <select id="createPoStatus" class="form-control">
                        <option value="1" selected>Draft</option>
                        <option value="2">Sent</option>
                        <option value="4">Received</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Invoice File / Receipt (Optional)</label>
                    <input type="file" id="createPoInvoiceFile" class="form-control" accept="image/*,application/pdf">
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 14px; font-weight: 600;">Order Items</h4>
                <button type="button" id="btnAddPoItemRow" class="btn-primary" style="padding: 4px 10px; font-size: 12px;">
                    <i style="width: 14px;" data-lucide="plus"></i> Add Line Item
                </button>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow-x: auto; margin-bottom: 15px;">
                <table class="data-table" style="width: 100%; font-size: 12px; margin: 0;">
                    <thead style="background: #f8fafc;">
                        <tr>
                            <th style="min-width: 180px;">Item *</th>
                            <th style="width: 90px;">Qty *</th>
                            <th style="width: 100px;">Unit Cost *</th>
                            <th style="width: 90px;">Discount</th>
                            <th style="min-width: 120px;">Tax Rate</th>
                            <th style="width: 100px;" class="text-right">Line Total</th>
                            <th style="width: 40px;" class="text-center"></th>
                        </tr>
                    </thead>
                    <tbody id="createPoItemsTableBody"></tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 280px;">
                    <div class="form-group">
                        <label style="font-size: 12px;">Delivery Charges</label>
                        <input type="number" id="createPoDeliveryCharges" class="form-control" step="0.01" min="0" value="0.00">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 12px;">Overall Discount</label>
                        <input type="number" id="createPoOverallDiscount" class="form-control" step="0.01" min="0" value="0.00">
                    </div>
                </div>

                <div style="width: 250px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Items Subtotal:</span>
                        <strong id="calcSubtotal">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Total Tax:</span>
                        <strong id="calcTax">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Delivery:</span>
                        <strong id="calcDelivery">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Discount:</span>
                        <strong id="calcDiscount">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #cbd5e1; margin-top: 4px; font-size: 15px; color: #0284c7;">
                        <strong>Grand Total:</strong>
                        <strong id="calcGrandTotal">Rs. 0.00</strong>
                    </div>
                </div>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Create Purchase Order",
        centered: true,
        bodyHtml: formHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Save Purchase Order", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitCreatePO();
                return false;
            }
        }
    });

    renderCreatePoItems();
    if (window.lucide) lucide.createIcons();

    $('#btnAddPoItemRow').click(function () {
        addBlankPoItem();
        renderCreatePoItems();
    });

    $('#createPoDeliveryCharges, #createPoOverallDiscount').on('input', function () {
        calculatePoTotals();
    });
});

function addBlankPoItem() {
    createPoItems.push({
        inventoryItemId: inventoryItemsCache.length > 0 ? inventoryItemsCache[0].id : '',
        quantityOrdered: 1,
        quantityReceived: 0,
        unitCost: 0,
        discount: 0,
        taxRateId: (taxRatesCache.length > 0 ? taxRatesCache[0].id : ''),
        taxRate: (taxRatesCache.length > 0 ? (taxRatesCache[0].rate || 0) : 0),
        taxName: (taxRatesCache.length > 0 ? (taxRatesCache[0].name || '') : 'None'),
        tax: 0,
        lineTotal: 0
    });
}

function renderCreatePoItems() {
    const $tbody = $('#createPoItemsTableBody');
    $tbody.empty();

    createPoItems.forEach((item, index) => {
        const itemOptions = inventoryItemsCache.map(inv => {
            const isSel = inv.id === Number(item.inventoryItemId);
            return `<option value="${inv.id}" ${isSel ? 'selected' : ''}>${escapeHtml(inv.title)} (Stock: ${inv.stock ?? 0})</option>`;
        }).join('');

        const taxOptions = `
            <option value="" data-rate="0" data-name="Zero Rate">0% (None)</option>
            ${taxRatesCache.map(t => {
                const isSel = Number(t.id) === Number(item.taxRateId);
                return `<option value="${t.id}" data-rate="${t.rate}" data-name="${escapeHtml(t.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)} (${t.rate}%)</option>`;
            }).join('')}
        `;

        const rowHtml = `
            <tr data-index="${index}">
                <td>
                    <select class="form-control po-item-select" data-field="inventoryItemId" style="font-size: 12px; padding: 4px 6px;">
                        ${itemOptions}
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control po-item-input" data-field="quantityOrdered" value="${item.quantityOrdered}" min="1" step="1" style="font-size: 12px; padding: 4px 6px;">
                </td>
                <td>
                    <input type="number" class="form-control po-item-input" data-field="unitCost" value="${item.unitCost}" min="0" step="0.01" style="font-size: 12px; padding: 4px 6px;">
                </td>
                <td>
                    <input type="number" class="form-control po-item-input" data-field="discount" value="${item.discount}" min="0" step="0.01" style="font-size: 12px; padding: 4px 6px;">
                </td>
                <td>
                    <select class="form-control po-tax-select" data-field="taxRateId" style="font-size: 12px; padding: 4px 6px;">
                        ${taxOptions}
                    </select>
                </td>
                <td class="text-right po-line-total-cell" style="font-weight: 600; vertical-align: middle;">
                    Rs. 0.00
                </td>
                <td class="text-center" style="vertical-align: middle;">
                    ${createPoItems.length > 1 ? `
                    <button type="button" class="action-btn delete btn-remove-po-item" data-index="${index}" title="Remove" style="width: 24px; height: 24px;">
                        <i style="width: 14px;" data-lucide="trash-2"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
        $tbody.append(rowHtml);
    });

    if (window.lucide) lucide.createIcons();
    recalculateItemLines();
}

$(document).on('change', '.po-item-select', function () {
    const idx = $(this).closest('tr').data('index');
    createPoItems[idx].inventoryItemId = parseInt($(this).val(), 10);
});

$(document).on('change', '.po-tax-select', function () {
    const idx = $(this).closest('tr').data('index');
    const $opt = $(this).find('option:selected');
    createPoItems[idx].taxRateId = $(this).val();
    createPoItems[idx].taxRate = parseFloat($opt.data('rate')) || 0;
    createPoItems[idx].taxName = $opt.data('name') || '';
    recalculateItemLines();
});

$(document).on('input', '.po-item-input', function () {
    const idx = $(this).closest('tr').data('index');
    const field = $(this).data('field');
    createPoItems[idx][field] = parseFloat($(this).val()) || 0;
    recalculateItemLines();
});

$(document).on('click', '.btn-remove-po-item', function () {
    const idx = $(this).data('index');
    if (createPoItems.length > 1) {
        createPoItems.splice(idx, 1);
        renderCreatePoItems();
    }
});

function recalculateItemLines() {
    let subtotal = 0;
    let totalTax = 0;

    createPoItems.forEach((item, index) => {
        const qty = parseFloat(item.quantityOrdered) || 0;
        const cost = parseFloat(item.unitCost) || 0;
        const discount = parseFloat(item.discount) || 0;
        const rate = parseFloat(item.taxRate) || 0;

        const baseAmount = Math.max(0, (qty * cost) - discount);
        const itemTax = (baseAmount * rate) / 100;
        const lineTotal = baseAmount + itemTax;

        item.tax = itemTax;
        item.lineTotal = lineTotal;

        subtotal += baseAmount;
        totalTax += itemTax;

        $(`#createPoItemsTableBody tr[data-index="${index}"] .po-line-total-cell`)
            .text(`Rs. ${lineTotal.toFixed(2)}`);
    });

    calculatePoTotals(subtotal, totalTax);
}

function calculatePoTotals(subtotal, totalTax) {
    if (subtotal === undefined) {
        subtotal = createPoItems.reduce((acc, it) => acc + (Math.max(0, (it.quantityOrdered * it.unitCost) - it.discount)), 0);
        totalTax = createPoItems.reduce((acc, it) => acc + (it.tax || 0), 0);
    }

    const delivery = parseFloat($('#createPoDeliveryCharges').val()) || 0;
    const overallDiscount = parseFloat($('#createPoOverallDiscount').val()) || 0;

    const grandTotal = Math.max(0, subtotal + totalTax + delivery - overallDiscount);

    $('#calcSubtotal').text(`Rs. ${subtotal.toFixed(2)}`);
    $('#calcTax').text(`Rs. ${totalTax.toFixed(2)}`);
    $('#calcDelivery').text(`Rs. ${delivery.toFixed(2)}`);
    $('#calcDiscount').text(`Rs. ${overallDiscount.toFixed(2)}`);
    $('#calcGrandTotal').text(`Rs. ${grandTotal.toFixed(2)}`);
}

function submitCreatePO() {
    const supplierId = $('#createPoSupplier').val();
    if (!supplierId) {
        showNotification("Please select a supplier.", "error");
        $('#createPoSupplier').focus();
        return;
    }

    if (createPoItems.length === 0) {
        showNotification("Please add at least one line item.", "error");
        return;
    }

    for (let i = 0; i < createPoItems.length; i++) {
        const it = createPoItems[i];
        if (!it.inventoryItemId) {
            showNotification(`Item is required on line ${i + 1}`, "error");
            return;
        }
        if (!it.quantityOrdered || it.quantityOrdered <= 0) {
            showNotification(`Valid ordered quantity is required on line ${i + 1}`, "error");
            return;
        }
        if (it.unitCost === undefined || it.unitCost < 0) {
            showNotification(`Valid unit cost is required on line ${i + 1}`, "error");
            return;
        }
    }

    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Storekeeper is required.", "error");
        return;
    }

    const statusVal = parseInt($('#createPoStatus').val(), 10) || 1;
    const delivery = parseFloat($('#createPoDeliveryCharges').val()) || 0;
    const discount = parseFloat($('#createPoOverallDiscount').val()) || 0;

    let subtotal = 0;
    let totalTax = 0;
    createPoItems.forEach(it => {
        const base = Math.max(0, (it.quantityOrdered * it.unitCost) - it.discount);
        const tx = (base * (it.taxRate || 0)) / 100;
        it.tax = tx;
        it.lineTotal = base + tx;
        if (statusVal === 4) {
            it.quantityReceived = it.quantityOrdered;
        } else {
            it.quantityReceived = 0;
        }
        subtotal += base;
        totalTax += tx;
    });

    const grandTotal = Math.max(0, subtotal + totalTax + delivery - discount);

    const formData = new FormData();
    formData.append('SupplierId', supplierId);
    formData.append('SupplierInvoiceNo', $('#createPoInvoiceNo').val().trim() || '');
    formData.append('Subtotal', subtotal.toFixed(2));
    formData.append('DeliveryCharges', delivery.toFixed(2));
    formData.append('Discount', discount.toFixed(2));
    formData.append('Tax', totalTax.toFixed(2));
    formData.append('GrandTotal', grandTotal.toFixed(2));
    formData.append('Status', statusVal);

    const fileInput = document.getElementById('createPoInvoiceFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('Invoice', fileInput.files[0]);
    }

    createPoItems.forEach((it, i) => {
        formData.append(`PurchaseOrderItems[${i}].InventoryItemId`, it.inventoryItemId);
        formData.append(`PurchaseOrderItems[${i}].QuantityOrdered`, it.quantityOrdered);
        formData.append(`PurchaseOrderItems[${i}].QuantityReceived`, it.quantityReceived);
        formData.append(`PurchaseOrderItems[${i}].UnitCost`, it.unitCost);
        formData.append(`PurchaseOrderItems[${i}].Discount`, it.discount || 0);
        formData.append(`PurchaseOrderItems[${i}].TaxRate`, it.taxRate || 0);
        formData.append(`PurchaseOrderItems[${i}].TaxName`, it.taxName || 'None');
        formData.append(`PurchaseOrderItems[${i}].Tax`, it.tax.toFixed(2));
        formData.append(`PurchaseOrderItems[${i}].LineTotal`, it.lineTotal.toFixed(2));
    });

    showNotification("Creating purchase order...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/PurchaseOrder?storekeeperId=${storekeeperId}`,
        method: 'POST',
        data: formData,
        showMessage: false,
        onSuccess: function (res) {
            if (res && (res.status === 200 || res.status === 201)) {
                $.dynamicModal.close();
                showNotification("Purchase order created successfully!", "success");
                if (poTable) poTable.ajax.reload(null, false);
            } else {
                showNotification(res?.responseMsg || "Failed to create purchase order.", "error");
            }
        },
        onError: function (xhr) {
            const msg = xhr.responseJSON?.responseMsg || "Error creating purchase order.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// EDIT PURCHASE ORDER
// -----------------------------------------------------------------------------
$(document).on('click', '.btn-edit-po', function () {
    const id = $(this).data('id');
    const po = poCache[id];
    if (!po) return;

    const editHtml = `
        <form id="frmEditPO">
            <div class="form-group" style="margin-bottom: 12px;">
                <label>Supplier <span style="color: red;">*</span></label>
                <select id="editPoSupplier" class="form-control" required>
                    ${suppliersCache.map(s => `<option value="${s.id}" ${s.id === po.supplierId ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label>Supplier Invoice No</label>
                <input type="text" id="editPoInvoiceNo" class="form-control" value="${escapeHtml(po.supplierInvoiceNo || '')}" placeholder="e.g. INV-10023">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label>Status</label>
                <select id="editPoStatus" class="form-control">
                    <option value="1" ${po.status === 1 ? 'selected' : ''}>Draft</option>
                    <option value="2" ${po.status === 2 ? 'selected' : ''}>Sent</option>
                    <option value="5" ${po.status === 5 ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label>Update Invoice Attachment (Optional)</label>
                <input type="file" id="editPoInvoiceFile" class="form-control" accept="image/*,application/pdf">
                ${po.invoiceFilePath ? `<small style="color: #64748b; display: block; margin-top: 4px;">Current attachment: <a href="${po.invoiceFilePath.startsWith('http') ? po.invoiceFilePath : `${baseApiUrl}/${po.invoiceFilePath}`}" target="_blank">View file</a></small>` : ''}
            </div>
        </form>
    `;

    $.dynamicModal({
        title: `Edit PO #${po.id}`,
        bodyHtml: editHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update PO", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitEditPO(id);
                return false;
            }
        }
    });
});

function submitEditPO(poId) {
    const supplierId = $('#editPoSupplier').val();
    const invoiceNo = $('#editPoInvoiceNo').val().trim();
    const statusVal = parseInt($('#editPoStatus').val(), 10);

    const formData = new FormData();
    if (supplierId) formData.append('SupplierId', supplierId);
    if (invoiceNo) formData.append('SupplierInvoiceNo', invoiceNo);
    if (statusVal) formData.append('Status', statusVal);

    const fileInput = document.getElementById('editPoInvoiceFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('Invoice', fileInput.files[0]);
    }

    showNotification("Updating purchase order...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/PurchaseOrder/${poId}`,
        method: 'PUT',
        data: formData,
        showMessage: false,
        onSuccess: function (res) {
            if (res && res.status === 200) {
                $.dynamicModal.close();
                showNotification("Purchase order updated successfully!", "success");
                if (poTable) poTable.ajax.reload(null, false);
            } else {
                showNotification(res?.responseMsg || "Failed to update purchase order.", "error");
            }
        },
        onError: function (xhr) {
            const msg = xhr.responseJSON?.responseMsg || "Error updating purchase order.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// RECEIVE GOODS
// -----------------------------------------------------------------------------
$(document).on('click', '.btn-receive-po', function () {
    const id = $(this).data('id');
    const po = poCache[id];
    if (!po) return;

    showNotification("Preparing goods receipt...", "info");

    $.dynamicModal({
        title: `Receive Goods - PO #${po.id}`,
        bodyHtml: `
            <div style="padding: 10px 0;">
                <p style="font-size: 14px; margin-bottom: 12px;">Confirm receiving goods for <strong>PO #${po.id}</strong> (${escapeHtml(po.supplierName || 'Supplier')}).</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 15px;">
                    <i style="width: 16px; vertical-align: middle;" data-lucide="info"></i>
                    Receiving goods will mark this purchase order as <strong>Received</strong> and automatically update warehouse inventory stock.
                </div>
            </div>
        `,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Confirm Goods Receipt", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                confirmReceiveGoods(id);
                return false;
            }
        }
    });
    if (window.lucide) lucide.createIcons();
});

function confirmReceiveGoods(poId) {
    showNotification("Processing goods receipt...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/PurchaseOrder/${poId}/receive`,
        method: 'PUT',
        data: [],
        contentType: 'application/json',
        showMessage: false,
        onSuccess: function (res) {
            if (res && res.status === 200) {
                $.dynamicModal.close();
                showNotification("Goods received and inventory stock updated successfully!", "success");
                if (poTable) poTable.ajax.reload(null, false);
            } else {
                showNotification(res?.responseMsg || "Failed to receive goods.", "error");
            }
        },
        onError: function (xhr) {
            const msg = xhr.responseJSON?.responseMsg || "Error processing goods receipt.";
            showNotification(msg, "error");
        }
    });
}

// ==================== Import Purchase Order (Excel / CSV) ====================
let importPoRows = [];
const IMPORT_PO_HEADERS = ['Item Title', 'Quantity Ordered', 'Unit Cost', 'Discount', 'Tax Rate'];

$('#btnImportPO').click(function () {
    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "warning");
        return;
    }

    if (suppliersCache.length === 0) {
        showNotification("Please create at least one supplier first.", "warning");
        return;
    }

    if (inventoryItemsCache.length === 0) {
        showNotification("No inventory items found. Please add inventory items first.", "warning");
        return;
    }

    importPoRows = [];

    const bodyHtml = `
        <style>
            .import-po-table { width: 100%; border-collapse: collapse; }
            .import-po-table th { text-align: left; font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; background: #f8fafc; }
            .import-po-table td { padding: 6px; border-bottom: 1px solid #eef1ee; vertical-align: middle; }
            .import-po-table .form-control { height: 36px; font-size: 13px; padding: 6px 8px; }
            .import-po-unmatched { border-color: #dc2626 !important; background: #fef2f2 !important; }
        </style>
        <p style="margin: 0 0 14px; color: #6b7280; font-size: 13px;">
            Download the sample file &mdash; it includes your store's inventory items. Fill in ordered quantities, unit costs, discounts, and tax rates, then upload your Excel (.xlsx) or CSV file. Review and edit the items below before importing into a new Purchase Order.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div class="form-group">
                <label>Supplier <span style="color: red;">*</span></label>
                <select id="importPoSupplier" class="form-control" required>
                    <option value="">Select Supplier</option>
                    ${suppliersCache.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Supplier Invoice No</label>
                <input type="text" id="importPoInvoiceNo" class="form-control" placeholder="e.g. INV-8874">
            </div>
            <div class="form-group">
                <label>Initial Status</label>
                <select id="importPoStatus" class="form-control">
                    <option value="1" selected>Draft</option>
                    <option value="2">Sent</option>
                    <option value="4">Received</option>
                </select>
            </div>
            <div class="form-group">
                <label>Invoice File / Receipt (Optional)</label>
                <input type="file" id="importPoInvoiceFile" class="form-control" accept="image/*,application/pdf">
            </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px;">
            <button type="button" id="btnDownloadPoImportSample" class="btn-outline">
                <i style="width: 16px;" data-lucide="download"></i>
                Download Sample File
            </button>
            <label for="importPoFileInput" class="btn-primary" style="margin: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i style="width: 16px;" data-lucide="file-up"></i>
                Choose Excel / CSV File
            </label>
            <input type="file" id="importPoFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
            <span id="importPoFileName" style="font-size: 13px; color: #6b7280;">No file chosen</span>
        </div>

        <div id="importPoPreviewWrap" style="display: none;">
            <div id="importPoSummary" style="font-size: 13px; margin-bottom: 10px;"></div>
            <div style="overflow-x: auto; max-height: 40vh; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="import-po-table">
                    <thead>
                        <tr>
                            <th style="width: 36px;">#</th>
                            <th style="min-width: 220px;">Item *</th>
                            <th style="width: 110px;">Qty Ordered *</th>
                            <th style="width: 120px;">Unit Cost *</th>
                            <th style="width: 110px;">Discount</th>
                            <th style="min-width: 140px;">Tax Rate</th>
                            <th style="width: 120px;" class="text-right">Line Total</th>
                            <th style="width: 44px;"></th>
                        </tr>
                    </thead>
                    <tbody id="importPoTableBody"></tbody>
                </table>
            </div>

            <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 280px;">
                    <div class="form-group">
                        <label style="font-size: 12px;">Delivery Charges</label>
                        <input type="number" id="importPoDeliveryCharges" class="form-control" step="0.01" min="0" value="0.00">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 12px;">Overall Discount</label>
                        <input type="number" id="importPoOverallDiscount" class="form-control" step="0.01" min="0" value="0.00">
                    </div>
                </div>

                <div style="width: 250px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Items Subtotal:</span>
                        <strong id="importCalcSubtotal">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Total Tax:</span>
                        <strong id="importCalcTax">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Delivery:</span>
                        <strong id="importCalcDelivery">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>Discount:</span>
                        <strong id="importCalcDiscount">Rs. 0.00</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid #cbd5e1; margin-top: 4px; font-size: 15px; color: #0284c7;">
                        <strong>Grand Total:</strong>
                        <strong id="importCalcGrandTotal">Rs. 0.00</strong>
                    </div>
                </div>
            </div>
        </div>
    `;

    $.dynamicModal({
        title: "Import Purchase Order",
        centered: true,
        bodyHtml: bodyHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Import Purchase Order", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitImportPurchaseOrder();
                return false;
            }
        }
    });

    if (window.lucide) lucide.createIcons();

    $('#btnDownloadPoImportSample').on('click', function (e) {
        e.preventDefault();
        downloadImportPoSampleFile();
    });

    $('#importPoFileInput').on('change', function (e) {
        handleImportPoFile(e);
        $(this).val('');
    });

    $('#importPoDeliveryCharges, #importPoOverallDiscount').on('input', function () {
        recalculateImportPoTotals();
    });
});

function downloadImportPoSampleFile() {
    const fileDate = new Date().toISOString().slice(0, 10);
    const sampleRows = [IMPORT_PO_HEADERS];

    if (inventoryItemsCache.length > 0) {
        const sampleCount = Math.min(5, inventoryItemsCache.length);
        for (let i = 0; i < sampleCount; i++) {
            const it = inventoryItemsCache[i];
            const tax = taxRatesCache.find(t => t.id === it.taxRateId);
            sampleRows.push([
                it.title,
                10,
                it.price ? (it.price * 0.8).toFixed(2) : 100,
                0,
                tax ? `${tax.name}` : (taxRatesCache[0]?.name || 'Standard')
            ]);
        }
    } else {
        sampleRows.push(
            ['Sample Product A', 10, 150.00, 0, 'GST'],
            ['Sample Product B', 25, 80.00, 5, 'Zero Rate']
        );
    }

    if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.aoa_to_sheet(sampleRows);
        worksheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'PurchaseOrder');
        XLSX.writeFile(workbook, `Purchase_Order_Sample_${fileDate}.xlsx`);
        return;
    }

    const csvContent = sampleRows.map(row => row.map(cell => {
        const text = cell === null || cell === undefined ? '' : String(cell);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchase_Order_Sample_${fileDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleImportPoFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    $('#importPoFileName').text(file.name);
    const fileName = file.name.toLowerCase();

    const $fileLabel = $('label[for="importPoFileInput"]');
    const originalLabelHtml = $fileLabel.html();
    $fileLabel.html('<i class="fa-solid fa-spinner fa-spin"></i> Processing...').css('pointerEvents', 'none');
    $('#importPoPreviewWrap').hide();

    function resetLoader() {
        $fileLabel.html(originalLabelHtml).css('pointerEvents', '');
        if (window.lucide) lucide.createIcons();
    }

    if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                buildImportPoRows(parseImportPoCsv(event.target.result));
            } catch (err) {
                console.error('Error parsing CSV:', err);
                showNotification('Error processing CSV file. Please check file structure.', 'error');
            } finally {
                resetLoader();
            }
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (typeof XLSX === 'undefined') {
            showNotification('Excel library not loaded. Please upload file as CSV.', 'error');
            resetLoader();
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                buildImportPoRows(rows);
            } catch (err) {
                console.error('Error parsing Excel:', err);
                showNotification('Error processing Excel file. Please check file structure.', 'error');
            } finally {
                resetLoader();
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showNotification('Please choose an Excel (.xlsx) or CSV file.', 'error');
        resetLoader();
    }
}

function parseImportPoCsv(text) {
    const rows = [];
    let row = [];
    let inQuotes = false;
    let currentCell = '';
    const source = String(text || '').replace(/^\uFEFF/, '');

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        const nextChar = source[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
            row.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(currentCell.trim());
            currentCell = '';
            if (row.some(c => c !== '')) rows.push(row);
            row = [];
        } else {
            currentCell += char;
        }
    }
    if (currentCell.length > 0 || row.length > 0) {
        row.push(currentCell.trim());
        if (row.some(c => c !== '')) rows.push(row);
    }
    return rows;
}

function findMatchedInventoryItem(rawValue) {
    const text = String(rawValue || '').trim();
    if (!text) return null;

    const num = Number(text);
    if (!isNaN(num)) {
        const byId = inventoryItemsCache.find(i => i.id === num);
        if (byId) return byId;
    }

    const lower = text.toLowerCase();
    return inventoryItemsCache.find(i => String(i.title || '').trim().toLowerCase() === lower || String(i.barcode || '').trim().toLowerCase() === lower) ||
           inventoryItemsCache.find(i => String(i.title || '').toLowerCase().includes(lower)) || null;
}

function findMatchedTaxRate(rawValue) {
    const text = String(rawValue || '').trim();
    if (!text) return null;

    const num = Number(text);
    if (!isNaN(num)) {
        const byId = taxRatesCache.find(t => t.id === num);
        if (byId) return byId;
        const byRate = taxRatesCache.find(t => parseFloat(t.rate) === num);
        if (byRate) return byRate;
    }

    const lower = text.toLowerCase();
    return taxRatesCache.find(t => String(t.name || '').trim().toLowerCase() === lower) ||
           taxRatesCache.find(t => String(t.name || '').toLowerCase().includes(lower)) || null;
}

function buildImportPoRows(rows) {
    if (!rows || rows.length === 0) {
        showNotification('The uploaded file is empty.', 'error');
        return;
    }

    const headerRow = (rows[0] || []).map(h => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const col = {
        item: headerRow.findIndex(h => h.includes('item') || h.includes('title') || h.includes('product') || h.includes('name')),
        quantity: headerRow.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('ordered')),
        cost: headerRow.findIndex(h => h.includes('cost') || h.includes('unitcost') || h.includes('price') || h.includes('rate')),
        discount: headerRow.findIndex(h => h.includes('discount')),
        tax: headerRow.findIndex(h => h.includes('tax'))
    };

    const hasHeader = Object.values(col).some(idx => idx !== -1);
    if (!hasHeader) {
        col.item = 0; col.quantity = 1; col.cost = 2; col.discount = 3; col.tax = 4;
    }

    const cell = (r, idx) => (idx === -1 || r[idx] === undefined || r[idx] === null) ? '' : r[idx];

    importPoRows = [];
    for (let r = hasHeader ? 1 : 0; r < rows.length; r++) {
        const row = rows[r] || [];
        if (row.every(c => String(c === null || c === undefined ? '' : c).trim() === '')) continue;

        const matchedItem = findMatchedInventoryItem(cell(row, col.item));
        const matchedTax = findMatchedTaxRate(cell(row, col.tax)) || (taxRatesCache.length > 0 ? taxRatesCache[0] : null);

        const qty = parseFloat(String(cell(row, col.quantity)).replace(/[^0-9.]/g, '')) || 1;
        const cost = parseFloat(String(cell(row, col.cost)).replace(/[^0-9.]/g, '')) || (matchedItem ? parseFloat(matchedItem.price || 0) : 0);
        const disc = parseFloat(String(cell(row, col.discount)).replace(/[^0-9.]/g, '')) || 0;

        importPoRows.push({
            inventoryItemId: matchedItem ? matchedItem.id : '',
            quantityOrdered: qty,
            unitCost: cost,
            discount: disc,
            taxRateId: matchedTax ? matchedTax.id : '',
            taxRate: matchedTax ? (matchedTax.rate || 0) : 0,
            taxName: matchedTax ? (matchedTax.name || 'None') : 'None',
            tax: 0,
            lineTotal: 0
        });
    }

    if (importPoRows.length === 0) {
        showNotification('No line items found in the file.', 'error');
        return;
    }

    renderImportPoPreview();
}

function renderImportPoPreview() {
    let html = '';

    importPoRows.forEach((row, index) => {
        const itemOptions = `<option value="">Select Item</option>` + inventoryItemsCache.map(inv => {
            const isSel = Number(inv.id) === Number(row.inventoryItemId);
            return `<option value="${inv.id}" ${isSel ? 'selected' : ''}>${escapeHtml(inv.title)} (Stock: ${inv.stock ?? 0})</option>`;
        }).join('');

        const taxOptions = `<option value="" data-rate="0" data-name="Zero Rate">0% (None)</option>` + taxRatesCache.map(t => {
            const isSel = Number(t.id) === Number(row.taxRateId);
            return `<option value="${t.id}" data-rate="${t.rate}" data-name="${escapeHtml(t.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)} (${t.rate}%)</option>`;
        }).join('');

        const isUnmatched = !row.inventoryItemId;

        html += `
            <tr data-row-index="${index}">
                <td style="font-size: 12px; color: #64748b;">${index + 1}</td>
                <td>
                    <select class="form-control ${isUnmatched ? 'import-po-unmatched' : ''}" data-field="inventoryItemId" style="min-width: 200px;">
                        ${itemOptions}
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control" data-field="quantityOrdered" value="${row.quantityOrdered}" min="1" step="1" style="width: 100px;">
                </td>
                <td>
                    <input type="number" class="form-control" data-field="unitCost" value="${row.unitCost}" min="0" step="0.01" style="width: 110px;">
                </td>
                <td>
                    <input type="number" class="form-control" data-field="discount" value="${row.discount}" min="0" step="0.01" style="width: 100px;">
                </td>
                <td>
                    <select class="form-control" data-field="taxRateId" style="min-width: 130px;">
                        ${taxOptions}
                    </select>
                </td>
                <td class="text-right import-po-line-total" style="font-weight: 600; vertical-align: middle;">
                    Rs. 0.00
                </td>
                <td class="text-center" style="vertical-align: middle;">
                    <button type="button" class="action-btn delete btn-delete-import-row" data-index="${index}" title="Delete Row">
                        <i style="width: 16px;" data-lucide="trash-2"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    $('#importPoTableBody').html(html);
    $('#importPoPreviewWrap').show();
    recalculateImportPoTotals();

    if (window.lucide) lucide.createIcons();
}

$(document).on('input change', '#importPoTableBody input, #importPoTableBody select', function () {
    const index = Number($(this).closest('tr').data('row-index'));
    const field = $(this).data('field');
    if (!importPoRows[index] || !field) return;

    if (field === 'inventoryItemId') {
        importPoRows[index].inventoryItemId = $(this).val();
        $(this).toggleClass('import-po-unmatched', !$(this).val());
    } else if (field === 'taxRateId') {
        const $opt = $(this).find('option:selected');
        importPoRows[index].taxRateId = $(this).val();
        importPoRows[index].taxRate = parseFloat($opt.data('rate')) || 0;
        importPoRows[index].taxName = $opt.data('name') || 'None';
    } else {
        importPoRows[index][field] = parseFloat($(this).val()) || 0;
    }

    recalculateImportPoTotals();
});

$(document).on('click', '.btn-delete-import-row', function () {
    const index = Number($(this).data('index'));
    importPoRows.splice(index, 1);
    if (importPoRows.length === 0) {
        $('#importPoPreviewWrap').hide();
        return;
    }
    renderImportPoPreview();
});

function recalculateImportPoTotals() {
    let subtotal = 0;
    let totalTax = 0;

    importPoRows.forEach((row, idx) => {
        const qty = parseFloat(row.quantityOrdered) || 0;
        const cost = parseFloat(row.unitCost) || 0;
        const discount = parseFloat(row.discount) || 0;
        const rate = parseFloat(row.taxRate) || 0;

        const base = Math.max(0, (qty * cost) - discount);
        const tax = (base * rate) / 100;
        const lineTotal = base + tax;

        row.tax = tax;
        row.lineTotal = lineTotal;

        subtotal += base;
        totalTax += tax;

        $(`#importPoTableBody tr[data-row-index="${idx}"] .import-po-line-total`)
            .text(`Rs. ${lineTotal.toFixed(2)}`);
    });

    const delivery = parseFloat($('#importPoDeliveryCharges').val()) || 0;
    const overallDiscount = parseFloat($('#importPoOverallDiscount').val()) || 0;
    const grandTotal = Math.max(0, subtotal + totalTax + delivery - overallDiscount);

    $('#importCalcSubtotal').text(`Rs. ${subtotal.toFixed(2)}`);
    $('#importCalcTax').text(`Rs. ${totalTax.toFixed(2)}`);
    $('#importCalcDelivery').text(`Rs. ${delivery.toFixed(2)}`);
    $('#importCalcDiscount').text(`Rs. ${overallDiscount.toFixed(2)}`);
    $('#importCalcGrandTotal').text(`Rs. ${grandTotal.toFixed(2)}`);

    const unmatchedCount = importPoRows.filter(r => !r.inventoryItemId).length;
    let summaryHtml = `<strong>${importPoRows.length}</strong> item row(s) ready.`;
    if (unmatchedCount > 0) {
        summaryHtml += ` <span style="color: #dc2626; font-weight: 500;">(${unmatchedCount} item(s) could not be matched automatically &mdash; please select the matching item).</span>`;
    }
    $('#importPoSummary').html(summaryHtml);
}

function submitImportPurchaseOrder() {
    if (!importPoRows || importPoRows.length === 0) {
        showNotification("Please upload and preview an Excel or CSV file first.", "error");
        return;
    }

    const supplierId = $('#importPoSupplier').val();
    if (!supplierId) {
        showNotification("Please select a supplier for the purchase order.", "error");
        $('#importPoSupplier').focus();
        return;
    }

    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first.", "error");
        return;
    }

    for (let i = 0; i < importPoRows.length; i++) {
        const row = importPoRows[i];
        if (!row.inventoryItemId) {
            showNotification(`Row ${i + 1}: Please select an Item.`, "error");
            return;
        }
        if (!row.quantityOrdered || row.quantityOrdered <= 0) {
            showNotification(`Row ${i + 1}: Ordered quantity must be greater than 0.`, "error");
            return;
        }
        if (row.unitCost === undefined || row.unitCost < 0) {
            showNotification(`Row ${i + 1}: Valid unit cost is required.`, "error");
            return;
        }
    }

    const statusVal = parseInt($('#importPoStatus').val(), 10) || 1;
    const delivery = parseFloat($('#importPoDeliveryCharges').val()) || 0;
    const overallDiscount = parseFloat($('#importPoOverallDiscount').val()) || 0;

    let subtotal = 0;
    let totalTax = 0;

    importPoRows.forEach(row => {
        const base = Math.max(0, (row.quantityOrdered * row.unitCost) - (row.discount || 0));
        const tx = (base * (row.taxRate || 0)) / 100;
        row.tax = tx;
        row.lineTotal = base + tx;
        row.quantityReceived = (statusVal === 4) ? row.quantityOrdered : 0;
        subtotal += base;
        totalTax += tx;
    });

    const grandTotal = Math.max(0, subtotal + totalTax + delivery - overallDiscount);

    const formData = new FormData();
    formData.append('SupplierId', supplierId);
    formData.append('SupplierInvoiceNo', $('#importPoInvoiceNo').val().trim() || '');
    formData.append('Subtotal', subtotal.toFixed(2));
    formData.append('DeliveryCharges', delivery.toFixed(2));
    formData.append('Discount', overallDiscount.toFixed(2));
    formData.append('Tax', totalTax.toFixed(2));
    formData.append('GrandTotal', grandTotal.toFixed(2));
    formData.append('Status', statusVal);

    const fileInput = document.getElementById('importPoInvoiceFile');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('Invoice', fileInput.files[0]);
    }

    importPoRows.forEach((row, i) => {
        formData.append(`PurchaseOrderItems[${i}].InventoryItemId`, row.inventoryItemId);
        formData.append(`PurchaseOrderItems[${i}].QuantityOrdered`, row.quantityOrdered);
        formData.append(`PurchaseOrderItems[${i}].QuantityReceived`, row.quantityReceived);
        formData.append(`PurchaseOrderItems[${i}].UnitCost`, row.unitCost);
        formData.append(`PurchaseOrderItems[${i}].Discount`, row.discount || 0);
        formData.append(`PurchaseOrderItems[${i}].TaxRate`, row.taxRate || 0);
        formData.append(`PurchaseOrderItems[${i}].TaxName`, row.taxName || 'None');
        formData.append(`PurchaseOrderItems[${i}].Tax`, row.tax.toFixed(2));
        formData.append(`PurchaseOrderItems[${i}].LineTotal`, row.lineTotal.toFixed(2));
    });

    showNotification(`Importing purchase order with ${importPoRows.length} item(s)...`, "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/PurchaseOrder?storekeeperId=${storekeeperId}`,
        method: 'POST',
        data: formData,
        showMessage: false,
        onSuccess: function (res) {
            if (res && (res.status === 200 || res.status === 201)) {
                importPoRows = [];
                $.dynamicModal.close();
                showNotification("Purchase order imported and created successfully!", "success");
                if (poTable) poTable.ajax.reload(null, false);
            } else {
                showNotification(res?.responseMsg || "Failed to import purchase order.", "error");
            }
        },
        onError: function (xhr) {
            const msg = xhr.responseJSON?.responseMsg || "Error importing purchase order.";
            showNotification(msg, "error");
        }
    });
}


