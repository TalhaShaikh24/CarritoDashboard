let inventoryTable;

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    if (!AuthHelper.isStorekeeper()) {
        $('#btnAddNewInventory').hide()
    }
    const val = $('#filterStorekeeper').val();
    return val || AuthHelper.getStorekeeperId() || null;
}

let storekeepersCache = [];
let categoriesCache = [];
let brandsCache = [];
let unitsCache = [];

let selectedFiles = {
    editInventory: {},
    newInventory: {}
};

$(document).ready(() => {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Managing inventory for ${storeName}`);
        }
    }

    // 1. Load Filter Options (Storekeepers/Brands/Categories) then Init Table
    Promise.all([fetchStorekeepers(), fetchCategories(), fetchBrands(), fetchUnits()]).then(() => {
        populateFilters();
        if (AuthHelper.isStorekeeper()) {
            initializeDataTable();
        } else {
            // Admin: the storekeeper filter is only populated now, so fetch the
            // selected storekeeper's categories and brands before initializing the table
            Promise.all([fetchCategories(), fetchBrands()]).then(() => {
                populateCategoryFilter();
                populateBrandFilter();
                initializeDataTable();
            });
        }
    });

    // Handle storekeeper ready event
    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing inventory for ${skp.storeName}`);
        }
        populateFilters();
        if (inventoryTable) {
            inventoryTable.ajax.reload();
        }
    });

    // 2. Search & Filter Listeners
    $('#inventorySearch').on('input', function () {
        if (inventoryTable) {
            inventoryTable.search(this.value).draw();
        }
    });

    $('#filterCategory, #filterBrand').on('change', function () {
        if (inventoryTable) {
            inventoryTable.ajax.reload();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        // Categories and brands belong to the selected storekeeper - reload them first
        Promise.all([fetchCategories(), fetchBrands()]).then(() => {
            populateCategoryFilter();
            populateBrandFilter();
            if (inventoryTable) {
                inventoryTable.ajax.reload();
            }
        });
    });

    // 3. Edit Button Listener
    $(document).on('click', '.action-btn.edit', function () {
        editInventory($(this).data('id'));
    });
});

