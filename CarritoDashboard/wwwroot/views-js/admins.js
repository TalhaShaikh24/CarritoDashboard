let adminsTable;
let adminDetailsCache = {};

$(document).ready(() => {
    $('#adminSearch').on('input', function () {
        adminsTable.search(this.value).draw();
    });

    initializeDataTable();
});

function initializeDataTable() {
    adminsTable = $('#adminsTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        ajax: function (data, callback) {
            const pageNumber = (data.start / data.length) + 1;

            $.ajax({
                url: baseApiUrl + '/api/Admin',
                type: 'GET',
                data: {
                    PageNumber: pageNumber,
                    PageSize: data.length,
                    Search: data.search.value
                },
                success: function (response) {
                    if (response.status === 200) {
                        callback({
                            draw: data.draw,
                            recordsTotal: response.data.totalRecords,
                            recordsFiltered: response.data.totalRecords,
                            data: response.data.items
                        });
                    }
                }
            });
        },
        columns: [
            { data: 'fullName', render: d => `<strong>${d || 'N/A'}</strong>` },
            { data: 'email', render: d => `<span class="text-muted">${d || 'N/A'}</span>` },
            { data: 'phone', render: d => `<span class="text-muted">${d || 'N/A'}</span>` },
            { data: 'designation', render: d => `<span class="badge badge-info">${d || 'N/A'}</span>` },
            {
                data: 'isActive',
                render: function (data) {
                    return `<span class="status-badge ${data ? 'active' : 'inactive'}">${data ? 'Active' : 'Inactive'}</span>`;
                }
            },
            {
                data: null,
                className: 'text-center',
                render: function (data, type, row) {
                    return `
                    <div class="action-btns">
                        <button class="action-btn view" data-id="${row.id}">
                            <i style="width: 18px;" data-lucide="eye"></i>
                        </button>
                        ${PermissionManager.hasPermission("Admin", "Update")
                                        ? `
                                <button class="action-btn edit" data-id="${row.id}">
                                    <i style="width: 18px;" data-lucide="square-pen"></i>
                                </button>
                              `
                                        : ""
                                    }
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

function addNewAdmin() {
    const payload = {
        FullName: $('#admFullName').val().trim(),
        Username: $('#admUsername').val().trim(),
        Password: $('#admPassword').val(),
        Email: $('#admEmail').val().trim(),
        Phone: $('#admPhone').val().trim(),
        Designation: $('#admDesignation').val().trim(),
        IsActive: $('#admIsActive').val() === "true",
        RoleId: 1 // Default Admin Role
    };

    if (!payload.FullName || !payload.Username || !payload.Password) {
        showNotification("Please fill required fields", "error");
        return;
    }

    ajaxRequest({
        url: baseApiUrl + '/api/Admin',
        method: 'POST',
        data: JSON.stringify(payload),
        contentType: 'application/json',
        onSuccess: (response) => {
            if (response.status === 200) {
                $.dynamicModal.close();
                adminsTable.ajax.reload();
                showNotification("Admin created and OTP sent!", "success");
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create admin.";
            showNotification(msg, "error");
        }
    });
}

// Edit Admin Functionality
function editAdmin(adminId) {
    ajaxRequest({
        url: `${baseApiUrl}/api/Admin/${adminId}`,
        method: 'GET',
        onSuccess: (response) => {
            const adm = response.data;
            const editForm = `
                <form id="frmEditAdmin">
                    <div class="form-group"><label>Full Name</label><input type="text" id="editAdmFullName" value="${adm.fullName}" placeholder="Enter Full Name"></div>
                    <div class="form-group"><label>Designation</label><input type="text" id="editAdmDesignation" value="${adm.designation}" placeholder="Enter Designation"></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="editAdmPhone" value="${adm.phone}" placeholder="Enter Phone"></div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="editAdmActive">
                            <option value="true" ${adm.isActive ? 'selected' : ''}>Active</option>
                            <option value="false" ${!adm.isActive ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </form>`;

            $.dynamicModal({
                title: "Edit Admin",
                bodyHtml: editForm,
                buttons: [
                    { text: "Cancel", class: "btn-outline", action: "close" },
                    { text: "Update", class: "btn-primary", action: "save" }
                ],
                onButtonClick: function (action) {
                    if (action === "save") {
                        updateAdmin(adminId);
                        return true;
                    }
                }
            });
        }
    });
}

function updateAdmin(adminId) {
    const payload = {
        FullName: $('#editAdmFullName').val(),
        Designation: $('#editAdmDesignation').val(),
        Phone: $('#editAdmPhone').val(),
        IsActive: $('#editAdmActive').val() === "true",
        RoleId: 1
    };

    ajaxRequest({
        url: `${baseApiUrl}/api/Admin/${adminId}`,
        method: 'PUT',
        data: JSON.stringify(payload),
        contentType: 'application/json',
        onSuccess: () => {
            $.dynamicModal.close();
            adminsTable.ajax.reload(null, false);
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update admin.";
            showNotification(msg, "error");
        }
    });
}

// Event Listeners
$(document).on('click', '.action-btn.edit', function () {
    editAdmin($(this).data('id'));
});


// Get Admin Details and Show in Modal
$(document).on('click', '.action-btn.view', function () {
    const adminId = $(this).data('id');

    // API Call to /api/Admin/{id}
    ajaxRequest({
        url: `${baseApiUrl}/api/Admin/${adminId}`,
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                const adm = response.data;

                const detailsHtml = `
                    <div class="user-header">
                        <div class="user-avatar-large">${adm.fullName?.charAt(0)?.toUpperCase()}</div>
                        <div class="user-header-info">
                            <h3>${adm.fullName}</h3>
                            <p>${adm.designation} • ${adm.isActive ?
                        '<span class="status-badge active">Active</span>' :
                        '<span class="status-badge inactive">Inactive</span>'}</p>
                        </div>
                    </div>

                    <div class="user-detail-item">
                        <i data-lucide="user"></i>
                        <div>
                            <span class="detail-label">Full Name</span>
                            <span class="detail-value">${adm.fullName || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="user-detail-item">
                        <i data-lucide="mail"></i>
                        <div>
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${adm.email || 'Not provided'}</span>
                        </div>
                    </div>
                    <div class="user-detail-item">
                        <i data-lucide="phone"></i>
                        <div>
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${adm.phone || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="user-detail-item">
                        <i data-lucide="briefcase"></i>
                        <div>
                            <span class="detail-label">Designation</span>
                            <span class="detail-value">${adm.designation || 'N/A'}</span>
                        </div>
                    </div>
                `;

                $.dynamicModal({
                    title: "Admin Details",
                    bodyHtml: detailsHtml,
                    buttons: [{ text: "Close", class: "btn-outline", action: "close" }]
                });

                // Icons initialize karein
                lucide?.createIcons();
            }
        }
    });
});

$('#btnAddNewAdmin').click(function () {
    $.dynamicModal({
        title: "Add New Admin",
        bodyHtml: $('#adminFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Admin", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => { if (action === "save") addNewAdmin(); }
    });
});