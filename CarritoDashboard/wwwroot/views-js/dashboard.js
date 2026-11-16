$(document).ready(() => {
    const baseApiUrl = window.baseApiUrl;

    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName() || 'My Store';
        $('.dash-page-heading').text(`${storeName} Overview`);
        $('#cityFilter').hide().next('.custom-select-wrapper').hide();
        $('#topSellersBlock').hide();
        $('#topRidersBlock').hide();

        // Hide Admin Stats
        $('#box-commission').hide();
        $('#box-customers').hide();
        $('#box-storekeepers').hide();
        $('#box-online-storekeepers-label').hide();
        $('#box-riders').hide();
        $('#box-online-riders-label').hide();
    }
    else {
        $('#recentOrdersBlock').hide();

        // Hide Storekeeper Stats
        $('#box-purchase').hide();
        $('#box-purchase-invoices').hide();
        $('#box-average-order-value').hide();
        $('#box-products').hide();
    }

    const state = {
        fromDate: null,
        toDate: null,
        city: null,
        charts: {
            revenue: null
        }
    };

    // Set default range (Last 30 Days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // --- Initialization ---
    initDatePicker(thirtyDaysAgo, today);
    initFilterButtons();
    loadCities();

    updateStateDates(thirtyDaysAgo, today);
    refreshDashboard();

    // Re-check if storekeeper data was loaded asynchronously
    $(document).on('storekeeperReady', function (e, skp) {
        currentUser = skp;
        if (skp.storeName) {
            $('.dash-page-heading').text(`${skp.storeName} Overview`);
        }
        $('#cityFilter').hide().next('.custom-select-wrapper').hide();
        $('#topSellersBlock').hide();
        $('#topRidersBlock').hide();
        refreshDashboard();
    });

    function initDatePicker(start, end) {
        $('#dashboardDateRange').dateRangePicker({
            initialStart: start,
            initialEnd: end,
            onSelect: function (range) {
                updateStateDates(range.start, range.end);
            }
        });
    }

    function initFilterButtons() {
        $('#cityFilter').on('change', function () {
            state.city = !$(this).val() || $(this).val() == 'All Cities' ? null : $(this).val();
        });

        $('#btnApply').on('click', function () {
            refreshDashboard();
        });

        $('#btnClear').on('click', function () {
            $('#cityFilter').val('').trigger('change');
            if ($('#cityFilter').data('customSelect')) {
                $('#cityFilter').customSelect('refresh');
            }
            state.city = null;

            const t = new Date();
            const start = new Date();
            start.setDate(t.getDate() - 30);
            updateStateDates(start, t);

            refreshDashboard();
        });
    }

    function loadCities() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetCities`,
            method: 'GET',
            showMessage: false,
            onSuccess: (res) => {
                const rawCities = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
                const $cityFilter = $('#cityFilter');
                const currentCity = state.city || $cityFilter.val() || '';

                $cityFilter.empty().append('<option value="All Cities">All Cities</option>');

                const cities = Array.from(new Set(
                    rawCities
                        .filter(c => c && typeof c === 'string' && c.trim().length > 0)
                        .map(c => c.trim())
                )).sort((a, b) => a.localeCompare(b));

                cities.forEach(city => {
                    const isSelected = city === currentCity;
                    $cityFilter.append(new Option(city, city, isSelected, isSelected));
                });

                if (currentCity && cities.includes(currentCity)) {
                    $cityFilter.val(currentCity);
                } else {
                    $cityFilter.val('');
                    state.city = null;
                }

                if ($cityFilter.data('customSelect')) {
                    $cityFilter.customSelect('refresh');
                } else {
                    $cityFilter.customSelect({ placeholder: 'All Cities' });
                }

                if (AuthHelper.isStorekeeper()) {
                    $cityFilter.hide().next('.custom-select-wrapper').hide();
                }
            },
            onError: (err) => {
                $('#popup-overlay').remove();
                console.error('Failed to load cities:', err);
            }
        });
    }

    function updateStateDates(start, end) {
        state.fromDate = formatDate(start);
        state.toDate = formatDate(end);

        const displayFormat = { day: '2-digit', month: 'short', year: 'numeric' };
        const text = `${start.toLocaleDateString('en-GB', displayFormat)} - ${end.toLocaleDateString('en-GB', displayFormat)}`;
        $('#dashboardDateRange .date-text').text(text);
    }

    function refreshDashboard() {
        if (AuthHelper.isStorekeeper()) {
            const skpId = AuthHelper.getStorekeeperId();
            loadStats(skpId);
            loadRevenueChart(skpId);
            loadRecentOrders(skpId);
            loadTopProducts(skpId);
        }
        else {
            loadStats();
            loadRevenueChart();
            loadTopProducts();
            loadTopSellers();
            loadTopRiders();
        }
    }

    // --- Data Loading ---
    function loadStats(skpId) {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetStats`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, storekeeperId: skpId, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                if (res && res.data) {
                    const data = res.data;
                    debugger;
                    // Shared Stats
                    $('#stat-revenue').text(formatCompactCurrency(data.TotalRevenue)).attr('title', formatCurrency(data.TotalRevenue));
                    $('#stat-orders').text(data.OrdersDelivered);
                    $('#stat-canceled-label').text(`${data.OrdersCanceled} Canceled`);

                    // Storekeeper Stats
                    if (skpId) {
                        $('#stat-purchase').text(formatCompactCurrency(data.TotalPurchase)).attr('title', formatCurrency(data.TotalPurchase));
                        $('#stat-purchase-invoices').text(data.TotalPurchaseInvoices);
                        $('#stat-average-order-value').text(formatCompactCurrency(data.AverageOrderValue)).attr('title', formatCurrency(data.AverageOrderValue));
                        $('#stat-products').text(data.TotalProducts);
                    }
                    // Admin Stats
                    else {
                        $('#stat-commission').text(formatCompactCurrency(data.Commission)).attr('title', formatCurrency(data.Commission));
                        $('#stat-customers').text(data.ActiveCustomers);
                        $('#stat-storekeepers').text(data.ActiveStorekeepers);
                        $('#stat-online-storekeepers-label').text(`${data.OnlineStorekeepers} Online`);
                        $('#stat-riders').text(data.ActiveRiders);
                        $('#stat-online-riders-label').text(`${data.OnlineRiders} Online`);
                    }
                }
            }
        });
    }

    function loadRevenueChart(skpId) {
        let revenueData = [], purchaseData = [];
        let expected = skpId ? 2 : 1;
        let loaded = 0;

        function tryRender() {
            if (++loaded === expected) renderRevenueChart(revenueData, purchaseData);
        }

        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetRevenue`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, storekeeperId: skpId, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => { revenueData = res.data || []; tryRender(); }
        });

        if (skpId) {
            ajaxRequest({
                url: `${baseApiUrl}/api/Dashboard/GetPurchases`,
                method: 'GET',
                data: { fromDate: state.fromDate, toDate: state.toDate, storekeeperId: skpId, city: state.city },
                isQuery: true,
                showMessage: false,
                onSuccess: (res) => { purchaseData = res.data || []; tryRender(); }
            });
        }
    }

    function loadRecentOrders(skpId) {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetRecentOrders`,
            method: 'GET',
            data: { storekeeperId: skpId },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderRecentOrders(res.data || []);
            }
        });
    }

    function loadTopProducts(skpId) {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetTopSellingItems`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, storekeeperId: skpId, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderTopProducts(res.data || []);
            }
        });
    }

    function loadTopSellers() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetTopSellers`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderTopSellers(res.data || []);
            }
        });
    }

    function loadTopRiders() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetTopRiders`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderTopRiders(res.data || []);
            }
        });
    }

    // --- Render Functions ---

    function buildValues(data, mode, fromDate, toDate) {
        const buckets = {};

        data.forEach(item => {
            const d = new Date(item.Date);
            if (isNaN(d)) return;
            let key;
            if (mode === 'yearly') key = String(d.getFullYear());
            else if (mode === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            else key = d.toISOString().slice(0, 10);
            buckets[key] = (buckets[key] || 0) + (item.Revenue ?? item.Purchase ?? 0);
        });

        const allKeys = [];
        if (mode === 'yearly') {
            for (let y = fromDate.getFullYear(); y <= toDate.getFullYear(); y++) allKeys.push(String(y));
        } else if (mode === 'monthly') {
            const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
            const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
            while (cursor <= end) {
                allKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
                cursor.setMonth(cursor.getMonth() + 1);
            }
        } else {
            const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
            const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
            while (cursor <= end) {
                allKeys.push(cursor.toISOString().slice(0, 10));
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        return allKeys.map(k => buckets[k] || 0);
    }

    function renderRevenueChart(revenueData, purchaseData = []) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (state.charts.revenue) state.charts.revenue.destroy();

        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const fromDate = state.fromDate ? new Date(state.fromDate) : new Date();
        const toDate = state.toDate ? new Date(state.toDate) : new Date();
        const spanMonths = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());

        let mode;
        if (spanMonths <= 1) {
            mode = 'daily';
        } else if (spanMonths <= 12) {
            mode = 'monthly';
        } else {
            mode = 'yearly';
        }

        const badgeLabels = { daily: 'Daily Trajectory', monthly: 'Monthly Trajectory', yearly: 'Yearly Trajectory' };
        $('#revenueChartBadge').text(badgeLabels[mode]);

        let labels, allKeys = [];

        // Build labels and keys
        if (mode === 'yearly') {
            for (let y = fromDate.getFullYear(); y <= toDate.getFullYear(); y++) allKeys.push(String(y));
            labels = allKeys;
        } else if (mode === 'monthly') {
            const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
            const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
            while (cursor <= endMonth) {
                allKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
                cursor.setMonth(cursor.getMonth() + 1);
            }
            labels = allKeys.map(k => {
                const [y, m] = k.split('-');
                return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
            });
        } else {
            const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
            const endDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
            while (cursor <= endDay) {
                allKeys.push(cursor.toISOString().slice(0, 10));
                cursor.setDate(cursor.getDate() + 1);
            }
            labels = allKeys.map(k => {
                const d = new Date(k);
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            });
        }

        const revenueValues = buildValues(revenueData, mode, fromDate, toDate);
        const purchaseValues = buildValues(purchaseData, mode, fromDate, toDate);

        const datasets = [
            {
                label: 'Gross Revenue',
                data: revenueValues,
                backgroundColor: 'rgba(10, 166, 74, 0.75)',
                hoverBackgroundColor: '#0aa64a',
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40
            }
        ];

        // Only add purchases dataset if purchase data exists
        if (purchaseData.length > 0) {
            datasets.push({
                label: 'Gross Purchases',
                data: purchaseValues,
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                hoverBackgroundColor: '#3b82f6',
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 40
            });
        }

        state.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: purchaseData.length > 0 },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 11, family: "'Inter', sans-serif" },
                        bodyFont: { size: 12, family: "'Inter', sans-serif", weight: 'bold' },
                        padding: 8,
                        cornerRadius: 4,
                        displayColors: purchaseData.length > 0,
                        callbacks: {
                            label: function (context) {
                                return `${context.dataset.label}: ` + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 10.5 },
                            color: '#94a3b8',
                            callback: function (val) {
                                if (val >= 1000000) return 'Rs ' + (val / 1000000).toFixed(1) + 'M';
                                if (val >= 1000) return 'Rs ' + (val / 1000).toFixed(0) + 'k';
                                return 'Rs ' + val;
                            }
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#64748b'
                        }
                    }
                }
            }
        });
    }

    function renderRecentOrders(orders) {
        const $container = $('#recentOrdersList');
        $container.empty();
        if (!orders || orders.length === 0) {
            $container.html('<div class="empty-state">No recent orders found.</div>');
            return;
        }

        orders.forEach((order, index) => {
            const STATUS_TEXT = {
                1: "Pending", 2: "Confirmed", 3: "Rider Confirmed", 4: "Out for Delivery", 5: "Delivered", 5: "Cancelled", 6: "In Progress", 7: "Completed"
            };

            const orderNum = `#ORD-${String(order.Id).padStart(4, '0')}`;
            const dateStr = order.CreatedAt ? new Date(order.CreatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';
            const stText = STATUS_TEXT[order.Status];
            const price = formatCurrency(order.GrandTotal);

            const html = `
                <div class="compact-item">
                    <span class="compact-rank rank-other">${index + 1}</span>
                    <div class="compact-info">
                        <p class="compact-name">${orderNum}</p>
                        <p class="compact-sub">${dateStr} · <span style="color:#166534; font-weight:600;">${stText}</span></p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${price}</p>
                    </div>
                </div>
            `;
            $container.append(html);
        });
    }

    function renderTopProducts(items) {
        const $container = $('#topProductsList');
        $container.empty();
        if (!items || items.length === 0) {
            $container.html('<div class="empty-state">No product sales found.</div>');
            return;
        }

        items.forEach((item, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : 'rank-other';
            const imgPath = item.PhotoFilePath || '';
            const totalSold = item.TotalSold ?? item.totalSold ?? 0;

            const avatarHtml = imgPath
                ? `<img src="${imgPath}" class="compact-avatar" alt="${item.Title}">`
                : `<div class="compact-avatar-fallback">${initial}</div>`;

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    ${avatarHtml}
                    <div class="compact-info">
                        <p class="compact-name" title="${item.Title}">${item.Title}</p>
                        <p class="compact-sub">Rs ${new Intl.NumberFormat('en-IN').format(item.Price || 0)} / ${item.type == 2 ? weight + ` ` + unit : `CASE`}</p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${new Intl.NumberFormat('en-IN').format(totalSold)} sold</p>
                    </div>
                </div>
            `;
            $container.append(html);
        });
    }

    function renderTopSellers(items) {
        const $container = $('#topSellersList');
        $container.empty();
        if (!items || items.length === 0) {
            $container.html('<div class="empty-state">No store data found.</div>');
            return;
        }

        items.forEach((item, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : 'rank-other';
            const imgPath = item.ProfilePhotoFilePath || '';
            const initial = item.StoreName ? item.StoreName.charAt(0).toUpperCase() : 'S';

            const address = item.Address || item.address || '';
            const addressHtml = `<p class="compact-sub store-address" title="${address}" data-address="${address}" style="max-width:50%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;">${address}</p>`;

            const avatarHtml = imgPath
                ? `<img src="${imgPath}" class="compact-avatar" alt="${item.StoreName}">`
                : `<div class="compact-avatar-fallback">${initial}</div>`;

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    ${avatarHtml}
                    <div class="compact-info">
                        <p class="compact-name" title="${item.StoreName}">${item.StoreName}</p>
                        ${addressHtml}
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${formatCurrency(item.Revenue)}</p>
                    </div>
                </div>
            `;
            $container.append(html);
        });
    }

    function renderTopRiders(items) {
        const $container = $('#topRidersList');
        $container.empty();
        if (!items || items.length === 0) {
            $container.html('<div class="empty-state">No rider data found.</div>');
            return;
        }

        items.forEach((item, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : 'rank-other';
            const name = item.FullName ?? item.fullName ?? 'Rider';
            const imgPath = item.ProfilePhotoFilePath ?? item.profilePhotoFilePath ?? '';
            const delivered = item.OrdersDelivered ?? item.ordersDelivered ?? 0;
            const initial = name.charAt(0).toUpperCase();

            const avatarHtml = imgPath
                ? `<img src="${imgPath}" class="compact-avatar" alt="${name}">`
                : `<div class="compact-avatar-fallback">${initial}</div>`;

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    ${avatarHtml}
                    <div class="compact-info">
                        <p class="compact-name" title="${name}">${name}</p>
                        <p class="compact-sub">Rider</p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${delivered} delivered</p>
                    </div>
                </div>
            `;
            $container.append(html);
        });
    }

    // --- Helpers ---
    function formatDate(date) {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    }

    function formatCurrency(amount) {
        return 'Rs ' + new Intl.NumberFormat('en-IN').format(amount);
    }

    function formatCompactCurrency(amount) {
        const num = Number(amount) || 0;
        const abs = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        let formatted;
        if (abs >= 1e9) {
            formatted = (abs / 1e9).toFixed(1).replace(/\.?0+$/, '') + ' B';
        } else if (abs >= 1e6) {
            formatted = (abs / 1e6).toFixed(1).replace(/\.?0+$/, '') + ' M';
        } else if (abs >= 1e3) {
            formatted = (abs / 1e3).toFixed(1).replace(/\.?0+$/, '') + ' K';
        } else {
            formatted = new Intl.NumberFormat('en-IN').format(abs);
        }

        return `Rs ${sign}${formatted}`;
    }
});