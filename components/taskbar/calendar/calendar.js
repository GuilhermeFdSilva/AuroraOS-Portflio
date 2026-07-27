export class Calendar {
    static #calendar = null;
    static #calendarButton = null;
    static #calendarVisible = false;
    static #calendarTemplateCache = null;

    static #daysWeek = ["D", "S", "T", "Q", "Q", "S", "S"];
    static #months = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];

    static #now = new Date();
    static #today = Calendar.#now.getDate();
    static #currentMonth = Calendar.#now.getMonth();
    static #currentYear = Calendar.#now.getFullYear();
    static #displayMonth = Calendar.#currentMonth;
    static #displayYear = Calendar.#currentYear;
    static #daysInMonth = 0;
    static #firstDay = 0;
    static #previousMonthDays = 0;

    static #calendarContainer = null;
    static #monthsYearField = null;
    static #containerDates = null;
    static #calendarButtonUp = null;
    static #calendarButtonDown = null;


    static async configureInstance(calendarButton) {
        if (Calendar.#calendar) {
            return Calendar.#calendar;
        }

        if (!(calendarButton instanceof HTMLElement)) {
            throw new TypeError("A valid calendar button is required.");
        }

        Calendar.#calendar = await Calendar.#loadCalendar();
        Calendar.#calendarButton = calendarButton;

        Calendar.#calendarButton.addEventListener("click", event => {
            event.stopPropagation();
            Calendar.#switchCalendarVisibility();
        });

        document.addEventListener("click", event => {
            const clickedOutsideCalendar = !Calendar.#calendar.contains(event.target);
            const clickedOutsideButton = !Calendar.#calendarButton.contains(event.target);

            if (Calendar.#calendarVisible && clickedOutsideCalendar && clickedOutsideButton) {
                Calendar.#switchCalendarVisibility();
            }
        });

        document.addEventListener("keydown", event => {
            if (Calendar.#calendarVisible && event.key === "Escape") {
                Calendar.#switchCalendarVisibility();
            }
        });

        Calendar.#calendarButtonUp.addEventListener("click", event => {
            event.stopPropagation();
            Calendar.#minusMonth();
        });

        Calendar.#calendarButtonDown.addEventListener("click", event => {
            event.stopPropagation();
            Calendar.#plusMonth();
        });

        return Calendar.#calendar;
    }

    static getInstance() {
        if (!Calendar.#calendarButton) {
            throw new Error("Calendar instance not created yet.");
        }

        return Calendar.#calendarButton;
    }

    static async #loadCalendarTemplate() {
        if (Calendar.#calendarTemplateCache) {
            return Calendar.#calendarTemplateCache;
        }

        const response = await fetch("./components/taskbar/calendar/calendar.html");
        Calendar.#calendarTemplateCache = await response.text();

        return Calendar.#calendarTemplateCache;
    }

    static async #loadCalendar() {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = await Calendar.#loadCalendarTemplate();

        Calendar.#calendarContainer = wrapper.firstElementChild;
        Calendar.#monthsYearField = Calendar.#calendarContainer.querySelector("#month-year");
        Calendar.#containerDates = Calendar.#calendarContainer.querySelector("#container-dates");
        Calendar.#calendarButtonUp = Calendar.#calendarContainer.querySelector("#calendar-button-up");
        Calendar.#calendarButtonDown = Calendar.#calendarContainer.querySelector("#calendar-button-down");

        return Calendar.#calendarContainer;
    }

    static #setDaysOfWeek() {
        Calendar.#daysWeek.forEach((dayInitial, index) => {
            const dayOfWeek = document.createElement("p");
            dayOfWeek.classList.add("day-field");
            dayOfWeek.classList.add(index === 0 || index === 6 ? "weekend" : "week");
            dayOfWeek.textContent = dayInitial;

            Calendar.#containerDates.appendChild(dayOfWeek);
        });
    }

    static #updateDays() {
        Calendar.#monthsYearField.innerText = `${Calendar.#months[Calendar.#displayMonth]} - ${Calendar.#displayYear}`;
        Calendar.#containerDates.innerHTML = "";
        Calendar.#setDaysOfWeek();

        let textDay = Calendar.#firstDay === 0
            ? 1
            : Calendar.#previousMonthDays - (Calendar.#firstDay - 1);

        let previousDays = textDay > 1;
        let color = previousDays ? "not-month-day" : "month-day";

        for (let fieldIndex = 0; fieldIndex < 42; fieldIndex++) {
            const day = document.createElement("p");
            const span = document.createElement("span");

            day.appendChild(span);
            day.classList.add("day-field");

            if (previousDays && textDay > Calendar.#previousMonthDays) {
                textDay = 1;
                previousDays = false;
                color = "month-day";
            }

            if (!previousDays && textDay > Calendar.#daysInMonth) {
                textDay = 1;
                previousDays = true;
                color = "not-month-day";
            }

            const isToday = (
                Calendar.#displayMonth === Calendar.#currentMonth &&
                Calendar.#displayYear === Calendar.#currentYear &&
                textDay === Calendar.#today &&
                !previousDays
            );

            if (isToday) {
                day.classList.add("today");
            }

            if (fieldIndex % 7 === 0 || (fieldIndex - 6) % 7 === 0) {
                day.classList.add("weekend-day");
            }

            day.classList.add(color);
            span.textContent = textDay;
            Calendar.#containerDates.appendChild(day);
            textDay++;
        }
    }

    static #updateMonthYear() {
        Calendar.#daysInMonth = new Date(
            Calendar.#displayYear,
            Calendar.#displayMonth + 1,
            0
        ).getDate();

        Calendar.#firstDay = new Date(
            Calendar.#displayYear,
            Calendar.#displayMonth,
            1
        ).getDay();

        Calendar.#previousMonthDays = new Date(
            Calendar.#displayYear,
            Calendar.#displayMonth,
            0
        ).getDate();

        Calendar.#updateDays();
    }

    static #plusMonth() {
        Calendar.#displayMonth++;

        if (Calendar.#displayMonth > 11) {
            Calendar.#displayMonth = 0;
            Calendar.#displayYear++;
        }

        Calendar.#updateMonthYear();
    }

    static #minusMonth() {
        Calendar.#displayMonth--;

        if (Calendar.#displayMonth < 0) {
            Calendar.#displayMonth = 11;
            Calendar.#displayYear--;
        }

        Calendar.#updateMonthYear();
    }

    static #switchCalendarVisibility() {
        Calendar.#calendarVisible = !Calendar.#calendarVisible;
        Calendar.#calendarContainer.style.display = Calendar.#calendarVisible ? "flex" : "none";

        if (Calendar.#calendarVisible) {
            Calendar.#resetDay();
        }
    }

    static #resetDay() {
        Calendar.#now = new Date();
        Calendar.#today = Calendar.#now.getDate();
        Calendar.#currentMonth = Calendar.#now.getMonth();
        Calendar.#currentYear = Calendar.#now.getFullYear();
        Calendar.#displayMonth = Calendar.#currentMonth;
        Calendar.#displayYear = Calendar.#currentYear;

        Calendar.#updateMonthYear();
    }
}
