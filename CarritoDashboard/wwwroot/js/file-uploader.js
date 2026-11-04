(function ($) {

    function getFileIcon(fileType) {
        /* Same as before */
        const baseAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"';
        const path = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />';
        let label = '';
        if (fileType && fileType.includes("pdf")) label = 'PDF';
        else if (fileType && fileType.includes("word")) label = 'DOC';
        if (!label) return `<svg ${baseAttrs}>${path}</svg>`;
        return `<svg ${baseAttrs}>${path}<text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">${label}</text></svg>`;
    }

    const RADIUS = 16;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    function getProgressHtml(progress) {
        /* Same as before */
        const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
        return `<div class="progress-container"><svg class="progress-ring" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="${RADIUS}" fill="none" stroke-width="3" stroke="rgba(76, 155, 14, 0.2)" /><circle class="progress-ring-fill" cx="20" cy="20" r="${RADIUS}" fill="none" stroke-width="3" stroke="#4c9b0e" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${offset}" stroke-linecap="round" /></svg><span class="progress-text">${Math.round(progress)}%</span></div>`;
    }

    // --- Main Plugin Logic ---
    $.fn.fileUploader = function (options) {
        const settings = $.extend({
            onChange: null,
            defaultValue: null // [NEW] Accept existing image URL
        }, options);

        return this.each(function () {
            const $originalInput = $(this);
            const isMultiple = settings.multiple !== undefined
                ? !!settings.multiple
                : ($originalInput.attr('multiple') !== undefined || $originalInput.prop('multiple') === true);

            // Cleanup: Agar pehle se initialize hai to purana UI hatao
            if ($originalInput.parent().hasClass('uploader-container')) {
                $originalInput.parent().find('.upload-area, .files-list').remove();
                $originalInput.unwrap();
                $originalInput.css('display', 'block');
            }

            $originalInput.wrap('<div class="uploader-container"></div>');
            const $container = $originalInput.parent();
            $originalInput.css('display', 'none');

            const uiHtml = `
        <div class="upload-area">
          <div class="upload-content">
            <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <h2 class="upload-title">Drag ${isMultiple ? "files" : "file"} here</h2><p class="upload-subtitle">or click to browse</p>
          </div>
        </div>
        <div class="files-list"></div>
      `;

            $originalInput.after(uiHtml);
            const $uploadArea = $container.find('.upload-area');
            const $filesList = $container.find('.files-list');
            let uploadedFiles = {};

            //Handle Default Value (Server Image)
            if (settings.defaultValue) {
                const id = "server-file-" + Math.random().toString(36).substr(2, 9);
                // Mock File Object
                const fileObj = {
                    id: id,
                    file: { name: "Existing Image", size: 0, type: "image/jpeg" }, // Dummy details
                    type: 'image',
                    progress: 100,
                    preview: settings.defaultValue,
                    isServerFile: true
                };
                uploadedFiles[id] = fileObj;
                renderFileItem(fileObj);
            }

            // ... Event Handlers (Click, Change, Drop)
            $uploadArea.on('click', function () { $originalInput.trigger('click'); });

            $originalInput.on('change', function (e) {
                handleFiles(this.files);
                $(this).val('');
            });

            $uploadArea.on('dragover', function (e) { e.preventDefault(); e.stopPropagation(); $(this).addClass('drag-over'); });
            $uploadArea.on('dragleave drop', function (e) { e.preventDefault(); e.stopPropagation(); $(this).removeClass('drag-over'); });
            $uploadArea.on('drop', function (e) { handleFiles(e.originalEvent.dataTransfer.files); });

            $filesList.on('click', '.remove-btn', function (e) {
                e.stopPropagation();
                removeFile($(this).data('id'));
            });

            function handleFiles(fileList) {
                let filesArr = Array.from(fileList);
                // Clear previous if single mode
                if (!isMultiple) {
                    Object.keys(uploadedFiles).forEach(id => removeFile(id, true));
                }

                filesArr.forEach(file => {
                    if (!file.type.startsWith('image/') && !file.type.includes('pdf') && !file.type.includes('document')) {
                        alert("Invalid file type"); return;
                    }
                    const id = Math.random().toString(36).substr(2, 9);
                    const isImg = file.type.startsWith('image/');

                    const fileObj = {
                        id: id,
                        file: file,
                        type: isImg ? 'image' : 'document',
                        progress: 0,
                        preview: isImg ? URL.createObjectURL(file) : null
                    };

                    uploadedFiles[id] = fileObj;
                    renderFileItem(fileObj);
                    simulateUpload(id);
                });

                triggerCallback();
            }

            function renderFileItem(fileObj) {
                // [MODIFIED] Show simplified details for server files
                const sizeKB = fileObj.isServerFile ? "Existing" : (fileObj.file.size / 1024).toFixed(2) + " KB";
                let previewContent;

                if (fileObj.type === 'image') {
                    previewContent = `<img src="${fileObj.preview}" alt="${fileObj.file.name}" class="thumbnail" />`;
                } else {
                    previewContent = `<div class="document-icon">${getFileIcon(fileObj.file.type)}</div>`;
                }

                const itemHtml = `
                  <div class="file-item" id="file-${fileObj.id}">
                    <div class="file-preview">
                      ${previewContent}
                      ${!fileObj.isServerFile ? `<div class="progress-overlay" id="prog-overlay-${fileObj.id}">${getProgressHtml(fileObj.progress)}</div>` : ''}
                    </div>
                    <div class="file-details">
                      <p class="file-name" title="${fileObj.file.name}">${fileObj.file.name}</p>
                      <p class="file-size">${sizeKB}</p>
                    </div>
                    <button class="remove-btn" data-id="${fileObj.id}" ${!fileObj.isServerFile && fileObj.progress < 100 ? 'style="display:none;"' : ''}>×</button>
                  </div>
                `;
                $filesList.append(itemHtml);
            }

            function simulateUpload(id) {
                const fileObj = uploadedFiles[id];
                if (!fileObj) return;

                fileObj.interval = setInterval(() => {
                    fileObj.progress += Math.random() * 30;
                    if (fileObj.progress > 100) fileObj.progress = 100;
                    updateProgressUI(id, fileObj.progress);
                    if (fileObj.progress >= 100) {
                        clearInterval(fileObj.interval);
                        completeUpload(id);
                    }
                }, 200); // Faster simulation
            }

            function updateProgressUI(id, progress) {
                const $item = $(`#file-${id}`);
                const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;
                $item.find('.progress-ring-fill').css('stroke-dashoffset', offset);
                $item.find('.progress-text').text(Math.round(progress) + '%');
            }

            function completeUpload(id) {
                const $item = $(`#file-${id}`);
                $item.find('.progress-overlay').fadeOut(200);
                $item.find('.remove-btn').fadeIn(200);
                triggerCallback();
            }

            function removeFile(id, silent = false) {
                if (uploadedFiles[id]) {
                    clearInterval(uploadedFiles[id].interval);
                    if (uploadedFiles[id].preview && !uploadedFiles[id].isServerFile) {
                        URL.revokeObjectURL(uploadedFiles[id].preview);
                    }
                    delete uploadedFiles[id];
                    $(`#file-${id}`).remove();
                    if (!silent) triggerCallback();
                }
            }

            function triggerCallback() {
                if (typeof settings.onChange === 'function') {
                    // Return only NEW files (exclude server files)
                    const newFiles = Object.values(uploadedFiles)
                        .filter(f => !f.isServerFile)
                        .map(f => f.file);
                    settings.onChange(newFiles);
                }
            }
        });
    };
})(jQuery);


// [NEW] Helper to initialize uploader for a specific input
function initUploader(selector, contextKey, fileKey, existingUrl = null) {
    const $input = $(selector);
    const isMultiple = $input.attr('multiple') !== undefined || $input.prop('multiple') === true;

    // Construct Full URL if path exists
    let fullPath = null;
    if (existingUrl && existingUrl.length > 0) {
        // Agar path me "http" nahi hai toh base URL add karo
        fullPath = existingUrl;
    }

    $input.fileUploader({
        multiple: isMultiple,
        defaultValue: fullPath, // [NEW] Pass the image URL
        onChange: function (files) {
            if (!selectedFiles[contextKey]) selectedFiles[contextKey] = {};
            if (isMultiple) {
                selectedFiles[contextKey][fileKey] = Array.isArray(files) ? files : (files ? [files] : []);
            } else {
                selectedFiles[contextKey][fileKey] = (files && files.length > 0) ? files[0] : null;
            }
        }
    });
}