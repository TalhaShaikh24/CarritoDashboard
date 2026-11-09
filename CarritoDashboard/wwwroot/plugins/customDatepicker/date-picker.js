(function ($) {

    /* =========================================================
       DATE RANGE PICKER PLUGIN
    ========================================================= */
    $.fn.dateRangePicker = function (options) {

        const settings = $.extend({
            initialStart: null,
            initialEnd: null,
            onSelect: function () { },
            onCancel: function () { },
            buttonText: '📅 Select Date Range'
        }, options);

        const MONTHS = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        return this.each(function () {

            const $trigger = $(this);

            // Store original button text/content
            const originalContent = $trigger.html();

            const today = new Date();
            let startDate = settings.initialStart ? new Date(settings.initialStart) : null;
            let endDate = settings.initialEnd ? new Date(settings.initialEnd) : null;
            let activePreset = "Custom";

            if (startDate && endDate) {
                const diffDays = Math.round((today - startDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 28 && diffDays <= 31) {
                    activePreset = "Last 30 Days";
                }
            }

            // Independent month state for each calendar side
            let leftMonth, rightMonth;
            function syncMonthsFromDates() {
                if (startDate && endDate) {
                    leftMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                    rightMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                    if (leftMonth.getTime() === rightMonth.getTime()) {
                        leftMonth = addMonths(rightMonth, -1);
                    }
                } else if (startDate) {
                    leftMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                    rightMonth = addMonths(leftMonth, 1);
                } else {
                    rightMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    leftMonth = addMonths(rightMonth, -1);
                }
            }
            syncMonthsFromDates();

            // Create wrapper for positioning
            $trigger.wrap('<div class="datepicker-dropdown-wrapper"></div>');
            const $wrapper = $trigger.parent();

            // Create popup structure dynamically
            const popupId = 'datepicker-popup-' + Math.random().toString(36).substr(2, 9);
            const $popup = $(`
        <div class="datepicker-popup" id="${popupId}" style="display:none;">
          <div class="datepicker-overlay"></div>
          <div class="datepicker-content">
            <div class="datepicker-inner"></div>
          </div>
        </div>
      `).appendTo($wrapper);

            const $pickerContainer = $popup.find('.datepicker-inner');

            /* ---------- Helpers ---------- */

            function format(d) {
                return d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
            }

            function sameDay(a, b) {
                return a && b && a.toDateString() === b.toDateString();
            }

            function addMonths(d, m) {
                const day = d.getDate();
                const target = new Date(d.getFullYear(), d.getMonth() + m, 1);
                const maxDaysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
                target.setDate(Math.min(day, maxDaysInTarget));
                return target;
            }

            function updateTrigger() {
                if (startDate && endDate) {
                    const $text = $trigger.find('.date-text');
                    if ($text.length) {
                        $text.text(`${format(startDate)} - ${format(endDate)}`);
                    } else {
                        $trigger.html(`📅 <span class="date-text">${format(startDate)} - ${format(endDate)}</span>`);
                    }
                } else {
                    $trigger.html(originalContent);
                }
            }

            function openPicker() {
                syncMonthsFromDates();
                render();
                $popup.fadeIn(150);
            }

            function closePicker() {
                $popup.fadeOut(150);
            }

            /* ---------- Calendar Builder ---------- */

            function buildCalendar(month) {
                const start = new Date(month.getFullYear(), month.getMonth(), 1);
                const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

                const gridStart = new Date(start);
                gridStart.setDate(gridStart.getDate() - gridStart.getDay());

                const gridEnd = new Date(end);
                gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

                let html = `
          <div class="calendar-header">
            <button type="button" class="nav-button prev">&#8249;</button>
            <span class="month-year">${MONTHS[month.getMonth()]} ${month.getFullYear()}</span>
            <button type="button" class="nav-button next">&#8250;</button>
          </div>

          <div class="days-grid">
            ${["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => `<div class="day-name">${d}</div>`).join("")}
          </div>
        `;

                let day = new Date(gridStart);

                while (day <= gridEnd) {
                    html += `<div class="days-grid">`;

                    for (let i = 0; i < 7; i++) {
                        const muted = day.getMonth() !== month.getMonth();
                        const rs = sameDay(day, startDate);
                        const re = sameDay(day, endDate);
                        const ir = startDate && endDate && day > startDate && day < endDate;

                        html += `
              <div class="day-cell
                ${muted ? "muted" : ""}
                ${rs ? "range-start" : ""}
                ${re ? "range-end" : ""}
                ${ir ? "in-range" : ""}"
                data-date="${day.toISOString()}">
                <span>${day.getDate()}</span>
              </div>
            `;
                        day.setDate(day.getDate() + 1);
                    }
                    html += `</div>`;
                }
                return html;
            }

            /* ---------- Render ---------- */

            function render() {
                $pickerContainer.html(`
          <div class="date-picker-container">

            <div class="date-picker-sidebar">
              ${["Today", "Last 30 Days", "Last 3 Months", "Last Year", "Custom"]
                        .map(p => `<div class="sidebar-item ${p === activePreset ? "active" : ""}" data-preset="${p}">${p}</div>`)
                        .join("")}
            </div>

            <div class="date-picker-main">

              <div class="calendars-wrapper">
                <div class="calendar-section left"></div>
                <div class="calendar-section right"></div>
              </div>

              <div class="date-picker-footer">
                <div class="selected-range-display">
                  <div class="date-input">${startDate ? format(startDate) : "Start Date"}</div>
                  <span>to</span>
                  <div class="date-input">${endDate ? format(endDate) : "End Date"}</div>
                </div>

                <div class="footer-actions">
                  <button type="button" class="btn-cancel">Cancel</button>
                  <button type="button" class="btn-set">Set Date</button>
                </div>
              </div>

            </div>
          </div>
        `);

                $pickerContainer.find(".calendar-section.left").html(buildCalendar(leftMonth));
                $pickerContainer.find(".calendar-section.right").html(buildCalendar(rightMonth));
            }

            /* ---------- Events ---------- */

            // Prevent clicks inside popup content from bubbling to document (which closes the picker)
            $popup.find('.datepicker-content').on("click", function (e) {
                e.stopPropagation();
            });

            $pickerContainer.on("click", ".day-cell", function (e) {
                e.preventDefault();
                e.stopPropagation();
                const d = new Date($(this).data("date"));

                if (!startDate || (startDate && endDate)) {
                    startDate = d;
                    endDate = null;
                } else if (d < startDate) {
                    startDate = d;
                    endDate = null;
                } else {
                    endDate = d;
                }
                activePreset = "Custom";
                render();
            });

            $pickerContainer.on("click", ".sidebar-item", function (e) {
                e.preventDefault();
                e.stopPropagation();
                activePreset = $(this).data("preset");
                const now = new Date();

                if (activePreset === "Today") {
                    startDate = new Date(now);
                    endDate = new Date(now);
                    rightMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    leftMonth = addMonths(rightMonth, -1);
                }
                if (activePreset === "Last 30 Days") {
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 30);
                    endDate = new Date(now);
                    rightMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    leftMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                    if (leftMonth.getTime() === rightMonth.getTime()) {
                        leftMonth = addMonths(rightMonth, -1);
                    }
                }
                if (activePreset === "Last 3 Months") {
                    startDate = addMonths(now, -3);
                    endDate = new Date(now);
                    rightMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    leftMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                }
                if (activePreset === "Last Year") {
                    startDate = addMonths(now, -12);
                    endDate = new Date(now);
                    rightMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    leftMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                }
                render();
            });

            // Month navigation: moves ONLY the clicked calendar by 1 month
            $pickerContainer.on("click", ".calendar-section.left .prev", function (e) {
                e.preventDefault();
                e.stopPropagation();
                leftMonth = addMonths(leftMonth, -1);
                render();
            });

            $pickerContainer.on("click", ".calendar-section.left .next", function (e) {
                e.preventDefault();
                e.stopPropagation();
                leftMonth = addMonths(leftMonth, 1);
                if (leftMonth.getTime() >= rightMonth.getTime()) {
                    rightMonth = addMonths(leftMonth, 1);
                }
                render();
            });

            $pickerContainer.on("click", ".calendar-section.right .prev", function (e) {
                e.preventDefault();
                e.stopPropagation();
                rightMonth = addMonths(rightMonth, -1);
                if (rightMonth.getTime() <= leftMonth.getTime()) {
                    leftMonth = addMonths(rightMonth, -1);
                }
                render();
            });

            $pickerContainer.on("click", ".calendar-section.right .next", function (e) {
                e.preventDefault();
                e.stopPropagation();
                rightMonth = addMonths(rightMonth, 1);
                render();
            });

            $pickerContainer.on("click", ".btn-set", function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (startDate && endDate) {
                    updateTrigger();
                    settings.onSelect({ start: startDate, end: endDate });
                    closePicker();
                }
            });

            $pickerContainer.on("click", ".btn-cancel", function (e) {
                e.preventDefault();
                e.stopPropagation();
                settings.onCancel();
                closePicker();
            });

            // Trigger button click
            $trigger.on("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                $popup.is(":visible") ? closePicker() : openPicker();
            });

            // Close on overlay click
            $popup.find('.datepicker-overlay').on("click", function (e) {
                e.stopPropagation();
                closePicker();
            });

            // Close on outside click
            $(document).on("click", function (e) {
                // If the target element was detached/re-rendered during event dispatch, ignore
                if (!document.body.contains(e.target)) return;
                if (!$(e.target).closest($popup).length && !$(e.target).closest($trigger).length) {
                    closePicker();
                }
            });

            // Initial render
            render();
            updateTrigger();
        });
    };

})(jQuery);
