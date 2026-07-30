import { Task } from "../task/task.js";

/**
 * Representa uma caixa de diálogo simples dentro do desktop.
 */
export class Dialog extends Task {
    static #dialogTemplateCache = null;
    static #cascadeStateByContext = new WeakMap();

    static #cascadeGap = 16;
    static #cascadeStep = 28;
    static #cascadeColumnStep = 56;

    /** Cria e abre uma caixa de diálogo. */
    constructor(context, config = {}) {
        super(context);

        this.#openDialog(config);
    }

    /** Carrega e mantém em cache o template da caixa de diálogo. */
    static async #loadDialogTemplate() {
        if (Dialog.#dialogTemplateCache) {
            return Dialog.#dialogTemplateCache;
        }

        const response = await fetch("./components/dialog/dialog.html");

        if (!response.ok) {
            throw new Error(
                `Não foi possível carregar o template da Dialog: ${response.status}`
            );
        }

        Dialog.#dialogTemplateCache = await response.text();

        return Dialog.#dialogTemplateCache;
    }

    /** Preenche o template e registra a caixa como tarefa. */
    async #openDialog(config = {}) {
        const {
            title = "Aviso",
            message = "",
            iconSrc = "",
            iconAlt = "icon"
        } = config;

        const html = await Dialog.#loadDialogTemplate();
        const wrapper = document.createElement("div");

        wrapper.innerHTML = html;

        const dialog = wrapper.firstElementChild;

        if (!(dialog instanceof HTMLElement)) {
            throw new Error("O template da Dialog não possui um elemento válido.");
        }

        dialog.setAttribute("aria-label", title);

        const titleElement = dialog.querySelector(".interface-title-text");
        const messageElement = dialog.querySelector(".dialog-message");
        const titleIcon = dialog.querySelector(".dialog-task-icon");

        if (titleElement) {
            titleElement.textContent = title;
        }

        if (messageElement) {
            messageElement.textContent = message;
        }

        if (titleIcon instanceof HTMLImageElement) {
            titleIcon.alt = iconAlt;

            if (iconSrc) {
                titleIcon.src = iconSrc;
            }
        }

        const closeButtons = [
            dialog.querySelector(".dialog-confirm"),
            dialog.querySelector(".dialog-close")
        ].filter((button) => button instanceof HTMLElement);

        this.openTask(dialog, closeButtons, {
            title,
            icon: {
                src: iconSrc,
                alt: iconAlt
            }
        });

        const context = dialog.parentElement;

        if (!(context instanceof HTMLElement)) {
            return;
        }

        Dialog.#positionInCascade(dialog, context, this);
        Dialog.#observeDialogClosing(context, this);
    }

    /** Posiciona novas caixas em sequência para evitar sobreposição total. */
    static #positionInCascade(dialog, context, task) {
        if (
            !(dialog instanceof HTMLElement) ||
            !(context instanceof HTMLElement)
        ) {
            return;
        }

        const bounds = Dialog.#getPositionBounds(dialog, context);
        const state = Dialog.#getCascadeState(context, bounds);

        state.openDialogs.add(task);

        const x = Dialog.#clamp(
            state.x,
            bounds.minX,
            bounds.maxX
        );

        const y = Dialog.#clamp(
            state.y,
            bounds.minY,
            bounds.maxY
        );

        dialog.style.left = `${x}px`;
        dialog.style.top = `${y}px`;
        dialog.style.transform = "none";

        Dialog.#advanceCascadeState(state, bounds);
    }

    /** Recupera ou cria o estado de posicionamento do desktop atual. */
    static #getCascadeState(context, bounds) {
        let state = Dialog.#cascadeStateByContext.get(context);

        if (!state) {
            const centeredPosition =
                Dialog.#getCenteredPosition(bounds);

            state = {
                x: centeredPosition.x,
                y: centeredPosition.y,
                columnX: centeredPosition.x,
                openDialogs: new Set()
            };

            Dialog.#cascadeStateByContext.set(context, state);

            return state;
        }

        state.columnX = Dialog.#clamp(
            state.columnX,
            bounds.minX,
            bounds.maxX
        );

        state.x = Dialog.#clamp(
            state.x,
            bounds.minX,
            bounds.maxX
        );

        state.y = Dialog.#clamp(
            state.y,
            bounds.minY,
            bounds.maxY
        );

        return state;
    }

    /** Calcula a posição central dentro dos limites disponíveis. */
    static #getCenteredPosition(bounds) {
        return {
            x: bounds.minX + (bounds.maxX - bounds.minX) / 2,
            y: bounds.minY + (bounds.maxY - bounds.minY) / 2
        };
    }

    /** Limpa o estado da cascata quando a última caixa é fechada. */
    static #observeDialogClosing(context, task) {
        if (!(context instanceof HTMLElement)) {
            return;
        }

        const unsubscribe = Task.subscribe(
            "task:closed",
            ({ task: closedTask }) => {
                if (closedTask !== task) {
                    return;
                }

                const state =
                    Dialog.#cascadeStateByContext.get(context);

                state?.openDialogs.delete(task);

                if (!state?.openDialogs.size) {
                    Dialog.#cascadeStateByContext.delete(context);
                }

                unsubscribe();
            }
        );
    }

    /** Avança a próxima posição da cascata. */
    static #advanceCascadeState(state, bounds) {
        const horizontalSpace = Math.max(
            0,
            bounds.maxX - bounds.minX
        );

        const horizontalStep = horizontalSpace >= Dialog.#cascadeStep
            ? Dialog.#cascadeStep
            : 0;
        const nextX = state.x + horizontalStep;
        const nextY = state.y + Dialog.#cascadeStep;

        if (nextX <= bounds.maxX && nextY <= bounds.maxY) {
            state.x = nextX;
            state.y = nextY;
            return;
        }

        const columnStep = Math.min(
            Dialog.#cascadeColumnStep,
            horizontalSpace
        );
        let nextColumnX = state.columnX + columnStep;

        if (columnStep === 0 || nextColumnX > bounds.maxX) {
            nextColumnX = bounds.minX;
        }

        state.columnX = nextColumnX;
        state.x = nextColumnX;
        state.y = bounds.minY;
    }

    /** Calcula os limites disponíveis para posicionar a caixa. */
    static #getPositionBounds(dialog, context) {
        const maximumX = Math.max(
            0,
            context.clientWidth - dialog.offsetWidth
        );

        const maximumY = Math.max(
            0,
            context.clientHeight - dialog.offsetHeight
        );

        const hasHorizontalMarginSpace =
            maximumX >= Dialog.#cascadeGap * 2;

        const hasVerticalMarginSpace =
            maximumY >= Dialog.#cascadeGap * 2;

        const minX = hasHorizontalMarginSpace
            ? Dialog.#cascadeGap
            : 0;

        const minY = hasVerticalMarginSpace
            ? Dialog.#cascadeGap
            : 0;

        const maxX = hasHorizontalMarginSpace
            ? maximumX - Dialog.#cascadeGap
            : maximumX;

        const maxY = hasVerticalMarginSpace
            ? maximumY - Dialog.#cascadeGap
            : maximumY;

        return {
            minX,
            minY,
            maxX,
            maxY
        };
    }

    /** Limita um valor ao intervalo recebido. */
    static #clamp(value, minimum, maximum) {
        return Math.max(
            minimum,
            Math.min(value, maximum)
        );
    }
}