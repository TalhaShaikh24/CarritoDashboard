(function ($) {
    $.fn.customSelect = function (methodOrOptions) {
        const methods = {
            init: function (options) {
                return this.each(function () {
                    const $nativeSelect = $(this);
                    if ($nativeSelect.data('customSelect')) return;

                    const settings = $.extend({
                        placeholder: 'Select option(s)',
                        searchableThreshold: 7,
                        searchable: false,
                        multiple: false,
                        maxSelections: null,
                        onChange: null
                    }, methodOrOptions || {});

                    if ($nativeSelect.prop('multiple')) {
                        settings.multiple = true;
                    }

                    const $wrapper = $('<div class="custom-select-wrapper"></div>');
                    const $trigger = $(`
            <div class="custom-select-trigger ${settings.multiple ? 'multiple' : ''}">
              <div class="selected-items"></div>
              <span class="placeholder">${settings.placeholder}</span>
              <div class="select-arrow">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          `);

                    const $selectedItems = $trigger.find('.selected-items');
                    const $placeholder = $trigger.find('.placeholder');

                    const $dropdown = $('<div class="custom-select-dropdown"></div>');
                    const $searchWrapper = $('<div class="custom-select-search" style="display:none;"></div>');
                    const $searchInput = $('<input type="text" placeholder="Search..." class="custom-select-search-input" />');
                    $searchWrapper.append($searchInput);
                    const $optionsContainer = $('<div class="custom-select-options"></div>');

                    $dropdown.append($searchWrapper).append($optionsContainer);
                    $wrapper.append($trigger).append($dropdown);
                    $nativeSelect.after($wrapper).hide();

                    let allOptions = [];
                    let selectedValues = [];

                    const updateTrigger = () => {
                        $selectedItems.empty();

                        if (settings.multiple) {
                            selectedValues.forEach(val => {
                                const opt = allOptions.find(o => o.value == val);
                                if (opt) {
                                    const $tag = $(`
                    <span class="select-tag">
                      ${opt.text}
                      <span class="tag-remove">×</span>
                    </span>
                  `);
                                    $tag.find('.tag-remove').on('click', function (e) {
                                        e.stopPropagation();
                                        removeValue(val);
                                    });
                                    $selectedItems.append($tag);
                                }
                            });

                            $placeholder.toggle(selectedValues.length === 0);
                        } else {
                            const selectedOpt = allOptions.find(o => o.selected);
                            const text = selectedOpt ? selectedOpt.text : settings.placeholder;
                            $placeholder.text(text).toggleClass('placeholder', !selectedOpt);
                        }
                    };

                    const removeValue = (value) => {
                        selectedValues = selectedValues.filter(v => v != value);
                        syncToNative();
                        updateTrigger();
                        buildOptions($searchInput.val());
                        if (settings.onChange) {
                            settings.onChange.call($nativeSelect[0], selectedValues, getSelectedTexts());
                        }
                    };

                    const addValue = (value) => {
                        if (settings.multiple) {
                            if (settings.maxSelections && selectedValues.length >= settings.maxSelections) return;
                            if (!selectedValues.includes(value)) {
                                selectedValues.push(value);
                            }
                        } else {
                            selectedValues = value ? [value] : [];
                        }
                        syncToNative();
                        updateTrigger();
                        buildOptions($searchInput.val());
                        if (settings.onChange) {
                            settings.onChange.call($nativeSelect[0], selectedValues, getSelectedTexts());
                        }
                    };

                    const getSelectedTexts = () => {
                        return selectedValues.map(val => {
                            const opt = allOptions.find(o => o.value == val);
                            return opt ? opt.text : '';
                        });
                    };

                    const syncToNative = () => {
                        if (settings.multiple) {
                            $nativeSelect.val(selectedValues);
                        } else {
                            $nativeSelect.val(selectedValues[0] || '');
                        }
                        $nativeSelect.trigger('change');
                    };

                    const buildOptions = (filterTerm = '') => {
                        $optionsContainer.empty();
                        const term = filterTerm.toLowerCase();
                        let visible = allOptions.filter(o => o.value !== ''); // skip placeholder

                        // FIXED: Filter whenever there's a search term
                        if (filterTerm) {
                            visible = visible.filter(o => o.text.toLowerCase().includes(term));
                        }

                        if (visible.length === 0) {
                            $optionsContainer.append('<div class="custom-select-option disabled">No options found</div>');
                            return;
                        }

                        visible.forEach((opt, i) => {
                            const isSelected = selectedValues.includes(opt.value);
                            const $opt = $(`
                <div class="custom-select-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">
                  ${settings.multiple ? '<input type="checkbox" ' + (isSelected ? 'checked' : '') + ' disabled>' : ''}
                  <span>${opt.text}</span>
                </div>
              `);
                            $optionsContainer.append($opt);
                            if (i < visible.length - 1) {
                                $optionsContainer.append('<div class="option-divider"></div>');
                            }
                        });
                    };

                    const refreshOptions = () => {
                        allOptions = [];
                        selectedValues = [];

                        $nativeSelect.find('option').each(function () {
                            const $opt = $(this);
                            const val = $opt.val();
                            const text = $opt.text();
                            const selected = $opt.is(':selected');

                            allOptions.push({ value: val, text: text, selected });

                            if (selected && val !== '') {
                                selectedValues.push(val);
                            }
                        });

                        // Show search if many options OR if explicitly enabled
                        const realOptionsCount = allOptions.filter(o => o.value !== '').length;

                        if (settings.searchable === true || settings.searchableThreshold === 0 || realOptionsCount >= settings.searchableThreshold || $nativeSelect.data('search') === true || $nativeSelect.attr('data-search') === 'true') {
                            $searchWrapper.show();
                        } else {
                            $searchWrapper.hide();
                        }

                        updateTrigger();
                        buildOptions();
                    };

                    // Initial load
                    refreshOptions();

                    // Trigger click
                    $trigger.on('click.customSelect', function (e) {
                        if ($nativeSelect.prop('disabled')) return;

                        $('.custom-select-dropdown.open').not($dropdown).removeClass('open');
                        $('.custom-select-trigger.open').not($trigger).removeClass('open');

                        const isOpen = $dropdown.hasClass('open');
                        $dropdown.toggleClass('open', !isOpen);
                        $trigger.toggleClass('open', !isOpen);

                        if (!isOpen && $searchWrapper.is(':visible')) {
                            setTimeout(() => $searchInput.focus(), 50);
                        }
                    });

                    // Option click
                    $optionsContainer.on('click.customSelect', '.custom-select-option:not(.disabled)', function () {
                        const value = $(this).data('value').toString();

                        if (settings.multiple) {
                            if (selectedValues.includes(value)) {
                                removeValue(value);
                            } else {
                                addValue(value);
                            }
                        } else {
                            addValue(value);
                            $dropdown.removeClass('open');
                            $trigger.removeClass('open');
                        }

                        $searchInput.val('');
                        buildOptions(); // Reset filter after selection
                    });

                    // Search
                    $searchInput.on('input.customSelect', function () {
                        buildOptions($(this).val());
                    });

                    // Backspace to remove last tag
                    $searchInput.on('keydown.customSelect', function (e) {
                        if (e.key === 'Backspace' && !$(this).val() && settings.multiple && selectedValues.length > 0) {
                            removeValue(selectedValues[selectedValues.length - 1]);
                        }
                    });

                    // Outside click
                    $(document).on('click.customSelect', function (e) {
                        if (!$(e.target).closest($wrapper).length) {
                            $dropdown.removeClass('open');
                            $trigger.removeClass('open');
                            $searchInput.val('');
                            buildOptions();
                        }
                    });

                    // Native change
                    $nativeSelect.on('change.customSelect', refreshOptions);

                    const instance = {
                        $nativeSelect,
                        $wrapper,
                        settings,
                        refresh: refreshOptions,
                        updateTrigger,
                        buildOptions
                    };

                    $nativeSelect.data('customSelect', instance);
                    $wrapper.data('customSelect', instance);
                });
            },

            reset: function () {
                return this.each(function () {
                    const instance = $(this).data('customSelect');
                    if (!instance) return;
                    instance.$nativeSelect.val(instance.settings.multiple ? [] : '').trigger('change');
                });
            },

            destroy: function () {
                return this.each(function () {
                    const instance = $(this).data('customSelect');
                    if (!instance) return;

                    $(document).off('click.customSelect');
                    instance.$nativeSelect.off('.customSelect');
                    instance.$wrapper.find('*').off('.customSelect');
                    instance.$wrapper.remove();
                    instance.$nativeSelect.show().removeData('customSelect');
                });
            },

            refresh: function () {
                return this.each(function () {
                    const instance = $(this).data('customSelect');
                    if (instance && instance.refresh) instance.refresh();
                });
            },

            val: function (value) {
                if (value === undefined) {
                    const instance = this.first().data('customSelect');
                    return instance ? instance.$nativeSelect.val() : this.val();
                } else {
                    this.each(function () {
                        const instance = $(this).data('customSelect');
                        if (instance) {
                            if (instance.settings.multiple) {
                                instance.$nativeSelect.val(Array.isArray(value) ? value : [value]);
                            } else {
                                instance.$nativeSelect.val(value);
                            }
                            instance.$nativeSelect.trigger('change');
                        } else {
                            $(this).val(value);
                        }
                    });
                    return this;
                }
            }
        };

        if (methods[methodOrOptions]) {
            return methods[methodOrOptions].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof methodOrOptions === 'object' || !methodOrOptions) {
            return methods.init.apply(this, arguments);
        }
    };
})(jQuery);

$(function () {
    $('select[data-custom-select]').each(function () {
        const $el = $(this);

        const options = {
            placeholder: $el.data('placeholder') || 'Select option(s)',
            maxSelections: $el.data('max') || null,
            searchableThreshold: 7
        };

        $el.customSelect(options);
    });
});



/*

// Initialize
$('#country').customSelect({
  onChange: function(value, text) {
    console.log('Selected:', value, text);
  }
});

// Reset (clear selection)
$('#country').customSelect('reset');

// Refresh (if you changed options dynamically)
$('#country').append('<option value="new">New Country</option>');
$('#country').customSelect('refresh');

// Get/Set value
console.log($('#country').customSelect('val'));        // get
$('#country').customSelect('val', 'us');               // set

// Completely destroy (original select wapas aa jayega)
$('#country').customSelect('destroy');





$('.custom-select').customSelect({
  multiple: true,           // ya <select multiple> use karo
  maxSelections: 5,         // optional limit
  onChange: function(values, texts) {
    console.log('Selected:', values, texts);
  }
});

// Set value
$('#multi').customSelect('val', ['1', '3']);


*/