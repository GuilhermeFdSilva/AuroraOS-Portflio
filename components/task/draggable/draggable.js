/**
 * Controla o arraste das janelas e mantém cada elemento dentro do desktop.
 */
export class DragManager {
    #activeElement = null;
    #activeContainer = null;
    #activePointerId = null;
    #captureElement = null;
    #offsetX = 0;
    #offsetY = 0;
    #registeredElements = new Map();
    #observers = new Set();
    #resizeFrame = null;
    #containerObserver = null;

    /**
     * Prepara os eventos globais e observa mudanças no tamanho do desktop.
     */
    constructor() {
        this.#containerObserver = typeof ResizeObserver === "function"
            ? new ResizeObserver(() => this.#scheduleConstraintUpdate())
            : null;

        this.#initializeGlobalEvents();
    }

    /**
     * Registra uma função que será avisada durante o arraste.
     */
    subscribe(observer) {
        if (typeof observer !== "function") {
            throw new TypeError("The observer must be a function.");
        }

        this.#observers.add(observer);
        return () => this.#observers.delete(observer);
    }

    /**
     * Habilita o arraste de um elemento dentro de um container.
     */
    register(element, container = element?.parentElement) {
        if (!(element instanceof HTMLElement)) return;

        const dragContainer = container instanceof HTMLElement
            ? container
            : document.documentElement;

        this.#registeredElements.set(element, dragContainer);
        element.dataset.draggableInit = "true";
        this.#containerObserver?.observe(dragContainer);

        requestAnimationFrame(() => {
            if (this.#registeredElements.has(element)) {
                this.#constrainElement(element, dragContainer);
            }
        });
    }

    /**
     * Remove um elemento do controle de arraste.
     */
    unregister(element) {
        if (!(element instanceof HTMLElement)) return;

        const container = this.#registeredElements.get(element);

        this.#registeredElements.delete(element);
        delete element.dataset.draggableInit;

        if (
            container &&
            ![...this.#registeredElements.values()].includes(container)
        ) {
            this.#containerObserver?.unobserve(container);
        }

        if (this.#activeElement === element) {
            this.#finishDrag("drag:cancel");
        }
    }

    /**
     * Registra os eventos de ponteiro e de redimensionamento da tela.
     */
    #initializeGlobalEvents() {
        document.addEventListener("pointerdown", event => this.#startDrag(event));
        document.addEventListener("pointermove", event => this.#moveDrag(event));
        document.addEventListener("pointerup", event => this.#endDrag(event));
        document.addEventListener("pointercancel", event => this.#cancelDrag(event));

        window.addEventListener("resize", this.#scheduleConstraintUpdate, { passive: true });
        window.visualViewport?.addEventListener(
            "resize",
            this.#scheduleConstraintUpdate,
            { passive: true }
        );
    }

    /**
     * Agenda o reposicionamento das janelas após uma mudança de tamanho.
     */
    #scheduleConstraintUpdate = () => {
        if (this.#resizeFrame !== null) {
            cancelAnimationFrame(this.#resizeFrame);
        }

        this.#resizeFrame = requestAnimationFrame(() => {
            this.#resizeFrame = null;
            this.#constrainRegisteredElements();
        });
    };

    /**
     * Inicia o arraste quando o título de uma janela é pressionado.
     */
    #startDrag(event) {
        if (event.button !== 0) return;

        const handle = event.target instanceof Element
            ? event.target.closest(".drag-handle")
            : null;

        if (!handle || event.target.closest("button")) return;

        const draggableElement = handle.closest(".interface-draggable");

        if (!draggableElement || !this.#registeredElements.has(draggableElement)) return;
        if (draggableElement.dataset.windowMaximized === "true") return;

        this.#activeElement = draggableElement;
        this.#activeContainer = this.#registeredElements.get(draggableElement);
        this.#activePointerId = event.pointerId;
        this.#captureElement = handle;

        this.#prepareElementPosition(draggableElement, this.#activeContainer);

        const elementRect = draggableElement.getBoundingClientRect();

        this.#offsetX = event.clientX - elementRect.left;
        this.#offsetY = event.clientY - elementRect.top;

        handle.setPointerCapture?.(event.pointerId);

        this.#notify("drag:start", {
            element: draggableElement,
            pointerType: event.pointerType
        });

        event.preventDefault();
    }

    /**
     * Atualiza a posição da janela durante o movimento do ponteiro.
     */
    #moveDrag(event) {
        if (!this.#isActivePointer(event)) return;

        const containerRect = this.#activeContainer.getBoundingClientRect();
        const bounds = this.#getMovementBounds(this.#activeElement, this.#activeContainer);
        const desiredX = event.clientX - containerRect.left - this.#offsetX;
        const desiredY = event.clientY - containerRect.top - this.#offsetY;
        const x = this.#clamp(desiredX, 0, bounds.maxX);
        const y = this.#clamp(desiredY, 0, bounds.maxY);

        this.#setElementPosition(this.#activeElement, x, y);

        this.#notify("drag:move", {
            element: this.#activeElement,
            position: { x, y },
            pointerType: event.pointerType
        });

        event.preventDefault();
    }

