let faqsTable;

// Enum Mappings based on your C# Enums
const FaqType = {
    1: 'General',
    2: 'Account',
    3: 'Ordering',
    4: 'Payments',
    5: 'Delivery',
    6: 'Coupons',
    7: 'Storekeeper',
    8: 'Rider',
    9: 'Safety',
    10: 'Technical',
    11: 'Legal'
};

const FaqUserType = {
    1: 'Customer',
    2: 'Storekeeper',
    3: 'Rider'
};

$(document).ready(() => {

    // --- Search & Filter Listeners ---
    $('#faqSearch').on('input', function () {
        faqsTable.search(this.value).draw();
    });


    $('#filterFaqUserType').on('change', function () {
        faqsTable.ajax.reload();
    });

    // --- DataTable Initialization ---
    function initializeDataTable() {
        faqsTable = $('#faqsTable').DataTable({
            processing: true,
            serverSide: true,
            searching: true,
            ordering: false, 
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            language: {
                processing: '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>',
                emptyTable: "No FAQs found",
                zeroRecords: "No matching FAQs found",
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

                // Get filter value if exists, default to empty (or 1 if you want to force default)
                const userTypeFilter = $('#filterFaqUserType').val() || null;

                $.ajax({
                    url: baseApiUrl + '/api/Faq',
                    type: 'GET',
                    data: {
                        PageNumber: pageNumber,
                        PageSize: pageSize,
                        Search: searchValue,
                        faqUserType: userTypeFilter // Optional filter
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
                    data: 'index',
                    width: '50px',
                    render: d => `<span class="text-muted">#${d}</span>`
                },
                {
                    data: 'question',
                    render: d => `<strong>${d || 'N/A'}</strong>`
                },
                {
                    data: 'answer',
                    render: d => {
                        // Truncate long answers for the table view
                        const text = d || '';
                        return text.length > 50 ? `<span title="${text}">${text.substring(0, 50)}...</span>` : text;
                    }
                },
                {
                    data: 'type',
                    render: function (data) {
                        return `<span class="badge badge-light-primary">${FaqType[data] || 'Unknown'}</span>`;
                    }
                },
                {
                    data: 'userType',
                    render: function (data) {
                        let colorClass = 'text-muted';
                        if (data === 1) colorClass = 'text-success'; // Customer
                        if (data === 2) colorClass = 'text-warning'; // Storekeeper
                        if (data === 3) colorClass = 'text-info';    // Rider
                        return `<span class="${colorClass} font-weight-bold">${FaqUserType[data] || 'Unknown'}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    width: '100px',
                    render: function (data, type, row) {
                        return `
                            <div class="action-btns">
                                <button class="action-btn edit" data-id="${row.id}">
                                    <i style="width: 18px;" data-lucide="square-pen"></i>
                                </button>
                                <button class="action-btn delete" data-id="${row.id}">
                                    <i style="width: 18px;" data-lucide="trash-2"></i>
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

    // --- Helper to Generate Select Options ---
    function generateOptionsHtml(enumObj, selectedValue = null) {
        let options = '';
        for (const [key, value] of Object.entries(enumObj)) {
            const isSelected = parseInt(key) === parseInt(selectedValue) ? 'selected' : '';
            options += `<option value="${key}" ${isSelected}>${value}</option>`;
        }
        return options;
    }

    // --- Add New FAQ ---
    $('#btnAddNewFaq').click(function () {
        const addFormHtml = `
            <form id="frmAddFaq">
                <div class="form-group">
                    <label>Sort Index</label>
                    <input type="number" id="faqIndex" class="form-control" value="0" required placeholder="Enter Sort Index">
                </div>
                <div class="form-group">
                    <label>User Type</label>
                    <select id="faqUserType" class="form-control" data-custom-select data-placeholder="Choose User Type">
                        ${generateOptionsHtml(FaqUserType)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category Type</label>
                    <select id="faqType" class="form-control" data-custom-select data-placeholder="Choose Category" data-search="true">
                        ${generateOptionsHtml(FaqType)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Question *</label>
                    <input type="text" id="faqQuestion" class="form-control" required placeholder="Enter Question">
                </div>
                <div class="form-group">
                    <label>Answer *</label>
                    <textarea id="faqAnswer" class="form-control" rows="4" required placeholder="Enter Answer"></textarea>
                </div>
            </form>
        `;

        $.dynamicModal({
            title: "Add New FAQ",
            bodyHtml: addFormHtml,
            buttons: [
                { text: "Cancel", class: "btn-outline", action: "close" },
                { text: "Create FAQ", class: "btn-primary", action: "save" }
            ],
            onButtonClick: function (action) {
                if (action === "save") {
                    saveFaq('POST');
                    return true;
                }
            }
        });
    });

    // --- Edit FAQ ---
    $(document).on('click', '.action-btn.edit', function () {
        const rowData = faqsTable.row($(this).parents('tr')).data();
        openFaqModal(rowData);
    });
    function openFaqModal(faq = null) {
        const isEdit = !!faq;
        const title = isEdit ? "Edit FAQ" : "Add New FAQ";

        const formHtml = `
            <form id="frmFaq">
                <div class="form-group">
                    <label>Sort Index</label>
                    <input type="number" id="faqIndex" class="form-control" value="${isEdit ? faq.index : 0}" required placeholder="Enter Sort Index">
                </div>
                <div class="form-group">
                    <label>User Type</label>
                    <select id="faqUserType" class="form-control">
                        ${generateOptionsHtml(FaqUserType, isEdit ? faq.userType : null)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Category Type</label>
                    <select id="faqType" class="form-control">
                        ${generateOptionsHtml(FaqType, isEdit ? faq.type : null)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Question *</label>
                    <input type="text" id="faqQuestion" class="form-control" value="${isEdit ? faq.question : ''}" required placeholder="Enter Question">
                </div>
                <div class="form-group">
                    <label>Answer *</label>
                    <textarea id="faqAnswer" class="form-control" rows="4" required placeholder="Enter Answer">${isEdit ? faq.answer : ''}</textarea>
                </div>
            </form>`;

        $.dynamicModal({
            title: title,
            bodyHtml: formHtml,
            buttons: [
                { text: "Cancel", class: "btn-outline", action: "close" },
                { text: isEdit ? "Update FAQ" : "Create FAQ", class: "btn-primary", action: "save" }
            ],
            onButtonClick: (action) => {
                if (action === "save") {
                    saveFaq(isEdit ? 'PUT' : 'POST', isEdit ? faq.id : null);
                    return true;
                }
            }
        });
    }
    // --- Save Logic (Create/Update) ---
    function saveFaq(method, id = null) {
        const question = $('#faqQuestion').val().trim();
        const answer = $('#faqAnswer').val().trim();
        const index = $('#faqIndex').val();
        const type = $('#faqType').val();
        const userType = $('#faqUserType').val();

        if (!question || !answer) {
            showNotification("Question and Answer are required", "error");
            return;
        }

        const payload = {
            index: parseInt(index),
            question: question,
            answer: answer,
            type: parseInt(type),
            userType: parseInt(userType)
        };

        const url = method === 'POST' ? `${baseApiUrl}/api/Faq` : `${baseApiUrl}/api/Faq/${id}`;
        const msg = method === 'POST' ? 'Creating FAQ...' : 'Updating FAQ...';

        showNotification(msg, "info");

        ajaxRequest({
            url: url,
            method: method,
            data: JSON.stringify(payload),
            contentType: 'application/json', 
            processData: false,
            showMessage: true,
            onSuccess: (response) => {
                if (response.status === 200) {
                    $.dynamicModal.close();
                    faqsTable.ajax.reload(null, false);
                }
            },
            onError: (xhr) => {
                $('#popup-overlay').remove();
                const msg = xhr.responseJSON?.responseMsg || "Failed to save FAQ.";
                showNotification(msg, "error");
            }
        });
    }

    // --- Delete FAQ ---
    $(document).on('click', '.action-btn.delete', function () {
        const faqId = $(this).data('id');
        ajaxRequest({
            url: `${baseApiUrl}/api/Faq/${faqId}`,
            method: 'DELETE',
            showMessage: true,
            confirmMessage:"Are you sure you want to delete this FAQ? This action cannot be undone.",
            onSuccess: (response) => {
                if (response.status === 200) {
                    $.dynamicModal.close();
                    faqsTable.ajax.reload(null, false);
                }
            },
            onError: (xhr) => {
                $('#popup-overlay').remove();
                const msg = xhr.responseJSON?.responseMsg || "Failed to save FAQ.";
                showNotification(msg, "error");
            }
        });

    });

    // Initialize Table
    initializeDataTable();
});