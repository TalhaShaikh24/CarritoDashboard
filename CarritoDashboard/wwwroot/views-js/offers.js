/**
 * Carrito Dashboard - Offers & Coupons Module
 * Fully functional with CarritoWebAPI (/api/Coupon).
 */

let couponsList = [];
let customersCache = [];
let currentFilter = 'all'; // 'all' | 'active' | 'scheduled' | 'expired'
let currentSearch = '';
let activeViewMode = 'vouchers'; // 'vouchers' | 'table'

$(document).ready(function () {
    // 1. Initialize view mode from localStorage
    const savedView = localStorage.getItem('offers_view_mode');
    if (savedView === 'table') {
        switchViewMode('table');
    }

    // 2. Fetch customers first (to map customer names), then load coupons
    fetchCustomers().then(() => {
        loadCoupons();
    });

    // 3. Search listener with debounce
    let searchDebounceTimer;
    $('#offerSearchInput').on('input', function () {
        const val = $(this).val().trim();
        currentSearch = val;
        $('#btnOfferSearchClear').toggle(val.length > 0);

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            renderCoupons();
        }, 250);
    });

    $('#btnOfferSearchClear').on('click', function () {
        $('#offerSearchInput').val('').focus();
        currentSearch = '';
        $(this).hide();
        renderCoupons();
    });

    // 4. Status Filter Tabs
    $('.offers-tab-btn').on('click', function () {
        $('.offers-tab-btn').removeClass('active');
        $(this).addClass('active');
        currentFilter = $(this).data('filter');
        renderCoupons();
    });

    // 5. View Mode Switcher
    $('#btnViewVouchers').on('click', function () {
        switchViewMode('vouchers');
    });

    $('#btnViewTable').on('click', function () {
        switchViewMode('table');
    });

    // 6. Refresh button
    $('#btnRefreshCoupons').on('click', function () {
        const $icon = $(this).find('svg, i');
        $icon.addClass('spin');
        loadCoupons().finally(() => {
            setTimeout(() => $icon.removeClass('spin'), 500);
        });
    });

    // 7. Create Coupon Button
    $('#btnAddNewOffer, #btnEmptyCreateCoupon').on('click', function () {
        openCreateCouponModal();
    });

    // 8. Copy coupon code to clipboard
    $(document).on('click', '.voucher-copy-btn', function (e) {
        e.stopPropagation();
        const code = $(this).data('code');
        if (!code) return;

        navigator.clipboard.writeText(code).then(() => {
            const $btn = $(this);
            const originalHtml = $btn.html();
            $btn.addClass('copied').html('<i data-lucide="check" style="width: 13px; height: 13px;"></i> Copied!');
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                $btn.removeClass('copied').html(originalHtml);
                if (window.lucide) lucide.createIcons();
            }, 1800);
        }).catch(() => {
            // Fallback for older browsers
            prompt("Copy this coupon code:", code);
        });
    });

    // 9. Edit Coupon Click
    $(document).on('click', '.btn-edit-coupon', function (e) {
        e.stopPropagation();
        const id = parseInt($(this).data('id'), 10);
        const coupon = couponsList.find(c => c.id === id);
        if (coupon) {
            openEditCouponModal(coupon);
        } else {
            showNotification("Coupon not found in memory", "error");
        }
    });
});

// -----------------------------------------------------------------------------
// 1. API: Load Coupons
// -----------------------------------------------------------------------------
function loadCoupons() {
    return new Promise((resolve) => {
        ajaxRequest({
            url: `${baseApiUrl}/api/Coupon?PageNumber=1&PageSize=100`,
            method: 'GET',
            showMessage: false,
            onSuccess: (response) => {
                if (response && response.status === 200 && response.data) {
                    couponsList = response.data.items || [];
                    updateMetrics();
                    renderCoupons();
                } else {
                    couponsList = [];
                    updateMetrics();
                    renderCoupons();
                }
                resolve();
            },
            onError: (xhr) => {
                console.warn("Failed to fetch coupons from API:", xhr);
                const errMsg = xhr.responseJSON?.responseMsg || "Could not connect to API at " + baseApiUrl;
                showNotification(errMsg, "error");
                couponsList = [];
                updateMetrics();
                renderCoupons();
                resolve();
            }
        });
    });
}