function initializeDataTable() {
    inventoryTable = $('#inventoryTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No inventory items found for selected storekeeper",
            zeroRecords: "No matching items found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: function (data, callback, settings) {
            const pageSize = data.length;
            const pageNumber = (data.start / data.length) + 1;
            const searchValue = data.search.value;

            const storekeeperId = getActiveStorekeeperId();
            const categoryId = $('#filterCategory').val() || null;
            const brandId = $('#filterBrand').val() || null;

            if (!storekeeperId) {
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                return;
            }

            // Always call GetAllByStorekeeperId - do not call general GetAll
            $.ajax({
                url: `${baseApiUrl}/api/Inventory/storekeeper/${storekeeperId}`,
                type: 'GET',
                data: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                    Search: searchValue,
                    CategoryId: categoryId,
                    BrandId: brandId
                },
                success: function (response) {
                    if (response && response.status === 200 && response.data) {
                        callback({
                            draw: data.draw,
                            recordsTotal: response.data.totalRecords || 0,
                            recordsFiltered: response.data.totalRecords || 0,
                            data: response.data.items || []
                        });
                    } else {
                        callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                    }
                },
                error: function () {
                    callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                }
            });
        },
        columns: [
            {
                data: 'photoFilePath',
                width: '60px',
                render: function (data) {
                    const imgUrl = data ? `${baseApiUrl}/${data}` : '/images/placeholder-product.png';
                    return `<img src="${imgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">`;
                }
            },
            {
                data: 'title',
                render: function (data, type, row) {
                    const titleText = data || 'N/A';
                    let typeBadge = '';
                    
                    if (row && row.type !== undefined && row.type !== null) {
                        const typeVal = row.type;
                        let badgeClass = 'badge-light-primary';
                        
                        if (row.packSize != null) {
                            badgeClass = 'badge-light-secondary';
                        } 

                        const displayLabel = row.packSize != null ? "Pack: " + row.packSize : "Catch Weight";



                        typeBadge = `<span class="badge ${badgeClass} badge-type">${displayLabel}</span>`;
                    }
                    
                    return `
                        <div class="product-title-cell">
                            <span class="product-title">${titleText}</span>
                            ${typeBadge}
                        </div>
                    `;
                }
            },
            {
                data: 'categoryName',
                render: d => `<span class="">${d || 'N/A'}</span>`
            },
            {
                data: 'brandName',
                render: d => `<span class="">${d || 'N/A'}</span>`
            },
            {
                data: null,
                render: function (data, type, row) {
                    const unit = (row && row.unitName ? row.unitName : 'UNIT').toUpperCase();
                    return `<span>${row.price} / ${unit}</span>`;
                }
            },
            {
                data: 'weight',
                render: function (data, type, row) {
                    const unit = (row && row.unitName ? row.unitName : 'UNIT').toUpperCase();
                    return `<span>${row.weight} ${unit}</span>`;
                }
            },
            {
                data: 'isActive',
                render: function (data) {
                    return `<span class="status-badge ${data ? 'active' : 'inactive'}">${data ? 'Active' : 'Inactive'}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                visible: AuthHelper.isStorekeeper() ? true : false,
                render: function (data, type, row) {
                    debugger
                    return `
                        <div class="action-btns">
                            <button class="action-btn edit" ${AuthHelper.isStorekeeper() ? '' : 'disabled'} data-id="${row.id}">
                                <i style="width: 18px;" data-lucide="square-pen"></i>
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
}

// --- Data Fetching Helpers ---

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

function fetchCategories() {
    return new Promise(resolve => {
        const params = { PageSize: 100 };
        const storekeeperId = getActiveStorekeeperId();
        if (storekeeperId) {
            params.storekeeperId = storekeeperId;
        }
        $.get(baseApiUrl + '/api/InventoryCategory', params, (res) => {
            if (res.status === 200) categoriesCache = res.data.items;
            resolve();
        }).fail(() => resolve());
    });
}

function populateCategoryFilter() {
    const catSelect = $('#filterCategory');
    catSelect.empty();
    catSelect.append(new Option('All Categories', ''));
    categoriesCache.forEach(c => catSelect.append(new Option(c.name, c.id)));
    if (catSelect.data('customSelect')) {
        catSelect.customSelect('refresh');
    }
}

function fetchBrands() {
    return new Promise(resolve => {
        const params = { PageSize: 100 };
        const storekeeperId = getActiveStorekeeperId();
        if (storekeeperId) {
            params.storekeeperId = storekeeperId;
        }
        $.get(baseApiUrl + '/api/InventoryBrand', params, (res) => {
            if (res.status === 200) brandsCache = res.data.items;
            resolve();
        }).fail(() => resolve());
    });
}

function populateBrandFilter() {
    const brandSelect = $('#filterBrand');
    brandSelect.empty();
    brandSelect.append(new Option('All Brands', ''));
    brandsCache.forEach(b => brandSelect.append(new Option(b.name, b.id)));
    if (brandSelect.data('customSelect')) {
        brandSelect.customSelect('refresh');
    }
}
function fetchUnits() {
    return new Promise(resolve => {
        $.get(baseApiUrl + '/api/InventoryUnit', { PageSize: 100 }, (res) => {
            if (res.status === 200) unitsCache = res.data.items;
            resolve();
        }).fail(() => resolve());
    });
}

function populateFilters() {
    const skSelect = $('#filterStorekeeper');
    const catSelect = $('#filterCategory');
    const brandSelect = $('#filterBrand');
    const unitSelect = $('#editInvUnit');

    skSelect.empty();

    if (AuthHelper.isStorekeeper()) {
        const skId = getActiveStorekeeperId() || '';
        const skName = AuthHelper.getStoreName() || 'My Store';
        skSelect.append(new Option(skName, skId, true, true));
        // Hide select container and show a store badge
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
        $(skSelect).customSelect({ placeholder: 'Select Storekeeper', searchable: true, searchableThreshold: 0 });
    }

    categoriesCache.forEach(c => catSelect.append(new Option(c.name, c.id)));
    brandsCache.forEach(b => brandSelect.append(new Option(b.name, b.id)));
    unitsCache.forEach(u => unitSelect.append(new Option(u.name, u.id)));

    $(catSelect).customSelect({ placeholder: 'All Categories', searchable: true, searchableThreshold: 0 });
    $(brandSelect).customSelect({ placeholder: 'All Brands', searchable: true, searchableThreshold: 0 });
    $(unitSelect).customSelect({ placeholder: 'Select Unit' });
}

function getOptionsHtml(items, selectedId) {
    return items.map(item =>
        `<option value="${item.id}" ${item.id === selectedId ? 'selected' : ''}>${item.name}</option>`
    ).join('');
}

// --- Edit Logic ---
function editInventory(id) {
    selectedFiles.editInventory = {}; // Reset file container

    // Fetch Details
    ajaxRequest({
        url: `${baseApiUrl}/api/Inventory/${id}`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                const item = response.data;
                const photoUrl = item.photoFilePath ? `${baseApiUrl}/${item.photoFilePath}` : null;

                // Prepare Modal Body with populated Selects
                const $template = $($('#inventoryFormTemplate').html());

                // Populate Dropdowns in Template
                $template.find('#editInvCategory').append(getOptionsHtml(categoriesCache, item.categoryId));
                $template.find('#editInvBrand').append(getOptionsHtml(brandsCache, item.brandId));
                $template.find('#editInvUnit').append(getOptionsHtml(unitsCache, item.unitId));

                $.dynamicModal({
                    title: "Edit Inventory Item",
                    bodyHtml: $template.prop('outerHTML'), // Get HTML string
                    buttons: [
                        { text: "Cancel", class: "btn-outline", action: "close" },
                        { text: "Update Item", class: "btn-primary", action: "save" }
                    ],
                    onButtonClick: function (action) {
                        if (action === "save") {
                            updateInventory(id);
                            return true;
                        }
                    }
                });

                // Set values on the live modal DOM: .val() on the detached template is
                // lost because the modal body is passed as an outerHTML string
                $('#editInvTitle').val(item.title);
                $('#editInvPrice').val(item.price);
                $('#editInvWeight').val(item.weight);
                $('#editInvDescription').val(item.description);
                // Type is shown but cannot be changed in Edit (the select is disabled)
                $('#editInvType').val(item.type);
                $('#editInvPackSize').val(item.packSize);
                $('#editInvMinOrderQuantity').val(item.minOrderQuantity);
                applyEditInventoryTypeState();

                $("#editInvBrand").customSelect();
                $("#editInvCategory").customSelect();
                $("#editInvUnit").customSelect();

                // Init Uploader
                initUploader('#editInvPhoto', 'editInventory', 'photo', photoUrl);
            }
        }
    });
}

