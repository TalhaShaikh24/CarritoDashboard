let ordersTable;

let currentStatus = 0; // 0 = All

const STATUS_MAP = {
    1: { text: "Pending", class: "pending" },
    2: { text: "Confirmed", class: "confirmed" },
    3: { text: "Out for Delivery", class: "delivery" },
    4: { text: "Delivered", class: "completed" },
    5: { text: "Cancelled", class: "cancelled" }
};

function getOrdersApiUrl() {
    const storekeeperId = AuthHelper.getStorekeeperId();
    if (AuthHelper.isStorekeeper() && storekeeperId) {
        return `${baseApiUrl}/api/Order/GetOrdersByStorekeeperId/${storekeeperId}`;
    }
    return `${baseApiUrl}/api/Order`;
}

$(document).ready(() => {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Viewing orders for ${storeName}`);
        }
    }

    initializeDataTable();

    // Reload if storekeeper data becomes ready asynchronously
    $(document).on('storekeeperReady', function (e, skpUser) {
        if (skpUser && skpUser.storeName) {
            $('.page-subtitle').text(`Viewing orders for ${skpUser.storeName}`);
        }
        if (ordersTable) {
            ordersTable.ajax.reload(); // URL is rebuilt on every request
        }
    });

    // Search (debounced, because every search is now a server request)
    let searchTimer;
    $('#orderSearch').on('input', function () {
        const value = this.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => ordersTable.search(value).draw(), 400);
    });

    // Status filter tabs
    $('.filter-tab').click(function () {
        $('.filter-tab').removeClass('active');
        $(this).addClass('active');
        currentStatus = Number($(this).data('status')) || 0;
        ordersTable.ajax.reload();
    });
});

function initializeDataTable() {
    ordersTable = $('#ordersTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,          // server returns the order, same as inventory
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No orders found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback) {
            const pageSize = data.length;
            const pageNumber = (data.start / data.length) + 1;
            const searchValue = data.search.value;

            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                Search: searchValue
            };
            if (currentStatus) {
                params.Status = currentStatus; // confirm the real parameter name, see below
            }

            $.ajax({
                url: getOrdersApiUrl(),
                type: 'GET',
                data: params,
                success: function (response) {
                    const d = response && response.data;
                    if (response && response.status === 200 && d) {
                        const total = d.totalRecords ?? 0;
                        callback({
                            draw: data.draw,
                            recordsTotal: total,
                            recordsFiltered: total,
                            data: d.items || []
                        });
                    } else {
                        showNotification(response?.responseMsg || "Failed to load orders", "error");
                        callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    }
                },
                error: function () {
                    showNotification("Failed to load orders", "error");
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                }
            });
        },
        columns: [
            {
                data: 'id',
                render: d => `<strong>#ORD-${d}</strong>`
            },
            {
                data: null,
                render: function (data) {
                    return data.customerFullName || data.customerPhone || '---';
                }
            },
            {
                data: 'storekeeperStoreName',
                render: d => d || '---'
            },
            {
                data: 'riderFullName',
                render: d => d || '---'
            },
            {
                data: 'createdAt',
                render: d => new Date(d).toLocaleString([], {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
            },
            {
                data: 'netPrice',
                render: d => `<strong>Rs. ${Number(d || 0).toFixed(2)}</strong>`
            },
            {
                data: 'status',
                render: function (data) {
                    const s = STATUS_MAP[data] || { text: 'Unknown', class: 'unknown' };
                    return `<span class="status-badge ${s.class}">${s.text}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data) {
                    return `
                        <div class="action-btns">
                            <button class="action-btn view" data-type="order" data-id="${data.id}">
                                <i style="width: 18px;" data-lucide="eye"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ],
        drawCallback: function () {
            lucide?.createIcons();
        }
    });

    // View order details
    $(document).on('click', '.action-btn.view[data-type="order"]', function () {
        const orderId = $(this).data('id');
        viewOrderDetails(orderId);
    });
}

function viewOrderDetails(orderId) {
    ajaxRequest({
        url: `${baseApiUrl}/api/Order/${orderId}`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                showOrderDetailModal(response.data);
            } else {
                showNotification("Failed to load order details", "error");
            }
        }
    });
}