// -----------------------------------------------------------------------------
// 2. API: Fetch Customers for Targeting Dropdown
// -----------------------------------------------------------------------------
function fetchCustomers() {
    return new Promise((resolve) => {
        $.ajax({
            url: `${baseApiUrl}/api/Customer?PageNumber=1&PageSize=100`,
            type: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken') || ''}`
            },
            success: (response) => {
                if (response && response.status === 200 && response.data) {
                    customersCache = response.data.items || [];
                }
                resolve();
            },
            error: () => {
                customersCache = [];
                resolve();
            }
        });
    });
}

function getCustomerName(customerId) {
    if (!customerId || customerId <= 0) {
        return "All Customers (Public)";
    }
    const cust = customersCache.find(c => c.id === customerId);
    if (cust) {
        return cust.fullName || cust.phone || `Customer #${customerId}`;
    }
    return `Customer #${customerId}`;
}

// -----------------------------------------------------------------------------
// 3. Status Determination Helper
// -----------------------------------------------------------------------------
function getCouponStatus(coupon) {
    const now = new Date();
    const start = new Date(coupon.startDate);
    const expiry = new Date(coupon.expiryDate);

    if (now < start) {
        return { text: "Scheduled", class: "scheduled", color: "#0284c7" };
    }
    if (now > expiry) {
        return { text: "Expired", class: "expired", color: "#dc2626" };
    }
    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
        return { text: "Limit Reached", class: "expired", color: "#dc2626" };
    }
    return { text: "Active", class: "active", color: "#0aa64a" };
}

// -----------------------------------------------------------------------------
// 4. Update Summary Metric Stats
// -----------------------------------------------------------------------------
function updateMetrics() {
    let total = couponsList.length;
    let active = 0;
    let expired = 0;
    let redemptions = 0;

    couponsList.forEach(c => {
        redemptions += (c.usageCount || 0);
        const st = getCouponStatus(c);
        if (st.class === 'active') active++;
        else if (st.class === 'expired') expired++;
    });

    $('#statTotalCoupons').text(total);
    $('#statActiveCoupons').text(active);
    $('#statExpiredCoupons').text(expired);
    $('#statTotalRedemptions').text(redemptions.toLocaleString());
}

// -----------------------------------------------------------------------------
// 5. Render Coupons (Vouchers & Table)
// -----------------------------------------------------------------------------
function getFilteredCoupons() {
    return couponsList.filter(c => {
        // Status filter
        const status = getCouponStatus(c);
        if (currentFilter === 'active' && status.class !== 'active') return false;
        if (currentFilter === 'scheduled' && status.class !== 'scheduled') return false;
        if (currentFilter === 'expired' && status.class !== 'expired') return false;

        // Search keyword
        if (currentSearch) {
            const term = currentSearch.toLowerCase();
            const matchCode = (c.code || '').toLowerCase().includes(term);
            const matchCust = getCustomerName(c.customerId).toLowerCase().includes(term);
            if (!matchCode && !matchCust) return false;
        }

        return true;
    });
}