function addNewInventory() {
    const formData = new FormData();
    const files = selectedFiles.newInventory;

    // Validate Required Fields
    const title = $('#newInvTitle').val().trim();
    const categoryId = $('#newInvCategory').val();
    const brandId = $('#newInvBrand').val();
    const unitId = $('#newInvUnit').val();
    const price = $('#newInvPrice').val();
    const weight = $('#newInvWeight').val() || 0;
    const type = $('#newInvType').val();
    const packSize = $('#newInvPackSize').val();
    const minOrderQuantity = $('#newInvMinOrderQuantity').val() || 0;

    // Pack Item needs Pack Size (Weight is optional); Catch Weight Item needs Weight (Pack Size is not sent)
    if (!title || !categoryId || !brandId || !unitId || !price || !type ||
        (type === '1' && !packSize) || (type === '2' && !weight)) {
        showNotification("Please fill all required fields", "error");
        return;
    }


    const activeSkpId = getActiveStorekeeperId();
    if (!activeSkpId) {
        showNotification("Please select or assign a storekeeper first", "error");
        return;
    }

    formData.append('[0].Title', title);
    formData.append('[0].CategoryId', categoryId);
    formData.append('[0].BrandId', brandId);
    formData.append('[0].UnitId', unitId);
    formData.append('[0].Price', price);
    formData.append('[0].Type', type);
    if (type === '1') {
        // Pack Item: PackSize is sent; Weight is optional and sent only when entered
        formData.append('[0].PackSize', packSize);
        if ($('#newInvWeight').val()) {
            formData.append('[0].Weight', weight);
        }
    } else {
        // Catch Weight Item: Weight is sent, PackSize is not sent (stays null on the API side)
        formData.append('[0].Weight', weight);
    }
    formData.append('[0].MinOrderQuantity', minOrderQuantity);
    formData.append('[0].Description', $('#newInvDescription').val().trim());
    formData.append('[0].CreatedByUserId', AuthHelper.getUserId() || 1);

    // Handle Photo
    if (files.photo) {
        formData.append('[0].Photo', files.photo);
    }

    showNotification("Creating inventory item...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Inventory?storekeeperId=${activeSkpId}`, 
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                inventoryTable.ajax.reload(null, false);
            }
        }
    });
}

