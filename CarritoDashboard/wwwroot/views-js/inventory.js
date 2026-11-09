let inventoryTable;

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    if (!AuthHelper.isStorekeeper()) {
        $('#btnAddNewInventory, #btnImportInventory').hide()
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

                    if (row?.type !== undefined && row?.type !== null) {
                        const typeVal = Number(row.type);

                        if (typeVal === 1) {
                            typeBadge = `
                                <span class="badge badge-light-warning badge-type">
                                    Pack: ${row.packSize ?? ''}
                                </span>
                                <span class="badge badge-light-primary badge-type">
                                    Weight: ${row.weight + " " +row.unitName.toUpperCase() ?? ''}
                                </span>
                            `;
                                            } else {
                                                typeBadge = `
                                <span class="badge badge-light-primary badge-type">
                                    Catch Weight
                                </span>
                            `;
                        }
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
                    const weight = row.weight;
                    return row.type == 2 ? `<span>Rs. ${row.price} / ${weight} ${unit}</span>` : `<span>Rs. ${row.price} / CASE</span>`;
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
                            <a href="/InventoryTransaction" class="action-btn" title="View Stock Transactions" style="display: inline-flex; align-items: center; justify-content: center; text-decoration: none;">
                                <i style="width: 18px;" data-lucide="history"></i>
                            </a>
                            <button class="action-btn edit" ${AuthHelper.isStorekeeper() ? '' : 'disabled'} data-id="${row.id}" title="Edit Item">
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
                debugger
                $("#editInvPackSize").removeAttr("required");
                $('#editInvPackSizeLabel').html('Pack Size');

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


// --- Quick Add Category / Brand (from the Add & Edit forms) ---
// The "+ Add New" link beside the Category / Brand labels opens a small
// centred popup over the form (its markup lives in Index.cshtml). Saving
// creates the record through the same endpoints the Categories / Brands
// pages use, then selects it in the form automatically.
let quickAddState = null;

$(document).on('click', '.quick-add-link', function (e) {
    e.preventDefault();
    openQuickAddPopup($(this).data('kind'), $(this).data('target'));
});

function openQuickAddPopup(kind, selectId) {
    const isCategory = kind === 'category';
    const label = isCategory ? 'Category' : 'Brand';
    quickAddState = { isCategory: isCategory, selectId: selectId };

    $('#quickAddTitle').text(`Add New ${label}`);
    $('#quickAddNameLabel').text(`${label} Name *`);
    $('#quickAddName').attr('placeholder', `Enter ${label.toLowerCase()} name`).val('');
    $('#quickAddSave').text(`Add ${label}`).prop('disabled', false);

    // Fresh uploader each time, so no photo from a previous add carries over
    selectedFiles.quickAddPopup = {};
    initUploader('#quickAddPhoto', 'quickAddPopup', 'photo');

    $('#quickAddOverlay').css('display', 'flex');
    $('#quickAddName').focus();
}

function closeQuickAddPopup() {
    $('#quickAddOverlay').hide();
    quickAddState = null;
}

$('#quickAddClose, #quickAddCancel').on('click', closeQuickAddPopup);

$('#quickAddOverlay').on('click', function (e) {
    if (e.target === this) {
        closeQuickAddPopup();
    }
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && quickAddState) {
        closeQuickAddPopup();
    }
});

$('#quickAddName').on('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitQuickAddPopup();
    }
});

$('#quickAddSave').on('click', submitQuickAddPopup);

