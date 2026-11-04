let settlementTable;
const currentUserId = 1;
const pageSizeMaxValue = 10000000;

let ridersCache = [];
let storeKeepersCache = [];

const SettlementType = { RiderCodSettlement: 1, StorekeeperWithdrawal: 10 };
const SettlementStatus = { Pending: 1, Processing: 2, Completed: 3, Rejected: 4 };

let selectedFiles = { newSettlement: {} };

$(document).ready(() => {
    initializeDataTable();
    populateFilters();
    fetchRiders();
    fetchStoreKeepers();

    $('#settlementSearch').on('input', function () {
        settlementTable.search(this.value).draw();
    });

    $('#filterType, #filterStatus').on('change', () => settlementTable.ajax.reload());

    $(document).on('click', '.action-btn.edit', function () {
        const data = $(this).data();
        editSettlement(data.id, data.status, data.amount, data.user);
    });
});

function initializeDataTable() {
    settlementTable = $('#settlementTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No settlements found",
            info: "Page <strong>_PAGE_</strong> of <strong>_PAGES_</strong>",
            paginate: {
                previous: '<i class="fa fa-chevron-left"></i>',
                next: '<i class="fa fa-chevron-right"></i>'
            }
        },
        ajax: (data, callback) => {
            $.ajax({
                url: `${baseApiUrl}/api/Settlement`,
                type: 'GET',
                data: {
                    PageNumber: (data.start / data.length) + 1,
                    PageSize: data.length,
                    Search: data.search.value,
                    Status: $('#filterStatus').val() || null
                },
                success: (res) => {
                    if (res.status === 200) {
                        callback({
                            draw: data.draw,
                            recordsTotal: res.data.totalRecords,
                            recordsFiltered: res.data.totalRecords,
                            data: res.data.items
                        });
                    }
                }
            });
        },
        columns: [
            {
                data: 'recieptPhotoFilePath',
                width: '60px',
                render: (data) => {
                    const imgUrl = data ? `${baseApiUrl}/${data}` : '/images/placeholder-receipt.png';
                    return `<a href="${imgUrl}" target="_blank">
                                <img src="${imgUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
                            </a>`;
                }
            },
            { data: 'targetFullName', render: d => `<strong>${d || 'Unknown'}</strong>` },
            { data: 'type', render: data => renderTypeBadge(data) },
            { data: 'amount', render: data => `<span style="font-weight: bold; color: var(--primary);">${parseFloat(data).toFixed(2)}</span>` },
            { data: 'status', render: data => renderStatusBadge(data) },
            { data: 'createdAt', render: data => data ? new Date(data).toLocaleDateString() : '-' },
            {
                data: null,
                className: 'text-center',
                render: (data, type, row) => {
                    return `
            <div class="dropdown">
                <button class="dropdown-toggle action-btn" type="button" data-toggle="dropdown">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                <div class="dropdown-menu">
                    <a class="dropdown-item" href="javascript:void(0)" onclick="updateSettlementStatus(${row.id}, 1)">
                        <i class="fas fa-clock"></i> Set Pending
                    </a>
                    <a class="dropdown-item" href="javascript:void(0)" onclick="updateSettlementStatus(${row.id}, 2)">
                        <i class="fas fa-spinner"></i> Set Processing
                    </a>
                    <a class="dropdown-item" href="javascript:void(0)" onclick="updateSettlementStatus(${row.id}, 3)">
                        <i class="fas fa-check-circle"></i> Set Completed
                    </a>
                    <a class="dropdown-item text-danger" href="javascript:void(0)" onclick="updateSettlementStatus(${row.id}, 4)">
                        <i class="fas fa-times-circle"></i> Set Rejected
                    </a>
                </div>
            </div>`;
                }
            }
        ],
        drawCallback: () => window.lucide && lucide.createIcons()
    });
}

function fetchRiders() {
    $.get(`${baseApiUrl}/api/Rider`, { PageNumber: 1, PageSize: pageSizeMaxValue }, (res) => {
        if (res.status === 200) ridersCache = res.data.items;
    });
}

function fetchStoreKeepers() {
    $.get(`${baseApiUrl}/api/Storekeeper`, { PageNumber: 1, PageSize: pageSizeMaxValue }, (res) => {
        if (res.status === 200) storeKeepersCache = res.data.items;
    });
}

function populateFilters() {
    $("#filterType, #filterStatus").customSelect();
}