function updateInventory(id) {
    const formData = new FormData();
    const files = selectedFiles.editInventory;

    formData.append('UpdatedByUserId', AuthHelper.getUserId() || 1);

    // Type cannot change in Edit: the disabled select still holds the item's
    // original type, and the API requires Type on update, so it is sent as-is
    const type = $('#editInvType').val();
    const packSize = $('#editInvPackSize').val();
    const weight = $('#editInvWeight').val();

    // Pack Item needs Pack Size (Weight is optional); Catch Weight Item needs Weight (Pack Size is not sent)
    if ((type === '1' && !packSize) || (type === '2' && !weight)) {
        showNotification("Please fill all required fields", "error");
        return;
    }

    // Optional/Nullable fields
    formData.append('Title', $('#editInvTitle').val().trim());
    formData.append('Price', $('#editInvPrice').val() || 0);
    formData.append('Type', type);
    if (type === '1') {
        // Pack Item: PackSize is sent; Weight is optional and sent only when entered
        formData.append('PackSize', packSize);
        if (weight) {
            formData.append('Weight', weight);
        }
    } else {
        formData.append('Weight', weight || 0);
    }
    formData.append('MinOrderQuantity', $('#editInvMinOrderQuantity').val() || 0);
    formData.append('Description', $('#editInvDescription').val().trim());
    formData.append('CategoryId', $('#editInvCategory').val());
    formData.append('BrandId', $('#editInvBrand').val());
    formData.append('UnitId', $('#editInvUnit').val());

    if (files.photo) {
        formData.append('Photo', files.photo);
    }

    if (!$('#editInvTitle').val()) {
        showNotification("Title is required", "error");
        return;
    }

    showNotification("Updating inventory...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Inventory/${id}`,
        method: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                inventoryTable.ajax.reload(null, false);
            }
        }
    });
}