function submitQuickAddPopup() {
    if (!quickAddState) return;
    const isCategory = quickAddState.isCategory;
    const selectId = quickAddState.selectId;
    const name = $('#quickAddName').val().trim();

    // Same name rule as the API DTOs (3-50 characters)
    if (!name || name.length < 3 || name.length > 50) {
        showNotification("Name must be between 3 and 50 characters.", "error");
        return;
    }

    const storekeeperId = getActiveStorekeeperId();
    if (!storekeeperId) {
        showNotification("Please select or assign a storekeeper first", "error");
        return;
    }

    const formData = new FormData();
    formData.append('StorekeeperId', storekeeperId);
    formData.append('Name', name);

    // Photo is optional - sent only when one was chosen
    const photoFile = selectedFiles.quickAddPopup ? selectedFiles.quickAddPopup.photo : null;
    if (photoFile) {
        formData.append('Photo', photoFile);
    }

    const $saveBtn = $('#quickAddSave');
    $saveBtn.prop('disabled', true);

    ajaxRequest({
        url: `${baseApiUrl}/api/${isCategory ? 'InventoryCategory' : 'InventoryBrand'}`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            $saveBtn.prop('disabled', false);
            // Both create endpoints return the new record's id
            const newId = response && response.data
                ? (isCategory ? response.data.categoryId : response.data.brandId)
                : null;
            if (newId) {
                finishQuickAdd(selectId, isCategory, { id: newId, name: name });
            } else {
                // Fallback: refresh the list and pick the entry with this name
                (isCategory ? fetchCategories() : fetchBrands()).then(() => {
                    const cache = isCategory ? categoriesCache : brandsCache;
                    const match = cache.find(x => x.name.toLowerCase() === name.toLowerCase());
                    if (match) {
                        finishQuickAdd(selectId, isCategory, match);
                    }
                });
            }
        },
        onError: () => {
            $saveBtn.prop('disabled', false);
        }
    });
}

