let ridersTable;
let riderDetailsCache = {};

// Store files from uploader plugin
let selectedFiles = {
    newRider: {},
    editRider: {}
};

$(document).ready(() => {

    $('#riderSearch').on('input', function () {
        ridersTable.search(this.value).draw();
    });

    function initializeDataTable() {
        ridersTable = $('#ridersTable').DataTable({
            ajax: {
                url: baseApiUrl + '/api/Rider',
                type: 'GET',
                dataSrc: function (response) {
                    if (response.status === 200 && response.data && response.data.items) {
                        return response.data.items;
                    }
                    showNotification(response.responseMsg || "Failed to load riders", "error");
                    return [];
                },
                error: function (xhr) {
                    handleAjaxError(xhr, "Failed to load riders");
                }
            },
            columns: [
                {
                    data: 'fullName',
                    render: function (data) {
                        return `<span style="font-weight:500">${data || 'N/A'}</span>`;
                    }
                },
                {
                    data: 'phone',
                    render: function (data) {
                        return `<span class="text-muted">${data || 'N/A'}</span>`;
                    }
                },
                {
                    data: 'email',
                    render: function (data) {
                        return `<span class="text-muted">${data || 'N/A'}</span>`;
                    }
                },
                {
                    data: 'bikePlateNumber',
                    render: function (data) {
                        return `<span class="text-muted">${data || 'N/A'}</span>`;
                    }
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
                                <button class="action-btn view" data-type="rider" data-id="${row.userId}" data-riderId="${row.id}">
                                    <i style="width: 18px;" data-lucide="eye"></i>
                                </button>
                                <button class="action-btn edit" data-type="rider" data-id="${row.userId}" data-riderId="${row.id}">
                                    <i style="width: 18px;" data-lucide="square-pen"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            processing: true,
            serverSide: false,
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            language: {
                processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
                emptyTable: "No riders found",
                zeroRecords: "No matching riders found",
                info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
                infoEmpty: "No riders available",
                infoFiltered: "(filtered from _MAX_ total riders)",
                paginate: {
                    previous: '<i class="fa fa-chevron-left"></i>',
                    next: '<i class="fa fa-chevron-right"></i>'
                }
            },
            drawCallback: function () {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            },
            order: [[0, 'asc']]
        });
    }

    function handleAjaxError(xhr, defaultMsg) {
        const statusCode = xhr.status;
        let errorMsg = defaultMsg;

        try {
            if (xhr.responseJSON) {
                errorMsg = xhr.responseJSON.responseMsg || xhr.responseJSON.error || errorMsg;
            }
        } catch (e) { }

        if (statusCode === 500) {
            $.showCustomPopup({
                title: "Server Error (500)",
                iconClass: "fas fa-exclamation-triangle",
                message: `<p>Something went wrong on the server.</p>
                          <p>Please try again later or contact support at 
                             <a href="mailto:support@carrito.com" class="support-link">support@carrito.com</a>
                          </p>`
            });
        } else {
            showNotification(errorMsg, "error", statusCode);
        }
    }

    function getRiderDetails(riderId, forceRefresh = false) {
        if (!forceRefresh && riderDetailsCache[riderId]) {
            return Promise.resolve(riderDetailsCache[riderId]);
        }

        return new Promise((resolve, reject) => {
            ajaxRequest({
                url: `${baseApiUrl}/api/Rider/${riderId}`,
                method: 'GET',
                showMessage: false,
                onSuccess: (response) => {
                    if (response.status === 200 && response.data) {
                        riderDetailsCache[riderId] = response.data;
                        resolve(response.data);
                    } else {
                        showNotification(response.responseMsg || "Failed to load rider details", "error");
                        reject();
                    }
                }
            });
        });
    }

    function editRider(riderId) {
        getRiderDetails(riderId, true).then(riderData => {
            const r = riderData;
            const photoUrl = (path) => path ? baseApiUrl + "/" + path : null;

            selectedFiles.editRider = {};

            const editFormHtml = `
                <form id="frmEditRider">
                    <div class="form-group"><label>Full Name <span style="color: red;">*</span></label><input type="text" id="editRiderFullName" value="${r.fullName || ''}" required placeholder="Enter Full Name"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="editRiderEmail" value="${r.email || ''}" placeholder="Enter Email"></div>
                    <div class="form-group"><label>Phone <span style="color: red;">*</span></label><input type="tel" id="editRiderPhone" value="${r.phone || ''}" required placeholder="Enter Phone"></div>
                    <div class="form-group"><label>Bike Plate Number</label><input type="text" id="editRiderBikePlate" value="${r.bikePlateNumber || ''}" placeholder="Enter Bike Plate Number"></div>
                    <div class="form-group"><label>Bike Model</label><input type="text" id="editRiderBikeModel" value="${r.bikeModel || ''}" placeholder="Enter Bike Model"></div>
                    <div class="form-group"><label>Driving License No</label><input type="text" id="editRiderDrivingLicense" value="${r.drivingLicenseNo || ''}" placeholder="Enter Driving License No"></div>

                    <hr style="margin: 20px 0;">
                    
                    <div class="form-group">
                        <label>Profile Photo</label>
                        <input type="file" id="editRiderProfilePhoto" accept="image/*">
                        <small class="text-muted">Leave empty to keep current</small>
                    </div>
                    <div class="form-group">
                        <label>NIC Front Photo</label>
                        <input type="file" id="editRiderNICFront" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>NIC Back Photo</label>
                        <input type="file" id="editRiderNICBack" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Bike Photo</label>
                        <input type="file" id="editRiderBikePhoto" accept="image/*">
                    </div>
                </form>
            `;

            $.dynamicModal({
                title: "Edit Rider",
                bodyHtml: editFormHtml,
                buttons: [
                    { text: "Cancel", class: "btn-outline", action: "close" },
                    { text: "Update Rider", class: "btn-primary", action: "save" }
                ],
                onButtonClick: function (action) {
                    if (action === "save") {
                        updateRider(riderId);
                        return true;
                    }
                }
            });

            initUploader('#editRiderProfilePhoto', 'editRider', 'profile', photoUrl(r.profilePhotoFilePath));
            initUploader('#editRiderNICFront', 'editRider', 'nicFront', photoUrl(r.nicFrontPhotoFilePath));
            initUploader('#editRiderNICBack', 'editRider', 'nicBack', photoUrl(r.nicBackPhotoFilePath));
            initUploader('#editRiderBikePhoto', 'editRider', 'bike', photoUrl(r.bikePhotoFilePath));
        });
    }

    function updateRider(riderId) {
        const formData = new FormData();
        const files = selectedFiles.editRider;

        formData.append('FullName', $('#editRiderFullName').val().trim());
        formData.append('Email', $('#editRiderEmail').val().trim() || '');
        formData.append('Phone', $('#editRiderPhone').val().trim());
        formData.append('IsActive', true);
        formData.append('BikePlateNumber', $('#editRiderBikePlate').val().trim());
        formData.append('BikeModel', $('#editRiderBikeModel').val().trim());
        formData.append('DrivingLicenseNo', $('#editRiderDrivingLicense').val().trim());

        if (files.profile) formData.append('ProfilePhoto', files.profile);
        if (files.nicFront) formData.append('NICFrontPhoto', files.nicFront);
        if (files.nicBack) formData.append('NICBackPhoto', files.nicBack);
        if (files.bike) formData.append('BikePhoto', files.bike);

        if (!$('#editRiderFullName').val() || !$('#editRiderPhone').val()) {
            showNotification("Full Name and Phone are required", "error");
            return;
        }

        showNotification("Updating rider...", "info");

        ajaxRequest({
            url: `${baseApiUrl}/api/Rider/${riderId}`,
            method: 'PUT',
            data: formData,
            showMessage: true,
            onSuccess: (response) => {
                if (response.status === 200) {
                    $.dynamicModal.close();
                    delete riderDetailsCache[riderId];
                    ridersTable.ajax.reload(null, false);
                }
            }
        });
    }

    function addNewRider() {
        const formData = new FormData();
        const files = selectedFiles.newRider;

        const requiredFields = {
            fullName: $('#riderFullName').val().trim(),
            username: $('#riderUsername').val().trim(),
            password: $('#riderPassword').val(),
            phone: $('#riderPhone').val().trim(),
            nic: $('#riderNIC').val().trim(),
            drivingLicense: $('#riderDrivingLicense').val().trim(),
            bikePlate: $('#riderBikePlate').val().trim(),
            bikeModel: $('#riderBikeModel').val().trim()
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (!value) {
                showNotification(`Please fill all required text fields (${key})`, "error");
                return;
            }
        }

        // Sanitize & validate Phone
        let phone = requiredFields.phone.replace(/[\s-]/g, '');
        if (phone.startsWith('+92')) phone = '0' + phone.substring(3);
        else if (phone.startsWith('92') && phone.length === 12) phone = '0' + phone.substring(2);

        if (!/^03\d{9}$/.test(phone)) {
            showNotification("Invalid phone number. Format: 03001234567 (11 digits)", "error");
            return;
        }

        // Sanitize & validate NIC
        let nic = requiredFields.nic.trim();
        const digitsOnly = nic.replace(/\D/g, '');
        if (digitsOnly.length === 13 && !nic.includes('-')) {
            nic = `${digitsOnly.substring(0, 5)}-${digitsOnly.substring(5, 12)}-${digitsOnly.substring(12, 13)}`;
        }

        if (!/^\d{5}-\d{7}-\d{1}$/.test(nic)) {
            showNotification("Invalid CNIC. Format: 12345-1234567-1", "error");
            return;
        }

        if (!files.nicFront || !files.nicBack || !files.bike) {
            showNotification("Please upload NIC (Front/Back) and Bike photos", "error");
            return;
        }

        formData.append('RoleId', 3);
        formData.append('FullName', requiredFields.fullName);
        formData.append('Username', requiredFields.username);
        formData.append('Password', requiredFields.password);
        formData.append('Phone', phone);
        formData.append('Email', $('#riderEmail').val().trim() || '');
        formData.append('IsActive', true);
        formData.append('NIC', nic);
        formData.append('DrivingLicenseNo', requiredFields.drivingLicense);
        formData.append('BikePlateNumber', requiredFields.bikePlate);
        formData.append('BikeModel', requiredFields.bikeModel);

        if (files.profile) formData.append('ProfilePhoto', files.profile);
        formData.append('NICFrontPhoto', files.nicFront);
        formData.append('NICBackPhoto', files.nicBack);
        formData.append('BikePhoto', files.bike);

        showNotification("Creating rider...", "info");

        ajaxRequest({
            url: baseApiUrl + '/api/Rider',
            method: 'POST',
            data: formData,
            showMessage: true,
            onSuccess: (response) => {
                if (response.status === 200 || response.statusCode === 200) {
                    $.dynamicModal.close();
                    ridersTable.ajax.reload(null, false);
                }
            }
        });
    }


    // Button Clicks Functions
    $(document).on('click', '.action-btn.view[data-type="rider"]', function () {
        const riderId = $(this).data('riderid');

        getRiderDetails(riderId).then(riderData => {
            const r = riderData;
            const photoUrl = (path) => path ? baseApiUrl + "/" + path : null;

            const detailsHtml = `
                <div class="user-header">
                    ${photoUrl(r.profilePhotoFilePath) ?
                    `<img src="${photoUrl(r.profilePhotoFilePath)}" alt="${r.fullName}" class="user-avatar-large" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">` :
                    `<div class="user-avatar-large">${r.fullName.charAt(0).toUpperCase()}</div>`
                }
                    <div class="user-header-info">
                        <h3>${r.fullName}</h3>
                        <p>Rider ${r.status === 1 ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>'}</p>
                    </div>
                </div>

                <div class="user-detail-item"><i style="width: 18px;" data-lucide="user"></i><div class="detail-content"><span class="detail-label">Username</span><span class="detail-value">${r.username || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i style="width: 18px;" data-lucide="mail"></i><div class="detail-content"><span class="detail-label">Email</span><span class="detail-value">${r.email || 'Not provided'}</span></div></div>
                <div class="user-detail-item"><i style="width: 18px;" data-lucide="phone"></i><div class="detail-content"><span class="detail-label">Phone</span><span class="detail-value">${r.phone}</span></div></div>
                <div class="user-detail-item"><i style="width: 18px;" data-lucide="id-card"></i><div class="detail-content"><span class="detail-label">NIC</span><span class="detail-value">${r.nic || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i style="width: 18px;" data-lucide="bike"></i><div class="detail-content"><span class="detail-label">Bike Plate</span><span class="detail-value">${r.bikePlateNumber || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i style="width: 18px;" data-lucide="calendar"></i><div class="detail-content"><span class="detail-label">Created At</span><span class="detail-value">${new Date(r.createdAt).toLocaleString()}</span></div></div>

                <div class="user-detail-section" style="margin-top:20px;">
                    <h4><i style="width: 18px;" data-lucide="image"></i> Documents</h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:10px;">
                        ${photoUrl(r.profilePhotoFilePath) ? `<div><strong>Profile Photo</strong><br><img src="${photoUrl(r.profilePhotoFilePath)}" style="width:100%;border-radius:8px;margin-top:5px;"></div>` : ''}
                        ${photoUrl(r.nicFrontPhotoFilePath) ? `<div><strong>NIC Front</strong><br><img src="${photoUrl(r.nicFrontPhotoFilePath)}" style="width:100%;border-radius:8px;margin-top:5px;"></div>` : ''}
                        ${photoUrl(r.nicBackPhotoFilePath) ? `<div><strong>NIC Back</strong><br><img src="${photoUrl(r.nicBackPhotoFilePath)}" style="width:100%;border-radius:8px;margin-top:5px;"></div>` : ''}
                        ${photoUrl(r.bikePhotoFilePath) ? `<div><strong>Bike Photo</strong><br><img src="${photoUrl(r.bikePhotoFilePath)}" style="width:100%;border-radius:8px;margin-top:5px;"></div>` : ''}
                    </div>
                </div>
            `;

            $.dynamicModal({
                title: "Rider Details",
                bodyHtml: detailsHtml,
                buttons: [{ text: "Close", class: "btn-outline", action: "close" }]
            });

            lucide.createIcons();
        });
    });

    $(document).on('click', '.action-btn.edit[data-type="rider"]', function () {
        const riderId = $(this).data('riderid');
        editRider(riderId);
    });

    $('#btnAddNewRider').click(function () {
        const templateContent = $('#riderFormTemplate').html();
        selectedFiles.newRider = {};

        $.dynamicModal({
            title: "Add New Rider",
            bodyHtml: templateContent,
            buttons: [
                { text: "Cancel", class: "btn-outline", action: "close" },
                { text: "Save Rider", class: "btn-primary", action: "save" }
            ],
            onButtonClick: function (action) {
                if (action === "save") {
                    addNewRider();
                    return true;
                }
            }
        });

        initUploader('#riderProfilePhoto', 'newRider', 'profile');
        initUploader('#riderNICFront', 'newRider', 'nicFront');
        initUploader('#riderNICBack', 'newRider', 'nicBack');
        initUploader('#riderBikePhoto', 'newRider', 'bike');
    });

    initializeDataTable();
});