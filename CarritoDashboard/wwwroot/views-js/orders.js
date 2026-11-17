let ordersTable;

let currentOrderType = 0; // 0 = All
let currentStatus = 0; // 0 = All

const ORDER_TYPE_TEXT = { 1: "Online", 2: "InStore" };

const STATUS_MAP = {
    1: { text: "Pending", class: "pending" },
    2: { text: "Confirmed", class: "confirmed" },
    3: { text: "Rider Assigned", class: "delivery" },
    4: { text: "Out for Delivery", class: "delivery" },
    5: { text: "Delivered", class: "completed" },
    6: { text: "Cancelled", class: "cancelled" },
    7: { text: "Completed", class: "completed" }
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
            ordersTable.column('store:name').visible(!AuthHelper.isStorekeeper());
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

    $('#orderTypeFilter').on('change', function () {
        currentOrderType = Number($(this).val()) || 0;
        ordersTable.ajax.reload();
    });

    $('#orderStatusFilter').on('change', function () {
        currentStatus = Number($(this).val()) || 0;
        ordersTable.ajax.reload();
    });

    $('#orderTypeFilter').customSelect();
    $('#orderStatusFilter').customSelect();
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
                params.Status = currentStatus;
            }

            if (currentOrderType) {
                params.OrderType = currentOrderType;
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
                data: null,
                render: function (data) {
                    const typeBadge = data.type == 1 ?
                        '<span class="badge badge-light-primary badge-type">Online</span>'
                        : '<span class="badge badge-light-warning badge-type">InStore</span>';
                    return `
                        <div class="product-title-cell">
                            <span class="product-title">#ORD-${data.id}</span>
                            ${typeBadge}
                        </div>
                    `;
                }
            },
            {
                data: null,
                render: function (data) {
                    return data.customerFullName || data.customerPhone || '---';
                }
            },
            {
                data: 'storekeeperStoreName',
                name: 'store',
                visible: !AuthHelper.isStorekeeper(),
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
                data: null,
                render: function (data) {
                    const grandTotal = Number(data.grandTotal || 0).toFixed(2);
                    const disc = extractOrderDiscounts(data);
                    let discountBadge = '';
                    if (disc.hasDiscount) {
                        discountBadge = `
                            <div class="od-table-discount-wrap mt-1">
                                <span class="od-table-discount-pill action-btn-link" data-id="${data.id}" title="Discount: -Rs. ${disc.totalDiscount.toFixed(2)}. Click to view breakdown.">
                                    <i data-lucide="tag" width="11" height="11"></i>
                                    -Rs. ${disc.totalDiscount.toFixed(2)}
                                </span>
                            </div>
                        `;
                    }
                    return `<div><strong>Rs. ${grandTotal}</strong>${discountBadge}</div>`;
                }
            },
            {
                data: 'status',
                render: function (data) {
                    const s = STATUS_MAP[data];
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


function extractOrderDiscounts(order) {
    if (!order) {
        return { totalDiscount: 0, couponDiscount: 0, discountOnItems: 0, hasDiscount: false, breakdown: [] };
    }

    const parseAmount = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        const n = Number(val);
        return isNaN(n) ? 0 : n;
    };

    const couponDiscount = parseAmount(order.couponDiscount ?? order.CouponDiscount);
    const discountOnItems = parseAmount(order.discountOnItems ?? order.DiscountOnItems);
    let totalDiscount = parseAmount(order.totalDiscount ?? order.TotalDiscount ?? order.discount ?? order.Discount);

    // If totalDiscount wasn't directly provided or is 0, but itemized discounts exist, sum them up
    if (totalDiscount <= 0 && (couponDiscount > 0 || discountOnItems > 0)) {
        totalDiscount = couponDiscount + discountOnItems;
    }

    const breakdown = [];
    // Only show the discounts which have values not null and greater than 0
    if (discountOnItems > 0) {
        breakdown.push({
            type: 'items',
            label: 'Store / Items Discount',
            description: 'Discount offered by store on line items',
            amount: discountOnItems,
            icon: 'shopping-bag'
        });
    }

    if (couponDiscount > 0) {
        breakdown.push({
            type: 'coupon',
            label: 'Coupon Discount',
            description: 'Discount on coupon applied',
            amount: couponDiscount,
            icon: 'ticket'
        });
    }

    // Account for any difference between totalDiscount and itemized breakdown (e.g. general promotion or manual order discount)
    const accounted = couponDiscount + discountOnItems;
    const remaining = Math.round((totalDiscount - accounted) * 100) / 100;
    if (remaining > 0.009 && breakdown.length > 0) {
        breakdown.push({
            type: 'other',
            label: 'Other Discount',
            description: 'Additional order promotional discount',
            amount: remaining,
            icon: 'tag'
        });
    } else if (breakdown.length === 0 && totalDiscount > 0) {
        breakdown.push({
            type: 'order',
            label: 'Order Discount',
            description: 'Total promotional discount applied',
            amount: totalDiscount,
            icon: 'tag'
        });
    }

    return {
        totalDiscount,
        couponDiscount,
        discountOnItems,
        hasDiscount: totalDiscount > 0,
        breakdown
    };
}

function showOrderDetailModal(order) {
    const status = STATUS_MAP[order.status];

    // Helpers
    const formatMoney = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
    const formatTime = (d) => new Date(d).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Discount handling (TotalDiscount, CouponDiscount, DiscountOnItems)
    const discountInfo = extractOrderDiscounts(order);

    let discountRowHtml = '';
    if (discountInfo.hasDiscount) {
        discountRowHtml = `
            <div class="od-pay-row od-discount-pay-row">
                <div class="od-discount-label-group" id="odDiscountLabelTrigger" role="button" tabindex="0" title="Tap to view discount breakdown">
                    <span class="od-discount-title">Discount</span>
                    <span class="od-discount-info-badge" aria-hidden="true">
                        <i data-lucide="info" width="13" height="13"></i>
                    </span>
                </div>
                <div class="od-discount-popover-anchor">
                    <button type="button" class="od-discount-trigger-btn" id="odDiscountTriggerBtn" aria-haspopup="dialog" aria-expanded="false" title="Tap to view discount breakdown">
                        <span class="od-disc-tag"><i data-lucide="tag" width="13" height="13"></i></span>
                        <span class="od-disc-val">- ${formatMoney(discountInfo.totalDiscount)}</span>
                        <span class="od-disc-chevron"><i data-lucide="chevron-down" width="13" height="13"></i></span>
                    </button>

                    <div class="od-discount-popover" id="odDiscountPopover" style="display: none;" role="dialog" aria-label="Discount Breakdown">
                        <div class="od-popover-arrow"></div>
                        <div class="od-popover-header">
                            <div class="od-popover-title">
                                <i data-lucide="sparkles" width="14" height="14"></i>
                                <span>Discount Breakdown</span>
                            </div>
                            <button type="button" class="od-popover-close" id="odCloseDiscountPopover" aria-label="Close breakdown">
                                <i data-lucide="x" width="13" height="13"></i>
                            </button>
                        </div>
                        <div class="od-popover-body">
                            ${discountInfo.breakdown.map(item => `
                                <div class="od-popover-item">
                                    <div class="od-popover-item-left">
                                        <span class="od-popover-item-icon ${item.type}">
                                            <i data-lucide="${item.icon}" width="14" height="14"></i>
                                        </span>
                                        <div>
                                            <div class="od-popover-item-title">${item.label}</div>
                                            <div class="od-popover-item-desc">${item.description}</div>
                                        </div>
                                    </div>
                                    <div class="od-popover-item-val">- ${formatMoney(item.amount)}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="od-popover-footer">
                            <span>Total</span>
                            <strong>- ${formatMoney(discountInfo.totalDiscount)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

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
        itemsHtml = order.orderItems.map(item => {
            const itemTitle = item.title || item.Title || 'Unnamed Item';
            const quantity = Number(item.quantity ?? item.Quantity ?? 1);
            const unitPrice = Number(item.price ?? item.Price ?? 0);
            const itemDiscount = Number(item.discount ?? item.Discount ?? 0);
            const taxAmount = Number(item.tax ?? item.Tax ?? 0);
            const taxRate = Number(item.taxRate ?? item.TaxRate ?? 0);
            const taxName = (item.taxName ?? item.TaxName ?? '').trim();
            const baseTotal = quantity * unitPrice;

            let lineTotal = Number(item.lineTotal ?? item.LineTotal ?? item.totalPrice ?? item.TotalPrice ?? 0);
            if (lineTotal <= 0 && unitPrice > 0) {
                lineTotal = Math.max(0, baseTotal - itemDiscount + taxAmount);
            }

            // Thumbnail
            const photoPath = item.photoFilePath ?? item.PhotoFilePath;
            let thumbHtml = `
                <div class="od-item-thumb-placeholder">
                    <i data-lucide="package" width="16" height="16"></i>
                </div>
            `;
            if (photoPath && typeof photoPath === 'string' && photoPath.trim() !== '') {
                const photoUrl = photoPath.startsWith('http') ? photoPath : `${baseApiUrl}/${photoPath.replace(/^\/+/, '')}`;
                thumbHtml = `
                    <img src="${photoUrl}" class="od-item-thumb" alt="${itemTitle}" onerror="this.onerror=null; this.replaceWith(this.nextElementSibling);" />
                    <div class="od-item-thumb-placeholder" style="display:none;">
                        <i data-lucide="package" width="16" height="16"></i>
                    </div>
                `;
            }

            // Badges for Discount and Tax
            const metaChips = [];
            if (itemDiscount > 0) {
                metaChips.push(`
                    <span class="od-item-chip discount" title="Discount on item: -${formatMoney(itemDiscount)}">
                        <i data-lucide="tag" width="11" height="11"></i>
                        <span>-${formatMoney(itemDiscount)}</span>
                    </span>
                `);
            }

            if (taxAmount > 0 || taxRate > 0) {
                let taxLabel = taxName || 'Tax';
                if (taxRate > 0) {
                    taxLabel += ` (${taxRate}%)`;
                }
                if (taxAmount > 0) {
                    taxLabel += `: +${formatMoney(taxAmount)}`;
                }
                metaChips.push(`
                    <span class="od-item-chip tax" title="Tax on item: ${taxLabel}">
                        <i data-lucide="receipt" width="11" height="11"></i>
                        <span>${taxLabel}</span>
                    </span>
                `);
            }

            const metaChipsHtml = metaChips.length > 0 ? `
                <div class="od-item-chips">
                    ${metaChips.join('')}
                </div>
            ` : '';

            const originalPriceHtml = (itemDiscount > 0 && baseTotal > lineTotal)
                ? `<span class="od-item-del-price" title="Original: ${formatMoney(baseTotal)}">${formatMoney(baseTotal)}</span>`
                : '';

            return `
                <tr>
                    <td width="55%">
                        <div class="od-item-cell">
                            ${thumbHtml}
                            <div class="od-item-info">
                                <div class="od-item-title">${itemTitle}</div>
                                ${metaChipsHtml}
                            </div>
                        </div>
                    </td>
                    <td width="22%" class="text-center od-item-qty-col">
                        ${quantity} × ${formatMoney(unitPrice)}
                    </td>
                    <td width="23%" class="text-right" style="text-align:right;">
                        <div class="od-item-total-col">
                            <span class="od-item-final-price">${formatMoney(lineTotal)}</span>
                            ${originalPriceHtml}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
                ${ORDER_TYPE_TEXT[order.type] === "Online" ? `
                    <div class="od-card">
                        <div class="od-card-label"><i data-lucide="bike" width="14"></i> Rider</div>
                        <div class="od-card-value">${order.riderFullName || 'Not Assigned'}</div>
                        <div class="od-card-sub">${order.riderPhone || '---'}</div>
                    </div>`
                : ``}
            </div>

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="history" width="18"></i> Order History</div>
                <div class="od-timeline-box">
                    ${historyHtml}
                </div>
            </div>
            ${ORDER_TYPE_TEXT[order.type] === "Online" ? `
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
            `: ''}

            <div class="od-section">
                <div class="od-section-title"><i data-lucide="shopping-cart" width="18"></i> Order Items</div>
                <table class="od-items-table">
                    <thead>
                        <tr>
                            <th>Item Details</th>
                            <th class="text-center">Qty × Price</th>
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
                        <span>Subtotal</span>
                        <span>${formatMoney(order.subtotal)}</span>
                    </div>
                    <div class="od-pay-row">
                        <span>Delivery Charges</span>
                        <span>${formatMoney(order.deliveryCharges)}</span>
                    </div>
                    ${discountRowHtml}
                    <div class="od-pay-row">
                        <span>Tax</span>
                        <span style="color:#16a34a;">- ${formatMoney(order.tax)}</span>
                    </div>
                    <div class="od-pay-row total">
                        <span>Total Payable</span>
                        <span>${formatMoney(order.grandTotal)}</span>
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

// Toggle discount popover open/close
function toggleDiscountPopover(forceState) {
    const $popover = $('#odDiscountPopover');
    const $btn = $('#odDiscountTriggerBtn');
    if ($popover.length === 0) return;

    const isVisible = $popover.is(':visible');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isVisible;

    if (shouldOpen) {
        $popover.stop(true, true).fadeIn(150);
        $btn.addClass('is-open').attr('aria-expanded', 'true');
        lucide?.createIcons();

        // Check if popover extends below modal viewport, flip if needed
        const $modalBody = $popover.closest('.modal-body');
        if ($modalBody.length) {
            const popoverOffset = $popover.offset();
            const modalOffset = $modalBody.offset();
            if (popoverOffset && modalOffset) {
                const popoverBottom = popoverOffset.top + $popover.outerHeight();
                const modalBottom = modalOffset.top + $modalBody.innerHeight();
                if (popoverBottom > modalBottom && $popover.outerHeight() < ($popover.parent().offset().top - modalOffset.top)) {
                    $popover.addClass('placement-top');
                } else {
                    $popover.removeClass('placement-top');
                }
            }
        }
    } else {
        $popover.stop(true, true).fadeOut(150);
        $btn.removeClass('is-open').attr('aria-expanded', 'false');
    }
}

// Global delegated events for discount popover and table discount pills
$(document).on('click', '#odDiscountTriggerBtn, #odDiscountLabelTrigger', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleDiscountPopover();
});

$(document).on('keydown', '#odDiscountLabelTrigger', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDiscountPopover();
    }
});

$(document).on('click', '#odCloseDiscountPopover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    toggleDiscountPopover(false);
});

$(document).on('click', function (e) {
    if (!$(e.target).closest('.od-discount-popover-anchor, #odDiscountLabelTrigger').length) {
        toggleDiscountPopover(false);
    }
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        toggleDiscountPopover(false);
    }
});

$(document).on('click', '.od-table-discount-pill', function (e) {
    e.stopPropagation();
    const orderId = $(this).data('id');
    if (orderId) {
        viewOrderDetails(orderId);
    }
});
