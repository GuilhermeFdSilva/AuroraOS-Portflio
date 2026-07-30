/**
 * Controla o calendário exibido a partir da barra de tarefas.
 */
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


    /**
     * Cria o calendário e registra seus controles de abertura e navegação.
     */
    static async configureInstance(calendarButton) {
        if (Calendar.#calendar) {
            return Calendar.#calendar;
        }

        if (!(calendarButton instanceof HTMLButtonElement)) {
            throw new TypeError("A valid calendar button is required.");
        }

        Calendar.#calendar = await Calendar.#loadCalendar();
        Calendar.#calendarButton = calendarButton;
        Calendar.#calendarButton.setAttribute("aria-expanded", "false");

        Calendar.#calendarButton.addEventListener("click", event => {
            event.stopPropagation();
            Calendar.#switchCalendarVisibility();
        });

        document.addEventListener("click", event => {
            if (!(event.target instanceof Node)) return;

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

    /** Retorna o botão que controla o calendário. */
    static getInstance() {
        if (!Calendar.#calendarButton) {
            throw new Error("Calendar instance not created yet.");
        }

        return Calendar.#calendarButton;
    }

    /** Carrega e mantém em cache o template do calendário. */
    static async #loadCalendarTemplate() {
        if (Calendar.#calendarTemplateCache) {
            return Calendar.#calendarTemplateCache;
        }

        const response = await fetch("./components/taskbar/calendar/calendar.html");

        if (!response.ok) {
            throw new Error(`Não foi possível carregar o calendário: ${response.status}`);
        }

        Calendar.#calendarTemplateCache = await response.text();
        return Calendar.#calendarTemplateCache;
    }

    /** Monta o elemento do calendário e encontra seus controles internos. */
    static async #loadCalendar() {
        const wrapper = document.createElement("div");

        wrapper.innerHTML = await Calendar.#loadCalendarTemplate();

        Calendar.#calendarContainer = wrapper.firstElementChild;

        if (!(Calendar.#calendarContainer instanceof HTMLElement)) {
            throw new Error("O template do calendário é inválido.");
        }

        Calendar.#monthsYearField = Calendar.#calendarContainer.querySelector("#month-year");
        Calendar.#containerDates = Calendar.#calendarContainer.querySelector("#container-dates");
        Calendar.#calendarButtonUp = Calendar.#calendarContainer.querySelector("#calendar-button-up");
        Calendar.#calendarButtonDown = Calendar.#calendarContainer.querySelector("#calendar-button-down");

        if (
            !(Calendar.#monthsYearField instanceof HTMLElement) ||
            !(Calendar.#containerDates instanceof HTMLElement) ||
            !(Calendar.#calendarButtonUp instanceof HTMLButtonElement) ||
            !(Calendar.#calendarButtonDown instanceof HTMLButtonElement)
        ) {
            throw new Error("A estrutura do calendário está incompleta.");
        }

        return Calendar.#calendarContainer;
    }

    /** Cria o cabeçalho com as iniciais dos dias da semana. */
    static #setDaysOfWeek() {
        Calendar.#daysWeek.forEach((dayInitial, index) => {
            const dayOfWeek = document.createElement("p");

            dayOfWeek.classList.add("day-field");
            dayOfWeek.classList.add(index === 0 || index === 6 ? "weekend" : "week");
            dayOfWeek.textContent = dayInitial;
            Calendar.#containerDates.appendChild(dayOfWeek);
        });
    }

    /** Preenche as 42 posições do calendário com os dias visíveis. */
    static #updateDays() {
        Calendar.#monthsYearField.textContent = `${Calendar.#months[Calendar.#displayMonth]} - ${Calendar.#displayYear}`;
        Calendar.#containerDates.innerHTML = "";
        Calendar.#setDaysOfWeek();

        let textDay = Calendar.#firstDay === 0
            ? 1
            : Calendar.#previousMonthDays - (Calendar.#firstDay - 1);
        let outsideCurrentMonth = textDay > 1;
        let color = outsideCurrentMonth ? "not-month-day" : "month-day";

        for (let fieldIndex = 0; fieldIndex < 42; fieldIndex++) {
            const day = document.createElement("p");
            const span = document.createElement("span");

            day.appendChild(span);
            day.classList.add("day-field");

            if (outsideCurrentMonth && textDay > Calendar.#previousMonthDays) {
                textDay = 1;
                outsideCurrentMonth = false;
                color = "month-day";
            }

            if (!outsideCurrentMonth && textDay > Calendar.#daysInMonth) {
                textDay = 1;
                outsideCurrentMonth = true;
                color = "not-month-day";
            }

            const isToday = (
                Calendar.#displayMonth === Calendar.#currentMonth &&
                Calendar.#displayYear === Calendar.#currentYear &&
                textDay === Calendar.#today &&
                !outsideCurrentMonth
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

    /** Recalcula quantidade de dias e posição inicial do mês exibido. */
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

    /** Avança um mês, incluindo a troca de ano. */
    static #plusMonth() {
        Calendar.#displayMonth++;

        if (Calendar.#displayMonth > 11) {
            Calendar.#displayMonth = 0;
            Calendar.#displayYear++;
        }

        Calendar.#updateMonthYear();
    }

    /** Retorna um mês, incluindo a troca de ano. */
    static #minusMonth() {
        Calendar.#displayMonth--;

        if (Calendar.#displayMonth < 0) {
            Calendar.#displayMonth = 11;
            Calendar.#displayYear--;
        }

        Calendar.#updateMonthYear();
    }

    /** Alterna a visibilidade do calendário. */
    static #switchCalendarVisibility() {
        Calendar.#calendarVisible = !Calendar.#calendarVisible;
        Calendar.#calendarContainer.style.display = Calendar.#calendarVisible ? "flex" : "none";
        Calendar.#calendarButton.setAttribute(
            "aria-expanded",
            String(Calendar.#calendarVisible)
        );

        if (Calendar.#calendarVisible) {
            Calendar.#resetDay();
        }
    }

    /** Volta a visualização para o mês e dia atuais. */
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
