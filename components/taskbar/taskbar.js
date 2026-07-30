import { StartMenu } from "./startMenu/startMenu.js";
import { Calendar } from "./calendar/calendar.js";
import { Task } from "../task/task.js";

/**
 * Monta a barra inferior e sincroniza seus botões com as tarefas abertas.
 */
export class Taskbar {
    static #instance = null;
    static #context = null;
    static #taskbarTemplateCache = null;
    static #taskButtons = new Map();
    static #taskObserverConfigured = false;

    /**
     * Cria a barra de tarefas, o menu iniciar e o calendário.
     */
    static async getTaskbar(container) {
        if (Taskbar.#instance) {
            return Taskbar.#instance;
        }

        if (!(container instanceof HTMLElement)) {
            throw new TypeError("A valid taskbar container is required.");
        }

        const wrapper = document.createElement("div");

        wrapper.innerHTML = await Taskbar.#loadTaskbarTemplate();

        const taskbarElement = wrapper.firstElementChild;

        if (!(taskbarElement instanceof HTMLElement)) {
            throw new Error("O template da barra de tarefas é inválido.");
        }

        const clock = taskbarElement.querySelector("#taskbar-clock");
        const taskContainer = taskbarElement.querySelector("#taskbar-apps");
        const startButton = taskbarElement.querySelector("#taskbar-start-button");
        const calendarButton = taskbarElement.querySelector("#taskbar-calendar-button");

        if (
            !(clock instanceof HTMLElement) ||
            !(taskContainer instanceof HTMLElement) ||
            !(startButton instanceof HTMLButtonElement) ||
            !(calendarButton instanceof HTMLButtonElement)
        ) {
            throw new Error("A estrutura da barra de tarefas está incompleta.");
        }

        Taskbar.#context = container;
        Taskbar.#instance = taskbarElement;

        Taskbar.#updateTime(clock);
        Taskbar.#configureTaskObserver(taskContainer);

        Taskbar.#instance.appendChild(await StartMenu.configInstance(startButton));
        Taskbar.#instance.appendChild(await Calendar.configureInstance(calendarButton));
        Taskbar.#context.appendChild(Taskbar.#instance);

        return Taskbar.#instance;
    }

    /**
     * Carrega e armazena o HTML da barra para reutilização.
     */
    static async #loadTaskbarTemplate() {
        if (Taskbar.#taskbarTemplateCache) {
            return Taskbar.#taskbarTemplateCache;
        }

        const response = await fetch("./components/taskbar/taskbar.html");

        if (!response.ok) {
            throw new Error(`Não foi possível carregar a barra de tarefas: ${response.status}`);
        }

        Taskbar.#taskbarTemplateCache = await response.text();
        return Taskbar.#taskbarTemplateCache;
    }

    /**
     * Escuta os eventos das tarefas para criar, remover e destacar botões.
     */
    static #configureTaskObserver(taskContainer) {
        if (Taskbar.#taskObserverConfigured) return;

        Taskbar.#taskObserverConfigured = true;

        Task.subscribe("task:opened", ({ task }) => {
            Taskbar.#addTaskButton(taskContainer, task);
            Taskbar.#updateActiveTask();
        });

        Task.subscribe("task:closed", ({ task }) => {
            Taskbar.#removeTaskButton(task);
            Taskbar.#updateActiveTask();
        });

        Task.subscribe("task:focused", () => Taskbar.#updateActiveTask());
        Task.subscribe("task:minimized", () => Taskbar.#updateActiveTask());
        Task.subscribe("task:restored", () => Taskbar.#updateActiveTask());

        Task.getOpenTasks().forEach(task => {
            Taskbar.#addTaskButton(taskContainer, task);
        });

        Taskbar.#updateActiveTask();
    }

    /** Cria o botão correspondente a uma tarefa aberta. */
    static #addTaskButton(taskContainer, task) {
        if (Taskbar.#taskButtons.has(task.taskID)) return;

        const button = document.createElement("button");
        const icon = document.createElement("img");
        const taskIcon = task.taskIcon;

        button.type = "button";
        button.classList.add("interface-button", "taskbar-task-button");
        button.dataset.taskId = task.taskID;
        button.title = task.taskTitle;
        button.setAttribute("aria-label", task.taskTitle || "Tarefa aberta");

        icon.alt = taskIcon.alt;
        if (taskIcon.src) icon.src = taskIcon.src;

        button.appendChild(icon);
        button.addEventListener("click", () => task.focusTask());

        Taskbar.#taskButtons.set(task.taskID, button);
        taskContainer.appendChild(button);
    }

    /** Remove da barra o botão de uma tarefa encerrada. */
    static #removeTaskButton(task) {
        const button = Taskbar.#taskButtons.get(task.taskID);

        button?.remove();
        Taskbar.#taskButtons.delete(task.taskID);
    }

    /** Atualiza o relevo visual do botão da tarefa ativa. */
    static #updateActiveTask() {
        Task.getOpenTasks().forEach(task => {
            const button = Taskbar.#taskButtons.get(task.taskID);
            if (!button) return;

            button.classList.toggle("taskbar-task-button-active", task.taskActive);
            button.setAttribute("aria-pressed", String(task.taskActive));
        });
    }

    /** Formata a hora atual no padrão HH:MM. */
    static #timeFormat(date) {
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${hours}:${minutes}`;
    }

    /** Atualiza continuamente o relógio da barra. */
    static #updateTime(clock) {
        clock.innerText = Taskbar.#timeFormat(new Date());
        setTimeout(() => Taskbar.#updateTime(clock), 1000);
    }
}