function showOrderDetailModal(order) {
    const status = STATUS_MAP[order.status] || { text: 'Unknown', class: 'unknown' };

    // Helpers
    const formatMoney = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
    const formatTime = (d) => new Date(d).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // 1. Order History HTML
    let historyHtml = '<p class="text-muted">No history found</p>';
    if (order.orderActivities?.length > 0) {
        historyHtml = order.orderActivities.map((act, idx) => `
            <div class="od-timeline-item">
                <div class="od-timeline-icon">
                    <i data-lucide="${idx === 0 ? 'check-circle' : 'circle'}" width="16"></i>
                </div>
                <div class="od-timeline-content">
                    <h6>${STATUS_MAP[act.status]?.text || 'Update'}</h6>
                    <small>${formatTime(act.createdAt)}</small>
                    ${act.remarks ? `<div class="od-timeline-remark">${act.remarks}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    // 2. Items HTML (Table Style for full width)
    let itemsHtml = '<tr><td colspan="3" class="text-center text-muted">No items</td></tr>';
    if (order.orderItems?.length > 0) {
        itemsHtml = order.orderItems.map(item => `
            <tr>
                <td width="60%">
                    <strong>${item.title}</strong>
                </td>
                <td width="20%" class="text-center">${item.quantity} x ${Number(item.price).toFixed(0)}</td>
                <td width="20%" class="text-right" style="text-align:right;">${formatMoney(item.totalPrice)}</td>
            </tr>
        `).join('');
    }

    const html = `
        <div class="od-wrapper">
            <div class="od-header">
                <div>
                    <h3 class="od-id">#ORD-${order.id}</h3>
                    <div class="od-date">${formatTime(order.createdAt)}</div>
                </div>
                <span class="od-badge ${status.class}">${status.text}</span>
            </div>

            <div class="od-info-grid">
                <div class="od-card">
                    <div class="od-card-label"><i data-lucide="user" width="14"></i> Customer</div>
                    <div class="od-card-value">${order.customerFullName || 'Unknown'}</div>
                    <div class="od-card-sub">${order.customerPhone || '---'}</div>
                </div>
                <div class="od-card">
                    <div class="od-card-label"><i data-lucide="store" width="14"></i> Store</div>
                    <div class="od-card-value">${order.storekeeperStoreName || 'Unknown'}</div>
                    <div class="od-card-sub">${order.storekeeperPhone || '---'}</div>
                </div>
                <div class="od-card">
                    <div class="od-card-label"><i data-lucide="bike" width="14"></i> Rider</div>
                    <div class="od-card-value">${order.riderFullName || 'Not Assigned'}</div>
                    <div class="od-card-sub">${order.riderPhone || '---'}</div>
                </div>
            </div>

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="history" width="18"></i> Order History</div>
                <div class="od-timeline-box">
                    ${historyHtml}
                </div>
            </div>

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="map" width="18"></i> Locations</div>
                <div class="od-address-row">
                    <div class="od-addr-col">
                        <div class="od-addr-label">Pickup From (Store)</div>
                        <div class="od-addr-val"><i data-lucide="store" width="14" style="vertical-align:middle"></i> ${order.pickupAddress?.address || 'N/A'}</div>
                    </div>
                    <div class="od-addr-col">
                        <div class="od-addr-label">Deliver To (Customer)</div>
                        <div class="od-addr-val"><i data-lucide="map-pin" width="14" style="vertical-align:middle"></i> ${order.deliveryAddress?.address || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="shopping-cart" width="18"></i> Order Items</div>
                <table class="od-items-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th class="text-center">Qty / Price</th>
                            <th style="text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="receipt" width="18"></i> Payment Summary</div>
                <div class="od-payment-box">
                    <div class="od-pay-row">
                        <span>Subtotal (Offer Price)</span>
                        <span>${formatMoney(order.offerPrice)}</span>
                    </div>
                    <div class="od-pay-row">
                        <span>Delivery Charges</span>
                        <span>${formatMoney(order.deliveryCharges)}</span>
                    </div>
                    <div class="od-pay-row">
                        <span>Discount</span>
                        <span style="color:#16a34a;">- ${formatMoney(order.discount)}</span>
                    </div>
                    <div class="od-pay-row total">
                        <span>Total Payable</span>
                        <span>${formatMoney(order.netPrice)}</span>
                    </div>
                </div>
            </div>

        </div>
    `;

    $.dynamicModal({
        title: "Order Details",
        bodyHtml: html,
        size: 'lg',
        buttons: [
            { text: "Close", class: "btn-outline", action: "close" }
        ]
    });

    lucide?.createIcons();
}