const API_ENDPOINT = window.baseApiUrl || '';


const TicketTypes = {
    1: "General Inquiry",
    2: "Order Issue",
    3: "Payment Issue",
    4: "Refund Request",
    5: "Delivery Issue",
    6: "Product Issue",
    7: "Coupon or Promotion",
    8: "Account Issue",
    9: "App / Technical Issue",
    10: "Storekeeper Issue",
    11: "Rider Issue",
    12: "Safety or Security",
    13: "Feedback or Suggestion"
};

const statusIcons = {
    1: '<svg class="hidden status-icon open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    2: '<svg class="hidden status-icon closed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
};

const statusText = {
    1: "Open",
    2: "Closed"
};

// Logic to determine badge color based on Ticket Type
function getBadgeClass(typeId) {
    if ([2, 3, 4, 12].includes(typeId)) return "high"; // Red/Orange
    if ([5, 11, 9].includes(typeId)) return "medium"; // Yellow/Blue
    return "low"; // Green/Grey
}

$(document).ready(() => {

    // ===== API CALLS =====

    // Fetch all tickets
    function loadTickets() {
        $.ajax({
            url: `${API_ENDPOINT}/api/Ticket`,
            type: 'GET',
            success: function (response) {
                if (response.status === 200 && response.data) {
                    renderTicketsList(response.data);
                } else {
                    showNotification(response.responseMsg || "Failed to load tickets", "error");
                    $("#ticketsList").html('<div class="empty-list">No tickets available</div>');
                }
            },
            error: function () {
                showNotification("Failed to load support tickets", "error");
                $("#ticketsList").html('<div class="empty-list">Error loading tickets</div>');
            }
        });
    }

    // Load single ticket details
    function loadAndShowTicketDetails(ticketId) {
        // Show loading state in the details pane
        $("#ticketDetails").html('<div style="padding:20px; text-align:center; color:#666;">Loading details...</div>');

        $.ajax({
            url: `${API_ENDPOINT}/api/Ticket/${ticketId}`,
            type: 'GET',
            success: function (response) {
                if (response.status === 200 && response.data) {
                    showTicketDetails(response.data);
                } else {
                    showNotification("Failed to load ticket details", "error");
                }
            },
            error: function () {
                showNotification("Error loading ticket details", "error");
            }
        });
    }

    // ===== RENDER FUNCTIONS (Old_ticket.js Design) =====

    // Render ticket list in sidebar
    function renderTicketsList(tickets) {
        let html = "";

        if (!tickets || tickets.length === 0) {
            $("#ticketsList").html('<div class="empty-list">No tickets found</div>');
            return;
        }

        tickets.forEach((ticket, index) => {
            const isActive = index === 0 ? "active" : "";

            // Logic: Default to status 1 (Open) if missing, as seen in tickets.js
            const statusId = ticket.status || 1;

            // Logic: Map integer Type to String Name
            const typeName = TicketTypes[ticket.type] || "General";
            const badgeClass = getBadgeClass(ticket.type);

            // Logic: Use complainantFullName from API response
            const customerName = ticket.complainantFullName || `User #${ticket.complainantUserId}`;

            // Design: Old_ticket.js HTML Structure
            html += `
                <div class="ticket-item ${isActive}" data-ticket-id="${ticket.id}">
                    <div class="ticket-header">
                        <div class="ticket-id-status">
                            <span class="ticket-id">#TK-${String(ticket.id).padStart(4, '0')}</span>
                            ${statusIcons[statusId]}
                        </div>
                        <span class="priority-badge ${badgeClass}">${typeName}</span>
                    </div>
                    <p class="ticket-subject">${ticket.subject || 'No subject'}</p>
                    <p class="ticket-meta">${customerName} | ${formatTimeAgo(new Date(ticket.createdAt))}</p>
                </div>
            `;
        });

        $("#ticketsList").html(html);

        // Show first ticket details by default
        if (tickets.length > 0) {
            loadAndShowTicketDetails(tickets[0].id);
        }
    }

    // Render detailed view
    function showTicketDetails(ticket) {
        const statusId = ticket.status || 1;
        const statusLabel = statusText[statusId] || "Open";

        const typeName = TicketTypes[ticket.type] || "General";
        const badgeClass = getBadgeClass(ticket.type);
        const customerName = ticket.complainantFullName || `User #${ticket.complainantUserId}`;

        // Attachments Logic
        let attachmentsHtml = '<p class="text-muted">No attachments</p>';

        if (ticket.ticketAttachments && ticket.ticketAttachments.length > 0) {
            attachmentsHtml = '<div class="attachments-container">';
            ticket.ticketAttachments.forEach(att => {
                // Fallback for filePath naming depending on API version
                const path = att.filePath || att.attachmentFilePath || '#';
                const filename = path.split('/').pop();

                attachmentsHtml += `
                    <div class="attachment-preview">
                        <a href="${API_ENDPOINT}/${path}" target="_blank">
                            <i data-lucide="file"></i> ${filename}
                        </a>
                    </div>
                `;
            });
            attachmentsHtml += '</div>';
        }

        // Design: Old_ticket.js HTML Structure
        const html = `
            <div class="ticket-detail-header">
                <h3 class="ticket-detail-id">#TK-${String(ticket.id).padStart(4, '0')}</h3>
                <p class="ticket-detail-subject">${ticket.subject || 'No subject'}</p>
            </div>
            <div class="ticket-detail-info">
                <div class="detail-row">
                    <p class="detail-label">Customer</p>
                    <p class="detail-value">${customerName}</p>
                </div>
                <div class="detail-row">
                    <p class="detail-label">Status</p>
                    <div class="status-box">
                        ${statusIcons[statusId] || ''}
                        <span style="font-weight:600">${statusLabel}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <p class="detail-label">Type</p>
                    <p class="detail-value priority-badge ${badgeClass}">${typeName}</p>
                </div>
                <div class="detail-row">
                    <p class="detail-label">Created</p>
                    <p class="detail-value">${new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
            </div>

            <div class="ticket-message-section hidden">
                <p class="detail-label">Message</p>
                 <p class="detail-value">${(ticket.message || 'No message provided').replace(/\n/g, '<br>')}</p>
            </div>

            <div class="ticket-attachments-section hidden">
                <p class="detail-label">Attachments</p>
                ${attachmentsHtml}
            </div>

            <button class="hidden btn-primaryy btn-emerald" style="width:100%;margin-top:20px;justify-content:center" data-id="${ticket.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Reply to Ticket
            </button>
        `;

        $("#ticketDetails").html(html);
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // ===== UTILS (from Old_ticket.js) =====

    // Time ago helper
    function formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // ===== EVENTS =====

    // Click on ticket in list
    $(document).on("click", ".ticket-item", function () {
        $(".ticket-item").removeClass("active");
        $(this).addClass("active");

        const ticketId = $(this).data("ticket-id");
        loadAndShowTicketDetails(ticketId);
    });

    // Reply button click (placeholder)
    $(document).on("click", ".btn-emerald", function () {
        const ticketId = $(this).data("id");
        if (typeof showNotification === "function") {
            showNotification(`Reply functionality for Ticket #TK-${String(ticketId).padStart(4, '0')} coming soon`, "info");
        } else {
            alert(`Reply to ticket #TK-${ticketId}`);
        }
    });

    // Initial load
    loadTickets();
});