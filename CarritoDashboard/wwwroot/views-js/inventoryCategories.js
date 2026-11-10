let categoriesTable;

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    if (!AuthHelper.isStorekeeper()) {
        $('#btnAddNewCategory').hide()
    }
    const val = $('#filterStorekeeper').val();
    return val || AuthHelper.getStorekeeperId() || null;
}

let storekeepersCache = [];

let selectedFiles = {
    newCategory: {},
    editCategory: {}
};

$(document).ready(() => {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Managing categories for ${storeName}`);
        }
    }

    $('#categorySearch').on('input', function () {
        categoriesTable.search(this.value).draw();
    });

    // Load Storekeepers then Init Table (same sequence as the Inventory Items page)
    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        initializeDataTable();
    });

    // Handle storekeeper ready event
    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing categories for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        if (categoriesTable) {
            categoriesTable.ajax.reload();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        if (categoriesTable) {
            categoriesTable.ajax.reload();
        }
    });
});

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

function populateStorekeeperFilter() {
    const skSelect = $('#filterStorekeeper');

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
}

function initializeDataTable() {
    categoriesTable = $('#categoriesTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No categories found for selected storekeeper",
            zeroRecords: "No matching categories found",
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

            if (!storekeeperId) {
                callback({ draw: data.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                return;
            }

            // Always fetch categories for the active storekeeper only
            $.ajax({
                url: baseApiUrl + '/api/InventoryCategory',
                type: 'GET',
                data: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                    Search: searchValue,
                    storekeeperId: storekeeperId
                },
                success: function (response) {
                    if (response.status === 200) {
                        callback({
                            draw: data.draw,
                            recordsTotal: response.data.totalRecords,
                            recordsFiltered: response.data.totalRecords,
                            data: response.data.items
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
                render: function (data, type, row) {
                    if (data) {
                        return `<img src="${baseApiUrl}/${data}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;" alt="${row.name}">`;
                    }
                    return `<div style="width: 40px; height: 40px; background: #eee; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #888;">${row.name.charAt(0).toUpperCase()}</div>`;
                }
            },
            {
                data: 'name',
                render: d => `<strong>${d || 'N/A'}</strong>`
            },
            {
                data: 'createdAt',
                render: d => d ? new Date(d).toLocaleDateString() : '-'
            },
            {
                data: 'updatedAt',
                render: d => d ? new Date(d).toLocaleDateString() : '<span class="status-badge inactive">Never</span>'
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                visible: AuthHelper.isStorekeeper() ? true : false,
                render: function (data, type, row) {
                    return `
                        <div class="action-btns">
                            <button class="action-btn edit" ${AuthHelper.isStorekeeper() ? '' : 'disabled'} data-id="${row.id}" data-name="${row.name}" data-photo="${row.photoFilePath || ''}">
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

// --- ADD NEW CATEGORY ---
$('#btnAddNewCategory').click(function () {
    selectedFiles.newCategory = {};

    $.dynamicModal({
        title: "Add New Category",
        bodyHtml: $('#categoryFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Category", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewCategory();
                return true;
            }
        }
    });

    initUploader('#icPhoto', 'newCategory', 'photo');
});

function addNewCategory() {
    const name = $('#icName').val().trim();
    const files = selectedFiles.newCategory;

    if (!name) {
        showNotification("Category name is required.", "error");
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

    if (files.photo) {
        formData.append('Photo', files.photo);
    }

    showNotification("Creating category...", "info");

    ajaxRequest({
        url: baseApiUrl + '/api/InventoryCategory',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {

            if (response.status === 201 || response.status === 200) {
                $.dynamicModal.close();
                categoriesTable.ajax.reload(null, false);
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create category.";
            showNotification(msg, "error");
        }
    });
}

// --- EDIT CATEGORY ---
$(document).on('click', '.action-btn.edit', function () {
    const id = $(this).data('id');
    const name = $(this).data('name');
    const photoPath = $(this).data('photo');

    selectedFiles.editCategory = {};
    const photoUrl = path => path ? `${baseApiUrl}/${path}` : null;

    const editFormHtml = `
        <form id="frmEditCategory">
            <div class="form-group">
                <label>Category Name <span style="color: red;">*</span></label>
                <input type="text" id="editIcName" value="${name}" required placeholder="Enter Category Name">
            </div>
            <hr style="margin: 25px 0;">
            <div class="form-group">
                <label>Photo</label>
                <input type="file" id="editIcPhoto" accept="image/*">
                <small>Upload to replace existing photo</small>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Edit Category",
        bodyHtml: editFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Category", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                updateCategory(id);
                return true;
            }
        }
    });

    initUploader('#editIcPhoto', 'editCategory', 'photo', photoUrl(photoPath));
});

function updateCategory(id) {
    const name = $('#editIcName').val().trim();
    const files = selectedFiles.editCategory;

    if (!name) {
        showNotification("Category name is required.", "error");
        return;
    }

    const formData = new FormData();
    formData.append('Name', name);

    if (files.photo) {
        formData.append('Photo', files.photo);
    }

    showNotification("Updating category...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/InventoryCategory/${id}`,
        method: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                categoriesTable.ajax.reload(null, false);
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update category.";
            showNotification(msg, "error");
        }
    });
}