function finishQuickAdd(selectId, isCategory, item) {
    // Keep the caches and the page's filter dropdowns in sync
    const cache = isCategory ? categoriesCache : brandsCache;
    if (!cache.some(x => x.id === item.id)) {
        cache.push({ id: item.id, name: item.name });
    }
    if (isCategory) {
        populateCategoryFilter();
    } else {
        populateBrandFilter();
    }

    // Add the new option to the form's select (if missing) and select it
    const $select = $('#' + selectId);
    if ($select.find(`option[value="${item.id}"]`).length === 0) {
        $select.append(new Option(item.name, item.id));
    }
    $select.val(item.id);
    if ($select.data('customSelect')) {
        $select.customSelect('refresh');
    }

    closeQuickAddPopup();
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
                    <label>Category * <a href="javascript:void(0);" class="quick-add-link" data-kind="category" data-target="newInvCategory">+ Add New</a></label>
                    <select id="newInvCategory" class="form-control" required>
                        <option value="">Select Category</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div class="form-group col-md-6">
                    <label>Brand * <a href="javascript:void(0);" class="quick-add-link" data-kind="brand" data-target="newInvBrand">+ Add New</a></label>
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
                <div class="form-group col-md-3">
                    <label>Weight *</label>
                    <input type="number" id="newInvWeight" class="form-control" min="0" step="0.01" required placeholder="Enter Weight">
                </div>
                <div class="form-group col-md-6">
                    <label id="newInvPriceLabel">Price *</label>
                    <input type="number" id="newInvPrice" class="form-control" min="0" required placeholder="Enter Price">
                </div>
                <div class="form-group col-md-3">
                    <label id="newInvPackSizeLabel">Pack Size</label>
                    <input type="number" id="newInvPackSize" class="form-control" min="0" placeholder="Enter Pack Size">
                </div>
                <div class="form-group col-md-3">
                    <label>Min Order Quantity *</label>
                    <input type="number" id="newInvMinOrderQuantity" class="form-control" min="0" step="0.01" required placeholder="Enter Min Order Quantity">
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

    // Price label: Pack Item is priced per case; Catch Weight Item shows the
    // entered weight with the selected unit as a badge (e.g. "Price Per [2.5 BA] *")
    if (isPackItem) {
        $('#newInvPriceLabel').html('Price Per Case *');
        $('#newInvPrice').attr('placeholder', 'Enter Price Per Case');

        $("#newInvPackSize").attr("required", "true");
        $('#newInvPackSizeLabel').html('Pack Size *');
    } else if (isCatchWeight) {

        $("#newInvPackSize").removeAttr("required");
        $('#newInvPackSizeLabel').html('Pack Size');

        const weightValue = $('#newInvWeight').val() ? String($('#newInvWeight').val()).trim() : '';
        if (weightValue && unitCode) {
            $('#newInvPriceLabel').html(`Price Per <span class="badge badge-light-primary">${weightValue} ${unitCode}</span> *`);
            $('#newInvPrice').attr('placeholder', `Enter Price Per ${weightValue} ${unitCode}`);
        } else if (unitCode) {
            $('#newInvPriceLabel').html(`Price Per <span class="badge badge-light-primary">${unitCode}</span> *`);
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
    if (unitFullName) {
        $('#newInvPackSize').attr('placeholder', `Enter Size in ${unitCode}`);
    } else {
        $('#newInvPackSize').attr('placeholder', 'Enter Pack Size');
    }
}

$(document).on('change', '#newInvType', applyInventoryTypeState);
$(document).on('change', '#newInvUnit', applyInventoryTypeState);
$(document).on('input change', '#newInvWeight', applyInventoryTypeState);

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

    // Price label: Pack Item is priced per case; Catch Weight Item shows the
    // entered weight with the selected unit as a badge (e.g. "Price Per [2.5 BA] *")
    if (isPackItem) {
        $('#editInvPriceLabel').html('Price Per Case *');
        $('#editInvPrice').attr('placeholder', 'Enter Price Per Case');

        $("#editInvPackSize").attr("required", "true");
        $('#editInvPackSizeLabel').html('Pack Size *');
    } else if (isCatchWeight) {
        $("#editInvPackSize").removeAttr("required");
        $('#editInvPackSizeLabel').html('Pack Size');

        const weightValue = $('#editInvWeight').val() ? String($('#editInvWeight').val()).trim() : '';
        if (weightValue && unitCode) {
            $('#editInvPriceLabel').html(`Price Per <span class="badge badge-light-primary">${weightValue} ${unitCode}</span> *`);
            $('#editInvPrice').attr('placeholder', `Enter Price Per ${weightValue} ${unitCode}`);
        } else if (unitCode) {
            $('#editInvPriceLabel').html(`Price Per <span class="badge badge-light-primary">${unitCode}</span> *`);
            $('#editInvPrice').attr('placeholder', `Enter Price Per ${unitCode}`);
        } else {
            $('#editInvPriceLabel').html('Price *');
            $('#editInvPrice').attr('placeholder', 'Enter Price');
        }
    } else {
        $('#editInvPriceLabel').html('Price *');
        $('#editInvPrice').attr('placeholder', 'Enter Price');
    }

    if (unitFullName) {
        $('#editInvPackSize').attr('placeholder', `Enter Size in ${unitCode}`);
    } else {
        $('#editInvPackSize').attr('placeholder', 'Enter Pack Size');
    }
}

$(document).on('change', '#editInvUnit', applyEditInventoryTypeState);
$(document).on('input change', '#editInvWeight', applyEditInventoryTypeState);

// ==================== Import Inventory (Excel / CSV) ====================
// Same flow as the MenuOptics import: download a sample file, upload the
// filled file, review and edit the rows inside the popup, then submit. The
// API create endpoint already accepts a list of items (the Add form uses the
// same endpoint with a single item), so all preview rows go in one request
// with the exact same field rules as the Add form.

let importInvRows = [];

const IMPORT_INV_HEADERS = ['Title', 'Category', 'Brand', 'Type', 'Unit', 'Price', 'Weight', 'Pack Size', 'Min Order Quantity', 'Description'];

function escapeImportHtml(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

$('#btnImportInventory').click(function () {
    importInvRows = [];

    const bodyHtml = `
        <style>
            .import-inv-table { width: 100%; min-width: 1200px; border-collapse: collapse; }
            .import-inv-table th { text-align: left; font-size: 12px; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
            .import-inv-table td { padding: 6px; border-bottom: 1px solid #eef1ee; vertical-align: middle; }
            .import-inv-table .form-control { height: 36px; font-size: 13px; padding: 6px 8px; }
            .import-inv-table select.form-control { min-width: 120px; }
            .import-inv-unmatched { border-color: #dc2626 !important; }
        </style>
        <p style="margin: 0 0 14px; color: #6b7280; font-size: 13px;">
            Download the sample file &mdash; it already contains the currently selected
            storekeeper's existing inventory items from the system. Edit that file or
            add new rows, then upload the Excel (.xlsx) or CSV file here. Every row
            loads below &mdash; you can edit any value or delete a row before importing.
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px;">
            <button type="button" id="btnDownloadImportSample" class="btn-outline">
                <i style="width: 16px;" data-lucide="download"></i>
                Download Sample File
            </button>
            <label for="importInvFileInput" class="btn-primary" style="margin: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i style="width: 16px;" data-lucide="file-up"></i>
                Choose Excel / CSV File
            </label>
            <input type="file" id="importInvFileInput" accept=".xlsx,.xls,.csv" style="display: none;">
            <span id="importInvFileName" style="font-size: 13px; color: #6b7280;">No file chosen</span>
        </div>
        <div id="importInvPreviewWrap" style="display: none;">
            <div id="importInvSummary" style="font-size: 13px; margin-bottom: 10px;"></div>
            <div style="overflow-x: auto;">
                <table class="import-inv-table">
                    <thead>
                        <tr>
                            <th style="width: 34px;">#</th>
                            <th>Title *</th>
                            <th>Category *</th>
                            <th>Brand *</th>
                            <th>Type *</th>
                            <th>Unit *</th>
                            <th>Price *</th>
                            <th>Weight</th>
                            <th>Pack Size</th>
                            <th>Min Order Qty</th>
                            <th>Description</th>
                            <th style="width: 44px;"></th>
                        </tr>
                    </thead>
                    <tbody id="importInvTableBody"></tbody>
                </table>
            </div>
        </div>
    `;

    $.dynamicModal({
        title: "Import Inventory Items",
        // Reusable centred layout from the shared modal component
        centered: true,
        bodyHtml: bodyHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Import Items", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                submitImportInventory();
                return true;
            }
        }
    });

    $('#btnDownloadImportSample').on('click', function (e) {
        e.preventDefault();
        downloadImportSampleFile();
    });

    $('#importInvFileInput').on('change', function (e) {
        handleImportInvFile(e);
        // Reset so the same file can be chosen again
        $(this).val('');
    });
});

