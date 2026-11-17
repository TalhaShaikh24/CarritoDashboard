/**
 * Carrito Dashboard - Modern Point of Sale (POS) Module
 * Fully functional with enterprise-grade features and high-fidelity mock data.
 */

const PosApp = (function () {
    // -------------------------------------------------------------------------
    // 1. HELPERS & COLOR GENERATOR
    // -------------------------------------------------------------------------
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getAvatarColor(str) {
        const palette = [
            { bg: '#e0f2fe', text: '#0284c7' },
            { bg: '#dcfce7', text: '#15803d' },
            { bg: '#fef3c7', text: '#b45309' },
            { bg: '#f3e8ff', text: '#7e22ce' },
            { bg: '#fee2e2', text: '#b91c1c' },
            { bg: '#ffedd5', text: '#c2410c' },
            { bg: '#ccfbf1', text: '#0f766e' },
            { bg: '#f1f5f9', text: '#475569' }
        ];
        let hash = 0;
        for (let i = 0; i < (str || '').length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return palette[Math.abs(hash) % palette.length];
    }

    const DUMMY_CUSTOMERS = [
        { id: 0, name: "Walk-in Customer", phone: "N/A", email: "", points: 0, credit: 0, address: "" },
        { id: 1, name: "Muhammad Talha", phone: "0300-8451299", email: "talha@example.com", points: 480, credit: 25000, address: "DHA Phase 6, Lahore" },
        { id: 2, name: "Hamza Farooq", phone: "0321-4458921", email: "hamza@example.com", points: 190, credit: 10000, address: "Gulberg III, Lahore" },
        { id: 3, name: "Ayesha Siddiqui", phone: "0333-7891234", email: "ayesha@example.com", points: 620, credit: 15000, address: "Model Town C-Block, Lahore" },
        { id: 4, name: "Usman Ghani", phone: "0312-9876543", email: "usman@example.com", points: 85, credit: 5000, address: "Johar Town, Lahore" },
        { id: 5, name: "Fatima Zahra", phone: "0345-1237890", email: "fatima@example.com", points: 310, credit: 20000, address: "Cantt Officers Colony, Lahore" }
    ];

    // -------------------------------------------------------------------------
    // 2. STATE
    // -------------------------------------------------------------------------
    let cart = [];
    let selectedCustomer = DUMMY_CUSTOMERS[0];
    let orderType = "Walk-in";

    let realProducts = [];
    let productsCache = {};
    let realCategories = [];
    let realBrands = [];
    let selectedCategoryId = null;
    let selectedBrand = "";
    let searchTerm = "";
    let searchTimeout = null;
    let sortBy = "popular";
    let viewMode = "grid";
    let isLoadingProducts = false;
    let activeStorekeeperId = null;
    let storekeepersCache = [];

    let taxRatesCache = [];
    let taxRatesMap = {};

    const TAX_RATE = 0.05;
    const DELIVERY_FEE = 100;

    let shiftData = {
        openingFloat: 10000,
        cashSales: 0,
        cardSales: 0,
        walletSales: 0,
        ordersCount: 0
    };

    let salesHistory = [];
    let heldOrders = [];

    let soundEnabled = true;
    let nextOrderSeq = 1001;
    let currentOrderNum = "#ORD-1001";
    let activePaymentMethod = "Cash";

    // -------------------------------------------------------------------------
    // 3. AUDIO SYNTHESIZER (Web Audio API)
    // -------------------------------------------------------------------------
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        return audioCtx;
    }

    function playBeep(freq = 880, duration = 0.08, type = 'sine') {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.debug('Audio error:', e);
        }
    }

    function playSuccessChime() {
        if (!soundEnabled) return;
        playBeep(523.25, 0.12, 'triangle');
        setTimeout(() => playBeep(659.25, 0.22, 'triangle'), 110);
    }

    function playWarningBeep() {
        if (!soundEnabled) return;
        playBeep(260, 0.18, 'sawtooth');
    }

    // -------------------------------------------------------------------------
    // 4. INITIALIZATION & STOREKEEPER SETUP
    // -------------------------------------------------------------------------
    function init() {
        loadPersistedState();
        setupClock();
        initCashierProfile();
        updateCartUI();
        bindEvents();
        updateHeldOrdersBadge();

        initStorekeeper().then(() => {
            return Promise.all([fetchCategories(), fetchTaxRates()]);
        }).then(() => {
            fetchInventory();
        });

        $(document).on('storekeeperReady', function (e, skpUser) {
            if (skpUser) {
                initStorekeeper().then(() => {
                    return Promise.all([fetchCategories(), fetchTaxRates()]);
                }).then(() => {
                    fetchInventory();
                });
            }
        });

        if (window.lucide) lucide.createIcons();
    }

    function getActiveStorekeeperId() {
        if (typeof AuthHelper !== 'undefined' && AuthHelper.isStorekeeper()) {
            return AuthHelper.getStorekeeperId();
        }
        return activeStorekeeperId;
    }

    function initStorekeeper() {
        if (typeof AuthHelper !== 'undefined' && AuthHelper.isStorekeeper()) {
            activeStorekeeperId = AuthHelper.getStorekeeperId();
            const storeName = AuthHelper.getStoreName() || 'My Store';
            $('#posStoreNameLabel').text(`Store: ${storeName}`);
            return Promise.resolve(activeStorekeeperId);
        }
        return Promise.resolve(activeStorekeeperId);
    }

    function fetchTaxRates() {
        const skId = getActiveStorekeeperId();
        if (!skId) {
            taxRatesCache = [];
            taxRatesMap = {};
            return Promise.resolve([]);
        }
        return new Promise((resolve) => {
            $.get(`${baseApiUrl}/api/TaxRate/${skId}`)
                .done(res => {
                    if (res && res.status === 200 && res.data) {
                        taxRatesCache = Array.isArray(res.data) ? res.data : (res.data.items || []);
                    } else {
                        taxRatesCache = [];
                    }
                    taxRatesMap = {};
                    taxRatesCache.forEach(t => { taxRatesMap[t.id] = t; });
                    resolve(taxRatesCache);
                })
                .fail(() => {
                    taxRatesCache = [];
                    taxRatesMap = {};
                    resolve([]);
                });
        });
    }

    function loadPersistedState() {
        try {
            const savedSound = localStorage.getItem('pos_sound_enabled');
            if (savedSound !== null) soundEnabled = savedSound === 'true';

            const savedHeld = localStorage.getItem('pos_held_orders');
            if (savedHeld) heldOrders = JSON.parse(savedHeld);

            const savedHistory = localStorage.getItem('pos_sales_history');
            if (savedHistory) salesHistory = JSON.parse(savedHistory);

            const savedShift = localStorage.getItem('pos_shift_data');
            if (savedShift) shiftData = JSON.parse(savedShift);

            const savedSeq = localStorage.getItem('pos_order_seq');
            if (savedSeq) nextOrderSeq = parseInt(savedSeq, 10);

            currentOrderNum = `#ORD-${nextOrderSeq}`;
            $('#posCurrentOrderNum').text(currentOrderNum);
        } catch (e) {
            console.warn('Error reading from localStorage:', e);
        }
    }

    function savePersistedState() {
        try {
            localStorage.setItem('pos_held_orders', JSON.stringify(heldOrders));
            localStorage.setItem('pos_sales_history', JSON.stringify(salesHistory));
            localStorage.setItem('pos_shift_data', JSON.stringify(shiftData));
            localStorage.setItem('pos_order_seq', nextOrderSeq.toString());
            localStorage.setItem('pos_sound_enabled', soundEnabled.toString());
        } catch (e) {
            console.warn('Error saving to localStorage:', e);
        }
    }

    function setupClock() {
        function tick() {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            $('#posClockTime').text(timeStr);
        }
        tick();
        setInterval(tick, 1000);
    }

    function initCashierProfile() {
        if (typeof AuthHelper !== 'undefined') {
            const user = AuthHelper.getCurrentUser();
            if (user && user.fullName) $('#posCashierName').text(user.fullName);
        }
    }

    // -------------------------------------------------------------------------
    // 5. CATEGORIES & BRANDS API FETCHING
    // -------------------------------------------------------------------------
    function fetchCategories() {
        const skId = getActiveStorekeeperId();
        if (!skId) return Promise.resolve();
        return new Promise(resolve => {
            $.ajax({
                url: `${baseApiUrl}/api/InventoryCategory`,
                type: 'GET',
                data: { PageNumber: 1, PageSize: 100, Search: '', storekeeperId: skId },
                success: function (res) {
                    if (res && res.status === 200 && res.data && res.data.items) {
                        realCategories = res.data.items;
                        renderCategoryPills();
                    }
                    resolve();
                },
                error: function () { resolve(); }
            });
        });
    }

    function renderCategoryPills() {
        const $container = $('#posCategoryPills');
        $container.empty();

        const isAllActive = (selectedCategoryId === null) ? 'active' : '';
        $container.append(`
            <button type="button" class="pos-cat-pill ${isAllActive}" data-category-id="">
                <span>All</span>
            </button>
        `);

        realCategories.forEach(cat => {
            const isActive = (selectedCategoryId == cat.id) ? 'active' : '';
            $container.append(`
                <button type="button" class="pos-cat-pill ${isActive}" data-category-id="${cat.id}">
                    <span>${escapeHtml(cat.name)}</span>
                </button>
            `);
        });
    }

    // -------------------------------------------------------------------------
    // 6. REAL INVENTORY FETCHING & CATALOG RENDERING
    // -------------------------------------------------------------------------
    function mapApiProduct(item) {
        let photoUrl = null;
        if (item.photoFilePath && typeof item.photoFilePath === 'string' && item.photoFilePath.trim() !== '') {
            photoUrl = item.photoFilePath.startsWith('http')
                ? item.photoFilePath
                : `${baseApiUrl}/${item.photoFilePath.replace(/^\/+/, '')}`;
        }

        let unitStr = '1 pc';
        if (item.unitName) {
            unitStr = (item.weight && item.weight > 0) ? `${item.weight} ${item.unitName}` : item.unitName;
        } else if (item.packSize) {
            unitStr = `Pack of ${item.packSize}`;
        }

        const rawPrice = parseFloat(item.price ?? item.Price) || 0;
        const rawDiscount = parseFloat(item.discount ?? item.Discount) || 0;
        const rawDiscountedPrice = parseFloat(item.discountedPrice ?? item.DiscountedPrice) || 0;
        const discountMinQty = parseInt(item.discountMinQuantity ?? item.DiscountMinQuantity, 10) || 1;
        const taxRateId = item.taxRateId ?? item.TaxRateId ?? 0;
        const rawTaxType = item.taxType ?? item.TaxType;
        const taxType = (rawTaxType === 2 || String(rawTaxType).toLowerCase() === 'exclusive') ? 2 : 1;
        const taxName = item.taxName ?? item.TaxName ?? item.taxRateName ?? '';
        let taxRate = parseFloat(item.taxRate ?? item.TaxRate) || 0;
        if (!taxRate && taxRatesMap[taxRateId]) {
            taxRate = parseFloat(taxRatesMap[taxRateId].rate) || 0;
        }

        return {
            id: item.id,
            title: item.title || 'Untitled Item',
            category: item.categoryName || 'General',
            categoryId: item.categoryId,
            brand: item.brandName || 'Generic',
            brandId: item.brandId,
            price: rawPrice,
            discount: rawDiscount,
            discountedPrice: rawDiscountedPrice,
            discountMinQuantity: discountMinQty,
            taxType: taxType,
            taxRateId: taxRateId,
            taxName: taxName,
            taxRate: taxRate,
            unit: unitStr,
            sku: item.barcode || `INV-${item.id}`,
            barcode: item.barcode || '',
            stock: parseFloat(item.stock) || 0,
            image: photoUrl,
            raw: item
        };
    }

    function fetchInventory() {
        const skId = getActiveStorekeeperId();
        if (!skId) return;

        isLoadingProducts = true;
        renderLoadingState();

        const queryData = {
            PageNumber: 1,
            PageSize: 100,
            Search: searchTerm || ''
        };
        if (selectedCategoryId) queryData.CategoryIds = selectedCategoryId;

        $.ajax({
            url: `${baseApiUrl}/api/Inventory/storekeeper/${skId}`,
            type: 'GET',
            data: queryData,
            success: function (res) {
                isLoadingProducts = false;
                if (res && res.status === 200 && res.data && res.data.items) {
                    realProducts = res.data.items.map(mapApiProduct);
                    realProducts.forEach(p => { productsCache[p.id] = p; });
                } else {
                    realProducts = [];
                }
                renderCatalog();
            },
            error: function (xhr) {
                isLoadingProducts = false;
                realProducts = [];
                renderCatalog();
                console.error("Error fetching inventory for POS:", xhr);
            }
        });
    }

    function renderLoadingState() {
        const $grid = $('#posProductsGrid');
        const $list = $('#posProductsList');
        const $empty = $('#posEmptyCatalog');

        $empty.hide();
        const loadingHtml = `
            <div class="pos-loading-state">
                <div class="pos-loading-spinner"></div>
                <span>Loading store inventory...</span>
            </div>
        `;
        if (viewMode === 'grid') {
            $grid.html(loadingHtml).show();
            $list.hide();
        } else {
            $list.html(loadingHtml).show();
            $grid.hide();
        }
    }

    function getSortedProducts() {
        return [...realProducts].sort((a, b) => {
            if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return a.id - b.id;
        });
    }

    function renderCatalog() {
        if (isLoadingProducts) return;

        const products = getSortedProducts();
        const $grid = $('#posProductsGrid');
        const $list = $('#posProductsList');
        const $empty = $('#posEmptyCatalog');

        $grid.empty();
        $list.empty();

        if (products.length === 0) {
            $grid.hide();
            $list.hide();
            $empty.show();
            if (window.lucide) lucide.createIcons();
            return;
        }

        $empty.hide();

        if (viewMode === 'grid') {
            $grid.show();
            $list.hide();

            products.forEach(p => {
                let stockClass = "in-stock";
                let stockLabel = `${p.stock} in stock`;
                let isOut = p.stock <= 0;

                if (p.stock <= 5 && p.stock > 0) {
                    stockClass = "low-stock";
                    stockLabel = `Only ${p.stock} left`;
                } else if (isOut) {
                    stockClass = "out";
                    stockLabel = "Out of Stock";
                }

                const initial = (p.title || 'P').trim().charAt(0).toUpperCase();
                const color = getAvatarColor(p.title);
                const hasImage = Boolean(p.image && p.image.trim().length > 0);

                const thumbHtml = hasImage
                    ? `<img src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="pos-card-initial-fallback" style="display: none; background: ${color.bg}; color: ${color.text};">${initial}</div>`
                    : `<div class="pos-card-initial-fallback" style="display: flex; background: ${color.bg}; color: ${color.text};">${initial}</div>`;

                const discPrice = (p.discountedPrice > 0 && p.discountedPrice < p.price) ? p.discountedPrice : (p.discount > 0 ? (p.price - p.discount) : 0);
                const hasItemDiscount = discPrice > 0 && discPrice < p.price;

                let cardPriceHtml = `<div class="pos-card-price"><span class="currency">Rs.</span>${p.price.toFixed(2)}</div>`;
                if (hasItemDiscount) {
                    cardPriceHtml = `
                        <div class="pos-card-price" style="display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15;">
                            <div>
                                <span class="currency" style="color: #0aa64a;">Rs.</span><span style="color: #0aa64a; font-weight: 700;">${discPrice.toFixed(2)}</span>
                                <del style="color: #94a3af; font-size: 11px; margin-left: 3px;">Rs. ${p.price.toFixed(0)}</del>
                            </div>
                            ${p.discountMinQuantity > 1 ? `<span style="font-size: 9.5px; color: #2563eb; font-weight: 600;">Disc Min Qty: ${p.discountMinQuantity}</span>` : ''}
                        </div>
                    `;
                }

                let taxTagHtml = '';
                if (p.taxRate > 0) {
                    taxTagHtml = p.taxType === 2
                        ? `<span class="pos-cart-item-tax-tag exclusive" style="font-size: 9.5px;" title="Exclusive tax: +${p.taxRate}%">+${p.taxRate}% Tax</span>`
                        : `<span class="pos-cart-item-tax-tag inclusive" style="font-size: 9.5px;" title="Inclusive tax (${p.taxRate}%)">Tax Incl</span>`;
                }

                const cardHtml = `
                    <div class="pos-product-card ${isOut ? 'out-of-stock' : ''}" data-id="${p.id}" title="${escapeHtml(p.title)}">
                        <div class="pos-card-thumb-wrap">
                            ${thumbHtml}
                            <span class="pos-stock-tag ${stockClass}">${stockLabel}</span>
                            <span class="pos-card-cat-badge">${escapeHtml((p.category || 'Item').split(' ')[0])}</span>
                        </div>
                        <div class="pos-card-info">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="pos-card-sku">${escapeHtml(p.sku)}</span>
                                ${taxTagHtml}
                            </div>
                            <h4 class="pos-card-title">${escapeHtml(p.title)}</h4>
                            <span class="pos-card-unit">${escapeHtml(p.unit)} &bull; ${escapeHtml(p.brand)}</span>
                        </div>
                        <div class="pos-card-bottom">
                            ${cardPriceHtml}
                            <button type="button" class="pos-card-add-btn" title="Add to Order">
                                <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    </div>
                `;
                $grid.append(cardHtml);
            });
        } else {
            $grid.hide();
            $list.show();

            products.forEach(p => {
                const isOut = p.stock <= 0;
                const initial = (p.title || 'P').trim().charAt(0).toUpperCase();
                const color = getAvatarColor(p.title);
                const hasImage = Boolean(p.image && p.image.trim().length > 0);

                const rowThumbHtml = hasImage
                    ? `<img class="pos-row-thumb" src="${p.image}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="pos-row-initial-fallback" style="display: none; background: ${color.bg}; color: ${color.text};">${initial}</div>`
                    : `<div class="pos-row-initial-fallback" style="display: flex; background: ${color.bg}; color: ${color.text};">${initial}</div>`;

                const discPrice = (p.discountedPrice > 0 && p.discountedPrice < p.price) ? p.discountedPrice : (p.discount > 0 ? (p.price - p.discount) : 0);
                const hasItemDiscount = discPrice > 0 && discPrice < p.price;

                let rowPriceHtml = `<div class="pos-row-price">Rs. ${p.price.toFixed(2)}</div>`;
                if (hasItemDiscount) {
                    rowPriceHtml = `
                        <div class="pos-row-price" style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2;">
                            <span style="color: #0aa64a; font-weight: 700;">Rs. ${discPrice.toFixed(2)}</span>
                            <del style="color: #94a3af; font-size: 11px;">Rs. ${p.price.toFixed(2)}</del>
                        </div>
                    `;
                }

                let rowTaxTag = '';
                if (p.taxRate > 0) {
                    rowTaxTag = p.taxType === 2
                        ? `<span class="pos-cart-item-tax-tag exclusive" style="font-size: 9.5px; margin-left: 4px;">+${p.taxRate}% Tax</span>`
                        : `<span class="pos-cart-item-tax-tag inclusive" style="font-size: 9.5px; margin-left: 4px;">Tax Incl</span>`;
                }

                const rowHtml = `
                    <div class="pos-product-row ${isOut ? 'out-of-stock' : ''}" data-id="${p.id}">
                        ${rowThumbHtml}
                        <div class="pos-row-details">
                            <div class="pos-row-title">${escapeHtml(p.title)} ${rowTaxTag}</div>
                            <div class="pos-row-meta">
                                <span>${escapeHtml(p.sku)}</span>
                                <span>&bull;</span>
                                <span>${escapeHtml(p.unit)}</span>
                                <span>&bull;</span>
                                <span style="color: ${p.stock <= 5 ? '#f59e0b' : '#10b981'}; font-weight: 600;">${p.stock} in stock</span>
                            </div>
                        </div>
                        ${rowPriceHtml}
                        <button type="button" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;">
                            + Add
                        </button>
                    </div>
                `;
                $list.append(rowHtml);
            });
        }

        if (window.lucide) lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // 7. CART MANAGEMENT & CALCULATIONS
    // -------------------------------------------------------------------------
    function addToCart(productId, quantity = 1) {
        const product = productsCache[productId] || realProducts.find(p => p.id === productId);
        if (!product) return;

        if (product.stock <= 0) {
            playWarningBeep();
            if (typeof showNotification === 'function') showNotification(`"${product.title}" is out of stock!`, "warning");
            return;
        }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.qty + quantity > product.stock) {
                playWarningBeep();
                if (typeof showNotification === 'function') showNotification(`Maximum available stock reached (${product.stock} available)`, "warning");
                return;
            }
            existingItem.qty += quantity;
        } else {
            cart.push({ id: product.id, product: product, qty: quantity });
        }

        playBeep(920, 0.08);
        updateCartUI();
    }

    function updateCartItemQty(productId, newQty) {
        const item = cart.find(i => i.id === productId);
        if (!item) return;

        if (newQty <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQty > item.product.stock) {
            playWarningBeep();
            if (typeof showNotification === 'function') showNotification(`Only ${item.product.stock} units available in stock`, "warning");
            item.qty = item.product.stock;
        } else {
            item.qty = newQty;
            playBeep(850, 0.05);
        }

        updateCartUI();
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => item.id !== productId);
        playBeep(440, 0.08);
        updateCartUI();
    }

    function clearCart() {
        if (cart.length === 0) return;
        if (confirm("Are you sure you want to clear all items in this order?")) {
            cart = [];
            playBeep(350, 0.1);
            updateCartUI();
        }
    }

    function calculateItemLine(item) {
        const product = item.product || {};
        const price = parseFloat(product.price) || 0;
        const qty = parseFloat(item.qty) || 0;
        const grossTotal = price * qty;

        let autoStoreDiscount = 0;
        const minQty = parseInt(product.discountMinQuantity, 10) || 1;
        if (qty >= minQty) {
            const discPrice = parseFloat(product.discountedPrice) || 0;
            const discVal = parseFloat(product.discount) || 0;
            if (discPrice > 0 && discPrice < price) {
                autoStoreDiscount = (price - discPrice) * qty;
            } else if (discVal > 0) {
                autoStoreDiscount = discVal * qty;
            }
        }

        const itemDiscount = Math.min(grossTotal, autoStoreDiscount);
        const lineSubtotal = Math.max(0, grossTotal - itemDiscount);

        const rawTaxType = product.taxType ?? product.raw?.taxType;
        const taxType = (rawTaxType === 2 || String(rawTaxType).toLowerCase() === 'exclusive') ? 2 : 1;
        const taxRateId = product.taxRateId ?? product.raw?.taxRateId;
        const taxRateObj = taxRatesMap[taxRateId];

        let taxRate = 0;
        if (product.taxRate !== undefined && product.taxRate !== null && !isNaN(product.taxRate) && product.taxRate > 0) {
            taxRate = parseFloat(product.taxRate);
        } else if (taxRateObj && !isNaN(taxRateObj.rate)) {
            taxRate = parseFloat(taxRateObj.rate);
        } else if (product.raw && product.raw.taxRate && !isNaN(product.raw.taxRate)) {
            taxRate = parseFloat(product.raw.taxRate);
        } else {
            taxRate = 5;
        }

        const taxName = product.taxName || (taxRateObj ? taxRateObj.name : 'GST');

        let taxAmount = 0;
        let exclusiveTax = 0;
        let inclusiveTax = 0;
        let linePayable = lineSubtotal;

        if (taxRate > 0 && lineSubtotal > 0) {
            if (taxType === 2) {
                taxAmount = lineSubtotal * (taxRate / 100);
                exclusiveTax = taxAmount;
                inclusiveTax = 0;
                linePayable = lineSubtotal + exclusiveTax;
            } else {
                taxAmount = lineSubtotal - (lineSubtotal / (1 + (taxRate / 100)));
                exclusiveTax = 0;
                inclusiveTax = taxAmount;
                linePayable = lineSubtotal;
            }
        }

        return {
            price, qty, grossTotal,
            autoStoreDiscount, itemDiscount, lineSubtotal,
            taxType, taxRate, taxName, taxAmount,
            exclusiveTax, inclusiveTax, linePayable
        };
    }

    function calculateTotals() {
        let itemsCount = 0;
        let grossSubtotal = 0;
        let totalItemDiscounts = 0;
        let totalLineSubtotal = 0;
        let totalExclusiveTax = 0;
        let totalInclusiveTax = 0;

        cart.forEach(item => {
            const line = calculateItemLine(item);
            itemsCount += line.qty;
            grossSubtotal += line.grossTotal;
            totalItemDiscounts += line.itemDiscount;
            totalLineSubtotal += line.lineSubtotal;
            totalExclusiveTax += line.exclusiveTax;
            totalInclusiveTax += line.inclusiveTax;
        });

        const totalTax = totalExclusiveTax + totalInclusiveTax;
        const deliveryFee = orderType === 'Delivery' ? DELIVERY_FEE : 0;
        const grandTotal = Math.max(0, (grossSubtotal - totalItemDiscounts) + totalExclusiveTax + deliveryFee);

        return {
            itemsCount,
            subtotal: grossSubtotal,
            itemDiscounts: totalItemDiscounts,
            orderDiscount: 0,
            discountAmount: totalItemDiscounts,
            taxAmount: totalTax,
            exclusiveTax: totalExclusiveTax,
            inclusiveTax: totalInclusiveTax,
            deliveryFee,
            grandTotal
        };
    }

    function updateCartUI() {
        const $container = $('#posCartItemsBody');
        const $empty = $('#posEmptyCart');
        const totals = calculateTotals();

        if (cart.length === 0) {
            $container.find('.pos-cart-item').remove();
            $empty.show();
            $('#btnOpenPaymentModal').prop('disabled', true);
        } else {
            $empty.hide();
            $container.find('.pos-cart-item').remove();

            cart.forEach(item => {
                const line = calculateItemLine(item);
                const initial = (item.product.title || 'P').trim().charAt(0).toUpperCase();
                const color = getAvatarColor(item.product.title);
                const hasImage = Boolean(item.product.image && item.product.image.trim().length > 0);
                const cartThumbHtml = hasImage
                    ? `<img class="pos-cart-item-thumb" src="${item.product.image}" alt="${escapeHtml(item.product.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                       <div class="pos-cart-initial-fallback" style="display: none; background: ${color.bg}; color: ${color.text};">${initial}</div>`
                    : `<div class="pos-cart-initial-fallback" style="display: flex; background: ${color.bg}; color: ${color.text};">${initial}</div>`;

                let taxBadge = '';
                if (line.taxRate > 0) {
                    if (line.taxType === 2) {
                        taxBadge = `<span class="pos-cart-item-tax-tag exclusive" title="Exclusive Tax (+${line.taxRate}%): +Rs. ${line.exclusiveTax.toFixed(2)}">+${line.taxRate}% ${escapeHtml(line.taxName)}</span>`;
                    } else {
                        taxBadge = `<span class="pos-cart-item-tax-tag inclusive" title="Inclusive Tax (${line.taxRate}%): Rs. ${line.inclusiveTax.toFixed(2)} (Tax Included in Price)">${line.taxRate}% ${escapeHtml(line.taxName)} (Incl)</span>`;
                    }
                }

                const itemHtml = `
                    <div class="pos-cart-item" data-id="${item.id}">
                        ${cartThumbHtml}
                        <div class="pos-cart-item-details">
                            <div class="pos-cart-item-name" title="${escapeHtml(item.product.title)}">${escapeHtml(item.product.title)}</div>
                            <div class="pos-cart-item-meta">
                                <span>Rs. ${item.product.price.toFixed(2)}</span>
                                ${line.itemDiscount > 0 ? `<span class="pos-cart-item-discount-tag" title="Discount: -Rs. ${line.itemDiscount.toFixed(2)}">-Rs. ${line.itemDiscount.toFixed(2)}</span>` : ''}
                                ${taxBadge}
                            </div>
                        </div>
                        <div class="pos-cart-qty-ctrl">
                            <button type="button" class="pos-qty-btn btn-qty-minus">&minus;</button>
                            <input type="number" class="pos-qty-input" value="${item.qty}" min="1" max="${item.product.stock}">
                            <button type="button" class="pos-qty-btn btn-qty-plus">&plus;</button>
                        </div>
                        <div class="pos-cart-item-total" title="${line.taxType === 2 && line.exclusiveTax > 0 ? `Subtotal: Rs. ${line.lineSubtotal.toFixed(2)} + Tax: Rs. ${line.exclusiveTax.toFixed(2)}` : ''}">
                            Rs. ${line.linePayable.toFixed(2)}
                        </div>
                        <div class="pos-cart-item-actions">
                            <button type="button" class="pos-item-action-btn btn-delete-item" title="Remove">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </div>
                `;
                $container.append(itemHtml);
            });

            $('#btnOpenPaymentModal').prop('disabled', false);
        }

        $('#posSummaryItemCount').text(totals.itemsCount);
        $('#posSummarySubtotal').text(`Rs. ${totals.subtotal.toFixed(2)}`);
        $('#posSummaryDiscount').text(`- Rs. ${totals.discountAmount.toFixed(2)}`);

        if (totals.exclusiveTax > 0 && totals.inclusiveTax > 0) {
            $('#posSummaryTax').html(`Rs. ${totals.taxAmount.toFixed(2)} <small style="font-size:10px; color:#475569; font-weight:normal;">(+Rs. ${totals.exclusiveTax.toFixed(2)} added)</small>`);
        } else if (totals.inclusiveTax > 0) {
            $('#posSummaryTax').html(`Rs. ${totals.inclusiveTax.toFixed(2)} <small style="font-size:10px; color:#2563eb; font-weight:normal;">(Included)</small>`);
        } else {
            $('#posSummaryTax').text(`+ Rs. ${totals.exclusiveTax.toFixed(2)}`);
        }

        if (orderType === 'Delivery') {
            $('#posDeliveryFeeRow').show();
            $('#posSummaryDeliveryFee').text(`Rs. ${totals.deliveryFee.toFixed(2)}`);
        } else {
            $('#posDeliveryFeeRow').hide();
        }

        $('#posSummaryGrandTotal').text(`Rs. ${totals.grandTotal.toFixed(2)}`);
        $('#btnPayTotalText').text(`Rs. ${totals.grandTotal.toFixed(2)}`);

        if (window.lucide) lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // 7. BARCODE SCANNING SIMULATOR
    // -------------------------------------------------------------------------
    function processBarcodeScan(inputCode) {
        const code = inputCode.trim();
        if (!code) return;

        const product = realProducts.find(p =>
            (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
            String(p.id) === code
        );

        if (product) {
            addToCart(product.id, 1);
            $('#posBarcodeInput').val('').focus();
            if (typeof showNotification === 'function') showNotification(`Scanned: ${product.title}`, "success");
            return;
        }

        const skId = getActiveStorekeeperId();
        if (skId) {
            $.ajax({
                url: `${baseApiUrl}/api/Inventory/storekeeper/${skId}`,
                type: 'GET',
                data: { PageNumber: 1, PageSize: 1, Search: code },
                success: function (res) {
                    if (res && res.status === 200 && res.data && res.data.items && res.data.items.length > 0) {
                        const mapped = mapApiProduct(res.data.items[0]);
                        productsCache[mapped.id] = mapped;
                        addToCart(mapped.id, 1);
                        $('#posBarcodeInput').val('').focus();
                        if (typeof showNotification === 'function') showNotification(`Scanned: ${mapped.title}`, "success");
                    } else {
                        playWarningBeep();
                        if (typeof showNotification === 'function') showNotification(`Barcode/SKU "${code}" not found!`, "error");
                        $('#posBarcodeInput').select();
                    }
                },
                error: function () {
                    playWarningBeep();
                    if (typeof showNotification === 'function') showNotification(`Barcode/SKU "${code}" not found!`, "error");
                    $('#posBarcodeInput').select();
                }
            });
        }
    }

    // -------------------------------------------------------------------------
    // 8. HOLD / PARK ORDER & RESUME
    // -------------------------------------------------------------------------
    function holdCurrentOrder() {
        if (cart.length === 0) {
            if (typeof showNotification === 'function') showNotification("Cart is empty! Nothing to hold.", "warning");
            return;
        }

        const totals = calculateTotals();
        const holdRecord = {
            holdId: "HOLD-" + Date.now().toString().slice(-5),
            orderNum: currentOrderNum,
            customer: selectedCustomer,
            orderType: orderType,
            cart: [...cart],
            totals: totals,
            heldAt: new Date().toISOString()
        };

        heldOrders.unshift(holdRecord);
        savePersistedState();
        updateHeldOrdersBadge();

        playBeep(700, 0.1);
        if (typeof showNotification === 'function') showNotification(`Order ${currentOrderNum} placed on hold.`, "info");

        cart = [];
        selectCustomer(DUMMY_CUSTOMERS[0]);
        nextOrderSeq++;
        currentOrderNum = `#ORD-${nextOrderSeq}`;
        $('#posCurrentOrderNum').text(currentOrderNum);
        savePersistedState();
        updateCartUI();
    }

    function resumeHeldOrder(holdId) {
        const index = heldOrders.findIndex(h => h.holdId === holdId);
        if (index === -1) return;

        if (cart.length > 0) {
            if (!confirm("Your active cart will be overwritten by this held order. Proceed?")) return;
        }

        const record = heldOrders[index];
        cart = [...record.cart];
        selectedCustomer = record.customer;
        orderType = record.orderType;
        currentOrderNum = record.orderNum;

        $('#posCurrentOrderNum').text(currentOrderNum);
        $('.pos-order-type-btn').removeClass('active');
        $(`.pos-order-type-btn[data-type="${orderType}"]`).addClass('active');
        updateCustomerBadge();

        heldOrders.splice(index, 1);
        savePersistedState();
        updateHeldOrdersBadge();

        closeModal('heldOrdersModal');
        playBeep(880, 0.08);
        updateCartUI();

        if (typeof showNotification === 'function') showNotification(`Resumed held order ${currentOrderNum}`, "success");
    }

    function deleteHeldOrder(holdId) {
        if (!confirm("Are you sure you want to delete this held order?")) return;
        heldOrders = heldOrders.filter(h => h.holdId !== holdId);
        savePersistedState();
        updateHeldOrdersBadge();
        renderHeldOrdersList();
    }

    function updateHeldOrdersBadge() {
        $('#heldOrdersCount').text(heldOrders.length);
        if (heldOrders.length > 0) {
            $('#heldOrdersCount').show();
        } else {
            $('#heldOrdersCount').text('0');
        }
    }

    function renderHeldOrdersList() {
        const $container = $('#heldOrdersListContainer');
        $container.empty();

        if (heldOrders.length === 0) {
            $container.html(`
                <div style="text-align: center; padding: 30px; color: var(--pos-muted);">
                    <i data-lucide="pause-circle" style="width: 38px; height: 38px; color: #cbd5e1; margin-bottom: 8px;"></i>
                    <p style="font-size: 13.5px; font-weight: 600;">No held orders</p>
                    <p style="font-size: 12px;">Orders suspended with [F3] will appear here.</p>
                </div>
            `);
            if (window.lucide) lucide.createIcons();
            return;
        }

        heldOrders.forEach(h => {
            const timeAgo = new Date(h.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const itemSummaries = h.cart.map(c => `${c.qty}x ${c.product.title.split(' ')[0]}`).slice(0, 3).join(', ');

            const itemHtml = `
                <div style="background: #f8faf9; border: 1px solid var(--pos-border); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: var(--pos-dark); font-size: 13.5px;">${h.orderNum}</strong>
                            <span style="font-size: 11px; background: #e2ece5; padding: 2px 6px; border-radius: 6px; font-weight: 600;">${h.orderType}</span>
                            <span style="font-size: 11px; color: var(--pos-muted);">${timeAgo}</span>
                        </div>
                        <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                            <strong>${h.customer.name}</strong> &bull; ${h.totals.itemsCount} items (${itemSummaries}...)
                        </div>
                        <div style="font-size: 13px; font-weight: 800; color: var(--pos-primary); margin-top: 2px;">
                            Rs. ${h.totals.grandTotal.toFixed(2)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="PosApp.resumeHeldOrder('${h.holdId}')" style="font-size: 12px; padding: 6px 12px; border-radius: 8px; background: var(--pos-primary); border: none;">
                            Resume
                        </button>
                        <button type="button" class="btn btn-outline btn-sm" onclick="PosApp.deleteHeldOrder('${h.holdId}')" style="font-size: 12px; padding: 6px 10px; border-radius: 8px; color: var(--pos-danger); border-color: #fecaca;">
                            &times;
                        </button>
                    </div>
                </div>
            `;
            $container.append(itemHtml);
        });

        if (window.lucide) lucide.createIcons();
    }

    // -------------------------------------------------------------------------
    // 9. CUSTOMER SELECTION & QUICK-ADD
    // -------------------------------------------------------------------------
    function selectCustomer(cust) {
        selectedCustomer = cust;
        updateCustomerBadge();
        closeModal('customerSelectModal');
        closeModal('newCustomerModal');
    }

    function selectWalkInCustomer() {
        selectCustomer(DUMMY_CUSTOMERS[0]);
    }

    function updateCustomerBadge() {
        $('#posCurrentCustomerLabel').text(selectedCustomer.name);
        if (selectedCustomer.id === 0) {
            $('#posCustLoyaltyPill').hide();
        } else {
            $('#posCustLoyaltyPill').show();
            $('#posCustPoints').text(selectedCustomer.points);
            $('#posCustCredit').text(`Rs. ${Number(selectedCustomer.credit).toLocaleString()}`);
        }
    }

    function renderCustomerList(searchTerm = '') {
        const $container = $('#customerListContainer');
        $container.empty();

        const filtered = DUMMY_CUSTOMERS.filter(c => {
            if (!searchTerm) return true;
            const t = searchTerm.toLowerCase();
            return c.name.toLowerCase().includes(t) || c.phone.includes(t) || c.email.toLowerCase().includes(t);
        });

        filtered.forEach(c => {
            const isSelected = c.id === selectedCustomer.id;
            const html = `
                <div class="pos-product-row" onclick="PosApp.selectCustomerById(${c.id})" style="border-color: ${isSelected ? 'var(--pos-primary)' : 'var(--pos-border)'}; background: ${isSelected ? '#eaf6ee' : '#fff'};">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: #e2ece5; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #16241b;">
                        ${c.name.charAt(0)}
                    </div>
                    <div style="flex: 1;">
                        <strong style="font-size: 13px; color: var(--pos-dark);">${c.name}</strong>
                        <div style="font-size: 11.5px; color: var(--pos-muted);">${c.phone} ${c.email ? '&bull; ' + c.email : ''}</div>
                    </div>
                    ${c.id !== 0 ? `<div style="text-align: right; font-size: 11.5px; color: #0aa64a; font-weight: 700;">${c.points} Pts</div>` : ''}
                </div>
            `;
            $container.append(html);
        });
    }

    function saveNewCustomer() {
        const name = $('#newCustFullName').val().trim();
        const phone = $('#newCustPhone').val().trim();
        const email = $('#newCustEmail').val().trim();
        const address = $('#newCustAddress').val().trim();
        const credit = parseFloat($('#newCustCredit').val()) || 0;

        if (!name || !phone) {
            alert("Please provide at least a full name and phone number.");
            return;
        }

        const newCust = {
            id: DUMMY_CUSTOMERS.length + 1,
            name, phone, email,
            points: 50,
            credit,
            address
        };

        DUMMY_CUSTOMERS.push(newCust);
        selectCustomer(newCust);
        playBeep(880, 0.08);

        if (typeof showNotification === 'function') {
            showNotification(`Customer "${name}" created and selected! (+50 Welcome Pts)`, "success");
        }
    }

    // -------------------------------------------------------------------------
    // 10. PAYMENT & SALE FINALIZATION
    // -------------------------------------------------------------------------
    function openPaymentModal() {
        if (cart.length === 0) return;

        const totals = calculateTotals();
        $('#payModalDueAmount').text(`Rs. ${totals.grandTotal.toFixed(2)}`);
        $('#payModalCustomerName').text(selectedCustomer.name);

        activePaymentMethod = "Cash";
        $('.pos-pay-tab').removeClass('active');
        $('.pos-pay-tab[data-method="Cash"]').addClass('active');
        $('.pos-method-pane').hide();
        $('#paneMethodCash').show();

        renderQuickCashPresets(totals.grandTotal);
        $('#cashTenderedInput').val(totals.grandTotal.toFixed(2));
        updateCashChangeCalculation(totals.grandTotal, totals.grandTotal);

        $('#splitCashInput').val((totals.grandTotal / 2).toFixed(2));
        $('#splitCardInput').val((totals.grandTotal / 2).toFixed(2));
        updateSplitStatus(totals.grandTotal);

        $('#orderNoteInput').val('');

        openModal('paymentModal');
        setTimeout(() => $('#cashTenderedInput').focus().select(), 150);
    }

    function renderQuickCashPresets(grandTotal) {
        const $row = $('#quickCashRow');
        $row.empty();

        const exact = Math.ceil(grandTotal);
        const presets = [exact];

        const notes = [50, 100, 500, 1000, 5000];
        notes.forEach(n => {
            const roundUp = Math.ceil(grandTotal / n) * n;
            if (roundUp > grandTotal && !presets.includes(roundUp)) presets.push(roundUp);
        });

        if (!presets.includes(exact + 100)) presets.push(exact + 100);
        if (!presets.includes(exact + 500)) presets.push(exact + 500);

        presets.sort((a, b) => a - b).slice(0, 5).forEach(amt => {
            const isExact = amt === exact;
            const chip = `
                <button type="button" class="pos-quick-cash-chip" data-amt="${amt}">
                    ${isExact ? `Exact (Rs. ${amt})` : `Rs. ${amt.toLocaleString()}`}
                </button>
            `;
            $row.append(chip);
        });
    }

    function updateCashChangeCalculation(tendered, dueTotal) {
        const change = tendered - dueTotal;
        const $banner = $('#cashChangeBanner');
        const $label = $('#changeLabel');
        const $amt = $('#changeAmount');

        if (change >= 0) {
            $banner.removeClass('shortage');
            $label.text('Change to Return:');
            $amt.text(`Rs. ${change.toFixed(2)}`);
        } else {
            $banner.addClass('shortage');
            $label.text('Shortage / Due:');
            $amt.text(`Rs. ${Math.abs(change).toFixed(2)}`);
        }
    }

    function updateSplitStatus(dueTotal) {
        const cashPortion = parseFloat($('#splitCashInput').val()) || 0;
        const cardPortion = parseFloat($('#splitCardInput').val()) || 0;
        const totalSplit = cashPortion + cardPortion;
        const diff = dueTotal - totalSplit;
        const $banner = $('#splitStatusBanner');
        const $amt = $('#splitStatusAmount');

        if (Math.abs(diff) < 0.01) {
            $banner.removeClass('shortage');
            $('#splitStatusLabel').text('Split Matched Perfectly:');
            $amt.text('Rs. 0.00');
        } else if (diff > 0) {
            $banner.addClass('shortage');
            $('#splitStatusLabel').text('Remaining to Split:');
            $amt.text(`Rs. ${diff.toFixed(2)}`);
        } else {
            $banner.addClass('shortage');
            $('#splitStatusLabel').text('Split Exceeds Total:');
            $amt.text(`+ Rs. ${Math.abs(diff).toFixed(2)}`);
        }
    }

    function completeSale() {
        const totals = calculateTotals();
        let tendered = totals.grandTotal;
        let change = 0;

        if (activePaymentMethod === 'Cash') {
            tendered = parseFloat($('#cashTenderedInput').val()) || 0;
            if (tendered < totals.grandTotal) {
                alert(`Insufficient amount tendered! Still short of Rs. ${(totals.grandTotal - tendered).toFixed(2)}`);
                $('#cashTenderedInput').focus();
                return;
            }
            change = tendered - totals.grandTotal;
        } else if (activePaymentMethod === 'Split') {
            const cashPart = parseFloat($('#splitCashInput').val()) || 0;
            const cardPart = parseFloat($('#splitCardInput').val()) || 0;
            if (Math.abs((cashPart + cardPart) - totals.grandTotal) > 0.5) {
                alert("Split payment total does not match grand total!");
                return;
            }
            tendered = totals.grandTotal;
        }

        const now = new Date();
        const saleRecord = {
            orderNum: currentOrderNum,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: now.toISOString(),
            cashier: $('#posCashierName').text() || 'Admin',
            customer: selectedCustomer,
            orderType: orderType,
            items: cart.map(item => {
                const line = calculateItemLine(item);
                return {
                    id: item.id,
                    title: item.product.title,
                    sku: item.product.sku,
                    unitPrice: item.product.price,
                    qty: item.qty,
                    lineDiscount: line.itemDiscount,
                    taxType: line.taxType,
                    taxRate: line.taxRate,
                    taxName: line.taxName,
                    taxAmount: line.taxAmount,
                    exclusiveTax: line.exclusiveTax,
                    inclusiveTax: line.inclusiveTax,
                    total: line.linePayable
                };
            }),
            totals: totals,
            paymentMethod: activePaymentMethod,
            tendered: tendered,
            change: change,
            note: $('#orderNoteInput').val().trim()
        };

        shiftData.ordersCount++;
        if (activePaymentMethod === 'Cash') {
            shiftData.cashSales += totals.grandTotal;
        } else if (activePaymentMethod === 'Card') {
            shiftData.cardSales += totals.grandTotal;
        } else if (activePaymentMethod === 'DigitalWallet') {
            shiftData.walletSales += totals.grandTotal;
        } else if (activePaymentMethod === 'Split') {
            const cashPart = parseFloat($('#splitCashInput').val()) || 0;
            const cardPart = parseFloat($('#splitCardInput').val()) || 0;
            shiftData.cashSales += cashPart;
            shiftData.cardSales += cardPart;
        }

        salesHistory.unshift(saleRecord);

        if (selectedCustomer.id !== 0) {
            const earnedPoints = Math.floor(totals.grandTotal / 100);
            selectedCustomer.points += earnedPoints;
        }

        cart.forEach(item => {
            const prod = productsCache[item.id] || realProducts.find(p => p.id === item.id);
            if (prod) prod.stock = Math.max(0, prod.stock - item.qty);
        });

        savePersistedState();
        playSuccessChime();
        closeModal('paymentModal');

        if (typeof showNotification === 'function') {
            showNotification(`Sale completed successfully! Invoice ${currentOrderNum}`, "success");
        }

        const autoPrint = $('#chkAutoPrintReceipt').is(':checked');
        if (autoPrint) {
            showReceiptModal(saleRecord);
        } else {
            resetForNextOrder();
        }
    }

    function resetForNextOrder() {
        cart = [];
        selectCustomer(DUMMY_CUSTOMERS[0]);
        nextOrderSeq++;
        currentOrderNum = `#ORD-${nextOrderSeq}`;
        $('#posCurrentOrderNum').text(currentOrderNum);
        savePersistedState();
        renderCatalog();
        updateCartUI();
        $('#posBarcodeInput').focus();
    }

    // -------------------------------------------------------------------------
    // 11. THERMAL RECEIPT MODAL
    // -------------------------------------------------------------------------
    function showReceiptModal(sale) {
        $('#recOrderNum').text(sale.orderNum);
        $('#recDate').text(sale.date);
        $('#recTime').text(sale.time);
        $('#recCashier').text(sale.cashier);
        $('#recCustomer').text(sale.customer.name);
        $('#recOrderType').text(sale.orderType);

        const $tbody = $('#recItemsTbody');
        $tbody.empty();
        sale.items.forEach(it => {
            let metaSub = '';
            if (it.lineDiscount > 0) metaSub += `<br><small style="color: #16a34a;">-Rs. ${it.lineDiscount.toFixed(2)} off</small>`;
            if (it.taxRate > 0) {
                const taxLabel = it.taxName || 'Tax';
                metaSub += `<br><small style="color: #6b7280;">${it.taxType === 2 ? `+${it.taxRate}% ${taxLabel}` : `${it.taxRate}% ${taxLabel} (Incl)`}</small>`;
            }
            const row = `
                <tr>
                    <td>${it.title}${metaSub}</td>
                    <td class="text-right">${it.qty}</td>
                    <td class="text-right">${it.unitPrice.toFixed(0)}</td>
                    <td class="text-right">Rs. ${it.total.toFixed(0)}</td>
                </tr>
            `;
            $tbody.append(row);
        });

        $('#recSubtotal').text(`Rs. ${sale.totals.subtotal.toFixed(2)}`);

        if (sale.totals.discountAmount > 0) {
            $('#recDiscountRow').show();
            $('#recDiscount').text(`- Rs. ${sale.totals.discountAmount.toFixed(2)}`);
        } else {
            $('#recDiscountRow').hide();
        }

        if (sale.totals.taxAmount > 0) {
            $('#recTaxRow').show();
            if (sale.totals.inclusiveTax > 0 && (!sale.totals.exclusiveTax || sale.totals.exclusiveTax <= 0)) {
                $('#recTaxRow').find('span:first').text('Tax (Included):');
                $('#recTax').text(`Rs. ${sale.totals.inclusiveTax.toFixed(2)}`);
            } else if (sale.totals.exclusiveTax > 0 && (!sale.totals.inclusiveTax || sale.totals.inclusiveTax <= 0)) {
                $('#recTaxRow').find('span:first').text('Tax (Added):');
                $('#recTax').text(`+ Rs. ${sale.totals.exclusiveTax.toFixed(2)}`);
            } else {
                $('#recTaxRow').find('span:first').text('Tax:');
                $('#recTax').text(`Rs. ${sale.totals.taxAmount.toFixed(2)} (+Rs. ${(sale.totals.exclusiveTax || 0).toFixed(2)} added)`);
            }
        } else {
            $('#recTaxRow').hide();
        }

        if (sale.totals.deliveryFee > 0) {
            $('#recFeeRow').show();
            $('#recFee').text(`Rs. ${sale.totals.deliveryFee.toFixed(2)}`);
        } else {
            $('#recFeeRow').hide();
        }

        $('#recGrandTotal').text(`Rs. ${sale.totals.grandTotal.toFixed(2)}`);
        $('#recPayMethod').text(sale.paymentMethod);
        $('#recTendered').text(`Rs. ${sale.tendered.toFixed(2)}`);
        $('#recChange').text(`Rs. ${sale.change.toFixed(2)}`);
        $('#recBarcodeDigits').text(`*${sale.orderNum.replace('#', '')}*`);

        openModal('receiptModal');
    }

    function printReceipt() {
        window.print();
    }

    // -------------------------------------------------------------------------
    // 12. SALES HISTORY
    // -------------------------------------------------------------------------
    function renderSalesHistoryTable() {
        const $tbody = $('#historyTableTbody');
        $tbody.empty();

        const search = $('#historySearchInput').val().trim().toLowerCase();
        const method = $('#historyMethodFilter').val();

        const filtered = salesHistory.filter(s => {
            if (method && s.paymentMethod !== method) return false;
            if (search) {
                const matchNum = s.orderNum.toLowerCase().includes(search);
                const matchCust = s.customer.name.toLowerCase().includes(search);
                if (!matchNum && !matchCust) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            $tbody.html(`
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px; color: var(--pos-muted);">
                        No sales found for today yet.
                    </td>
                </tr>
            `);
            return;
        }

        filtered.forEach(s => {
            const tr = `
                <tr>
                    <td><strong>${s.orderNum}</strong></td>
                    <td>${s.time}</td>
                    <td>${s.customer.name}</td>
                    <td>${s.items.length} items</td>
                    <td><strong>Rs. ${s.totals.grandTotal.toFixed(2)}</strong></td>
                    <td><span class="status-badge completed">${s.paymentMethod}</span></td>
                    <td class="text-center">
                        <button type="button" class="btn btn-outline btn-sm" onclick="PosApp.viewHistoryReceipt('${s.orderNum}')" title="Reprint Receipt" style="padding: 4px 10px; font-size: 11px; border-radius: 6px;">
                            Receipt
                        </button>
                    </td>
                </tr>
            `;
            $tbody.append(tr);
        });
    }

    function viewHistoryReceipt(orderNum) {
        const sale = salesHistory.find(s => s.orderNum === orderNum);
        if (sale) {
            closeModal('salesHistoryModal');
            showReceiptModal(sale);
        }
    }

    // -------------------------------------------------------------------------
    // 13. SHIFT / REGISTER REPORT
    // -------------------------------------------------------------------------
    function renderShiftSummary() {
        const totalSales = shiftData.cashSales + shiftData.cardSales + shiftData.walletSales;
        const totalInDrawer = shiftData.openingFloat + shiftData.cashSales;

        $('#shiftOpeningFloat').text(`Rs. ${shiftData.openingFloat.toLocaleString()}`);
        $('#shiftCashSales').text(`Rs. ${shiftData.cashSales.toFixed(2)}`);
        $('#shiftCardSales').text(`Rs. ${shiftData.cardSales.toFixed(2)}`);
        $('#shiftWalletSales').text(`Rs. ${shiftData.walletSales.toFixed(2)}`);
        $('#shiftTotalDrawerCash').text(`Rs. ${totalInDrawer.toFixed(2)}`);
        $('#shiftOrdersCount').text(`${shiftData.ordersCount} orders (Total: Rs. ${totalSales.toFixed(2)})`);
    }

    // -------------------------------------------------------------------------
    // 14. MODAL HELPERS
    // -------------------------------------------------------------------------
    function openModal(modalId) {
        $(`#${modalId}`).fadeIn(180);
        if (window.lucide) lucide.createIcons();
    }

    function closeModal(modalId) {
        $(`#${modalId}`).fadeOut(140);
    }

    // -------------------------------------------------------------------------
    // 15. EVENT BINDINGS
    // -------------------------------------------------------------------------
    function bindEvents() {
        $('#posBarcodeInput').on('keypress', function (e) {
            if (e.which === 13) processBarcodeScan($(this).val());
        });
        $('#btnSubmitBarcode').on('click', function () {
            processBarcodeScan($('#posBarcodeInput').val());
        });

        $('#posSearchProduct').on('input', function () {
            const val = $(this).val();
            $('#btnClearSearch').toggle(val.length > 0);
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchTerm = val.trim();
                fetchInventory();
            }, 300);
        });
        $('#btnClearSearch').on('click', function () {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTerm = '';
            $('#posSearchProduct').val('').focus();
            $(this).hide();
            fetchInventory();
        });

<<<<<<< HEAD
=======
        // Category pills click (filters live inventory by categoryId)
>>>>>>> 05cff5168ad05cb1c6a28144ff46c41ddaf0a66e
        $(document).on('click', '.pos-cat-pill', function () {
            const catId = $(this).data('category-id');
            selectedCategoryId = (catId === '' || catId === undefined || catId === null) ? null : parseInt(catId, 10);
            $('.pos-cat-pill').removeClass('active');
            $(this).addClass('active');
            fetchInventory();
        });

        $('#viewModeGrid').on('click', function () {
            viewMode = 'grid';
            $('.pos-view-btn').removeClass('active');
            $(this).addClass('active');
            renderCatalog();
        });
        $('#viewModeList').on('click', function () {
            viewMode = 'list';
            $('.pos-view-btn').removeClass('active');
            $(this).addClass('active');
            renderCatalog();
        });

        $('#btnResetCatalogFilters').on('click', function () {
            selectedCategoryId = null;
            searchTerm = '';
            $('#posSearchProduct').val('');
            renderCategoryPills();
            fetchInventory();
        });

        $(document).on('click', '.pos-product-card, .pos-product-row', function (e) {
            const id = parseInt($(this).data('id'), 10);
            if (id) addToCart(id, 1);
        });

        $(document).on('click', '.btn-qty-minus', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            const item = cart.find(i => i.id === id);
            if (item) updateCartItemQty(id, item.qty - 1);
        });

        $(document).on('click', '.btn-qty-plus', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            const item = cart.find(i => i.id === id);
            if (item) updateCartItemQty(id, item.qty + 1);
        });

        $(document).on('change', '.pos-qty-input', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            const val = parseInt($(this).val(), 10) || 1;
            updateCartItemQty(id, val);
        });

        $(document).on('click', '.btn-delete-item', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            removeFromCart(id);
        });

        $('#btnClearCart').on('click', clearCart);
        $('#btnHoldOrder').on('click', holdCurrentOrder);

        $('#btnHeldOrders').on('click', function () {
            renderHeldOrdersList();
            openModal('heldOrdersModal');
        });

        $('.pos-order-type-btn').on('click', function () {
            $('.pos-order-type-btn').removeClass('active');
            $(this).addClass('active');
            orderType = $(this).data('type');
            updateCartUI();
        });

        $('#btnOpenCustomerModal').on('click', function () {
            renderCustomerList();
            openModal('customerSelectModal');
        });

        $('#custSearchInput').on('input', function () {
            renderCustomerList($(this).val());
        });

        $('#btnQuickAddCustomer, #btnOpenNewCustFromSelect').on('click', function () {
            closeModal('customerSelectModal');
            $('#newCustomerForm')[0].reset();
            openModal('newCustomerModal');
        });

        $('#btnSaveNewCustomer').on('click', saveNewCustomer);

        $('#btnOpenPaymentModal').on('click', openPaymentModal);

        $('.pos-pay-tab').on('click', function () {
            $('.pos-pay-tab').removeClass('active');
            $(this).addClass('active');
            activePaymentMethod = $(this).data('method');
            $('.pos-method-pane').hide();
            $(`#paneMethod${activePaymentMethod}`).show();
        });

        $(document).on('click', '.pos-quick-cash-chip[data-amt]', function () {
            const amt = parseFloat($(this).data('amt')) || 0;
            const totals = calculateTotals();
            $('#cashTenderedInput').val(amt.toFixed(2));
            updateCashChangeCalculation(amt, totals.grandTotal);
        });

        $('#cashTenderedInput').on('input', function () {
            const val = parseFloat($(this).val()) || 0;
            const totals = calculateTotals();
            updateCashChangeCalculation(val, totals.grandTotal);
        });

        $('#splitCashInput, #splitCardInput').on('input', function () {
            const totals = calculateTotals();
            updateSplitStatus(totals.grandTotal);
        });

        $('#btnFinalizeSale').on('click', completeSale);
        $('#btnPrintReceiptBtn').on('click', printReceipt);
        $('#btnReceiptNewSale').on('click', function () {
            closeModal('receiptModal');
            resetForNextOrder();
        });

        $('#btnSalesHistory').on('click', function () {
            renderSalesHistoryTable();
            openModal('salesHistoryModal');
        });
        $('#historySearchInput, #historyMethodFilter').on('input change', renderSalesHistoryTable);

        $('#btnRegisterSummary').on('click', function () {
            renderShiftSummary();
            openModal('registerSummaryModal');
        });
        $('#btnPrintShiftReport').on('click', function () { window.print(); });

        $('#btnShortcutsHelp').on('click', function () { openModal('shortcutsModal'); });
        $('#btnToggleFullscreen').on('click', toggleFullscreen);
        $('#btnToggleSound').on('click', toggleSound);

        $(document).on('keydown', handleGlobalKeydown);
    }

    function toggleFullscreen() {
        $('body').toggleClass('pos-fullscreen-mode');
        const isFull = $('body').hasClass('pos-fullscreen-mode');
        $('#fullscreenIcon').attr('data-lucide', isFull ? 'minimize' : 'maximize');
        if (window.lucide) lucide.createIcons();
        if (isFull) {
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => { });
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        $('#soundLabel').text(soundEnabled ? 'Sound' : 'Muted');
        $('#btnToggleSound').toggleClass('active', soundEnabled);
        savePersistedState();
        if (soundEnabled) playBeep(880, 0.08);
    }

    function handleGlobalKeydown(e) {
        if (e.key === 'F1') { e.preventDefault(); $('#posBarcodeInput').focus().select(); return; }
        if (e.key === 'F2') { e.preventDefault(); $('#btnOpenCustomerModal').click(); return; }
        if (e.key === 'F3') { e.preventDefault(); holdCurrentOrder(); return; }
        if (e.key === 'F4') { e.preventDefault(); $('#btnHeldOrders').click(); return; }
        if (e.key === 'F8') { e.preventDefault(); clearCart(); return; }
        if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0) openPaymentModal(); return; }
        if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
        if (e.key === 'Escape') { $('.pos-modal-overlay:visible').last().fadeOut(140); return; }
        if (e.key === '/' && !$(e.target).is('input, textarea, select')) {
            e.preventDefault();
            $('#posSearchProduct').focus().select();
        }
    }

    // -------------------------------------------------------------------------
    // 16. PUBLIC API
    // -------------------------------------------------------------------------
    return {
        init,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        clearCart,
        holdCurrentOrder,
        resumeHeldOrder,
        deleteHeldOrder,
        selectCustomer,
        selectCustomerById: function (id) {
            const cust = DUMMY_CUSTOMERS.find(c => c.id === id);
            if (cust) selectCustomer(cust);
        },
        selectWalkInCustomer,
        openPaymentModal,
        completeSale,
        printReceipt,
        viewHistoryReceipt,
        openModal,
        closeModal
    };
})();

$(document).ready(function () {
    if ($('#posModule').length > 0) {
        PosApp.init();
    }
});