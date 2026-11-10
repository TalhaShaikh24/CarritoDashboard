let transactionsTable = null;
let storekeepersCache = [];

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    const val = $('#filterStorekeeper').val();
    return val || null;
}

$(document).ready(function () {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Managing stock transactions for ${storeName}`);
        }
    }

    // 1. Fetch Storekeepers, select the first by default for Admin, then initialize Table
    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        initializeDataTable();
    });

    // 2. Search & filter listeners
    $('#transactionSearch').on('input', function () {
        if (transactionsTable) {
            transactionsTable.search(this.value).draw();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        if (transactionsTable) {
            transactionsTable.ajax.reload();
        }
    });

    // Handle storekeeper ready event
    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing stock transactions for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        if (transactionsTable) {
            transactionsTable.ajax.reload();
        }
    });
});

// --- Storekeeper Data & Filter ---

function fetchStorekeepers() {
    return new Promise(resolve => {
        $.get(`${baseApiUrl}/api/Storekeeper`, { PageNumber: 1, PageSize: 100 }, function (res) {
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
        const skId = AuthHelper.getStorekeeperId() || '';
        const skName = AuthHelper.getStoreName() || 'My Store';
        skSelect.append(new Option(skName, skId, true, true));
        skSelect.closest('.custom-select-wrapper, select').hide();
    } else {
        if (storekeepersCache.length === 0) {
            skSelect.append(new Option('No Storekeepers Found', ''));
        } else {
            // Admin Dashboard: select the first storekeeper by default
            storekeepersCache.forEach((sk, idx) => {
                const displayName = sk.storeName || sk.fullName || `Store #${sk.id}`;
                const isFirst = (idx === 0);
                const opt = new Option(displayName, sk.id, isFirst, isFirst);
                skSelect.append(opt);
            });
        }

        if (!skSelect.data('customSelect')) {
            skSelect.customSelect({ placeholder: 'Select Storekeeper', searchable: true, searchableThreshold: 0 });
        } else {
            skSelect.customSelect('refresh');
        }
    }
}

// --- DataTable Initialization ---

function initializeDataTable() {
    transactionsTable = $('#transactionsTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading transactions...</span></div>',
            emptyTable: "No stock transactions found for the selected storekeeper",
            zeroRecords: "No matching stock transactions found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const pageSize = data.length;
            const pageNumber = (data.start / data.length) + 1;
            const searchValue = data.search ? data.search.value : '';

            const storekeeperId = getActiveStorekeeperId();

            if (!storekeeperId) {
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                return;
            }
            
            // Target endpoint: /api/InventoryTransaction/GetAll (with fallback to /api/InventoryTransaction)
            const primaryUrl = `${baseApiUrl}/api/InventoryTransaction/GetAll`;
            const fallbackUrl = `${baseApiUrl}/api/InventoryTransaction`;

            const queryParams = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                Search: searchValue || undefined,
                storekeeperId: storekeeperId
            };
            
            function handleSuccess(response) {
                if (response && (response.status === 200 || response.status === undefined) && response.data) {
                    const items = response.data.items || [];
                    const totalCount = response.data.totalRecords !== undefined ? response.data.totalRecords : items.length;

                    callback({
                        draw: data.draw,
                        recordsTotal: totalCount,
                        recordsFiltered: totalCount,
                        data: items
                    });
                } else {
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                }
            }

            $.ajax({
                url: primaryUrl,
                type: 'GET',
                data: queryParams,
                success: handleSuccess,
                error: function (xhr) {
                    // Fallback to /api/InventoryTransaction if /GetAll is not explicitly routed
                    if (xhr.status === 404) {
                        $.ajax({
                            url: fallbackUrl,
                            type: 'GET',
                            data: queryParams,
                            success: handleSuccess,
                            error: function () {
                                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                            }
                        });
                    } else {
                        callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    }
                }
            });
        },
        columns: [
            {
                data: 'inventoryItemTitle',
                render: function (data, type, row) {
                    const title = data || `Item #${row.inventoryItemId || 'N/A'}`;
                    return `
                        <div class="product-title-cell">
                            <span class="product-title font-weight-semibold">${title}</span>
                            ${row.inventoryItemId ? `<small class="text-muted">Item ID: #${row.inventoryItemId}</small>` : ''}
                        </div>
                    `;
                }
            },
            {
                data: 'referenceId',
                render: function (data) {
                    if (!data) return '<span class="text-muted">-</span>';
                    return `<span class="reference-badge">#${data}</span>`;
                }
            },
            {
                data: 'transactionType',
                render: function (data) {
                    if (!data) return '<span class="badge badge-light-neutral">Unknown</span>';
                    const upper = data.toUpperCase();

                    if (upper.includes('PURCHASE') || upper === 'IN' || upper.includes('RESTOCK') || upper.includes('RECEIVE')) {
                        return `<span class="badge badge-light-success"><i data-lucide="arrow-down-left" style="width: 13px; height: 13px; margin-right: 3px;"></i>${data}</span>`;
                    } else if (upper.includes('SALE') || upper === 'OUT' || upper.includes('ORDER')) {
                        return `<span class="badge badge-light-info"><i data-lucide="arrow-up-right" style="width: 13px; height: 13px; margin-right: 3px;"></i>${data}</span>`;
                    } else if (upper.includes('ADJUST')) {
                        return `<span class="badge badge-light-warning"><i data-lucide="sliders" style="width: 13px; height: 13px; margin-right: 3px;"></i>${data}</span>`;
                    } else if (upper.includes('RETURN')) {
                        return `<span class="badge badge-light-secondary"><i data-lucide="rotate-ccw" style="width: 13px; height: 13px; margin-right: 3px;"></i>${data}</span>`;
                    } else if (upper.includes('DAMAGE') || upper.includes('EXPIRE') || upper.includes('LOSS')) {
                        return `<span class="badge badge-light-danger"><i data-lucide="alert-triangle" style="width: 13px; height: 13px; margin-right: 3px;"></i>${data}</span>`;
                    }
                    return `<span class="badge badge-light-primary">${data}</span>`;
                }
            },
            {
                data: 'quantity',
                className: 'text-right',
                render: function (data) {
                    const num = Number(data);
                    if (isNaN(num)) return '-';
                    if (num > 0) {
                        return `<span class="qty-positive">+${num.toLocaleString()}</span>`;
                    } else if (num < 0) {
                        return `<span class="qty-negative">${num.toLocaleString()}</span>`;
                    }
                    return `<span>0</span>`;
                }
            },
            {
                data: 'stockAfter',
                className: 'text-right',
                render: function (data) {
                    const num = Number(data);
                    const formatted = isNaN(num) ? '-' : num.toLocaleString();
                    return `<span class="badge badge-light-neutral" style="font-size: 13px; font-weight: 700;">${formatted}</span>`;
                }
            },
            {
                data: 'timestamp',
                render: function (data) {
                    if (!data) return '-';
                    const dateObj = new Date(data);
                    if (isNaN(dateObj.getTime())) return data;

                    const dateStr = dateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    const timeStr = dateObj.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                    return `<div style="line-height: 1.2;"><span>${dateStr}</span><br><small class="text-muted">${timeStr}</small></div>`;
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
