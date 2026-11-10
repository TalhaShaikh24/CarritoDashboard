let customersTable;
let customerDetailsCache = {};

// Store files from uploader plugin
let selectedFiles = {
    newCustomer: {},
    editCustomer: {}
};

$(document).ready(() => {

    // Search
    $('#customerSearch').on('input', function () {
        customersTable.search(this.value).draw();
    });
    
    $("#myDatePicker").dateRangePicker({
        onSelect: function (range) {
            console.log('Date range selected:', range.start, range.end);
        }
    });

    function initializeDataTable() {
        customersTable = $('#customersTable').DataTable({

            ajax: {
                url: `${baseApiUrl}/api/Customer`,
                type: 'GET',
                dataSrc: response => {
                    if (response.status === 200 && response.data?.items) {
                        return response.data.items;
                    }
                    showNotification(response.responseMsg || "Failed to load customers", "error");
                    return [];
                },
                error: (xhr) => handleAjaxError(xhr, "Failed to load customers")
            },
            columns: [
                { data: 'fullName', render: d => `<strong>${d || 'N/A'}</strong>` },
                { data: 'email', render: d => `<span class="text-muted">${d || 'Not provided'}</span>` },
                { data: 'phone', render: d => `<span class="text-muted">${d || 'N/A'}</span>` },
                {
                    data: 'isActive',
                    render: data => {
                        const isActive = data !== false;
                        return `<span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    render: (data, type, row) => `
                        <div class="action-btns">
                            <button class="action-btn view" data-type="customer" data-id="${row.userId}" data-customerId="${row.id}">
                                <i style="width: 18px;" data-lucide="eye"></i>
                            </button>
                            <button class="action-btn edit" data-type="customer" data-id="${row.userId}" data-customerId="${row.id}">
                                <i style="width: 18px;" data-lucide="square-pen"></i>
                            </button>
                        </div>
                    `
                }
            ],
            processing: true,
            serverSide: false,
            pageLength: 10,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            language: {
                processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
                emptyTable: "No customers found",
                info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
                paginate: {
                    previous: '<i class="fa fa-chevron-left"></i>',
                    next: '<i class="fa fa-chevron-right"></i>'
                }
            },
            drawCallback: () => lucide?.createIcons(),
            order: [[0, 'asc']]
        });
    }

    function handleAjaxError(xhr, defaultMsg) {
        const statusCode = xhr.status;
        let errorMsg = defaultMsg;
        try {
            if (xhr.responseJSON) errorMsg = xhr.responseJSON.responseMsg || errorMsg;
        } catch (e) { }

        if (statusCode === 500) {
            $.showCustomPopup({
                title: "Server Error (500)",
                iconClass: "fas fa-exclamation-triangle",
                message: `Something went wrong on the server.<br>Please contact <a href="mailto:support@carrito.com">support@carrito.com</a>`
            });
        } else {
            showNotification(errorMsg, "error");
        }
    }

    function getCustomerDetails(customerId, forceRefresh = false) {
        if (!forceRefresh && customerDetailsCache[customerId]) {
            return Promise.resolve(customerDetailsCache[customerId]);
        }

        return new Promise((resolve, reject) => {
            ajaxRequest({
                url: `${baseApiUrl}/api/Customer/${customerId}`,
                method: 'GET',
                showMessage: false,
                onSuccess: response => {
                    if (response.status === 200 && response.data) {
                        customerDetailsCache[customerId] = response.data;
                        resolve(response.data);
                    } else {
                        reject();
                    }
                },
                onError: () => reject()
            });
        });
    }

    function editCustomer(customerId) {
        getCustomerDetails(customerId, true).then(customer => {
            const user = customer || {};
            selectedFiles.editCustomer = {};
            debugger
            const editFormHtml = `
                <form id="frmEditCustomer">
                    <div class="form-group"><label>Full Name *</label><input type="text" id="editCustomerFullName" value="${user.fullName || ''}" required placeholder="Enter Full Name"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="editCustomerEmail" value="${user.email || ''}" placeholder="Enter Email"></div>
                    <div class="form-group"><label>Phone *</label><input type="tel" id="editCustomerPhone" value="${user.phone || ''}" required placeholder="Enter Phone"></div>

                    <hr style="margin:20px 0;">

                    <div class="form-group">
                        <label>Profile Photo</label>
                        <input type="file" id="editCustomerProfilePhoto" accept="image/*">
                        <small>Leave empty to keep current</small>
                    </div>
                </form>
            `;

            $.dynamicModal({
                title: "Edit Customer",
                bodyHtml: editFormHtml,
                buttons: [
                    { text: "Cancel", class: "btn-outline", action: "close" },
                    { text: "Update Customer", class: "btn-primary", action: "save" }
                ],
                onButtonClick: action => {
                    if (action === "save") {
                        updateCustomer(customerId);
                        return true;
                    }
                }
            });

            initUploader('#editCustomerProfilePhoto', 'editCustomer', 'profile',
                customer.profilePhotoFilePath ? `${baseApiUrl}/${customer.profilePhotoFilePath}` : null);
        });
    }

    function updateCustomer(customerId) {
        const formData = new FormData();

        formData.append('FullName', $('#editCustomerFullName').val().trim());
        formData.append('Email', $('#editCustomerEmail').val().trim() || '');
        formData.append('Phone', $('#editCustomerPhone').val().trim());
        formData.append('IsActive', true);

        const files = selectedFiles.editCustomer;
        if (files.profile) formData.append('ProfilePhoto', files.profile);

        if (!$('#editCustomerFullName').val() || !$('#editCustomerPhone').val()) {
            showNotification("Full Name & Phone are required", "error");
            return;
        }

        showNotification("Updating customer...", "info");

        ajaxRequest({
            url: `${baseApiUrl}/api/Customer/${customerId}`,
            method: 'PUT',
            data: formData,
            processData: false,
            contentType: false,
            showMessage: true,
            onSuccess: response => {
                if (response.status === 200) {
                    $.dynamicModal.close();
                    delete customerDetailsCache[customerId];
                    customersTable.ajax.reload(null, false);
                }
            },
            onError: (xhr) => {
                $('#popup-overlay').remove();
                const msg = xhr.responseJSON?.responseMsg || "Failed to update customer.";
                showNotification(msg, "error");
            }
        });
    }

    function addNewCustomer() {
        const formData = new FormData();
        const files = selectedFiles.newCustomer;

        const required = {
            fullName: $('#customerFullName').val().trim(),
            username: $('#customerUsername').val().trim(),
            password: $('#customerPassword').val(),
            phone: $('#customerPhone').val().trim()
        };

        for (const [key, value] of Object.entries(required)) {
            if (!value) {
                showNotification(`Please fill ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`, "error");
                return;
            }
        }

        formData.append('RoleId', 4); // Customer role
        formData.append('FullName', required.fullName);
        formData.append('Username', required.username);
        formData.append('Password', required.password);
        formData.append('Email', $('#customerEmail').val().trim() || '');
        formData.append('Phone', required.phone);
        formData.append('IsActive', true);

        // Optional address
        const addressFields = ['Address', 'City', 'State', 'ZipCode', 'Latitude', 'Longitude'];
        addressFields.forEach(field => {
            const val = $(`#customer${field}`).val()?.trim();
            if (val) formData.append(field, val);
        });

        if (files.profile) formData.append('ProfilePhoto', files.profile);

        showNotification("Creating customer...", "info");

        ajaxRequest({
            url: `${baseApiUrl}/api/Customer`,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            showMessage: true,
            onSuccess: response => {
                if (response.status === 200) {
                    $.dynamicModal.close();
                    customersTable.ajax.reload(null, false);
                }
            },
            onError: (xhr) => {
                $('#popup-overlay').remove();
                const msg = xhr.responseJSON?.responseMsg || "Failed to create customer.";
                showNotification(msg, "error");
            }
        });
    }

    // Event handlers
    $('#btnAddNewCustomer').click(() => {
        selectedFiles.newCustomer = {};

        $.dynamicModal({
            title: "Add New Customer",
            bodyHtml: $('#customerFormTemplate').html(),
            buttons: [
                { text: "Cancel", class: "btn-outline", action: "close" },
                { text: "Create Customer", class: "btn-primary", action: "save" }
            ],
            onButtonClick: action => {
                if (action === "save") {
                    addNewCustomer();
                    return true;
                }
            }
        });

        initUploader('#customerProfilePhoto', 'newCustomer', 'profile');
    });

    $(document).on('click', '.action-btn.view[data-type="customer"]', function () {
      
        const customerId = $(this).data('customerid');

        getCustomerDetails(customerId).then(customer => {
            const user = customer.user || {};
            const photoUrl = p => p ? `${baseApiUrl}/${p}` : null;

            let addressesHtml = '<p class="text-muted">No addresses added yet</p>';
            if (customer.addresses?.length > 0) {
                addressesHtml = customer.addresses.map(a => `
                    <div class="address-item ${a.isDefault ? 'default' : ''}">
                        <strong>${a.city || ''}, ${a.state || ''}${a.isDefault ? ' <small>(Default)</small>' : ''}</strong>
                        <p>${a.address || ''}</p>
                        <small>Zip: ${a.zipCode || '—'} • ${a.latitude ? `Lat: ${a.latitude}, Lng: ${a.longitude}` : ''}</small>
                    </div>
                `).join('');
            }

            const detailsHtml = `
                <div class="user-header">
                    ${photoUrl(customer.profilePhotoFilePath) ?
                    `<img src="${photoUrl(customer.profilePhotoFilePath)}" class="user-avatar-large">` :
                    `<div class="user-avatar-large">${user.fullName?.charAt(0)?.toUpperCase() || '?'}</div>`
                }
                    <div class="user-header-info">
                        <h3>${user.fullName || 'N/A'}</h3>
                        <p>Customer • ${user.isActive !== false ? '<span class="status-badge active">Active</span>' : '<span class="status-badge inactive">Inactive</span>'}</p>
                    </div>
                </div>

                <div class="user-detail-item"><i data-lucide="user"></i><div><span class="detail-label">Username</span><span>${user.username || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="mail"></i><div><span class="detail-label">Email</span><span>${user.email || 'Not provided'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="phone"></i><div><span class="detail-label">Phone</span><span>${user.phone || 'N/A'}</span></div></div>
                <div class="user-detail-item"><i data-lucide="calendar"></i><div><span class="detail-label">Joined</span><span>${new Date(user.createdAt).toLocaleString()}</span></div></div>

                <div class="user-detail-section mt-4">
                    <h4><i data-lucide="map-pin"></i> Addresses</h4>
                    <div class="addresses-container mt-2">
                        ${addressesHtml}
                    </div>
                </div>
            `;

            $.dynamicModal({
                title: "Customer Details",
                bodyHtml: detailsHtml,
                buttons: [{ text: "Close", class: "btn-outline", action: "close" }]
            });

            lucide?.createIcons();
        });
    });

    $(document).on('click', '.action-btn.edit[data-type="customer"]', function () {
        editCustomer($(this).data('customerid'));
    });

    initializeDataTable();
});