// Listener for "Add Inventory" button
$('#btnAddNewInventory').click(function () {
    selectedFiles.newInventory = {}; // Reset files

    // Generate Options from Cache
    const categoryOptions = getOptionsHtml(categoriesCache);
    const brandOptions = getOptionsHtml(brandsCache);
    // The first unit is selected by default in the Add form
    const unitOptions = getOptionsHtml(unitsCache, unitsCache.length ? unitsCache[0].id : undefined);

    const addFormHtml = `
        <form id="frmAddInventory">
            <div class="form-group">
                <label>Title *</label>
                <input type="text" id="newInvTitle" class="form-control" required placeholder="Enter Title">
            </div>
            
            <div class="form-row">
                <div class="form-group col-md-6">
                    <label>Category *</label>
                    <select id="newInvCategory" class="form-control" required>
                        <option value="">Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group col-md-6">
                    <label>Brand *</label>
                    <select id="newInvBrand" class="form-control" required>
                        <option value="">Select Brand</option>
                        ${brandOptions}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group col-md-6">
                    <label>Type *</label>
                    <select id="newInvType" class="form-control" required>
                        <option value="">Select Type</option>
                        <option value="1" selected>Pack Item</option>
                        <option value="2">Catch Weight Item</option>
                    </select>
                </div>
                <div class="form-group col-md-6">
                    <label>Unit *</label>
                    <select id="newInvUnit" class="form-control" required>
                        <option value="">Select Unit</option>
                        ${unitOptions}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group col-md-6">
                    <label id="newInvPriceLabel">Price *</label>
                    <input type="number" id="newInvPrice" class="form-control" min="0" required placeholder="Enter Price">
                </div>
                
                <div class="form-group col-md-3">
                    <label>Weight</label>
                    <input type="number" id="newInvWeight" class="form-control" min="0" step="0.01" placeholder="Enter Weight">
                </div>
                <div class="form-group col-md-3">
                    <label id="newInvPackSizeLabel">Pack Size</label>
                    <input type="number" id="newInvPackSize" class="form-control" min="0" placeholder="Enter Pack Size">
                </div>
                <div class="form-group col-md-3">
                    <label>Min Order Quantity</label>
                    <input type="number" id="newInvMinOrderQuantity" class="form-control" min="0" step="0.01" placeholder="Enter Min Order Quantity">
                </div>
            </div>

            <div class="form-group">
                <label>Description</label>
                <textarea id="newInvDescription" class="form-control" rows="3" placeholder="Enter Description"></textarea>
            </div>

            <hr style="margin:20px 0;">

            <div class="form-group">
                <label>Product Photo</label>
                <input type="file" id="newInvPhoto" accept="image/*">
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Add New Inventory Item",
        bodyHtml: addFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Item", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewInventory();
                return true;
            }
        }
    });

    // Initialize Custom Selects
    $("#newInvCategory").customSelect();
    $("#newInvBrand").customSelect();
    $("#newInvUnit").customSelect();
    $("#newInvType").customSelect();
    applyInventoryTypeState();

    
    initUploader('#newInvPhoto', 'newInventory', 'photo');
});
// Add Inventory: Pack Item uses Pack Size (Weight disabled); Catch Weight Item uses Weight (Pack Size disabled)
function applyInventoryTypeState() {
    const type = $('#newInvType').val();
    const isPackItem = type === '1';
    const isCatchWeight = type === '2';

    $('#newInvPackSize').prop('disabled', isCatchWeight);
    if (isCatchWeight) {
        $('#newInvPackSize').val('');
    }

    // Weight stays enabled for Pack Item too (it is optional there)

    // Unit display: full name in the select (e.g. "BA - Bag"), short code before " - " (e.g. "BA")
    const unitFullName = $('#newInvUnit').val() ? $('#newInvUnit option:selected').text().trim() : '';
    const unitCode = unitFullName ? (unitFullName.includes(' - ') ? unitFullName.split(' - ')[0].trim() : unitFullName) : '';

    // Price label follows the type: Pack Item is priced per case,
    // Catch Weight Item is priced per selected unit (unit code shown as a badge)
    if (isPackItem) {
        $('#newInvPriceLabel').html('Price Per Case *');
        $('#newInvPrice').attr('placeholder', 'Enter Price Per Case');
    } else if (isCatchWeight) {
        if (unitCode) {
            $('#newInvPriceLabel').html(`Price Per <span class="badge badge-light-secondary">${unitCode}</span> *`);
            $('#newInvPrice').attr('placeholder', `Enter Price Per ${unitCode}`);
        } else {
            $('#newInvPriceLabel').html('Price *');
            $('#newInvPrice').attr('placeholder', 'Enter Price');
        }
    } else {
        $('#newInvPriceLabel').html('Price *');
        $('#newInvPrice').attr('placeholder', 'Enter Price');
    }

    // Pack Size label stays plain; only its placeholder follows the selected unit
    $('#newInvPackSizeLabel').html('Pack Size *');
    if (unitFullName) {
        $('#newInvPackSize').attr('placeholder', `Enter Size in ${unitCode}`);
    } else {
        $('#newInvPackSize').attr('placeholder', 'Enter Pack Size');
    }
}

$(document).on('change', '#newInvType', applyInventoryTypeState);
$(document).on('change', '#newInvUnit', applyInventoryTypeState);

// Edit form: same Type-based state as Add, but the Type itself is fixed
// (the #editInvType select is disabled, so it can never change here)
function applyEditInventoryTypeState() {
    const type = $('#editInvType').val();
    const isPackItem = type === '1';
    const isCatchWeight = type === '2';

    $('#editInvPackSize').prop('disabled', isCatchWeight);
    if (isCatchWeight) {
        $('#editInvPackSize').val('');
    }

    // Weight stays enabled for Pack Item too (it is optional there)

    // Unit display: full name in the select (e.g. "BA - Bag"), short code before " - " (e.g. "BA")
    const unitFullName = $('#editInvUnit').val() ? $('#editInvUnit option:selected').text().trim() : '';
    const unitCode = unitFullName ? (unitFullName.includes(' - ') ? unitFullName.split(' - ')[0].trim() : unitFullName) : '';

    // Price label follows the type, same as the Add form
    if (isPackItem) {
        $('#editInvPriceLabel').html('Price Per Case *');
        $('#editInvPrice').attr('placeholder', 'Enter Price Per Case');
    } else if (isCatchWeight) {
        if (unitCode) {
            $('#editInvPriceLabel').html(`Price Per <span class="badge badge-light-secondary">${unitCode}</span> *`);
            $('#editInvPrice').attr('placeholder', `Enter Price Per ${unitCode}`);
        } else {
            $('#editInvPriceLabel').html('Price *');
            $('#editInvPrice').attr('placeholder', 'Enter Price');
        }
    } else {
        $('#editInvPriceLabel').html('Price *');
        $('#editInvPrice').attr('placeholder', 'Enter Price');
    }

    // Pack Size label stays plain; only its placeholder follows the selected unit
    $('#editInvPackSizeLabel').html('Pack Size *');
    if (unitFullName) {
        $('#editInvPackSize').attr('placeholder', `Enter Size in ${unitCode}`);
    } else {
        $('#editInvPackSize').attr('placeholder', 'Enter Pack Size');
    }
}

$(document).on('change', '#editInvUnit', applyEditInventoryTypeState);