function renderCoupons() {
    const filtered = getFilteredCoupons();
    const $grid = $('#offersVouchersGrid');
    const $tbody = $('#offersTableTbody');
    const $empty = $('#offersEmptyState');

    $grid.empty();
    $tbody.empty();

    if (filtered.length === 0) {
        $grid.hide();
        $('#offersTableView').hide();
        $empty.show();
        if (window.lucide) lucide.createIcons();
        return;
    }

    $empty.hide();

    if (activeViewMode === 'vouchers') {
        $grid.show();
        $('#offersTableView').hide();
    } else {
        $grid.hide();
        $('#offersTableView').show();
    }

    filtered.forEach(c => {
        const status = getCouponStatus(c);
        const isPercentage = (c.discountPercentage && c.discountPercentage > 0);
        const discountText = isPercentage 
            ? `${c.discountPercentage}%` 
            : `Rs. ${Number(c.discountValue || 0).toLocaleString()}`;
        const discountSub = isPercentage ? "OFF" : "FLAT OFF";

        const startFormatted = c.startDate ? new Date(c.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        const expiryFormatted = c.expiryDate ? new Date(c.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        // Expiry countdown / urgency
        const daysLeft = Math.ceil((new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        let expiryUrgency = `Expires: ${expiryFormatted}`;
        let isUrgent = false;

        if (status.class === 'expired') {
            expiryUrgency = `Expired on ${expiryFormatted}`;
        } else if (daysLeft === 0) {
            expiryUrgency = `Expires Today!`;
            isUrgent = true;
        } else if (daysLeft > 0 && daysLeft <= 3) {
            expiryUrgency = `${daysLeft} days left!`;
            isUrgent = true;
        }

        // Usage progress calculation
        const limit = c.usageLimit || 100;
        const count = c.usageCount || 0;
        const usagePercent = Math.min(100, Math.round((count / limit) * 100));
        let usageFillClass = "";
        if (usagePercent >= 90) usageFillClass = "near-limit";
        if (usagePercent >= 100) usageFillClass = "full";

        const customerName = getCustomerName(c.customerId);

        // 1. Voucher Card HTML
        const cardHtml = `
            <div class="coupon-voucher-card" data-id="${c.id}">
                <!-- Header -->
                <div class="voucher-head ${status.class}">
                    <div class="voucher-head-top">
                        <span class="voucher-badge">${status.text}</span>
                        <div class="voucher-actions">
                            <button type="button" class="voucher-action-btn btn-edit-coupon" data-id="${c.id}" title="Edit Coupon">
                                <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Code box with Copy -->
                    <div class="voucher-code-row">
                        <span class="voucher-code-text">${c.code}</span>
                        <button type="button" class="voucher-copy-btn" data-code="${c.code}" title="Copy Code">
                            <i data-lucide="copy" style="width: 13px; height: 13px;"></i> Copy
                        </button>
                    </div>

                    <!-- Big Discount -->
                    <div class="voucher-discount-val">
                        ${discountText} <small>${discountSub}</small>
                    </div>
                </div>

                <!-- Perforation Notch Line -->
                <div class="voucher-perforation">
                    <div class="voucher-perforation-line"></div>
                </div>

                <!-- Body Details -->
                <div class="voucher-body">
                    <div class="voucher-specs-grid">
                        <div class="voucher-spec-item">
                            <span class="voucher-spec-label">Min. Order</span>
                            <span class="voucher-spec-value">${c.minOrderValue > 0 ? `Rs. ${Number(c.minOrderValue).toLocaleString()}` : 'No Min.'}</span>
                        </div>
                        <div class="voucher-spec-item">
                            <span class="voucher-spec-label">Max. Discount</span>
                            <span class="voucher-spec-value">${c.maxOrderAmount > 0 ? `Rs. ${Number(c.maxOrderAmount).toLocaleString()}` : (isPercentage ? 'No Cap' : 'N/A')}</span>
                        </div>
                    </div>

                    <!-- Usage Meter -->
                    <div class="voucher-usage-wrap">
                        <div class="voucher-usage-labels">
                            <span>Redemptions</span>
                            <span><strong>${count}</strong> / ${limit} (${usagePercent}%)</span>
                        </div>
                        <div class="voucher-progress-bar">
                            <div class="voucher-progress-fill ${usageFillClass}" style="width: ${usagePercent}%;"></div>
                        </div>
                    </div>

                    <!-- Target audience -->
                    <div>
                        <span class="voucher-target-pill" title="${customerName}">
                            <i data-lucide="${c.customerId > 0 ? 'user' : 'users'}" style="width: 12px; height: 12px;"></i>
                            ${customerName}
                        </span>
                    </div>

                    <!-- Footer -->
                    <div class="voucher-footer">
                        <div class="voucher-expiry-chip ${isUrgent ? 'expiring-soon' : ''}">
                            <i data-lucide="clock" style="width: 13px; height: 13px;"></i>
                            <span>${expiryUrgency}</span>
                        </div>
                        <span style="font-size: 10.5px; color: #94a3b8;">${startFormatted} &bull; ${expiryFormatted}</span>
                    </div>
                </div>
            </div>
        `;
        $grid.append(cardHtml);

        // 2. Table Row HTML
        const rowHtml = `
            <tr>
                <td><strong style="font-family: monospace; font-size: 14px; letter-spacing: 0.05em; color: #0aa64a;">${c.code}</strong></td>
                <td><strong>${discountText} ${discountSub}</strong></td>
                <td>${c.minOrderValue > 0 ? `Rs. ${Number(c.minOrderValue).toLocaleString()}` : '-'}</td>
                <td>${c.maxOrderAmount > 0 ? `Rs. ${Number(c.maxOrderAmount).toLocaleString()}` : '-'}</td>
                <td>
                    <span style="font-size: 12px;">${startFormatted} &rarr; ${expiryFormatted}</span>
                </td>
                <td>
                    <div style="font-size: 12px; font-weight: 700;">${count} / ${limit}</div>
                    <div class="voucher-progress-bar" style="width: 80px; margin-top: 3px;">
                        <div class="voucher-progress-fill ${usageFillClass}" style="width: ${usagePercent}%;"></div>
                    </div>
                </td>
                <td>
                    <span class="voucher-target-pill">
                        <i data-lucide="${c.customerId > 0 ? 'user' : 'users'}" style="width: 12px; height: 12px;"></i>
                        ${customerName}
                    </span>
                </td>
                <td><span class="status-badge ${status.class}">${status.text}</span></td>
                <td class="text-center">
                    <button class="action-btn edit btn-edit-coupon" data-id="${c.id}" title="Edit Coupon">
                        <i data-lucide="square-pen" style="width: 16px; height: 16px;"></i>
                    </button>
                </td>
            </tr>
        `;
        $tbody.append(rowHtml);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

function switchViewMode(mode) {
    activeViewMode = mode;
    localStorage.setItem('offers_view_mode', mode);

    if (mode === 'vouchers') {
        $('#btnViewVouchers').addClass('active');
        $('#btnViewTable').removeClass('active');
        $('#offersVouchersGrid').show();
        $('#offersTableView').hide();
    } else {
        $('#btnViewTable').addClass('active');
        $('#btnViewVouchers').removeClass('active');
        $('#offersVouchersGrid').hide();
        $('#offersTableView').show();
    }

    if (window.lucide) lucide.createIcons();
}

// -----------------------------------------------------------------------------
// 6. CREATE COUPON MODAL & SUBMISSION (POST api/Coupon)
// -----------------------------------------------------------------------------
function openCreateCouponModal() {
    const template = $('#couponModalTemplate').html();

    $.dynamicModal({
        title: "Create Promotional Coupon",
        bodyHtml: template,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Save & Publish Coupon", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitCreateCoupon();
                return false; // prevent premature close; close handled in AJAX onSuccess
            }
        }
    });

    // Populate customer options in modal
    populateCustomerDropdown('#modalCustomerId');

    // Set default dates (Today and 30 days from today)
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30);

    $('#modalStartDate').val(today.toISOString().split('T')[0]);
    $('#modalExpiryDate').val(expiry.toISOString().split('T')[0]);

    // Setup Discount Type Switcher inside modal
    let selectedType = 1; // 1 = Percentage, 2 = Amount
    $('#btnDiscTypePercent').on('click', function () {
        selectedType = 1;
        $('#btnDiscTypePercent').addClass('active');
        $('#btnDiscTypeAmount').removeClass('active');
        $('#lblDiscountValue').html('Discount Percentage (%) <span class="text-danger">*</span>');
        $('#modalDiscountValue').attr('placeholder', 'e.g. 20 (for 20% off)').attr('max', '100');
        $('#groupMaxDiscount').show();
    });

    $('#btnDiscTypeAmount').on('click', function () {
        selectedType = 2;
        $('#btnDiscTypeAmount').addClass('active');
        $('#btnDiscTypePercent').removeClass('active');
        $('#lblDiscountValue').html('Flat Discount Amount (Rs.) <span class="text-danger">*</span>');
        $('#modalDiscountValue').attr('placeholder', 'e.g. 250 (for Rs. 250 off)').removeAttr('max');
        $('#groupMaxDiscount').hide();
    });

    // Random code generator
    $('#btnGenerateRandomCode').on('click', function () {
        const prefixes = ["SAVE", "FLASH", "DEAL", "CARRITO", "EID", "SUPER", "WEEKEND"];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNum = Math.floor(10 + Math.random() * 90);
        $('#modalCouponCode').val(`${randomPrefix}${randomNum}`).focus();
    });

    if (window.lucide) lucide.createIcons();
}

function submitCreateCoupon() {
    const code = $('#modalCouponCode').val().trim().toUpperCase();
    const discountType = $('#btnDiscTypePercent').hasClass('active') ? 1 : 2;
    const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;
    const minOrderValue = parseFloat($('#modalMinOrderValue').val()) || null;
    const maxDiscountAmount = parseFloat($('#modalMaxDiscount').val()) || null;
    const startDate = $('#modalStartDate').val();
    const expiryDate = $('#modalExpiryDate').val();
    const usageLimit = parseInt($('#modalUsageLimit').val(), 10) || 100;
    const customerIdVal = $('#modalCustomerId').val();
    const customerId = customerIdVal ? parseInt(customerIdVal, 10) : null;

    // Frontend Validations
    if (!code || code.length < 3) {
        showNotification("Please enter a valid coupon code (min 3 characters).", "error");
        $('#modalCouponCode').focus();
        return;
    }

    if (discountValue <= 0) {
        showNotification("Please specify a valid discount value greater than 0.", "error");
        $('#modalDiscountValue').focus();
        return;
    }

    if (discountType === 1 && discountValue > 100) {
        showNotification("Percentage discount cannot exceed 100%.", "error");
        $('#modalDiscountValue').focus();
        return;
    }

    if (!startDate || !expiryDate) {
        showNotification("Please select both start date and expiry date.", "error");
        return;
    }

    if (new Date(expiryDate) < new Date(startDate)) {
        showNotification("Expiry date must be on or after the start date.", "error");
        $('#modalExpiryDate').focus();
        return;
    }

    // Build Payload matching CouponCreateDTO exactly:
    const payload = {
        customerId: customerId,
        code: code,
        discountType: discountType,
        discountValue: discountValue,
        minOrderValue: minOrderValue,
        maxDiscountAmount: (discountType === 1) ? maxDiscountAmount : null,
        startDate: new Date(startDate + "T00:00:00").toISOString(),
        expiryDate: new Date(expiryDate + "T23:59:59").toISOString(),
        usageLimit: usageLimit
    };

    showNotification("Saving coupon...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Coupon`,
        method: 'POST',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (res) => {
            if (res && res.status === 200) {
                $.dynamicModal.close();
                showNotification(`Coupon "${code}" created successfully!`, "success");
                loadCoupons();
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create coupon.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// 7. EDIT COUPON MODAL & SUBMISSION (PUT api/Coupon/{id})
// -----------------------------------------------------------------------------
function openEditCouponModal(coupon) {
    const template = $('#couponModalTemplate').html();

    $.dynamicModal({
        title: `Edit Coupon: ${coupon.code}`,
        bodyHtml: template,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Coupon", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitUpdateCoupon(coupon.id);
                return false;
            }
        }
    });

    // Populate customer options
    populateCustomerDropdown('#modalCustomerId');

    // Code is primary identifier - backend CouponUpdateDTO does not accept code updates
    $('#modalCouponId').val(coupon.id);
    $('#modalCouponCode').val(coupon.code).prop('disabled', true).css('background', '#f1f5f9');
    $('#btnGenerateRandomCode').hide();
    $('#codeHelpText').text('Coupon code cannot be changed once created. Other parameters can be updated.');

    // Determine existing discount type
    const isPercentage = (coupon.discountPercentage && coupon.discountPercentage > 0);
    const existingVal = isPercentage ? coupon.discountPercentage : coupon.discountValue;

    if (isPercentage) {
        $('#btnDiscTypePercent').addClass('active');
        $('#btnDiscTypeAmount').removeClass('active');
        $('#lblDiscountValue').html('Discount Percentage (%) <span class="text-danger">*</span>');
        $('#modalDiscountValue').val(existingVal).attr('placeholder', 'e.g. 20').attr('max', '100');
        $('#groupMaxDiscount').show();
    } else {
        $('#btnDiscTypeAmount').addClass('active');
        $('#btnDiscTypePercent').removeClass('active');
        $('#lblDiscountValue').html('Flat Discount Amount (Rs.) <span class="text-danger">*</span>');
        $('#modalDiscountValue').val(existingVal).attr('placeholder', 'e.g. 250').removeAttr('max');
        $('#groupMaxDiscount').hide();
    }

    $('#btnDiscTypePercent').on('click', function () {
        $('#btnDiscTypePercent').addClass('active');
        $('#btnDiscTypeAmount').removeClass('active');
        $('#lblDiscountValue').html('Discount Percentage (%) <span class="text-danger">*</span>');
        $('#modalDiscountValue').attr('placeholder', 'e.g. 20').attr('max', '100');
        $('#groupMaxDiscount').show();
    });

    $('#btnDiscTypeAmount').on('click', function () {
        $('#btnDiscTypeAmount').addClass('active');
        $('#btnDiscTypePercent').removeClass('active');
        $('#lblDiscountValue').html('Flat Discount Amount (Rs.) <span class="text-danger">*</span>');
        $('#modalDiscountValue').attr('placeholder', 'e.g. 250').removeAttr('max');
        $('#groupMaxDiscount').hide();
    });

    if (coupon.minOrderValue > 0) $('#modalMinOrderValue').val(coupon.minOrderValue);
    if (coupon.maxOrderAmount > 0) $('#modalMaxDiscount').val(coupon.maxOrderAmount);
    $('#modalUsageLimit').val(coupon.usageLimit || 100);

    if (coupon.startDate) {
        const sDate = new Date(coupon.startDate).toISOString().split('T')[0];
        $('#modalStartDate').val(sDate);
    }
    if (coupon.expiryDate) {
        const eDate = new Date(coupon.expiryDate).toISOString().split('T')[0];
        $('#modalExpiryDate').val(eDate);
    }

    if (coupon.customerId > 0) {
        $('#modalCustomerId').val(coupon.customerId);
    }

    if (window.lucide) lucide.createIcons();
}

function submitUpdateCoupon(couponId) {
    const discountType = $('#btnDiscTypePercent').hasClass('active') ? 1 : 2;
    const discountValue = parseFloat($('#modalDiscountValue').val()) || 0;
    const minOrderValue = parseFloat($('#modalMinOrderValue').val()) || null;
    const maxDiscountAmount = parseFloat($('#modalMaxDiscount').val()) || null;
    const startDate = $('#modalStartDate').val();
    const expiryDate = $('#modalExpiryDate').val();
    const usageLimit = parseInt($('#modalUsageLimit').val(), 10) || 100;
    const customerIdVal = $('#modalCustomerId').val();
    const customerId = customerIdVal ? parseInt(customerIdVal, 10) : null;

    if (discountValue <= 0) {
        showNotification("Please specify a valid discount value.", "error");
        return;
    }

    if (discountType === 1 && discountValue > 100) {
        showNotification("Percentage discount cannot exceed 100%.", "error");
        return;
    }

    if (!startDate || !expiryDate) {
        showNotification("Please select both start date and expiry date.", "error");
        return;
    }

    if (new Date(expiryDate) < new Date(startDate)) {
        showNotification("Expiry date must be on or after start date.", "error");
        return;
    }

    // Build Payload matching CouponUpdateDTO exactly:
    const payload = {
        customerId: customerId,
        discountType: discountType,
        discountValue: discountValue,
        minOrderValue: minOrderValue,
        maxDiscountAmount: (discountType === 1) ? maxDiscountAmount : null,
        startDate: new Date(startDate + "T00:00:00").toISOString(),
        expiryDate: new Date(expiryDate + "T23:59:59").toISOString(),
        usageLimit: usageLimit
    };

    showNotification("Updating coupon...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Coupon/${couponId}`,
        method: 'PUT',
        data: payload,
        contentType: 'application/json',
        showMessage: true,
        onSuccess: (res) => {
            if (res && res.status === 200) {
                $.dynamicModal.close();
                showNotification("Coupon updated successfully!", "success");
                loadCoupons();
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update coupon.";
            showNotification(msg, "error");
        }
    });
}

// -----------------------------------------------------------------------------
// 8. Helper: Populate Customer Dropdown
// -----------------------------------------------------------------------------
function populateCustomerDropdown(selector) {
    const $select = $(selector);
    $select.find('option:not(:first)').remove();

    customersCache.forEach(cust => {
        const name = cust.fullName || cust.phone || `Customer #${cust.id}`;
        $select.append(`<option value="${cust.id}">${name} (${cust.phone || 'No phone'})</option>`);
    });
}
