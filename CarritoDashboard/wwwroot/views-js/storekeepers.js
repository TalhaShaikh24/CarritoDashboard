let storekeepersTable;
let storekeeperDetailsCache = {};

// Store files from uploader plugin
let selectedFiles = {
    newStorekeeper: {},
    editStorekeeper: {}
};

$(document).ready(() => {

    $('#storekeeperSearch').on('input', function () {
        storekeepersTable.search(this.value).draw();
    });

    initializeDataTable();
});


function initializeDataTable() {
    storekeepersTable = $('#storekeepersTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No storekeepers found",
            zeroRecords: "No matching storekeepers found",
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

            $.ajax({
                url: baseApiUrl + '/api/Storekeeper',
                type: 'GET',
                data: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                    Search: searchValue
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
                        callback({
                            draw: data.draw,
                            recordsTotal: 0,
                            recordsFiltered: 0,
                            data: []
                        });
                    }
                },
                error: function () {
                    callback({
                        draw: data.draw,
                        recordsTotal: 0,
                        recordsFiltered: 0,
                        data: []
                    });
                }
            });
        },
        columns: [
            { data: 'storeName', render: d => `<strong>${d || 'N/A'}</strong>` },
            {
                data: 'fullName',
                render: d => `<span class="text-muted">${d || 'N/A'}</span>`
            },
            {
                data: 'phone',
                render: d => `<span class="text-muted">${d || 'N/A'}</span>`
            },
            {
                data: 'city',
                render: d => `<span class="text-muted">${d || 'N/A'}</span>`
            },
            {
                data: 'status',
                render: function (data) {
                    const isActive = data === 1;
                    return `<span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>`;
                }
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data, type, row) {
                    return `
                            <div class="action-btns">
                                <button class="action-btn view" data-type="storekeeper" data-id="${row.userId}" data-storekeeperId="${row.id}">
                                    <i style="width: 18px;" data-lucide="eye"></i>
                                </button>
                                <button class="action-btn edit" data-type="storekeeper" data-id="${row.userId}" data-storekeeperId="${row.id}">
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

function getStorekeeperDetails(storekeeperId, forceRefresh = false) {
    if (!forceRefresh && storekeeperDetailsCache[storekeeperId]) {
        return Promise.resolve(storekeeperDetailsCache[storekeeperId]);
    }

    return new Promise((resolve, reject) => {
        ajaxRequest({
            url: `${baseApiUrl}/api/Storekeeper/${storekeeperId}`,
            method: 'GET',
            showMessage: false,
            onSuccess: (response) => {
                if (response.status === 200 && response.data) {
                    storekeeperDetailsCache[storekeeperId] = response.data;
                    resolve(response.data);
                } else {
                    reject();
                    showNotification("Failed to load storekeeper details", "error");
                }
            },
            onError: () => reject()
        });
    });
}

function editStorekeeper(storekeeperId) {
    getStorekeeperDetails(storekeeperId, true).then(sk => {
        selectedFiles.editStorekeeper = {};

        const photoUrl = path => path ? `${baseApiUrl}/${path}` : null;

        const editFormHtml = `
                <form id="frmEditStorekeeper">
                    <div class="form-group"><label>Full Name *</label><input type="text" id="editSkFullName" value="${sk.fullName || ''}" required placeholder="Enter Full Name"></div>
                    <div class="form-group"><label>Phone *</label><input type="tel" id="editSkPhone" value="${sk.phone || ''}" required placeholder="Enter Phone"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="editSkEmail" value="${sk.email || ''}" placeholder="Enter Email"></div>
                    
                    <hr style="margin:20px 0;">
                    
                    <div class="form-group"><label>Store Name *</label><input type="text" id="editSkStoreName" value="${sk.storeName || ''}" required placeholder="Enter Store Name"></div>
                    <div class="form-group"><label>NIC Number *</label><input type="text" id="editSkNIC" value="${sk.nic || ''}" required placeholder="Enter NIC Number"></div>
                    <div class="form-group"><label>Address *</label><textarea id="editSkAddress" rows="2" required placeholder="Enter Address">${sk.address || ''}</textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>State *</label><input type="text" id="editSkState" value="${sk.state || ''}" required placeholder="Enter State"></div>
                        <div class="form-group"><label>City *</label><input type="text" id="editSkCity" value="${sk.city || ''}" required placeholder="Enter City"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Zip Code</label><input type="text" id="editSkZipCode" value="${sk.zipCode || ''}" placeholder="Enter Zip Code"></div>
                        <div class="form-group"><label>Status</label>
                            <select id="editSkStatus">
                                <option value="1" ${sk.status === 1 ? 'selected' : ''}>Active</option>
                                <option value="0" ${sk.status === 0 ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <hr style="margin:20px 0;">

                    <div class="form-group">
                        <label>Profile Photo</label>
                        <input type="file" id="editSkProfilePhoto" accept="image/*">
                        <small>Leave empty to keep current</small>
                    </div>
                    <div class="form-group">
                        <label>NIC Front</label>
                        <input type="file" id="editSkNICFront" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>NIC Back</label>
                        <input type="file" id="editSkNICBack" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Additional Store Photos</label>
                        <input type="file" id="editSkStorePhotos" accept="image/*" multiple>
                        <small>Uploaded photos will be added (existing remain)</small>
                    </div>
                </form>
            `;

        $.dynamicModal({
            title: "Edit Storekeeper",
            bodyHtml: editFormHtml,
            buttons: [
                { text: "Cancel", class: "btn-outline", action: "close" },
                { text: "Update Storekeeper", class: "btn-primary", action: "save" }
            ],
            onButtonClick: function (action) {
                if (action === "save") {
                    updateStorekeeper(storekeeperId);
                    return true;
                }
            }
        });

        initUploader('#editSkProfilePhoto', 'editStorekeeper', 'profile', photoUrl(sk.profilePhotoFilePath));
        initUploader('#editSkNICFront', 'editStorekeeper', 'nicFront', photoUrl(sk.nicFrontPhotoFilePath));
        initUploader('#editSkNICBack', 'editStorekeeper', 'nicBack', photoUrl(sk.nicBackPhotoFilePath));
        initUploader('#editSkStorePhotos', 'editStorekeeper', 'storePhotos'); // multiple allowed
    });
}

function sanitizePhone(raw) {
    if (!raw) return '';
    let phone = raw.replace(/[\s-]/g, '');
    if (phone.startsWith('+92')) {
        phone = '0' + phone.substring(3);
    } else if (phone.startsWith('92') && phone.length === 12) {
        phone = '0' + phone.substring(2);
    }
    return phone;
}

function sanitizeNIC(raw) {
    if (!raw) return '';
    let nic = raw.trim();
    const digitsOnly = nic.replace(/\D/g, '');
    if (digitsOnly.length === 13 && !nic.includes('-')) {
        nic = `${digitsOnly.substring(0, 5)}-${digitsOnly.substring(5, 12)}-${digitsOnly.substring(12, 13)}`;
    }
    return nic;
}

function updateStorekeeper(storekeeperId) {
    const formData = new FormData();

    const fullName = $('#editSkFullName').val().trim();
    const phone = sanitizePhone($('#editSkPhone').val().trim());
    const storeName = $('#editSkStoreName').val().trim();
    const nic = sanitizeNIC($('#editSkNIC').val().trim());

    if (!fullName || !phone || !storeName) {
        showNotification("Full Name, Phone, and Store Name are required", "error");
        return;
    }

    if (!/^03\d{9}$/.test(phone)) {
        showNotification("Invalid phone number. Example: 03001234567 (11 digits)", "error");
        return;
    }

    if (nic && !/^\d{5}-\d{7}-\d{1}$/.test(nic)) {
        showNotification("Invalid CNIC. Format: 12345-1234567-1", "error");
        return;
    }

    formData.append('FullName', fullName);
    formData.append('Phone', phone);
    formData.append('Email', $('#editSkEmail').val().trim() || '');
    formData.append('IsActive', true);
    formData.append('StoreName', storeName);
    formData.append('NIC', nic);
    formData.append('Address', $('#editSkAddress').val().trim());
    formData.append('State', $('#editSkState').val().trim());
    formData.append('City', $('#editSkCity').val().trim());
    formData.append('ZipCode', $('#editSkZipCode').val().trim());
    formData.append('Status', $('#editSkStatus').val());

    const files = selectedFiles.editStorekeeper;

    if (files.profile) formData.append('ProfilePhoto', files.profile);
    if (files.nicFront) formData.append('NICFrontPhoto', files.nicFront);
    if (files.nicBack) formData.append('NICBackPhoto', files.nicBack);
    const editStorePhotosList = Array.isArray(files.storePhotos)
        ? files.storePhotos
        : (files.storePhotos ? [files.storePhotos] : []);

    if (editStorePhotosList.length) {
        editStorePhotosList.forEach(file => formData.append('StorePhotos', file));
    }

    showNotification("Updating storekeeper...", "info");

    ajaxRequest({
        url: `${baseApiUrl}/api/Storekeeper/${storekeeperId}`,
        method: 'PUT',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200 || response.statusCode === 200) {
                $.dynamicModal.close();
                delete storekeeperDetailsCache[storekeeperId];
                storekeepersTable.ajax.reload(null, false);
            }
        }
    });
}

function addNewStorekeeper() {
    const formData = new FormData();
    const files = selectedFiles.newStorekeeper;

    const required = {
        fullName: $('#skFullName').val().trim(),
        username: $('#skUsername').val().trim(),
        password: $('#skPassword').val(),
        phone: $('#skPhone').val().trim(),
        storeName: $('#skStoreName').val().trim(),
        nic: $('#skNIC').val().trim(),
        address: $('#skAddress').val().trim(),
        state: $('#skState').val().trim(),
        city: $('#skCity').val().trim()
    };

    for (const [key, val] of Object.entries(required)) {
        if (!val) {
            showNotification(`Please fill all required fields (${key})`, "error");
            return;
        }
    }

    // Sanitize and validate Phone
    const phone = sanitizePhone(required.phone);
    if (!/^03\d{9}$/.test(phone)) {
        showNotification("Invalid phone number. Format: 03001234567 (11 digits)", "error");
        return;
    }

    // Sanitize and validate CNIC
    const nic = sanitizeNIC(required.nic);
    if (!/^\d{5}-\d{7}-\d{1}$/.test(nic)) {
        showNotification("Invalid CNIC. Format: 12345-1234567-1", "error");
        return;
    }

    const storePhotosList = Array.isArray(files.storePhotos)
        ? files.storePhotos
        : (files.storePhotos ? [files.storePhotos] : []);

    if (!files.nicFront) {
        showNotification("NIC Front photo is required", "error");
        return;
    }

    if (!files.nicBack) {
        showNotification("NIC Back photo is required", "error");
        return;
    }

    if (!storePhotosList.length) {
        showNotification("At least one Store Photo is required", "error");
        return;
    }

    formData.append('RoleId', 2);
    formData.append('Username', required.username);
    formData.append('Password', required.password);
    formData.append('FullName', required.fullName);
    formData.append('Phone', phone);
    formData.append('Email', $('#skEmail').val().trim() || '');
    formData.append('IsActive', true);
    formData.append('NIC', nic);
    formData.append('StoreName', required.storeName);
    formData.append('Address', required.address);
    formData.append('State', required.state);
    formData.append('City', required.city);
    formData.append('ZipCode', $('#skZipCode').val().trim() || '');
    formData.append('Status', $('#skStatus').val() || 1);

    if (files.profile) formData.append('ProfilePhoto', files.profile);
    formData.append('NICFrontPhoto', files.nicFront);
    formData.append('NICBackPhoto', files.nicBack);

    storePhotosList.forEach(file => {
        formData.append('StorePhotos', file);
    });

    showNotification("Creating storekeeper...", "info");

    ajaxRequest({
        url: baseApiUrl + '/api/Storekeeper',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200 || response.statusCode === 200) {
                $.dynamicModal.close();
                storekeepersTable.ajax.reload(null, false);
            }
        }
    });
}

// Event Listeners
$(document).on('click', '.action-btn.view[data-type="storekeeper"]', function () {
    const storekeeperId = $(this).data('storekeeperid');

    getStorekeeperDetails(storekeeperId).then(sk => {
        const photoUrl = p => p ? `${baseApiUrl}/${p}` : null;

        let storePhotosHtml = '';
        if (sk.storePhotos?.length) {
            storePhotosHtml = sk.storePhotos.map((p, i) => `
                    <div>
                        <strong>Store Photo ${i + 1}</strong><br>
                        <img src="${photoUrl(p.photoFilePath)}" style="width:100%;border-radius:8px;margin-top:6px;">
                    </div>
                `).join('');
        }

        const detailsHtml = `
                <div class="user-header">
                    ${photoUrl(sk.profilePhotoFilePath) ?
                `<img src="${photoUrl(sk.profilePhotoFilePath)}" class="user-avatar-large">` :
                `<div class="user-avatar-large">${sk.fullName?.charAt(0)?.toUpperCase()}</div>`
            }
                    <div class="user-header-info">
                        <h3>${sk.storeName}</h3>
                        <p>Owner: ${sk.fullName} • ${sk.status === 1 ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>'}</p>
                    </div>
                </div>

                <div class="user-detail-item"><i data-lucide="user"></i><div><span class="detail-label">Owner Name</span><span class="detail-value">${sk.fullName || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="phone"></i><div><span class="detail-label">Phone</span><span class="detail-value">${sk.phone || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="mail"></i><div><span class="detail-label">Email</span><span class="detail-value">${sk.email || 'Not provided'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="id-card"></i><div><span class="detail-label">NIC</span><span class="detail-value">${sk.nic || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="map-pin"></i><div><span class="detail-label">Location</span><span class="detail-value">${sk.city}, ${sk.state}</span></div></div>
                <div class="user-detail-item"><i data-lucide="calendar"></i><div><span class="detail-label">Created</span><span class="detail-value">${new Date(sk.createdAt).toLocaleString()}</span></div></div>

                <div class="user-detail-section" style="margin-top:25px;">
                    <h4><i data-lucide="images"></i> Store Photos</h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;margin-top:12px;">
                        ${storePhotosHtml || '<p style="color:#888;">No store photos available</p>'}
                    </div>
                </div>
            `;

        $.dynamicModal({
            title: "Storekeeper Details",
            bodyHtml: detailsHtml,
            buttons: [{ text: "Close", class: "btn-outline", action: "close" }]
        });

        lucide?.createIcons();
    });
});

$(document).on('click', '.action-btn.edit[data-type="storekeeper"]', function () {
    debugger
    editStorekeeper($(this).data('storekeeperid'));
});

$('#btnAddNewStorekeeper').click(function () {
    selectedFiles.newStorekeeper = {
        storePhotos: []
    };

    $.dynamicModal({
        title: "Add New Storekeeper",
        bodyHtml: $('#storekeeperFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Storekeeper", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                addNewStorekeeper();
                return true;
            }
        }
    });

    initUploader('#skProfilePhoto', 'newStorekeeper', 'profile');
    initUploader('#skNICFront', 'newStorekeeper', 'nicFront');
    initUploader('#skNICBack', 'newStorekeeper', 'nicBack');
    initUploader('#skStorePhotos', 'newStorekeeper', 'storePhotos'); // multiple
});

// Auto-format CNIC input (12345-1234567-1)
$(document).on('input', '#skNIC, #editSkNIC', function () {
    let val = $(this).val().replace(/\D/g, '').substring(0, 13);
    if (val.length > 12) {
        val = val.substring(0, 5) + '-' + val.substring(5, 12) + '-' + val.substring(12);
    } else if (val.length > 5) {
        val = val.substring(0, 5) + '-' + val.substring(5);
    }
    $(this).val(val);
});

// Auto-format Phone input (03001234567)
$(document).on('input', '#skPhone, #editSkPhone', function () {
    let val = $(this).val().trim();
    if (val.startsWith('+92')) {
        val = '0' + val.substring(3);
    } else if (val.startsWith('92') && val.length > 2) {
        val = '0' + val.substring(2);
    }
    val = val.replace(/\D/g, '').substring(0, 11);
    $(this).val(val);
});