// The sample file carries the storekeeper's REAL inventory items from the API
// (same idea as the MenuOptics sample, which lists the actual menu items), so
// the user can edit that file and upload it back. When the storekeeper has no
// items yet, it falls back to a blank template with two example rows.
function downloadImportSampleFile() {
    const activeSkpId = getActiveStorekeeperId();
    if (!activeSkpId) {
        showNotification('Please select or assign a storekeeper first', 'error');
        return;
    }

    ajaxRequest({
        url: `${baseApiUrl}/api/Inventory/storekeeper/${activeSkpId}`,
        method: 'GET',
        data: { PageNumber: 1, PageSize: 1000 },
        showMessage: false,
        onSuccess: (response) => {
            const items = (response && response.status === 200 && response.data && response.data.items) ? response.data.items : [];
            if (items.length > 0) {
                const rows = [IMPORT_INV_HEADERS].concat(items.map(item => [
                    item.title || '',
                    item.categoryName || '',
                    item.brandName || '',
                    Number(item.type) === 2 ? 'Catch Weight Item' : 'Pack Item',
                    item.unitName || '',
                    item.price === null || item.price === undefined ? '' : item.price,
                    item.weight ? item.weight : '',
                    item.packSize === null || item.packSize === undefined ? '' : item.packSize,
                    item.minOrderQuantity === null || item.minOrderQuantity === undefined ? '' : item.minOrderQuantity,
                    item.description || ''
                ]));
                generateImportSampleFile(rows);
            } else {
                generateImportSampleFile(buildImportTemplateRows());
            }
        },
        onError: () => {
            showNotification('Failed to download sample file.', 'error');
        }
    });
}

function buildImportTemplateRows() {
    const categoryName = categoriesCache.length ? categoriesCache[0].name : 'Category Name';
    const brandName = brandsCache.length ? brandsCache[0].name : 'Brand Name';
    const unitName = unitsCache.length ? unitsCache[0].name : 'Unit Name';

    return [
        IMPORT_INV_HEADERS,
        ['Sample Pack Item', categoryName, brandName, 'Pack Item', unitName, 1200, '', 12, 1, 'Sample pack item - replace with your own data'],
        ['Sample Catch Weight Item', categoryName, brandName, 'Catch Weight Item', unitName, 850, 2.5, '', 0.5, 'Sample catch weight item - replace with your own data']
    ];
}

