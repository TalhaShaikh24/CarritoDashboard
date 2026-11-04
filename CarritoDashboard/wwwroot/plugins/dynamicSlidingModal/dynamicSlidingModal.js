;(function($) {
    // Default modal HTML structure (agar page pe nahi hai toh auto create kar dega)
    const modalTemplate = `
        <div id="modalOverlay" class="modal-overlay"></div>
       
        <div class="sliding-modal" id="dynamicModal">
        <div class="modal-header">
            <h2 class="modal-title" id="modalTitle">Modal Title</h2>
            <button class="modal-close" id="modalCloseBtn">
                <i style="width: 22px;" data-lucide="x"></i>
            </button>
        </div>
        <div class="modal-body" id="modalBody">
        </div>
        <div class="modal-footer" id="modalFooter">
        </div>
    </div>
    `;

    // Plugin definition
    $.dynamicModal = function(options) {
        const settings = $.extend({
            title: "Modal Title",
            bodyHtml: "<p>No content provided.</p>",
            buttons: [
                { text: "Close", class: "btn-outline", action: "close" },
                { text: "Save", class: "btn-primary", action: "save" }
            ],
            onButtonClick: function(action, $button) {
                // Default behavior: agar action 'close' hai toh band kar do
                if (action === "close") {
                    $.dynamicModal.close();
                }
            },
            onClose: function() {}
        }, options);

        // Agar modal already exist nahi karta toh create kar do
        if ($("#dynamicModal").length === 0) {
            $("body").append(modalTemplate);
        }

        // Content set karo
        $("#modalTitle").text(settings.title);
        $("#modalBody").html(settings.bodyHtml);

        // Buttons generate karo
        let buttonsHtml = '<div class="btn-group">';
        settings.buttons.forEach((btn, index) => {
            const btnClass = btn.class || "btn-primary";
            const action = btn.action || "custom-" + index;
            buttonsHtml += `
                <button type="button" class="${btnClass}" data-action="${action}">
                    ${btn.text}
                </button>`;
        });
        buttonsHtml += '</div>';
        $("#modalFooter").html(buttonsHtml);

        // Lucide icons refresh (agar available ho)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Modal open karo
        $("#modalOverlay").addClass("open");
        $("#dynamicModal").addClass("open");

        // === Event listeners clean & re-attach ===
        const $doc = $(document);
        const $footer = $("#modalFooter");
        const $closeElements = $("#modalCloseBtn, #modalOverlay");

        // Purane listeners remove karo
        $closeElements.off(".dynamicModal");
        $footer.off(".dynamicModal");
        $doc.off(".dynamicModal");

        // Close function
        const closeModal = function() {
            $("#modalOverlay").removeClass("open");
            $("#dynamicModal").removeClass("open");
            $closeElements.off(".dynamicModal");
            $footer.off(".dynamicModal");
            $doc.off(".dynamicModal");
            settings.onClose();
        };

        // Close handlers
        $closeElements.on("click.dynamicModal", closeModal);
        $doc.on("keydown.dynamicModal", function(e) {
            if (e.key === "Escape") {
                closeModal();
            }
        });

        // Button click handler (delegated)
        $footer.on("click.dynamicModal", "button", function(e) {
            e.preventDefault();
            const action = $(this).data("action");
            // Custom callback call karo — agar false return kare toh default close mat karo
            if (settings.onButtonClick(action, $(this)) !== false) {
                if (action === "close") {
                    closeModal();
                }
            }
        });

        $('#dynamicModal select[data-custom-select]').customSelect();
    };

    // Static method to close the modal
    $.dynamicModal.close = function() {
        $("#modalOverlay").removeClass("open");
        $("#dynamicModal").removeClass("open");
        $(document).off(".dynamicModal");
        $("#modalCloseBtn, #modalOverlay").off(".dynamicModal");
        $("#modalFooter").off(".dynamicModal");
    };

})(jQuery);