import { DragManager } from "./draggable/draggable.js";

/**
 * Classe base das janelas e diálogos exibidos como tarefas.
 */
export class Task {
    static #context = null;
    static #openTasks = [];
    static #nextTaskId = 0;
    static #zIndex = 0;
    static #observers = new Map();
    static #dragManager = null;

    #taskID = "";
    #taskTitle = "";
    #taskIcon = { src: "", alt: "icon" };
    #taskActive = false;
    #taskMinimized = false;
    #taskZIndex = 0;
    #taskElement = null;
    #focusHandler = null;
    #closeHandlers = [];

    /** Define o desktop compartilhado e prepara o gerenciador de arraste. */
    constructor(context) {
        if (!Task.#context) {
            if (!(context instanceof HTMLElement)) {
                throw new Error("The application context can't be NULL.");
            }

            Task.#context = context;
        }

        Task.#configureDragManager();
    }

    get taskID() {
        return this.#taskID;
    }

    get taskTitle() {
        return this.#taskTitle;
    }

    get taskIcon() {
        return { ...this.#taskIcon };
    }

    get taskActive() {
        return this.#taskActive;
    }

    get taskZIndex() {
        return this.#taskZIndex;
    }

    get taskMinimized() {
        return this.#taskMinimized;
    }

    /** Registra um observador para um evento de tarefa. */
    static subscribe(eventName, observer) {
        if (typeof observer !== "function") {
            throw new TypeError("The observer must be a function.");
        }

        if (!Task.#observers.has(eventName)) {
            Task.#observers.set(eventName, new Set());
        }

        Task.#observers.get(eventName).add(observer);

        return () => Task.unsubscribe(eventName, observer);
    }

    /** Remove um observador anteriormente registrado. */
    static unsubscribe(eventName, observer) {
        const observers = Task.#observers.get(eventName);
        if (!observers) return;

        observers.delete(observer);

        if (!observers.size) {
            Task.#observers.delete(eventName);
        }
    }

    /** Retorna uma cópia da lista de tarefas abertas. */
    static getOpenTasks() {
        return [...Task.#openTasks];
    }

    /** Registra e exibe uma nova tarefa no desktop. */
    openTask(taskElement, closeElements = [], config = {}) {
        if (!(taskElement instanceof HTMLElement) || this.#taskElement) return;

        const {
            title = "",
            icon = {}
        } = config;

        this.#taskID = Task.#getTaskId();
        this.#taskTitle = title;
        this.#taskIcon = {
            src: icon.src ?? "",
            alt: icon.alt ?? "icon"
        };
        this.#taskElement = taskElement;

        taskElement.id = this.#taskID;
        taskElement.dataset.taskId = this.#taskID;

        this.#focusHandler = () => this.focusTask();
        taskElement.addEventListener("pointerdown", this.#focusHandler);

        Task.#openTasks.push(this);
        Task.#context.appendChild(taskElement);
        Task.#dragManager.register(taskElement, Task.#context);

        this.closeTask(closeElements);
        this.focusTask();

        Task.#notify("task:opened", { task: this });
    }

    /**
     * Restaura a tarefa, coloca-a acima das demais e marca-a como ativa.
     */
    focusTask() {
        if (!Task.#openTasks.includes(this) || !this.#taskElement) return;

        this.restoreTask();

        if (this.#taskActive) return;

        Task.#openTasks.forEach(task => {
            task.#taskActive = false;
            task.#taskElement?.removeAttribute("data-task-active");
        });

        Task.#zIndex++;

        this.#taskActive = true;
        this.#taskZIndex = Task.#zIndex;
        this.#taskElement.style.zIndex = this.#taskZIndex;
        this.#taskElement.dataset.taskActive = "true";

        Task.#notify("task:focused", { task: this });
    }

    /** Oculta a tarefa sem removê-la da barra de tarefas. */
    minimizeTask() {
        if (
            !Task.#openTasks.includes(this) ||
            !this.#taskElement ||
            this.#taskMinimized
        ) {
            return;
        }

        const wasActive = this.#taskActive;

        this.#taskMinimized = true;
        this.#taskActive = false;
        this.#taskElement.hidden = true;
        this.#taskElement.style.display = "none";
        this.#taskElement.removeAttribute("data-task-active");
        this.#taskElement.dataset.taskMinimized = "true";

        Task.#notify("task:minimized", { task: this });

        if (wasActive) {
            Task.#focusHighestTask(this);
        }
    }

    /** Torna novamente visível uma tarefa minimizada. */
    restoreTask() {
        if (
            !Task.#openTasks.includes(this) ||
            !this.#taskElement ||
            !this.#taskMinimized
        ) {
            return;
        }

        this.#taskMinimized = false;
        this.#taskElement.hidden = false;
        this.#taskElement.style.removeProperty("display");
        delete this.#taskElement.dataset.taskMinimized;

        Task.#notify("task:restored", { task: this });
    }

    /** Vincula elementos que devem fechar esta tarefa. */
    closeTask(closeElements = []) {
        closeElements
            .filter(element => element instanceof HTMLElement)
            .forEach(element => {
                const handler = () => this.removeTask();

                element.addEventListener("click", handler);
                this.#closeHandlers.push({ element, handler });
            });
    }

    /** Remove a tarefa, seus eventos e seu elemento visual. */
    removeTask() {
        const taskIndex = Task.#openTasks.indexOf(this);
        if (taskIndex === -1) return;

        const wasActive = this.#taskActive;

        this.#removeCloseListeners();

        if (this.#taskElement && this.#focusHandler) {
            this.#taskElement.removeEventListener("pointerdown", this.#focusHandler);
        }

        Task.#dragManager.unregister(this.#taskElement);
        this.#taskElement?.remove();
        Task.#openTasks.splice(taskIndex, 1);

        this.#taskActive = false;
        this.#taskMinimized = false;
        Task.#notify("task:closed", { task: this });

        if (wasActive) {
            Task.#focusHighestTask();
        }

        this.#taskElement = null;
        this.#focusHandler = null;
    }

    /** Cria um único gerenciador de arraste para todas as tarefas. */
    static #configureDragManager() {
        if (Task.#dragManager) return;

        Task.#dragManager = new DragManager();
        Task.#dragManager.subscribe(({ type, detail }) => {
            if (type === "drag:start") {
                Task.#activateTaskByElement(detail.element);
            }
        });
    }

    /** Localiza e ativa a tarefa associada a um elemento arrastado. */
    static #activateTaskByElement(taskElement) {
        const task = Task.#openTasks.find(item => item.#taskElement === taskElement);
        task?.focusTask();
    }

    /** Ativa a tarefa visível com maior ordem de empilhamento. */
    static #focusHighestTask(excludedTask = null) {
        const availableTasks = Task.#openTasks.filter(task => {
            return task !== excludedTask && !task.#taskMinimized;
        });

        if (!availableTasks.length) return;

        const nextTask = availableTasks
            .sort((taskA, taskB) => taskB.#taskZIndex - taskA.#taskZIndex)[0];

        nextTask.focusTask();
    }

    /** Gera um identificador sequencial para a próxima tarefa. */
    static #getTaskId() {
        const id = `task-${Task.#nextTaskId}`;
        Task.#nextTaskId++;

        return id;
    }

    /** Envia um evento aos observadores registrados. */
    static #notify(eventName, detail = {}) {
        Task.#observers.get(eventName)?.forEach(observer => observer(detail));
        Task.#observers.get("*")?.forEach(observer => observer({ eventName, ...detail }));
    }

    /** Remove os eventos adicionados aos botões de fechamento. */
    #removeCloseListeners() {
        this.#closeHandlers.forEach(({ element, handler }) => {
            element.removeEventListener("click", handler);
        });

        this.#closeHandlers = [];
    }
}
