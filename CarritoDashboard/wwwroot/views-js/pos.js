/**
 * Carrito Dashboard - Modern Point of Sale (POS) Module
 * Fully functional with enterprise-grade features and high-fidelity mock data.
 */

const PosApp = (function () {
    // -------------------------------------------------------------------------
    // 1. DUMMY DATA REPOSITORY
    // -------------------------------------------------------------------------
    const DUMMY_PRODUCTS = [
        // Fruits & Vegetables
        {
            id: 1,
            title: "Gala Red Apples",
            category: "Fruits & Vegetables",
            brand: "Fresh Farm",
            price: 240,
            unit: "1 kg",
            sku: "FRU-APP-01",
            barcode: "8901001",
            stock: 45,
            image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 2,
            title: "Farm Fresh Bananas",
            category: "Fruits & Vegetables",
            brand: "Fresh Farm",
            price: 160,
            unit: "1 Dozen",
            sku: "FRU-BAN-02",
            barcode: "8901002",
            stock: 60,
            image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 3,
            title: "Imported Juicy Oranges",
            category: "Fruits & Vegetables",
            brand: "Citrus Orchard",
            price: 190,
            unit: "1 kg",
            sku: "FRU-ORA-03",
            barcode: "8901003",
            stock: 35,
            image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 4,
            title: "Organic Red Tomatoes",
            category: "Fruits & Vegetables",
            brand: "Green Valley",
            price: 120,
            unit: "1 kg",
            sku: "VEG-TOM-04",
            barcode: "8901004",
            stock: 28,
            image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 5,
            title: "Fresh Red Onions",
            category: "Fruits & Vegetables",
            brand: "Green Valley",
            price: 140,
            unit: "1 kg",
            sku: "VEG-ONI-05",
            barcode: "8901005",
            stock: 50,
            image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 6,
            title: "Golden Fresh Potatoes",
            category: "Fruits & Vegetables",
            brand: "Green Valley",
            price: 90,
            unit: "1 kg",
            sku: "VEG-POT-06",
            barcode: "8901006",
            stock: 80,
            image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80"
        },

        // Dairy & Bakery
        {
            id: 7,
            title: "Olper's Full Cream Milk 1L",
            category: "Dairy & Bakery",
            brand: "Olper's",
            price: 290,
            unit: "1 Tetra Pack",
            sku: "DAI-OLP-07",
            barcode: "8901007",
            stock: 45,
            image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 8,
            title: "Nurpur Pure Butter 200g",
            category: "Dairy & Bakery",
            brand: "Nurpur",
            price: 380,
            unit: "1 Pack",
            sku: "DAI-BUT-08",
            barcode: "8901008",
            stock: 22,
            image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 9,
            title: "Golden Farm Brown Eggs",
            category: "Dairy & Bakery",
            brand: "Eggland",
            price: 320,
            unit: "1 Dozen",
            sku: "DAI-EGG-09",
            barcode: "8901009",
            stock: 35,
            image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 10,
            title: "Dawn Plain White Bread Large",
            category: "Dairy & Bakery",
            brand: "Dawn",
            price: 150,
            unit: "1 Loaf",
            sku: "BAK-BRD-10",
            barcode: "8901010",
            stock: 18,
            image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 11,
            title: "Adams Premium Cheddar Cheese",
            category: "Dairy & Bakery",
            brand: "Adams",
            price: 540,
            unit: "200g Pack",
            sku: "DAI-CHS-11",
            barcode: "8901011",
            stock: 14,
            image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&auto=format&fit=crop&q=80"
        },

        // Beverages
        {
            id: 12,
            title: "Coca-Cola Original 1.5L",
            category: "Beverages",
            brand: "Coca-Cola",
            price: 170,
            unit: "1 Bottle",
            sku: "BEV-COK-12",
            barcode: "8901012",
            stock: 65,
            image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 13,
            title: "Sprite Refreshing Lime 1.5L",
            category: "Beverages",
            brand: "Coca-Cola",
            price: 170,
            unit: "1 Bottle",
            sku: "BEV-SPR-13",
            barcode: "8901013",
            stock: 50,
            image: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 14,
            title: "Nestle Pure Life Water 1.5L",
            category: "Beverages",
            brand: "Nestle",
            price: 90,
            unit: "1 Bottle",
            sku: "BEV-WAT-14",
            barcode: "8901014",
            stock: 95,
            image: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 15,
            title: "Tapal Danedar Black Tea 400g",
            category: "Beverages",
            brand: "Tapal",
            price: 620,
            unit: "1 Pack",
            sku: "BEV-TEA-15",
            barcode: "8901015",
            stock: 30,
            image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 16,
            title: "Nescafe Classic Instant Coffee 100g",
            category: "Beverages",
            brand: "Nestle",
            price: 890,
            unit: "1 Jar",
            sku: "BEV-COF-16",
            barcode: "8901016",
            stock: 12,
            image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80"
        },

        // Snacks & Confectionery
        {
            id: 17,
            title: "Lays French Cheese 55g",
            category: "Snacks",
            brand: "Lays",
            price: 80,
            unit: "1 Pack",
            sku: "SNK-LAY-17",
            barcode: "8901017",
            stock: 75,
            image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 18,
            title: "Kurkure Red Chilli Chatpata 60g",
            category: "Snacks",
            brand: "Kurkure",
            price: 60,
            unit: "1 Pack",
            sku: "SNK-KUR-18",
            barcode: "8901018",
            stock: 90,
            image: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 19,
            title: "Cadbury Dairy Milk Silk 90g",
            category: "Snacks",
            brand: "Cadbury",
            price: 260,
            unit: "1 Bar",
            sku: "SNK-CAD-19",
            barcode: "8901019",
            stock: 38,
            image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 20,
            title: "LU Oreo Vanilla Biscuits Family Pack",
            category: "Snacks",
            brand: "LU",
            price: 140,
            unit: "1 Pack",
            sku: "SNK-ORE-20",
            barcode: "8901020",
            stock: 45,
            image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80"
        },

        // Cooking & Staples
        {
            id: 21,
            title: "Guard Supreme Basmati Rice 1 kg",
            category: "Staples",
            brand: "Guard",
            price: 380,
            unit: "1 kg Pack",
            sku: "STP-RIC-21",
            barcode: "8901021",
            stock: 40,
            image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 22,
            title: "Dalda Premium Cooking Oil 1L",
            category: "Staples",
            brand: "Dalda",
            price: 510,
            unit: "1 Litre Pouch",
            sku: "STP-OIL-22",
            barcode: "8901022",
            stock: 26,
            image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 23,
            title: "National Iodized Pink Salt 800g",
            category: "Staples",
            brand: "National",
            price: 80,
            unit: "1 Pack",
            sku: "STP-SLT-23",
            barcode: "8901023",
            stock: 60,
            image: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 24,
            title: "Shan Special Bombay Biryani Masala 50g",
            category: "Staples",
            brand: "Shan",
            price: 110,
            unit: "1 Box",
            sku: "STP-SHA-24",
            barcode: "8901024",
            stock: 85,
            image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80"
        },

        // Meat & Seafood
        {
            id: 25,
            title: "Fresh Chicken Boneless Breast",
            category: "Meat & Seafood",
            brand: "K&Ns / Fresh",
            price: 850,
            unit: "1 kg",
            sku: "MEA-CHK-25",
            barcode: "8901025",
            stock: 15,
            image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 26,
            title: "Premium Mutton Mix Cut",
            category: "Meat & Seafood",
            brand: "Meat One",
            price: 1950,
            unit: "1 kg",
            sku: "MEA-MUT-26",
            barcode: "8901026",
            stock: 8,
            image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80"
        },

        // Household & Personal Care
        {
            id: 27,
            title: "Ariel Deep Clean Detergent 1 kg",
            category: "Household",
            brand: "Ariel",
            price: 580,
            unit: "1 Pack",
            sku: "HOU-ARI-27",
            barcode: "8901027",
            stock: 25,
            image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 28,
            title: "Dettol Original Soap 3-Pack (3x100g)",
            category: "Household",
            brand: "Dettol",
            price: 330,
            unit: "3x100g Pack",
            sku: "HOU-DET-28",
            barcode: "8901028",
            stock: 32,
            image: "https://images.unsplash.com/photo-1607006314798-e7d4ee712d96?w=400&auto=format&fit=crop&q=80"
        },
        {
            id: 29,
            title: "Colgate Total Clean Mint Toothpaste 100g",
            category: "Household",
            brand: "Colgate",
            price: 240,
            unit: "1 Tube",
            sku: "HOU-COL-29",
            barcode: "8901029",
            stock: 29,
            image: "https://images.unsplash.com/photo-1559591937-e1032c589f7a?w=400&auto=format&fit=crop&q=80"
        }
    ];

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
    let cart = []; // [{ id, product, qty, lineDiscount, note }]
    let selectedCustomer = DUMMY_CUSTOMERS[0];
    let orderType = "Walk-in"; // Walk-in, Takeaway, Delivery
    let selectedCategory = "All";
    let selectedBrand = "";
    let searchTerm = "";
    let sortBy = "popular";
    let viewMode = "grid"; // 'grid' or 'list'

    // Order calculation state
    let cartDiscount = { type: 'none', value: 0 }; // type: 'none' | 'percent' | 'fixed'
    let isTaxEnabled = true; // GST 5%
    const TAX_RATE = 0.05;
    const DELIVERY_FEE = 100;

    // Shift / Register tracking
    let shiftData = {
        openingFloat: 10000,
        cashSales: 0,
        cardSales: 0,
        walletSales: 0,
        ordersCount: 0
    };

    // Sales history state
    let salesHistory = [];

    // Held orders state
    let heldOrders = [];

    // Settings
    let soundEnabled = true;
    let nextOrderSeq = 1001;
    let currentOrderNum = "#ORD-1001";
    let activePaymentMethod = "Cash";

    // Line item being edited in modal
    let editingLineItemId = null;

    // -------------------------------------------------------------------------
    // 3. AUDIO SYNTHESIZER (Web Audio API)
    // -------------------------------------------------------------------------
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
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
        playBeep(523.25, 0.12, 'triangle'); // C5
        setTimeout(() => playBeep(659.25, 0.22, 'triangle'), 110); // E5
    }

    function playWarningBeep() {
        if (!soundEnabled) return;
        playBeep(260, 0.18, 'sawtooth');
    }

    // -------------------------------------------------------------------------
    // 4. INITIALIZATION
    // -------------------------------------------------------------------------
    function init() {
        loadPersistedState();
        setupClock();
        populateBrandsFilter();
        renderCategoryPills();
        renderCatalog();
        updateCartUI();
        bindEvents();
        updateHeldOrdersBadge();
        initCashierProfile();

        // Render Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
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
            if (savedSeq) {
                nextOrderSeq = parseInt(savedSeq, 10);
            }
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
            if (user && user.fullName) {
                $('#posCashierName').text(user.fullName);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 5. CATALOG RENDERING & FILTERING
    // -------------------------------------------------------------------------
    function populateBrandsFilter() {
        const brands = [...new Set(DUMMY_PRODUCTS.map(p => p.brand))].sort();
        const $brandSelect = $('#posFilterBrand');
        brands.forEach(b => {
            $brandSelect.append(`<option value="${b}">${b}</option>`);
        });
    }

    function renderCategoryPills() {
        const categories = ["All", ...new Set(DUMMY_PRODUCTS.map(p => p.category))];
        const $container = $('#posCategoryPills');
        $container.empty();

        categories.forEach(cat => {
            const count = cat === "All" ? DUMMY_PRODUCTS.length : DUMMY_PRODUCTS.filter(p => p.category === cat).length;
            const isActive = cat === selectedCategory ? "active" : "";
            const pillHtml = `
                <button type="button" class="pos-cat-pill ${isActive}" data-category="${cat}">
                    <span>${cat}</span>
                    <span class="cat-count">${count}</span>
                </button>
            `;
            $container.append(pillHtml);
        });
    }

    function getFilteredProducts() {
        return DUMMY_PRODUCTS.filter(p => {
            // Category filter
            if (selectedCategory !== "All" && p.category !== selectedCategory) {
                return false;
            }
            // Brand filter
            if (selectedBrand && p.brand !== selectedBrand) {
                return false;
            }
            // Search keyword
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchTitle = p.title.toLowerCase().includes(term);
                const matchSku = p.sku.toLowerCase().includes(term);
                const matchBarcode = p.barcode.includes(term);
                const matchBrand = p.brand.toLowerCase().includes(term);
                if (!matchTitle && !matchSku && !matchBarcode && !matchBrand) {
                    return false;
                }
            }
            return true;
        }).sort((a, b) => {
            if (sortBy === 'name_asc') return a.title.localeCompare(b.title);
            if (sortBy === 'price_asc') return a.price - b.price;
            if (sortBy === 'price_desc') return b.price - a.price;
            return a.id - b.id; // 'popular'
        });
    }

    function renderCatalog() {
        const products = getFilteredProducts();
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

                const cardHtml = `
                    <div class="pos-product-card ${isOut ? 'out-of-stock' : ''}" data-id="${p.id}" title="${p.title}">
                        <div class="pos-card-thumb-wrap">
                            <img src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'">
                            <span class="pos-stock-tag ${stockClass}">${stockLabel}</span>
                            <span class="pos-card-cat-badge">${p.category.split(' ')[0]}</span>
                        </div>
                        <div class="pos-card-info">
                            <span class="pos-card-sku">${p.sku}</span>
                            <h4 class="pos-card-title">${p.title}</h4>
                            <span class="pos-card-unit">${p.unit} &bull; ${p.brand}</span>
                        </div>
                        <div class="pos-card-bottom">
                            <div class="pos-card-price">
                                <span class="currency">Rs.</span>${p.price.toFixed(2)}
                            </div>
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
                const rowHtml = `
                    <div class="pos-product-row ${isOut ? 'out-of-stock' : ''}" data-id="${p.id}">
                        <img class="pos-row-thumb" src="${p.image}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'">
                        <div class="pos-row-details">
                            <div class="pos-row-title">${p.title}</div>
                            <div class="pos-row-meta">
                                <span>${p.sku}</span>
                                <span>&bull;</span>
                                <span>${p.unit}</span>
                                <span>&bull;</span>
                                <span style="color: ${p.stock <= 5 ? '#f59e0b' : '#10b981'}; font-weight: 600;">${p.stock} in stock</span>
                            </div>
                        </div>
                        <div class="pos-row-price">Rs. ${p.price.toFixed(2)}</div>
                        <button type="button" class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; border-radius: 8px;">
                            + Add
                        </button>
                    </div>
                `;
                $list.append(rowHtml);
            });
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // -------------------------------------------------------------------------
    // 6. CART MANAGEMENT & CALCULATIONS
    // -------------------------------------------------------------------------
    function addToCart(productId, quantity = 1) {
        const product = DUMMY_PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        if (product.stock <= 0) {
            playWarningBeep();
            if (typeof showNotification === 'function') {
                showNotification(`"${product.title}" is out of stock!`, "warning");
            }
            return;
        }

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.qty + quantity > product.stock) {
                playWarningBeep();
                if (typeof showNotification === 'function') {
                    showNotification(`Maximum available stock reached (${product.stock} available)`, "warning");
                }
                return;
            }
            existingItem.qty += quantity;
        } else {
            cart.push({
                id: product.id,
                product: product,
                qty: quantity,
                lineDiscount: 0,
                note: ""
            });
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
            if (typeof showNotification === 'function') {
                showNotification(`Only ${item.product.stock} units available in stock`, "warning");
            }
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
            cartDiscount = { type: 'none', value: 0 };
            playBeep(350, 0.1);
            updateCartUI();
        }
    }

    function calculateTotals() {
        let itemsCount = 0;
        let subtotal = 0;

        cart.forEach(item => {
            itemsCount += item.qty;
            const itemPriceTotal = (item.product.price * item.qty) - (item.lineDiscount || 0);
            subtotal += Math.max(0, itemPriceTotal);
        });

        // Overall Order Discount
        let discountAmount = 0;
        if (cartDiscount.type === 'percent') {
            discountAmount = (subtotal * (cartDiscount.value / 100));
        } else if (cartDiscount.type === 'fixed') {
            discountAmount = cartDiscount.value;
        }
        discountAmount = Math.min(discountAmount, subtotal);

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);

        // Tax
        const taxAmount = isTaxEnabled ? (discountedSubtotal * TAX_RATE) : 0;

        // Delivery fee
        const deliveryFee = orderType === 'Delivery' ? DELIVERY_FEE : 0;

        const grandTotal = discountedSubtotal + taxAmount + deliveryFee;

        return {
            itemsCount,
            subtotal,
            discountAmount,
            taxAmount,
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
                const lineTotal = Math.max(0, (item.product.price * item.qty) - (item.lineDiscount || 0));
                const itemHtml = `
                    <div class="pos-cart-item" data-id="${item.id}">
                        <img class="pos-cart-item-thumb" src="${item.product.image}" alt="${item.product.title}" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'">
                        <div class="pos-cart-item-details">
                            <div class="pos-cart-item-name" title="${item.product.title}">${item.product.title}</div>
                            <div class="pos-cart-item-meta">
                                <span>Rs. ${item.product.price.toFixed(2)}</span>
                                ${item.lineDiscount > 0 ? `<span class="pos-cart-item-discount-tag">-Rs. ${item.lineDiscount}</span>` : ''}
                                ${item.note ? `<span title="${item.note}" style="color: #0aa64a;"><i data-lucide="file-text" style="width: 12px; height: 12px; vertical-align: -2px;"></i></span>` : ''}
                            </div>
                        </div>
                        <div class="pos-cart-qty-ctrl">
                            <button type="button" class="pos-qty-btn btn-qty-minus">&minus;</button>
                            <input type="number" class="pos-qty-input" value="${item.qty}" min="1" max="${item.product.stock}">
                            <button type="button" class="pos-qty-btn btn-qty-plus">&plus;</button>
                        </div>
                        <div class="pos-cart-item-total">
                            Rs. ${lineTotal.toFixed(2)}
                        </div>
                        <div class="pos-cart-item-actions">
                            <button type="button" class="pos-item-action-btn btn-edit-line" title="Line Discount & Note">
                                <i data-lucide="sliders-horizontal" style="width: 14px; height: 14px;"></i>
                            </button>
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

        // Summary stats
        $('#posSummaryItemCount').text(totals.itemsCount);
        $('#posSummarySubtotal').text(`Rs. ${totals.subtotal.toFixed(2)}`);

        if (totals.discountAmount > 0) {
            $('#posSummaryDiscount').text(`- Rs. ${totals.discountAmount.toFixed(2)}`);
            $('#btnApplyCartDiscount').text('Edit').addClass('active');
        } else {
            $('#posSummaryDiscount').text(`- Rs. 0.00`);
            $('#btnApplyCartDiscount').text('+ Add').removeClass('active');
        }

        $('#posSummaryTax').text(`Rs. ${totals.taxAmount.toFixed(2)}`);
        $('#btnToggleTax').text(isTaxEnabled ? 'GST 5%' : 'Exempt');

        if (orderType === 'Delivery') {
            $('#posDeliveryFeeRow').show();
            $('#posSummaryDeliveryFee').text(`Rs. ${totals.deliveryFee.toFixed(2)}`);
        } else {
            $('#posDeliveryFeeRow').hide();
        }

        $('#posSummaryGrandTotal').text(`Rs. ${totals.grandTotal.toFixed(2)}`);
        $('#btnPayTotalText').text(`Rs. ${totals.grandTotal.toFixed(2)}`);

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // -------------------------------------------------------------------------
    // 7. BARCODE SCANNING SIMULATOR
    // -------------------------------------------------------------------------
    function processBarcodeScan(inputCode) {
        const code = inputCode.trim();
        if (!code) return;

        // Search by barcode or SKU
        const product = DUMMY_PRODUCTS.find(p => 
            p.barcode === code || 
            p.sku.toLowerCase() === code.toLowerCase()
        );

        if (product) {
            addToCart(product.id, 1);
            $('#posBarcodeInput').val('').focus();
            if (typeof showNotification === 'function') {
                showNotification(`Scanned: ${product.title}`, "success");
            }
        } else {
            playWarningBeep();
            if (typeof showNotification === 'function') {
                showNotification(`Barcode/SKU "${code}" not found!`, "error");
            }
            $('#posBarcodeInput').select();
        }
    }

    // -------------------------------------------------------------------------
    // 8. HOLD / PARK ORDER & RESUME
    // -------------------------------------------------------------------------
    function holdCurrentOrder() {
        if (cart.length === 0) {
            if (typeof showNotification === 'function') {
                showNotification("Cart is empty! Nothing to hold.", "warning");
            }
            return;
        }

        const totals = calculateTotals();
        const holdRecord = {
            holdId: "HOLD-" + Date.now().toString().slice(-5),
            orderNum: currentOrderNum,
            customer: selectedCustomer,
            orderType: orderType,
            cart: [...cart],
            cartDiscount: { ...cartDiscount },
            isTaxEnabled: isTaxEnabled,
            totals: totals,
            heldAt: new Date().toISOString()
        };

        heldOrders.unshift(holdRecord);
        savePersistedState();
        updateHeldOrdersBadge();

        playBeep(700, 0.1);
        if (typeof showNotification === 'function') {
            showNotification(`Order ${currentOrderNum} placed on hold.`, "info");
        }

        // Reset to next order
        cart = [];
        cartDiscount = { type: 'none', value: 0 };
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
            if (!confirm("Your active cart will be overwritten by this held order. Proceed?")) {
                return;
            }
        }

        const record = heldOrders[index];
        cart = [...record.cart];
        selectedCustomer = record.customer;
        orderType = record.orderType;
        cartDiscount = { ...record.cartDiscount };
        isTaxEnabled = record.isTaxEnabled;
        currentOrderNum = record.orderNum;

        $('#posCurrentOrderNum').text(currentOrderNum);
        $('.pos-order-type-btn').removeClass('active');
        $(`.pos-order-type-btn[data-type="${orderType}"]`).addClass('active');
        updateCustomerBadge();

        // Remove from held orders
        heldOrders.splice(index, 1);
        savePersistedState();
        updateHeldOrdersBadge();

        closeModal('heldOrdersModal');
        playBeep(880, 0.08);
        updateCartUI();

        if (typeof showNotification === 'function') {
            showNotification(`Resumed held order ${currentOrderNum}`, "success");
        }
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
            name: name,
            phone: phone,
            email: email,
            points: 50, // Welcome reward bonus points!
            credit: credit,
            address: address
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

        // Reset inputs
        activePaymentMethod = "Cash";
        $('.pos-pay-tab').removeClass('active');
        $('.pos-pay-tab[data-method="Cash"]').addClass('active');
        $('.pos-method-pane').hide();
        $('#paneMethodCash').show();

        // Render Quick Cash suggestion presets
        renderQuickCashPresets(totals.grandTotal);

        // Pre-fill tendered with exact total
        $('#cashTenderedInput').val(totals.grandTotal.toFixed(2));
        updateCashChangeCalculation(totals.grandTotal, totals.grandTotal);

        // Split inputs reset
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

        // Suggest clean round note amounts
        const notes = [50, 100, 500, 1000, 5000];
        notes.forEach(n => {
            const roundUp = Math.ceil(grandTotal / n) * n;
            if (roundUp > grandTotal && !presets.includes(roundUp)) {
                presets.push(roundUp);
            }
        });

        // Add +100, +500 if reasonable
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

        // Build Sale Record
        const now = new Date();
        const saleRecord = {
            orderNum: currentOrderNum,
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isoDate: now.toISOString(),
            cashier: $('#posCashierName').text() || 'Admin',
            customer: selectedCustomer,
            orderType: orderType,
            items: cart.map(item => ({
                id: item.id,
                title: item.product.title,
                sku: item.product.sku,
                unitPrice: item.product.price,
                qty: item.qty,
                lineDiscount: item.lineDiscount || 0,
                total: (item.product.price * item.qty) - (item.lineDiscount || 0)
            })),
            totals: totals,
            paymentMethod: activePaymentMethod,
            tendered: tendered,
            change: change,
            note: $('#orderNoteInput').val().trim()
        };

        // Update shift stats
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

        // Add to sales history
        salesHistory.unshift(saleRecord);

        // Add loyalty points to registered customer
        if (selectedCustomer.id !== 0) {
            const earnedPoints = Math.floor(totals.grandTotal / 100);
            selectedCustomer.points += earnedPoints;
        }

        // Decrement local inventory stock
        cart.forEach(item => {
            const prod = DUMMY_PRODUCTS.find(p => p.id === item.id);
            if (prod) {
                prod.stock = Math.max(0, prod.stock - item.qty);
            }
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
        cartDiscount = { type: 'none', value: 0 };
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

        // Items table
        const $tbody = $('#recItemsTbody');
        $tbody.empty();
        sale.items.forEach(it => {
            const row = `
                <tr>
                    <td>${it.title}<br><small style="color: #6b7280;">${it.sku}</small></td>
                    <td class="text-right">${it.qty}</td>
                    <td class="text-right">${it.unitPrice.toFixed(0)}</td>
                    <td class="text-right">Rs. ${it.total.toFixed(0)}</td>
                </tr>
            `;
            $tbody.append(row);
        });

        // Totals
        $('#recSubtotal').text(`Rs. ${sale.totals.subtotal.toFixed(2)}`);

        if (sale.totals.discountAmount > 0) {
            $('#recDiscountRow').show();
            $('#recDiscount').text(`- Rs. ${sale.totals.discountAmount.toFixed(2)}`);
        } else {
            $('#recDiscountRow').hide();
        }

        if (sale.totals.taxAmount > 0) {
            $('#recTaxRow').show();
            $('#recTax').text(`Rs. ${sale.totals.taxAmount.toFixed(2)}`);
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
        // Barcode quick scan in top bar
        $('#posBarcodeInput').on('keypress', function (e) {
            if (e.which === 13) {
                processBarcodeScan($(this).val());
            }
        });
        $('#btnSubmitBarcode').on('click', function () {
            processBarcodeScan($('#posBarcodeInput').val());
        });

        // Search in catalog
        $('#posSearchProduct').on('input', function () {
            searchTerm = $(this).val();
            $('#btnClearSearch').toggle(searchTerm.length > 0);
            renderCatalog();
        });
        $('#btnClearSearch').on('click', function () {
            searchTerm = '';
            $('#posSearchProduct').val('').focus();
            $(this).hide();
            renderCatalog();
        });

        // Category pills click
        $(document).on('click', '.pos-cat-pill', function () {
            const cat = $(this).data('category');
            if (cat) {
                selectedCategory = cat;
                $('.pos-cat-pill').removeClass('active');
                $(this).addClass('active');
                renderCatalog();
            }
        });

        // Brand filter & sort
        $('#posFilterBrand').on('change', function () {
            selectedBrand = $(this).val();
            renderCatalog();
        });
        $('#posSortBy').on('change', function () {
            sortBy = $(this).val();
            renderCatalog();
        });

        // View mode toggle
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

        // Reset catalog filter button
        $('#btnResetCatalogFilters').on('click', function () {
            selectedCategory = 'All';
            selectedBrand = '';
            searchTerm = '';
            $('#posSearchProduct').val('');
            $('#posFilterBrand').val('');
            renderCategoryPills();
            renderCatalog();
        });

        // Product click in grid or list
        $(document).on('click', '.pos-product-card, .pos-product-row', function (e) {
            const id = parseInt($(this).data('id'), 10);
            if (id) {
                addToCart(id, 1);
            }
        });

        // Cart quantity buttons
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

        // Cart item delete
        $(document).on('click', '.btn-delete-item', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            removeFromCart(id);
        });

        // Cart item line edit
        $(document).on('click', '.btn-edit-line', function (e) {
            e.stopPropagation();
            const id = parseInt($(this).closest('.pos-cart-item').data('id'), 10);
            const item = cart.find(i => i.id === id);
            if (item) {
                editingLineItemId = id;
                $('#lineItemTitle').text(item.product.title);
                $('#lineItemDiscountInput').val(item.lineDiscount || '');
                $('#lineItemNoteInput').val(item.note || '');
                openModal('lineItemModal');
            }
        });

        $('#btnSaveLineItemOptions').on('click', function () {
            if (!editingLineItemId) return;
            const item = cart.find(i => i.id === editingLineItemId);
            if (item) {
                item.lineDiscount = parseFloat($('#lineItemDiscountInput').val()) || 0;
                item.note = $('#lineItemNoteInput').val().trim();
                updateCartUI();
            }
            closeModal('lineItemModal');
        });

        // Clear cart
        $('#btnClearCart').on('click', clearCart);

        // Hold order
        $('#btnHoldOrder').on('click', holdCurrentOrder);

        // View held orders
        $('#btnHeldOrders').on('click', function () {
            renderHeldOrdersList();
            openModal('heldOrdersModal');
        });

        // Order Type buttons
        $('.pos-order-type-btn').on('click', function () {
            $('.pos-order-type-btn').removeClass('active');
            $(this).addClass('active');
            orderType = $(this).data('type');
            updateCartUI();
        });

        // Customer selection
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

        // Order Discount Modal
        let activeDiscType = 'percent';
        $('#btnApplyCartDiscount').on('click', function () {
            if (cart.length === 0) return;
            activeDiscType = cartDiscount.type === 'fixed' ? 'fixed' : 'percent';
            if (activeDiscType === 'percent') {
                $('#btnDiscTypePercent').addClass('active');
                $('#btnDiscTypeFixed').removeClass('active');
                $('#discValueLabel').text('Discount Percentage (%)');
                $('#discValueInput').val(cartDiscount.type === 'percent' ? cartDiscount.value : '');
            } else {
                $('#btnDiscTypeFixed').addClass('active');
                $('#btnDiscTypePercent').removeClass('active');
                $('#discValueLabel').text('Fixed Amount (Rs.)');
                $('#discValueInput').val(cartDiscount.type === 'fixed' ? cartDiscount.value : '');
            }
            openModal('discountModal');
        });

        $('#btnDiscTypePercent').on('click', function () {
            activeDiscType = 'percent';
            $('#btnDiscTypePercent').addClass('active');
            $('#btnDiscTypeFixed').removeClass('active');
            $('#discValueLabel').text('Discount Percentage (%)');
        });

        $('#btnDiscTypeFixed').on('click', function () {
            activeDiscType = 'fixed';
            $('#btnDiscTypeFixed').addClass('active');
            $('#btnDiscTypePercent').removeClass('active');
            $('#discValueLabel').text('Fixed Amount (Rs.)');
        });

        $('.promo-chip').on('click', function () {
            const pct = $(this).data('pct');
            const fixed = $(this).data('fixed');
            if (pct) {
                activeDiscType = 'percent';
                $('#btnDiscTypePercent').click();
                $('#discValueInput').val(pct);
            } else if (fixed) {
                activeDiscType = 'fixed';
                $('#btnDiscTypeFixed').click();
                $('#discValueInput').val(fixed);
            }
        });

        $('#btnApplyDiscountSubmit').on('click', function () {
            const val = parseFloat($('#discValueInput').val()) || 0;
            if (val > 0) {
                cartDiscount = { type: activeDiscType, value: val };
                playBeep(880, 0.08);
            } else {
                cartDiscount = { type: 'none', value: 0 };
            }
            closeModal('discountModal');
            updateCartUI();
        });

        $('#btnRemoveDiscount').on('click', function () {
            cartDiscount = { type: 'none', value: 0 };
            closeModal('discountModal');
            updateCartUI();
        });

        // Toggle Tax
        $('#btnToggleTax').on('click', function () {
            isTaxEnabled = !isTaxEnabled;
            playBeep(700, 0.06);
            updateCartUI();
        });

        // Open Payment Modal
        $('#btnOpenPaymentModal').on('click', openPaymentModal);

        // Payment Method Tabs
        $('.pos-pay-tab').on('click', function () {
            $('.pos-pay-tab').removeClass('active');
            $(this).addClass('active');
            activePaymentMethod = $(this).data('method');

            $('.pos-method-pane').hide();
            $(`#paneMethod${activePaymentMethod}`).show();
        });

        // Quick Cash Chips
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

        // Split inputs
        $('#splitCashInput, #splitCardInput').on('input', function () {
            const totals = calculateTotals();
            updateSplitStatus(totals.grandTotal);
        });

        // Finalize Sale
        $('#btnFinalizeSale').on('click', completeSale);

        // Receipt Modal buttons
        $('#btnPrintReceiptBtn').on('click', printReceipt);
        $('#btnReceiptNewSale').on('click', function () {
            closeModal('receiptModal');
            resetForNextOrder();
        });

        // Sales history
        $('#btnSalesHistory').on('click', function () {
            renderSalesHistoryTable();
            openModal('salesHistoryModal');
        });
        $('#historySearchInput, #historyMethodFilter').on('input change', renderSalesHistoryTable);

        // Register summary
        $('#btnRegisterSummary').on('click', function () {
            renderShiftSummary();
            openModal('registerSummaryModal');
        });
        $('#btnPrintShiftReport').on('click', function () {
            window.print();
        });

        // Shortcuts Dialog
        $('#btnShortcutsHelp').on('click', function () {
            openModal('shortcutsModal');
        });

        // Fullscreen toggle
        $('#btnToggleFullscreen').on('click', toggleFullscreen);

        // Sound toggle
        $('#btnToggleSound').on('click', toggleSound);

        // Global Keyboard Shortcuts
        $(document).on('keydown', handleGlobalKeydown);
    }

    function toggleFullscreen() {
        $('body').toggleClass('pos-fullscreen-mode');
        const isFull = $('body').hasClass('pos-fullscreen-mode');
        $('#fullscreenIcon').attr('data-lucide', isFull ? 'minimize' : 'maximize');
        if (window.lucide) lucide.createIcons();

        // Optional browser fullscreen
        if (isFull) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } else {
            if (document.exitFullscreen && document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        $('#soundLabel').text(soundEnabled ? 'Sound' : 'Muted');
        $('#btnToggleSound').toggleClass('active', soundEnabled);
        savePersistedState();
        if (soundEnabled) {
            playBeep(880, 0.08);
        }
    }

    function handleGlobalKeydown(e) {
        // F1: Focus Barcode / Search
        if (e.key === 'F1') {
            e.preventDefault();
            $('#posBarcodeInput').focus().select();
            return;
        }

        // F2: Customer Select
        if (e.key === 'F2') {
            e.preventDefault();
            $('#btnOpenCustomerModal').click();
            return;
        }

        // F3: Hold Order
        if (e.key === 'F3') {
            e.preventDefault();
            holdCurrentOrder();
            return;
        }

        // F4: View Held Orders
        if (e.key === 'F4') {
            e.preventDefault();
            $('#btnHeldOrders').click();
            return;
        }

        // F8: Clear Cart
        if (e.key === 'F8') {
            e.preventDefault();
            clearCart();
            return;
        }

        // F9: Pay / Checkout
        if (e.key === 'F9') {
            e.preventDefault();
            if (cart.length > 0) {
                openPaymentModal();
            }
            return;
        }

        // F11: Toggle Fullscreen Mode
        if (e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
            return;
        }

        // Escape: Close topmost modal
        if (e.key === 'Escape') {
            $('.pos-modal-overlay:visible').last().fadeOut(140);
            return;
        }

        // '/' shortcut when not inside an input box: Focus Search
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

// Self-initialize on DOM ready
$(document).ready(function () {
    if ($('#posModule').length > 0) {
        PosApp.init();
    }
});