function renderTypeBadge(typeId) {
    const isRider = typeId == SettlementType.RiderCodSettlement;
    const icon = isRider ? 'bike' : 'store';
    const label = isRider ? 'Rider COD' : 'Store Withdrawal';
    const badgeClass = isRider ? 'badge-light-info' : 'badge-light-warning';

    return `<span class="badge ${badgeClass}"><i data-lucide="${icon}" style="width:12px; margin-right:4px;"></i>${label}</span>`;
}

function renderStatusBadge(statusId) {
    switch (statusId) {
        case SettlementStatus.Pending: return '<span class="status-badge preparing">Pending</span>';
        case SettlementStatus.Processing: return '<span class="status-badge new">Processing</span>';
        case SettlementStatus.Completed: return '<span class="status-badge completed">Completed</span>';
        case SettlementStatus.Rejected: return '<span class="status-badge" style="background:#fee2e2; color:#dc2626;">Rejected</span>';
        default: return '<span class="status-badge">Unknown</span>';
    }
}

$('#btnAddNewSettlement').click(function () {
    selectedFiles.newSettlement = {};
    const $template = $($('#settlementAddTemplate').html());

    $.dynamicModal({
        title: "Create New Settlement",
        bodyHtml: $template.prop('outerHTML'),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Settlement", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => action === "save" && saveNewSettlement()
    });

    $("#newSetStatus, #newSetTargetUser").customSelect();
    initUploader('#newSetPhoto', 'newSettlement', 'photo');
    lucide.createIcons();

    populateTargetUserSelect(SettlementType.RiderCodSettlement);

    $(document).on('change', 'input[name="settlementType"]', function () {
        populateTargetUserSelect(parseInt($(this).val()));
    });
});

function populateTargetUserSelect(typeVal) {
    const $targetSelect = $("#newSetTargetUser");
    $targetSelect.empty().append('<option value="">Select User</option>');

    const dataSource = (typeVal === SettlementType.RiderCodSettlement) ? ridersCache : storeKeepersCache;

    dataSource.forEach(item => {
        let name = (typeVal === SettlementType.RiderCodSettlement)
            ? (item.fullName || item.username || "Rider")
            : `${item.storeName || "Unknown Store"} (${item.fullName || ""})`;

        if (item.userId) $targetSelect.append(new Option(name, item.userId));
    });

    $targetSelect.val("").trigger('change');
}

function saveNewSettlement() {
    const files = selectedFiles.newSettlement;
    const type = $('input[name="settlementType"]:checked').val();
    const targetUserId = $('#newSetTargetUser').val();
    const amount = $('#newSetAmount').val();

    if (!type || !targetUserId || !amount || !files.photo) {
        showNotification("Please fill all fields and upload receipt", "error");
        return;
    }

    const formData = new FormData();
    formData.append('TargetUserId', targetUserId);
    formData.append('AdminUserId', currentUserId);
    formData.append('Type', type);
    formData.append('Amount', amount);
    formData.append('Status', $('#newSetStatus').val());
    formData.append('RecieptPhoto', files.photo);

    ajaxRequest({
        url: `${baseApiUrl}/api/Settlement`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        showMessage: true,
        onSuccess: (res) => {
            if (res.status === 200) {
                $.dynamicModal.close();
                settlementTable.ajax.reload(null, false);
            }
        }
    });
}

function editSettlement(id, status, amount, userName) {
    const $template = $($('#settlementEditTemplate').html());
    $template.find('#editSetStatus').val(status);
    $template.find('#readOnlyAmount').val(amount);
    $template.find('#readOnlyUser').val(userName);

    $.dynamicModal({
        title: "Edit Settlement Status",
        bodyHtml: $template.prop('outerHTML'),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Status", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => action === "save" && updateSettlementStatus(id)
    });

    $("#editSetStatus").customSelect();
}

function updateSettlementStatus(id, newStatus) {


    $.confirmDialog({
        title: "Change Status",
        message: "Are you sure you want to change the status?",
        confirmText: "Update",
        cancelText: "Cancel",
        onConfirm: function () {
            ajaxRequest({
                url: `${baseApiUrl}/api/Settlement/${id}`,
                method: 'PUT',
                data: JSON.stringify({ status: parseInt(newStatus) }), 
                contentType: 'application/json',
                showMessage: true,
                onSuccess: (res) => {
                    if (res.status === 200) {

                        settlementTable.ajax.reload(null, false);
                    }
                }
            });
        },
        onCancel: function () {
            console.log("User cancelled");
            return;
        }
    });




    
}