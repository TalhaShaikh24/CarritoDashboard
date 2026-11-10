$(document).ready(() => {
    const baseApiUrl = window.baseApiUrl;

    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName() || 'My Store';
        $('.dash-page-heading').text(`${storeName} Overview`);
        $('#cityFilter').hide().next('.custom-select-wrapper').hide();
        $('#topRidersBlock').hide();
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
            if (skpId) {
                loadStorekeeperDashboard(skpId);
                loadRevenueChart();
                return;
            }
        }
        loadStats();
        loadRevenueChart();
        loadTopProducts();
        loadTopSellers();
        loadTopRiders();
    }

    // --- Data Loading ---
    function loadStats() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetStats`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                if (res && res.data) {
                    const d = res.data;

                    // --- UPDATED STATS MAPPING ---
                    const rev = d.Revenue || d.revenue || 0;
                    const comm = d.CommissionCollected || d.commissionCollected || 0;

                    $('#stat-revenue').text(formatCompactCurrency(rev)).attr('title', formatCurrency(rev));
                    $('#stat-commission').text(formatCompactCurrency(comm)).attr('title', formatCurrency(comm));
                    $('#stat-customers').text(d.ActiveCustomers ?? d.activeCustomers ?? 0);
                    $('#stat-orders').text(d.OrdersDelivered ?? d.ordersDelivered ?? 0);
                    $('#stat-canceled-label').text(`${d.OrdersCanceled ?? d.ordersCanceled ?? 0} Canceled`);
                    $('#stat-storekeepers').text(d.ActiveStorekeepers ?? d.activeStorekeepers ?? 0);
                    $('#stat-online-storekeepers-label').text(`${d.OnlineStorekeepers ?? d.onlineStorekeepers ?? 0} Online`);
                    $('#stat-riders').text(d.ActiveRiders ?? d.activeRiders ?? 0);
                    $('#stat-online-riders-label').text(`${d.OnlineRiders ?? d.onlineRiders ?? 0} Online`);
                }
            }
        });
    }


    function loadRevenueChart() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetRevenue`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderRevenueChart(res.data || []);
            }
        });
    }

    function loadTopProducts() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetTopSellingItems`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
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

    function renderRevenueChart(data) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (state.charts.revenue) state.charts.revenue.destroy();

        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const fromDate = state.fromDate ? new Date(state.fromDate) : new Date();
        const toDate = state.toDate ? new Date(state.toDate) : new Date();
        const spanMonths = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());

        // Decide granularity
        // ≤ 1 month  → daily
        // 1–12 months → monthly
        // > 12 months → yearly
        let mode;
        if (spanMonths <= 1) {
            mode = 'daily';
        } else if (spanMonths <= 12) {
            mode = 'monthly';
        } else {
            mode = 'yearly';
        }

        // Update badge label
        const badgeLabels = { daily: 'Daily Trajectory', monthly: 'Monthly Trajectory', yearly: 'Yearly Trajectory' };
        $('#revenueChartBadge').text(badgeLabels[mode]);

        let labels, values;

        if (mode === 'yearly') {
            // Aggregate by year
            const buckets = {};
            data.forEach(item => {
                const d = new Date(item.Date ?? item.date);
                if (isNaN(d)) return;
                const key = String(d.getFullYear());
                buckets[key] = (buckets[key] || 0) + (item.Revenue ?? item.revenue ?? 0);
            });

            // Walk year-by-year from fromDate to toDate
            const allKeys = [];
            for (let y = fromDate.getFullYear(); y <= toDate.getFullYear(); y++) {
                allKeys.push(String(y));
            }

            labels = allKeys;
            values = allKeys.map(k => buckets[k] || 0);

        } else if (mode === 'monthly') {
            // Aggregate by month
            const buckets = {};
            data.forEach(item => {
                const d = new Date(item.Date ?? item.date);
                if (isNaN(d)) return;
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                buckets[key] = (buckets[key] || 0) + (item.Revenue ?? item.revenue ?? 0);
            });

            // Walk month-by-month from fromDate to toDate
            const allKeys = [];
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
            values = allKeys.map(k => buckets[k] || 0);

        } else {
            // Daily — build complete day-by-day list
            const buckets = {};
            data.forEach(item => {
                const d = new Date(item.Date ?? item.date);
                if (isNaN(d)) return;
                const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
                buckets[key] = (buckets[key] || 0) + (item.Revenue ?? item.revenue ?? 0);
            });

            const allKeys = [];
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
            values = allKeys.map(k => buckets[k] || 0);
        }

        state.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gross Revenue',
                    data: values,
                    backgroundColor: 'rgba(10, 166, 74, 0.75)',
                    hoverBackgroundColor: '#0aa64a',
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: { size: 11, family: "'Inter', sans-serif" },
                        bodyFont: { size: 12, family: "'Inter', sans-serif", weight: 'bold' },
                        padding: 8,
                        cornerRadius: 4,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                return 'Revenue: ' + formatCurrency(context.parsed.y);
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

    // --- Storekeeper Dashboard Logic ---
    function loadStorekeeperDashboard(skpId) {
        if (!skpId) return;

        // 1. Fetch Storekeeper Stats (Orders, Revenue, Avg Order Value, Recent Orders)
        ajaxRequest({
            url: `${baseApiUrl}/api/Storekeeper/GetStorekeeperStats/${skpId}`,
            method: 'GET',
            showMessage: false,
            onSuccess: (res) => {
                if (res && res.data) {
                    const d = res.data;

                    // 1. Total Revenue
                    const skpRev = d.TotalRevenue || 0;
                    const skpAov = d.AverageOrderValue || 0;
                    $('#stat-revenue').text(formatCompactCurrency(skpRev)).attr('title', formatCurrency(skpRev));

                    // 2. Average Order Value (Replaces Commission)
                    $('#stat-commission').text(formatCompactCurrency(skpAov)).attr('title', formatCurrency(skpAov));
                    $('#stat-commission').closest('.kpi-card').find('.kpi-label').text('Avg Order Value');
                    $('#stat-commission').closest('.kpi-card').find('.kpi-foot span').text('Per order');

                    // 3. Lifetime Orders (Replaces Customers)
                    $('#stat-customers').text(d.TotalOrders || 0);
                    $('#stat-customers').closest('.kpi-card').find('.kpi-label').text('Total Orders');
                    $('#stat-customers').closest('.kpi-card').find('.kpi-foot span').text('Lifetime');

                    // 4. Recent Orders count
                    const recentCount = (d.RecentOrders && d.RecentOrders.length) || 0;
                    $('#stat-orders').text(recentCount);
                    $('#stat-orders').closest('.kpi-card').find('.kpi-label').text('Recent Orders');
                    $('#stat-canceled-label').text('Recent activity');

                    // 6. Store Status
                    $('#stat-riders').text('Active');
                    $('#stat-riders').closest('.kpi-card').find('.kpi-label').text('Store Status');
                    $('#stat-riders').closest('.kpi-card').find('.kpi-foot span').text('Accepting orders');

                    // Render Recent Orders in place of "Top Stores"
                    renderStorekeeperRecentOrders(d.RecentOrders || []);
                }
            }
        });

        // 2. Fetch Storekeeper Inventory Count
        ajaxRequest({
            url: `${baseApiUrl}/api/Inventory/storekeeper/${skpId}?PageNumber=1&PageSize=1`,
            method: 'GET',
            showMessage: false,
            onSuccess: (res) => {
                if (res && res.data) {
                    $('#stat-storekeepers').text(res.data.totalRecords || 0);
                    $('#stat-storekeepers').closest('.kpi-card').find('.kpi-label').text('My Products');
                    $('#stat-storekeepers').closest('.kpi-card').find('.kpi-foot span').text('Active SKUs');
                }
            }
        });

        // 3. Load Store's Items in place of Top Products
        ajaxRequest({
            url: `${baseApiUrl}/api/Inventory/storekeeper/${skpId}?PageNumber=1&PageSize=5`,
            method: 'GET',
            showMessage: false,
            onSuccess: (res) => {
                if (res && res.data && res.data.items) {
                    renderStorekeeperInventoryHighlights(res.data.items);
                }
            }
        });
    }

    function renderStorekeeperRecentOrders(orders) {
        const $box = $('#topSellersList').closest('.dash-block');
        $box.find('.dash-block-title').text('My Recent Orders');
        $box.find('.dash-badge-neutral').text('Latest Orders');

        const $container = $('#topSellersList');
        $container.empty();
        if (!orders || orders.length === 0) {
            $container.html('<div class="empty-state">No recent orders found.</div>');
            return;
        }

        const STATUS_TEXT = {
            1: "Pending", 2: "Confirmed", 3: "Out for Delivery", 4: "Delivered", 5: "Cancelled", 6: "In Progress"
        };

        orders.forEach((order, index) => {
            const orderNum = `#ORD-${String(order.id).padStart(4, '0')}`;
            const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';
            const stText = STATUS_TEXT[order.status] || 'Processing';
            const price = formatCurrency(order.netPrice || 0);

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

    function renderStorekeeperInventoryHighlights(items) {
        const $box = $('#topProductsList').closest('.dash-block');
        $box.find('.dash-block-title').text('My Catalog Items');
        $box.find('.dash-badge-neutral').text('Store Inventory');

        const $container = $('#topProductsList');
        $container.empty();
        if (!items || items.length === 0) {
            $container.html('<div class="empty-state">No inventory items found.</div>');
            return;
        }

        items.forEach((item, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : 'rank-other';
            const price = formatCurrency(item.price || 0);
            const weight = item.weight ? `${item.weight} ${item.unitName || ''}` : (item.unitName || 'Unit');

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    <div class="compact-info">
                        <p class="compact-name" title="${item.title || ''}">${item.title || 'Product'}</p>
                        <p class="compact-sub">${item.categoryName || 'General'} · ${weight}</p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${price}</p>
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