function generateImportSampleFile(sampleRows) {
    const fileDate = new Date().toISOString().slice(0, 10);

    if (typeof XLSX !== 'undefined') {
        const worksheet = XLSX.utils.aoa_to_sheet(sampleRows);
        worksheet['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 18 }, { wch: 40 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
        XLSX.writeFile(workbook, `Inventory_Import_Sample_${fileDate}.xlsx`);
        return;
    }

    // Fallback when the Excel library could not be loaded: same content as CSV
    const csvContent = sampleRows.map(row => row.map(cell => {
        const text = cell === null || cell === undefined ? '' : String(cell);
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventory_Import_Sample_${fileDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function handleImportInvFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    $('#importInvFileName').text(file.name);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                buildImportInvRows(parseImportCsvText(event.target.result));
            } catch (err) {
                console.error('Error parsing CSV:', err);
                showNotification('Error processing CSV file. Please check the file structure.', 'error');
            }
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        if (typeof XLSX === 'undefined') {
            showNotification('Excel support could not be loaded. Please upload the file as CSV instead.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
                buildImportInvRows(rows);
            } catch (err) {
                console.error('Error parsing Excel file:', err);
                showNotification('Error processing Excel file. Please check the file structure.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        showNotification('Please choose an Excel (.xlsx) or CSV file.', 'error');
    }
}

// Quote-aware CSV parser (same approach as the MenuOptics import parser)
function parseImportCsvText(text) {
    const rows = [];
    let row = [];
    let inQuotes = false;
    let currentCell = '';

    const source = String(text || '').replace(/^\uFEFF/, '');

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        const nextChar = source[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
            row.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            row.push(currentCell.trim());
            currentCell = '';
            if (row.some(c => c !== '')) {
                rows.push(row);
            }
            row = [];
        } else {
            currentCell += char;
        }
    }

    if (currentCell.length > 0 || row.length > 0) {
        row.push(currentCell.trim());
        if (row.some(c => c !== '')) {
            rows.push(row);
        }
    }

    return rows;
}

function normalizeImportHeader(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match a file cell to a cached Category / Brand / Unit: by Id when the cell is
// numeric, otherwise by name (case-insensitive). Units can also be written as
// just the short code ("BA") while the saved name is "BA - Bag".
function findImportCachedItem(cache, rawValue) {
    const text = String(rawValue === null || rawValue === undefined ? '' : rawValue).trim();
    if (!text) return null;

    const asNumber = Number(text);
    if (!isNaN(asNumber)) {
        const byId = cache.find(item => item.id === asNumber);
        if (byId) return byId;
    }

    const wanted = text.toLowerCase();
    let match = cache.find(item => String(item.name || '').trim().toLowerCase() === wanted);
    if (match) return match;

    match = cache.find(item => {
        const name = String(item.name || '').trim().toLowerCase();
        return name.split('-')[0].trim() === wanted || wanted.split('-')[0].trim() === name;
    });
    return match || null;
}

function cleanImportNumber(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^0-9.\-]/g, '');
}

function parseImportType(rawValue) {
    const text = String(rawValue || '').trim().toLowerCase();
    if (text === '2' || text.includes('catch')) return '2';
    return '1'; // Pack Item is the default, same as the Add form
}

function buildImportInvRows(rows) {
    if (!rows || rows.length === 0) {
        showNotification('The uploaded file is empty.', 'error');
        return;
    }

    const headerRow = (rows[0] || []).map(normalizeImportHeader);
    const col = {
        title: headerRow.findIndex(h => h.includes('title') || h === 'name' || h.includes('product')),
        category: headerRow.findIndex(h => h.includes('categor')),
        brand: headerRow.findIndex(h => h.includes('brand')),
        type: headerRow.findIndex(h => h.includes('type')),
        unit: headerRow.findIndex(h => h.includes('unit')),
        price: headerRow.findIndex(h => h.includes('price')),
        weight: headerRow.findIndex(h => h.includes('weight')),
        packSize: headerRow.findIndex(h => h.includes('packsize') || h === 'pack'),
        minOrder: headerRow.findIndex(h => h.includes('minorder') || h === 'moq'),
        description: headerRow.findIndex(h => h.includes('desc'))
    };

    const hasHeader = Object.values(col).some(idx => idx !== -1);
    if (!hasHeader) {
        // No recognisable header: fall back to the sample file's column order
        // and treat every row as data
        col.title = 0; col.category = 1; col.brand = 2; col.type = 3; col.unit = 4;
        col.price = 5; col.weight = 6; col.packSize = 7; col.minOrder = 8; col.description = 9;
    }

    const cell = (row, idx) => (idx === -1 || row[idx] === undefined || row[idx] === null) ? '' : row[idx];

    importInvRows = [];
    for (let r = hasHeader ? 1 : 0; r < rows.length; r++) {
        const row = rows[r] || [];
        if (row.every(c => String(c === null || c === undefined ? '' : c).trim() === '')) continue;

        const category = findImportCachedItem(categoriesCache, cell(row, col.category));
        const brand = findImportCachedItem(brandsCache, cell(row, col.brand));
        const unit = findImportCachedItem(unitsCache, cell(row, col.unit));

        importInvRows.push({
            title: String(cell(row, col.title)).trim(),
            categoryId: category ? String(category.id) : '',
            brandId: brand ? String(brand.id) : '',
            unitId: unit ? String(unit.id) : '',
            type: parseImportType(cell(row, col.type)),
            price: cleanImportNumber(cell(row, col.price)),
            weight: cleanImportNumber(cell(row, col.weight)),
            packSize: cleanImportNumber(cell(row, col.packSize)),
            minOrderQuantity: cleanImportNumber(cell(row, col.minOrder)),
            description: String(cell(row, col.description)).trim()
        });
    }

    if (importInvRows.length === 0) {
        showNotification('The uploaded file does not contain any item rows.', 'error');
        return;
    }

    renderImportInvPreview();
}

function getImportOptionsHtml(items, selectedId, placeholder) {
    let html = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        html += `<option value="${item.id}" ${String(item.id) === String(selectedId) ? 'selected' : ''}>${escapeImportHtml(item.name)}</option>`;
    });
    return html;
}

function renderImportInvPreview() {
    let html = '';

    importInvRows.forEach((row, index) => {
        html += `
        <tr data-row-index="${index}">
            <td>${index + 1}</td>
            <td><input type="text" class="form-control" data-field="title" value="${escapeImportHtml(row.title)}" placeholder="Enter Title" style="min-width: 220px;"></td>
            <td><select class="form-control ${row.categoryId ? '' : 'import-inv-unmatched'}" data-field="categoryId">${getImportOptionsHtml(categoriesCache, row.categoryId, 'Select Category')}</select></td>
            <td><select class="form-control ${row.brandId ? '' : 'import-inv-unmatched'}" data-field="brandId">${getImportOptionsHtml(brandsCache, row.brandId, 'Select Brand')}</select></td>
            <td>
                <select class="form-control" data-field="type">
                    <option value="1" ${row.type === '1' ? 'selected' : ''}>Pack Item</option>
                    <option value="2" ${row.type === '2' ? 'selected' : ''}>Catch Weight Item</option>
                </select>
            </td>
            <td><select class="form-control ${row.unitId ? '' : 'import-inv-unmatched'}" data-field="unitId">${getImportOptionsHtml(unitsCache, row.unitId, 'Select Unit')}</select></td>
            <td><input type="number" class="form-control" data-field="price" min="0" step="0.01" value="${escapeImportHtml(row.price)}" placeholder="Enter Price" style="min-width: 90px;"></td>
            <td><input type="number" class="form-control" data-field="weight" min="0" step="0.01" value="${escapeImportHtml(row.weight)}" placeholder="Enter Weight" style="min-width: 90px;"></td>
            <td><input type="number" class="form-control import-inv-packsize" data-field="packSize" min="0" step="1" value="${escapeImportHtml(row.packSize)}" placeholder="Enter Pack Size" style="min-width: 90px;"></td>
            <td><input type="number" class="form-control" data-field="minOrderQuantity" min="0" step="0.01" value="${escapeImportHtml(row.minOrderQuantity)}" placeholder="Enter Min Order Quantity" style="min-width: 100px;"></td>
            <td><input type="text" class="form-control" data-field="description" value="${escapeImportHtml(row.description)}" placeholder="Enter Description" style="min-width: 140px;"></td>
            <td><button type="button" class="action-btn delete import-inv-delete" title="Delete row"><i style="width: 16px;" data-lucide="trash-2"></i></button></td>
        </tr>`;
    });

    $('#importInvTableBody').html(html);
    applyImportInvTypeStates();
    updateImportInvSummary();
    $('#importInvPreviewWrap').show();

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function applyImportInvTypeStates() {
    $('#importInvTableBody tr').each(function () {
        const index = Number($(this).data('row-index'));
        const row = importInvRows[index];
        if (!row) return;
        // Catch Weight rows do not use Pack Size (same rule as the Add form)
        const $packSize = $(this).find('.import-inv-packsize');
        $packSize.prop('disabled', row.type === '2');
        if (row.type === '2') {
            $packSize.val('');
            row.packSize = '';
        }
    });
}

function updateImportInvSummary() {
    const unmatchedCount = importInvRows.filter(row => !row.categoryId || !row.brandId || !row.unitId).length;
    let html = `<strong>${importInvRows.length}</strong> row(s) ready to import.`;
    if (unmatchedCount > 0) {
        html += ` <span style="color: #dc2626;">${unmatchedCount} row(s) have a Category, Brand or Unit that could not be matched &mdash; please select them before importing.</span>`;
    }
    $('#importInvSummary').html(html);
}

// Preview rows stay editable: every input/select writes back into importInvRows
$(document).on('input change', '#importInvTableBody input, #importInvTableBody select', function () {
    const index = Number($(this).closest('tr').data('row-index'));
    const field = $(this).data('field');
    if (!importInvRows[index] || !field) return;

    importInvRows[index][field] = $(this).val();
    if (field === 'type') {
        applyImportInvTypeStates();
    }
    if (field === 'categoryId' || field === 'brandId' || field === 'unitId') {
        $(this).toggleClass('import-inv-unmatched', !$(this).val());
        updateImportInvSummary();
    }
});

$(document).on('click', '.import-inv-delete', function () {
    const index = Number($(this).closest('tr').data('row-index'));
    importInvRows.splice(index, 1);
    if (importInvRows.length === 0) {
        $('#importInvPreviewWrap').hide();
        return;
    }
    renderImportInvPreview();
});

function submitImportInventory() {
    if (!importInvRows || importInvRows.length === 0) {
        showNotification('Please choose an Excel or CSV file first', 'error');
        return;
    }

    const activeSkpId = getActiveStorekeeperId();
    if (!activeSkpId) {
        showNotification('Please select or assign a storekeeper first', 'error');
        return;
    }

    // Validate every row with the same rules as the Add form
    for (let i = 0; i < importInvRows.length; i++) {
        const row = importInvRows[i];
        const rowLabel = `Row ${i + 1}`;
        if (!row.title || !String(row.title).trim()) {
            showNotification(`${rowLabel}: Title is required`, 'error');
            return;
        }
        if (!row.categoryId) {
            showNotification(`${rowLabel}: Please select a Category`, 'error');
            return;
        }
        if (!row.brandId) {
            showNotification(`${rowLabel}: Please select a Brand`, 'error');
            return;
        }
        if (!row.unitId) {
            showNotification(`${rowLabel}: Please select a Unit`, 'error');
            return;
        }
        if (row.price === '' || isNaN(Number(row.price))) {
            showNotification(`${rowLabel}: Price is required`, 'error');
            return;
        }
        if (row.type === '1' && (row.packSize === '' || isNaN(Number(row.packSize)))) {
            showNotification(`${rowLabel}: Pack Size is required for Pack Item`, 'error');
            return;
        }
        if (row.type === '2' && (row.weight === '' || isNaN(Number(row.weight)))) {
            showNotification(`${rowLabel}: Weight is required for Catch Weight Item`, 'error');
            return;
        }
    }

    const formData = new FormData();
    importInvRows.forEach((row, i) => {
        formData.append(`[${i}].Title`, String(row.title).trim());
        formData.append(`[${i}].CategoryId`, row.categoryId);
        formData.append(`[${i}].BrandId`, row.brandId);
        formData.append(`[${i}].UnitId`, row.unitId);
        formData.append(`[${i}].Price`, row.price);
        formData.append(`[${i}].Type`, row.type);
        if (row.type === '1') {
            // Pack Item: PackSize is sent; Weight is optional and sent only when entered
            formData.append(`[${i}].PackSize`, row.packSize);
            if (row.weight !== '' && !isNaN(Number(row.weight))) {
                formData.append(`[${i}].Weight`, row.weight);
            }
        } else {
            // Catch Weight Item: Weight is sent, PackSize is not sent (stays null on the API side)
            formData.append(`[${i}].Weight`, row.weight);
        }
        formData.append(`[${i}].MinOrderQuantity`, row.minOrderQuantity === '' ? 0 : row.minOrderQuantity);
        formData.append(`[${i}].Description`, row.description || '');
        formData.append(`[${i}].CreatedByUserId`, AuthHelper.getUserId() || 1);
    });

    showNotification(`Importing ${importInvRows.length} inventory item(s)...`, 'info');

    ajaxRequest({
        url: `${baseApiUrl}/api/Inventory?storekeeperId=${activeSkpId}`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                importInvRows = [];
                $.dynamicModal.close();
                if (inventoryTable) {
                    inventoryTable.ajax.reload(null, false);
                }
            }
        }
    });
}
