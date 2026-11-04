let brandsTable;
let brandDetailsCache = {};

function getActiveStorekeeperId() {
    if (AuthHelper.isStorekeeper()) {
        return AuthHelper.getStorekeeperId();
    }
    const val = $('#filterStorekeeper').val();
    return val || AuthHelper.getStorekeeperId() || null;
}

let storekeepersCache = [];

let selectedFiles = {
    newBrand: {},
    editBrand: {}
};

$(document).ready(() => {
    if (AuthHelper.isStorekeeper()) {
        const storeName = AuthHelper.getStoreName();
        if (storeName) {
            $('.page-subtitle').text(`Managing brands for ${storeName}`);
        }
    }

    $('#brandSearch').on('input', function () {
        brandsTable.search(this.value).draw();
    });

    // Load Storekeepers then Init Table (same sequence as the Inventory Items page)
    fetchStorekeepers().then(() => {
        populateStorekeeperFilter();
        initializeDataTable();
    });

    // Handle storekeeper ready event
    $(document).on('storekeeperReady', function (e, skp) {
        if (skp && skp.storeName) {
            $('.page-subtitle').text(`Managing brands for ${skp.storeName}`);
        }
        populateStorekeeperFilter();
        if (brandsTable) {
            brandsTable.ajax.reload();
        }
    });

    $('#filterStorekeeper').on('change', function () {
        if (brandsTable) {
            brandsTable.ajax.reload();
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
        if ($('#skpActiveBadge').length === 0) {
            $(`<div id="skpActiveBadge" class="storekeeper-badge-pill" style="margin-right: 8px;">
                <i style="width:14px;height:14px;" data-lucide="store"></i>
                <span>${skName}</span>
            </div>`).insertBefore(skSelect.parent());
            if (window.lucide) lucide.createIcons();
        }
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
    brandsTable = $('#brandsTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No brands found for selected storekeeper",
            zeroRecords: "No matching brands found",
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

            // Always fetch brands for the active storekeeper only
            $.ajax({
                url: baseApiUrl + '/api/InventoryBrand',
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
                render: function (data, type, row) {

                    return `
                        <div class="action-btns">
                            <button class="action-btn edit" data-id="${row.id}" data-name="${row.name}" data-photo="${row.photoFilePath || ''}">
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

// --- ADD NEW BRAND ---
$('#btnAddNewBrand').click(function () {
    selectedFiles.newBrand = {}; // Reset files

    $.dynamicModal({
        title: "Add New Brand",
        bodyHtml: $('#brandFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Brand", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewBrand();
                return true;
            }
        }
    });

    // Initialize file uploader 
    initUploader('#ibPhoto', 'newBrand', 'photo');
});

function addNewBrand() {
    const name = $('#ibName').val().trim();
    const files = selectedFiles.newBrand;

    // Validation based on DTO attributes
    if (!name || name.length < 3) {
        showNotification("Name is required and must be at least 3 characters.", "error");
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

    showNotification("Creating brand...", "info");

    ajaxRequest({
        url: baseApiUrl + '/api/InventoryBrand',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                brandsTable.ajax.reload(null, false);
            }
        }
    });
}

// --- EDIT BRAND ---
$(document).on('click', '.action-btn.edit', function () {
    const id = $(this).data('id');
    const name = $(this).data('name'); 
    const photoPath = $(this).data('photo');

    selectedFiles.editBrand = {};

    const photoUrl = path => path ? `${baseApiUrl}/${path}` : null;


    const editFormHtml = `
        <form id="frmEditBrand">
            <div class="form-group">
                <label>Brand Name <span style="color: red;">*</span></label>
                <input type="text" id="editIbName" value="${name}" required>
            </div>
            <hr style="margin: 25px 0;">
            <div class="form-group">
                <label>Photo</label>
                <input type="file" id="editIbPhoto" accept="image/*">
                <small>Upload to replace existing photo</small>
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Edit Brand",
        bodyHtml: editFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Brand", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                updateBrand(id);
                return true;
            }
        }
    });


    initUploader('#editIbPhoto', 'editBrand', 'photo', photoUrl(photoPath));
});

function updateBrand(id) {
    const name = $('#editIbName').val().trim();
    const files = selectedFiles.editBrand;

    if (!name || name.length < 3) {
        showNotification("Name is required and must be at least 3 characters.", "error");
        return;
    }

    const formData = new FormData();
    formData.append('Name', name);


    if (files.photo) {
        formData.append('Photo', files.photo);
    }


    ajaxRequest({
        url: `${baseApiUrl}/api/InventoryBrand/${id}`,
        method: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                brandsTable.ajax.reload(null, false);
            }
        }
    });
}