    /** Finaliza normalmente o arraste atual. */
    #endDrag(event) {
        if (this.#isActivePointer(event)) {
            this.#finishDrag("drag:end", event.pointerType);
        }
    }

    /** Cancela o arraste quando o navegador interrompe o ponteiro. */
    #cancelDrag(event) {
        if (this.#isActivePointer(event)) {
            this.#finishDrag("drag:cancel", event.pointerType);
        }
    }

    /**
     * Libera o ponteiro, avisa os observadores e limpa o estado interno.
     */
    #finishDrag(eventName, pointerType = "") {
        const element = this.#activeElement;

        if (
            this.#captureElement &&
            this.#activePointerId !== null &&
            this.#captureElement.hasPointerCapture?.(this.#activePointerId)
        ) {
            this.#captureElement.releasePointerCapture(this.#activePointerId);
        }

        if (element) {
            this.#notify(eventName, { element, pointerType });
        }

        this.#clearActiveElement();
    }

    /** Verifica se o evento pertence ao ponteiro que está arrastando. */
    #isActivePointer(event) {
        return Boolean(
            this.#activeElement &&
            this.#activeContainer &&
            event.pointerId === this.#activePointerId
        );
    }

    /**
     * Converte a posição atual para coordenadas internas e aplica os limites.
     */
    #prepareElementPosition(element, container) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const bounds = this.#getMovementBounds(element, container);
        const x = this.#clamp(elementRect.left - containerRect.left, 0, bounds.maxX);
        const y = this.#clamp(elementRect.top - containerRect.top, 0, bounds.maxY);

        element.style.transform = "none";
        this.#setElementPosition(element, x, y);
    }

    /** Reaplica os limites a todos os elementos registrados. */
    #constrainRegisteredElements() {
        this.#registeredElements.forEach((container, element) => {
            this.#constrainElement(element, container);
        });
    }

    /** Mantém um elemento visível dentro de seu container. */
    #constrainElement(element, container) {
        if (!element.isConnected || !container.isConnected || element.hidden) return;
        this.#prepareElementPosition(element, container);
    }

    /** Calcula o maior deslocamento permitido nos dois eixos. */
    #getMovementBounds(element, container) {
        return {
            maxX: Math.max(0, container.clientWidth - element.offsetWidth),
            maxY: Math.max(0, container.clientHeight - element.offsetHeight)
        };
    }

    /** Aplica coordenadas absolutas ao elemento. */
    #setElementPosition(element, x, y) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }

    /** Limita um número ao intervalo recebido. */
    #clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }

    /** Limpa os dados usados pelo arraste atual. */
    #clearActiveElement() {
        this.#activeElement = null;
        this.#activeContainer = null;
        this.#activePointerId = null;
        this.#captureElement = null;
        this.#offsetX = 0;
        this.#offsetY = 0;
    }

    /** Envia um evento interno para todos os observadores. */
    #notify(type, detail = {}) {
        this.#observers.forEach(observer => observer({ type, detail }));
    }
}
