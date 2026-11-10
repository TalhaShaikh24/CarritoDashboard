// Setup global AJAX headers
//(function setupAjaxDefaults() {
//    $.ajaxSetup({
//        xhrFields: {
//            withCredentials: true
//        }
//    });
//})();

// Global AJAX function
function ajaxRequest({
    url,
    method = 'GET',
    data = {},
    headers = {},
    contentType = 'application/json',
    processData = true,
    responseType = 'json',
    isQuery = false,
    onSuccess = () => { },
    onError = null,
    onComplete = () => { },
    showMessage = true,
    showErrorModal = true,
    confirmMessage = 'Are you sure you want to delete this item?'
}) {
    const upperMethod = method.toUpperCase();

    // If DELETE, show confirmation modal
    if (upperMethod === 'DELETE') {
        showConfirmDeleteModal(confirmMessage, () => {
            // Proceed with the AJAX request after confirmation
            executeAjaxRequest({
                url,
                method,
                data,
                headers,
                contentType,
                processData,
                responseType,
                isQuery,
                onSuccess,
                onError,
                hasCustomOnError: typeof onError === 'function',
                onComplete,
                showMessage,
                showErrorModal
            });
        });
        return; // Exit to wait for confirmation
    }

    // For non-DELETE requests, execute immediately
    executeAjaxRequest({
        url,
        method,
        data,
        headers,
        contentType,
        processData,
        responseType,
        isQuery,
        onSuccess,
        onError,
        hasCustomOnError: typeof onError === 'function',
        onComplete,
        showMessage,
        showErrorModal
    });
}

// Extracted AJAX execution logic to avoid duplication
function executeAjaxRequest({
    url,
    method,
    data,
    headers,
    contentType,
    processData,
    responseType,
    isQuery,
    onSuccess,
    onError,
    hasCustomOnError = false,
    onComplete,
    showMessage,
    showErrorModal = true
}) {
    const upperMethod = method.toUpperCase();
    
    // Append query parameters if isQuery is true AND method is GET or DELETE
    if (isQuery || data && (upperMethod === 'GET' || upperMethod === 'DELETE')) {
        const queryString = $.param(data);
        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
        }
        data = null; // Prevent sending data in body
    }

    // Detect and handle FormData
    let finalData = data;
    if (data instanceof FormData) {
        contentType = false;
        processData = false;
    } else if (contentType === 'application/json' && data && typeof data === 'object') {
        finalData = JSON.stringify(data);
    }

    // Automatically attach JWT token and DeviceId
    headers = headers || {};
    const jwtToken = localStorage.getItem('jwtToken');
    if (jwtToken && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'web-' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem('deviceId', deviceId);
    }
    if (!headers['X-DeviceId']) {
        headers['X-DeviceId'] = deviceId;
    }

    $.ajax({
        url,
        type: method,
        data: finalData,
        headers,
        contentType,
        processData,
        dataType: responseType,
        success: function (response, textStatus, xhr) {
            const statusCode = xhr.status;
            const successMsg = response?.responseMsg || "Operation completed successfully.";

            if (showMessage) {
                showNotification(successMsg, "success", statusCode);
            }

            onSuccess(response);
        },
        error: function (xhr, status, error) {
            const statusCode = xhr.status;
            let errorMsg = "An unexpected error occurred";

            try {
                if (xhr.responseJSON) {
                    const res = xhr.responseJSON;
                    // Check if ASP.NET ModelState / ProblemDetails validation errors exist
                    if (res.errors && typeof res.errors === 'object') {
                        const errorItems = [];
                        for (const field in res.errors) {
                            const errs = res.errors[field];
                            if (Array.isArray(errs)) {
                                errs.forEach(e => errorItems.push(e));
                            } else if (typeof errs === 'string') {
                                errorItems.push(errs);
                            }
                        }
                        if (errorItems.length > 0) {
                            errorMsg = errorItems.map(msg => `<div class="error-item">• ${msg}</div>`).join('');
                        } else {
                            errorMsg = res.title || "Validation error occurred.";
                        }
                    } else if (res.responseMsg) {
                        errorMsg = res.responseMsg;
                    } else if (res.message) {
                        errorMsg = res.message;
                    } else if (res.error) {
                        errorMsg = typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
                    } else if (res.title) {
                        errorMsg = res.title;
                    } else {
                        errorMsg = typeof res === 'string' ? res : JSON.stringify(res);
                    }
                } else if (xhr.responseText) {
                    try {
                        const parsed = JSON.parse(xhr.responseText);
                        if (parsed.errors && typeof parsed.errors === 'object') {
                            const errorItems = [];
                            for (const field in parsed.errors) {
                                const errs = parsed.errors[field];
                                if (Array.isArray(errs)) {
                                    errs.forEach(e => errorItems.push(e));
                                } else if (typeof errs === 'string') {
                                    errorItems.push(errs);
                                }
                            }
                            errorMsg = errorItems.length > 0 
                                ? errorItems.map(msg => `<div class="error-item">• ${msg}</div>`).join('')
                                : (parsed.title || "Validation error occurred.");
                        } else {
                            errorMsg = parsed.responseMsg || parsed.message || parsed.error || parsed.title || xhr.responseText;
                        }
                    } catch {
                        errorMsg = xhr.responseText;
                    }
                } else if (error) {
                    errorMsg = error;
                }
            } catch {
                errorMsg = "Error parsing server response";
            }

            // Handle 401 Unauthorized
            if (statusCode === 401) {
                showNotification("Session expired or unauthorized. Redirecting to login...", "warning");
                localStorage.removeItem('jwtToken');
                localStorage.removeItem('currentUser');
                setTimeout(() => {
                    window.location.href = '/Account/Login';
                }, 1200);
                onError(xhr, status, error);
                return;
            }

            // Trigger global popup if status is 500
            if (statusCode === 500) {
                if (showErrorModal) {
                    $.showCustomPopup({
                        title: "Server Error (500)",
                        iconClass: "fas fa-exclamation-triangle",
                        message: `
                        <p>Something went wrong on the server.</p>
                        <p>Please try again later or contact support at 
                            <a href="mailto:support@carrito.com" class="support-link">
                                support@carrito.com
                            </a>
                        </p>`
                    });
                } else if (showMessage && !hasCustomOnError) {
                    showNotification(errorMsg, "error", statusCode);
                }
            } else if (showMessage && !hasCustomOnError) { 
                showNotification(errorMsg, "error", statusCode);
            }
            if (hasCustomOnError && typeof onError === 'function') {
                onError(xhr, status, error);
            }
        },
        complete: function () {
            onComplete();
        }
    });
}

