
(function ($) {

    $.confirmDialog = function (options) {

        const settings = $.extend({
            title: "Confirm",
            message: "Are you sure?",
            confirmText: "Yes",
            cancelText: "Cancel",
            onConfirm: function () {},
            onCancel: function () {}
        }, options);

        // Remove existing dialog if any
        $("#confirmOverlay").remove();

        // Create HTML dynamically
        const dialogHTML = `
        <div class="confirm-dialog-overlay open" id="confirmOverlay">
            <div class="confirm-dialog">
                <div class="confirm-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </div>
                <h3 class="confirm-title">${settings.title}</h3>
                <p class="confirm-message">${settings.message}</p>
                <div class="confirm-buttons">
                    <button class="btn-outline" id="confirmCancel">${settings.cancelText}</button>
                    <button class="btn-danger" id="confirmOk">${settings.confirmText}</button>
                </div>
            </div>
        </div>`;

        $("body").append(dialogHTML);

        // Events
        $("#confirmOk").on("click", function () {
            $("#confirmOverlay").remove();
            settings.onConfirm();
        });

        $("#confirmCancel").on("click", function () {
            $("#confirmOverlay").remove();
            settings.onCancel();
        });
    };

})(jQuery);