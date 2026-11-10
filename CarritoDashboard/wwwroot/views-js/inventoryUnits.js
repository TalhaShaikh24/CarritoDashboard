let unitsTable;

$(document).ready(() => {

    $('#unitSearch').on('input', function () {
        unitsTable.search(this.value).draw();
    });

    initializeDataTable();
});

function initializeDataTable() {
    unitsTable = $('#unitsTable').DataTable({
        processing: true,
        serverSide: true,
        searching: true,
        ordering: false,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        language: {
            processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
            emptyTable: "No units found",
            zeroRecords: "No matching units found",
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
                url: baseApiUrl + '/api/InventoryUnit',
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
                data: 'id',
                render: d => `<span class="text-muted">#${d}</span>`
            },
            {
                data: 'name',
                render: d => `<strong>${d || 'N/A'}</strong>`
            },
            {
                data: null,
                orderable: false,
                className: 'text-center',
                render: function (data, type, row) {
                    return `
                        <div class="action-btns">
                            <button class="action-btn edit" data-id="${row.id}" data-name="${row.name}">
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

// --- ADD NEW UNIT ---
$('#btnAddNewUnit').click(function () {
    $.dynamicModal({
        title: "Add New Unit",
        bodyHtml: $('#unitFormTemplate').html(),
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Create Unit", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                saveUnit('POST');
                return true;
            }
        }
    });
});

// --- EDIT UNIT ---
$(document).on('click', '.action-btn.edit', function () {
    const id = $(this).data('id');
    const name = $(this).data('name');

    const editFormHtml = `
        <form id="frmEditUnit">
            <div class="form-group">
                <label>Unit Name <span style="color: red;">*</span></label>
                <input type="text" id="unitName" class="form-control" value="${name}" required placeholder="Enter Unit Name">
            </div>
        </form>
    `;

    $.dynamicModal({
        title: "Edit Unit",
        bodyHtml: editFormHtml,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Unit", class: "btn-primary", action: "save" }
        ],
        onButtonClick: function (action) {
            if (action === "save") {
                saveUnit('PUT', id);
                return true;
            }
        }
    });
});

// --- SAVE Logic (Common for Create/Update) ---
function saveUnit(method, id = null) {
    const name = $('#unitName').val().trim();

    if (!name) {
        showNotification("Unit Name is required", "error");
        return;
    }

    const payload = {
        Name: name
    };

    const url = method === 'POST' ? `${baseApiUrl}/api/InventoryUnit` : `${baseApiUrl}/api/InventoryUnit/${id}`;
    const msg = method === 'POST' ? "Creating unit..." : "Updating unit...";

    showNotification(msg, "info");

    ajaxRequest({
        url: url,
        method: method,
        data: JSON.stringify(payload), 
        contentType: 'application/json',
        processData: false,
        showMessage: true,
        onSuccess: (response) => {
            if (response.status === 200 || response.status === 201) {
                $.dynamicModal.close();
                unitsTable.ajax.reload(null, false);
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to save unit.";
            showNotification(msg, "error");
        }
    });
}