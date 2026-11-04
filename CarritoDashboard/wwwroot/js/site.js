/* global $ */

$(document).ready(() => {
    // ===== SIDEBAR & NAVIGATION =====
    $("#sidebarToggle").click(() => {
        $("#sidebar").toggleClass("collapsed");
    });

    // Submenu Toggle
    $(".nav-item.has-submenu").click(function () {
        const submenu = $(this).data("submenu");
        const $submenuEl = $(`#submenu-${submenu}`);
        $submenuEl.toggleClass("open");
        $(this).parent(".nav-group").toggleClass("open");
    });

    // Ensure active submenu and its parent group are open & highlighted
    const $activeSubmenu = $(".submenu-item.active");
    if ($activeSubmenu.length > 0) {
        $activeSubmenu.closest(".submenu").addClass("open");
        const $parentGroup = $activeSubmenu.closest(".nav-group");
        $parentGroup.addClass("open");
        $parentGroup.find(".nav-item.has-submenu").addClass("active-parent");
    }

    // ===== DELETE CONFIRMATION LOGIC =====
    let deleteCallback = null;

    // Global listener for delete buttons to open the overlay
    // Note: Specific pages must attach the data-id and data-type
    $(document).on("click", ".action-btn.delete, .delete-offer", function () {
        const type = $(this).data("type") || "item";
        $("#confirmTitle").text(`Delete ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        $("#confirmOverlay").addClass("open");

        // Store the context or ID if needed by specific pages
        window.currentDeleteId = $(this).data("id");
    });

    $("#confirmDelete").click(() => {
        if (typeof window.onConfirmDelete === 'function') {
            window.onConfirmDelete(window.currentDeleteId);
        }
        $("#confirmOverlay").removeClass("open");
    });

    $("#confirmCancel").click(() => {
        $("#confirmOverlay").removeClass("open");
    });

    // ===== HELPER FUNCTIONS (Globally Available) =====

    window.createStatusToggle = function (isActive) {
        return `<div class="status-toggle ${isActive ? "active" : ""}" onclick="$(this).toggleClass('active')">
            <div class="toggle-knob"></div>
        </div>`;
    };


    window.renderPagination = function (elementId, currentPage, totalPages) {
        if (totalPages <= 1) {
            $(`#${elementId}`).html("");
            return;
        }

        let btns = "";
        btns += `<button class="page-btn" ${currentPage === 1 ? "disabled" : ""}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>`;

        for (let i = 1; i <= totalPages; i++) {
            btns += `<button class="page-btn ${i === currentPage ? "active" : ""}">${i}</button>`;
        }

        btns += `<button class="page-btn" ${currentPage === totalPages ? "disabled" : ""}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>`;

        $(`#${elementId}`).html(`
            <p class="pagination-info">Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></p>
            <div class="pagination-btns">${btns}</div>
        `);
    };




    $(".modal-close").on("click", function (e) {
        e.stopPropagation();
        const modalId = $(this).closest(".sliding-modal").attr("id");
        closeModal(modalId);
    });



});



// Modal open/close logic
function openModal(modalId) {

    $('#' + modalId).addClass('show').hide().fadeIn(200);
}

function closeModal(modalId) {
    $('#' + modalId).fadeOut(200, function () {
        $(this).removeClass('show');
    });
}


// TOAST
function showNotification(message, type = "info", statusCode = null, customTitle = null) {
    const icons = {
        success: "fas fa-check-circle",
        error: "fas fa-exclamation-circle",
        info: "fas fa-info-circle",
        warning: "fas fa-exclamation-triangle"
    };

    let title = customTitle;
    if (!title) {
        if (statusCode === 200 || type === "success") {
            title = "Success";
        } else if (statusCode === 400) {
            title = "Validation Error";
        } else if (statusCode === 401 || statusCode === 403) {
            title = "Access Denied";
        } else if (statusCode === 404) {
            title = "Not Found";
        } else if (statusCode !== null || type === "error") {
            title = "Error";
        } else {
            title = "Notice";
        }
    }

    let $container = $("#notificationContainer");
    if ($container.length === 0) {
        $container = $('<div id="notificationContainer" class="notification-container"></div>');
        $("body").append($container);
    }

    const notification = $(`
        <div class="notification notification-${type}">
            <i class="${icons[type] || icons.info}"></i>
            <div class="notification-content">
                <h5>${title}</h5>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" type="button" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `);

    $container.append(notification);

    const duration = type === "error" ? 7000 : 4000;
    const timer = setTimeout(() => {
        notification.fadeOut(250, function () { $(this).remove(); });
    }, duration);

    // Manual close
    notification.find(".notification-close").on("click", () => {
        clearTimeout(timer);
        notification.fadeOut(200, function () { $(this).remove(); });
    });
}






// Initialize dropdown toggle
$(document).on('click', '.dropdown-toggle', function (e) {

    e.preventDefault();
    e.stopPropagation();
    const $dropdown = $(this).siblings('.dropdown-menu');
    $('.dropdown-menu').not($dropdown).removeClass('show'); // Close other open dropdowns
    $dropdown.toggleClass('show'); // Toggle the clicked dropdown
});

// Close dropdown when clicking outside
$(document).on('click', function (e) {
    if (!$(e.target).closest('.dropdown').length) {
        $('.dropdown-menu').removeClass('show');
    }
});

// Logout handler with confirmation
$(document).on('click', '.logout-btn, #sidebarLogoutBtn', function (e) {
    e.preventDefault();
    if (typeof $.showConfirm === 'function') {
        $.showConfirm({
            title: "Confirm Sign Out",
            message: "Are you sure you want to log out of the Carrito Operations Dashboard?",
            confirmBtnText: "Yes, Logout",
            confirmClass: "btn-danger",
            onConfirm: () => {
                executeLogout();
            }
        });
    } else {
        if (confirm("Are you sure you want to log out?")) {
            executeLogout();
        }
    }
});

function executeLogout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    if (typeof showNotification === 'function') {
        showNotification("You have been logged out. Redirecting...", "info");
    }
    setTimeout(() => {
        window.location.href = '/Account/Login';
    }, 600);
}



