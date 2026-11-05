$(document).ready(() => {
    const baseApiUrl = window.baseApiUrl;

    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName() || 'My Store';
        $('.dash-page-heading').text(`${storeName} Overview`);
        $('#cityFilter').closest('.custom-select-container, select').hide();
    }

    const state = {
        fromDate: null,
        toDate: null,
        city: null,
        charts: {
            revenue: null,
            category: null
        }
    };

    // --- Initialization ---
    initDatePicker();
    initFilterButtons();

    // Set default range (Last 30 Days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    updateStateDates(thirtyDaysAgo, today);
    refreshDashboard();

    // Re-check if storekeeper data was loaded asynchronously
    $(document).on('storekeeperReady', function (e, skp) {
        currentUser = skp;
        if (skp.storeName) {
            $('.dash-page-heading').text(`${skp.storeName} Overview`);
        }
        refreshDashboard();
    });

    function initDatePicker() {
        $('#dashboardDateRange').dateRangePicker({
            onSelect: function (range) {
                updateStateDates(range.start, range.end);
            }
        });
    }

    function initFilterButtons() {
        $('#cityFilter').on('change', function () {
            state.city = $(this).val() || null;
        });

        $('#btnApply').on('click', function () {
            refreshDashboard();
        });

        $('#btnClear').on('click', function () {
            $('#cityFilter').val('').trigger('change');
            state.city = null;

            const t = new Date();
            const start = new Date();
            start.setDate(t.getDate() - 30);
            updateStateDates(start, t);

            refreshDashboard();
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
        loadCategoryChart();
        loadTopProducts();
        loadTopSellers();
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
                    $('#stat-revenue').text(formatCurrency(d.Revenue || 0));
                    $('#stat-commission').text(formatCurrency(d.CommissionCollected || 0));
                    $('#stat-customers').text(d.ActiveCustomers || 0);
                    $('#stat-orders').text(d.OrdersDelivered || 0);
                    $('#stat-canceled-label').text(`${d.OrdersCanceled || 0} Canceled`);
                    $('#stat-storekeepers').text(d.ActiveStorekeepers || 0);
                    $('#stat-riders').text(d.ActiveRiders || 0);
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

    function loadCategoryChart() {
        ajaxRequest({
            url: `${baseApiUrl}/api/Dashboard/GetRevenueByCategory`,
            method: 'GET',
            data: { fromDate: state.fromDate, toDate: state.toDate, city: state.city },
            isQuery: true,
            showMessage: false,
            onSuccess: (res) => {
                renderCategoryChart(res.data || []);
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

    // --- Render Functions ---

    function renderRevenueChart(data) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (state.charts.revenue) state.charts.revenue.destroy();

        const groupedData = data.reduce((acc, curr) => {
            const dateObj = new Date(curr.Date);
            const monthKey = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!acc[monthKey]) acc[monthKey] = 0;
            acc[monthKey] += curr.Revenue;
            return acc;
        }, {});

        const labels = Object.keys(groupedData);
        const values = Object.values(groupedData);

        state.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gross Revenue',
                    data: values,
                    borderColor: '#0aa64a',
                    borderWidth: 2,
                    backgroundColor: 'rgba(10, 166, 74, 0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#0aa64a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                    pointHoverRadius: 5
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

    function renderCategoryChart(data) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (state.charts.category) state.charts.category.destroy();

        const labels = data.map(item => item.CategoryName);
        const values = data.map(item => item.Revenue);
        const groceryPalette = ['#0aa64a', '#078a3e', '#3ecf74', '#8fe3b6', '#ff8712', '#ffb25e'];

        state.charts.category = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Category Revenue',
                    data: values,
                    backgroundColor: labels.map((_, i) => groceryPalette[i % groceryPalette.length]),
                    borderRadius: 4,
                    borderSkipped: false,
                    maxBarThickness: 36
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
            const totalRevenue = (item.Price || 0) * (item.TotalSold || 0);

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    <div class="compact-info">
                        <p class="compact-name" title="${item.Title}">${item.Title}</p>
                        <p class="compact-sub">${item.TotalSold} sold · Rs ${new Intl.NumberFormat('en-IN').format(item.Price || 0)}/unit</p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${formatCurrency(totalRevenue)}</p>
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
            
            const avatarHtml = imgPath
                ? `<img src="${imgPath}" class="compact-avatar" alt="${item.StoreName}">`
                : `<div class="compact-avatar-fallback">${initial}</div>`;

            const html = `
                <div class="compact-item">
                    <span class="compact-rank ${rankClass}">#${rank}</span>
                    ${avatarHtml}
                    <div class="compact-info">
                        <p class="compact-name" title="${item.StoreName}">${item.StoreName}</p>
                        <p class="compact-sub">Store #${item.StorekeeperId}</p>
                    </div>
                    <div class="compact-metric">
                        <p class="compact-val">${formatCurrency(item.Revenue)}</p>
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
                    $('#stat-revenue').text(formatCurrency(d.TotalRevenue || 0));

                    // 2. Average Order Value (Replaces Commission)
                    $('#stat-commission').text(formatCurrency(d.AverageOrderValue || 0));
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

        // 4. Load Category distribution
        loadCategoryChart();
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
});