let couponsData = [];

$(document).ready(() => {
    loadCoupons();


    $('#btnAddNewOffer').click(() => openOfferModal());
});


function loadCoupons() {
    ajaxRequest({
        url: `${baseApiUrl}/api/Coupon?PageNumber=1&PageSize=100`, 
        method: 'GET',
        showMessage: false,
        onSuccess: (response) => {
            if (response.status === 200 && response.data) {
                couponsData = response.data.items;
                renderOfferCards();
            }
        }
    });
}

function renderOfferCards() {
    let html = "";
    couponsData.forEach(offer => {
        const expiryDate = new Date(offer.expiryDate).toLocaleDateString();
        const isExpired = new Date(offer.expiryDate) < new Date();

        html += `
            <div class="offer-card">
                <div class="offer-header">
                    <div class="offer-header-top">
                        <span class="offer-label">PROMO CODE</span>
                        <div class="offer-actions">
                            <button class="edit-offer" data-id="${offer.id}" title="Edit Offer">
                                <i data-lucide="edit-3" style="width:16px;"></i>
                            </button>
                        </div>
                    </div>
                    <p class="offer-code">${offer.code}</p>
                    <div class="offer-discount">
                        <i data-lucide="ticket" style="width:20px; margin-right:8px;"></i>
                        ${offer.discountPercentage > 0 ? offer.discountPercentage + '%' : 'Rs. ' + offer.discountValue}
                    </div>
                </div>
                <div class="offer-body">
                    <div class="offer-detail">
                        <p class="offer-detail-label">Status</p>
                        <p class="offer-detail-value ${isExpired ? 'expired' : 'active'}">${isExpired ? 'Expired' : 'Active'}</p>
                    </div>
                    <div class="offer-footer">
                        <i data-lucide="calendar" style="width:16px; margin-right:4px;"></i>
                        Expires: ${expiryDate}
                    </div>
                </div>
            </div>`;
    });
    $("#offersGrid").html(html);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}


function openOfferModal() {
    const templateContent = $('#offerFormTemplate').html();

    $.dynamicModal({
        title: "Create New Coupon",
        bodyHtml: templateContent,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Save Coupon", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => {
            if (action === "save") {
                saveCoupon();
                return false; /
            }
        }
    });
}

// API call to Save
function saveCoupon() {
    const data = {
        code: $('#couponCode').val().trim(),
        discountPercentage: parseFloat($('#discountPercentage').val()) || 0,
        discountValue: parseFloat($('#discountValue').val()) || 0,
        minOrderValue: parseFloat($('#minOrderValue').val()) || 0,
        expiryDate: $('#expiryDate').val(),
        customerId: 0 
    };

    if (!data.code || !data.expiryDate) {
        showNotification("Please fill required fields", "warning");
        return;
    }

    ajaxRequest({
        url: `${baseApiUrl}/api/Coupon`,
        method: 'POST',
        data: data,
        onSuccess: (res) => {
            if (res.status === 200) {
                showNotification("Coupon created successfully!", "success");
                $.dynamicModal.close();
                loadCoupons();
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to create coupon.";
            showNotification(msg, "error");
        }
    });
}


// --- Open Edit Modal ---
function openEditOfferModal(offer) {

    const template = $('#offerFormTemplate').html();

    $.dynamicModal({
        title: `Edit Offer: ${offer.code}`,
        bodyHtml: template,
        buttons: [
            { text: "Cancel", class: "btn-outline", action: "close" },
            { text: "Update Offer", class: "btn-primary", action: "save" }
        ],
        onButtonClick: (action) => {
            if (action === "save") {
                updateOffer(offer.id);
                return true;
            }
        }
    });

    // Populate existing values into the modal
    $('#couponCode').val(offer.code);
    $('#discountPercentage').val(offer.discountPercentage);
    $('#discountValue').val(offer.discountValue);
    $('#minOrderValue').val(offer.minOrderValue);

    // Date format for input[type="date"] (YYYY-MM-DD)
    if (offer.expiryDate) {
        const date = new Date(offer.expiryDate).toISOString().split('T')[0];
        $('#expiryDate').val(date);
    }
}

// --- Update API Call ---
function updateOffer(id) {
    const data = {
        code: $('#couponCode').val().trim(),
        discountPercentage: parseFloat($('#discountPercentage').val()) || 0,
        discountValue: parseFloat($('#discountValue').val()) || 0,
        minOrderValue: parseFloat($('#minOrderValue').val()) || 0,
        expiryDate: $('#expiryDate').val(),
        customerId: 0
    };

    ajaxRequest({
        url: `${baseApiUrl}/api/Coupon/${id}`,
        method: 'PUT',
        data: data,
        onSuccess: (res) => {
            if (res.status === 200) {
                showNotification("Offer updated successfully", "success");
                $.dynamicModal.close();
                loadCoupons();
            }
        },
        onError: (xhr) => {
            $('#popup-overlay').remove();
            const msg = xhr.responseJSON?.responseMsg || "Failed to update offer.";
            showNotification(msg, "error");
        }
    });
}

// Edit Button Click (Delegated Event)
$(document).on('click', '.edit-offer', function () {
    const id = $(this).data('id');
    const offer = couponsData.find(o => o.id == id);
    if (offer) {
        openEditOfferModal(offer);
    } else {
        showNotification("Offer details not found", "error");
    }
});