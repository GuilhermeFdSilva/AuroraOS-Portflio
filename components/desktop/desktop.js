import { LocalStorageManager } from "../../js/storage/localStorageManager.js";
import { Window } from "../window/window.js";

/**
 * Gerencia os atalhos exibidos na área de trabalho.
 */
export class Desktop {
    static #storageKey = "desktop.shortcuts.positions";

    static #shortcuts = {
        shortcuts: [
            {
                id: "notepad",
                label: "Bloco de notas",
                iconSrc: "./assets/bloco_de_notas.png",
                iconAlt: "Bloco de notas",
                action: () => Desktop.#openApplicationWindow({
                    title: "Bloco de notas",
                    iconSrc: "./assets/bloco_de_notas.png"
                })
            },
            {
                id: "calculator",
                label: "Calculadora",
                iconSrc: "./assets/calculadora.png",
                iconAlt: "Calculadora",
                action: () => Desktop.#openApplicationWindow({
                    title: "Calculadora",
                    iconSrc: "./assets/calculadora.png"
                })
            },
            {
                id: "resume",
                label: "Currículo",
                iconSrc: "./assets/doc.png",
                iconAlt: "Currículo",
                action: () => Desktop.#openApplicationWindow({
                    title: "Currículo",
                    iconSrc: "./assets/doc.png"
                })
            },
            {
                id: "projects",
                label: "Projetos",
                iconSrc: "./assets/docs.png",
                iconAlt: "Projetos",
                action: () => Desktop.#openApplicationWindow({
                    title: "Projetos",
                    iconSrc: "./assets/docs.png"
                })
            }
        ]
    };

    static #shortcutConfigs = [];
    static #container = null;
    static #isConfigured = false;
    static #shortcutLayer = null;
    static #shortcutElements = new Map();
    static #positions = new Map();
    static #selectedShortcutId = null;
    static #dragState = null;
    static #resizeObserver = null;

    static #lastTouch = {
        shortcutId: null,
        timestamp: 0
    };

    static #ignoreNextClick = false;
    static #lastPointerType = "mouse";

    constructor() {
        throw new Error(
            "Desktop is a static class and cannot be instantiated."
        );
    }

    /**
     * Configura e retorna o desktop da aplicação.
     *
     * @param {HTMLElement} container Elemento principal do desktop.
     */
    static getDesktop(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError(
                "A valid desktop container is required."
            );
        }

        if (Desktop.#isConfigured) {
            return Desktop.#container;
        }

        Desktop.#isConfigured = true;
        Desktop.#container = container;

        Desktop.#normalizeShortcutConfigs();
        Desktop.#createShortcutLayer();
        Desktop.#restorePositions();
        Desktop.#renderShortcuts();
        Desktop.#configureDesktopEvents();
        Desktop.#configureResizeObserver();
        Desktop.#layoutShortcuts();

        return Desktop.#container;
    }

    /**
     * Retorna uma cópia das posições atuais por identificador.
     *
     * @returns {Record<string, number>}
     */
    static getShortcutPositions() {
        return Object.fromEntries(
            Desktop.#positions
        );
    }

    /**
     * Volta os atalhos para a ordem definida na configuração inicial.
     */
    static resetShortcutPositions() {
        Desktop.#positions.clear();

        Desktop.#shortcutConfigs.forEach(
            (shortcut, index) => {
                Desktop.#positions.set(
                    shortcut.id,
                    index
                );
            }
        );

        Desktop.#savePositions();
        Desktop.#layoutShortcuts();
        Desktop.clearSelection();
    }

    /**
     * Remove o destaque de seleção do atalho atual.
     */
    static clearSelection() {
        if (!Desktop.#selectedShortcutId) {
            return;
        }

        const selectedElement =
            Desktop.#shortcutElements.get(
                Desktop.#selectedShortcutId
            );

        selectedElement?.classList.remove(
            "desktop-shortcut-selected"
        );

        selectedElement?.setAttribute(
            "aria-selected",
            "false"
        );

        Desktop.#selectedShortcutId = null;
    }

    /**
     * Valida configurações e impede identificadores duplicados.
     */
    static #normalizeShortcutConfigs() {
        const shortcuts =
            Desktop.#shortcuts.shortcuts;

        if (!Array.isArray(shortcuts)) {
            throw new TypeError(
                "A lista de atalhos deve ser um array."
            );
        }

        const registeredIds = new Set();

        Desktop.#shortcutConfigs = shortcuts.map(
            (shortcut, index) => {
                const id = String(
                    shortcut?.id ?? ""
                ).trim();

                if (!id) {
                    throw new TypeError(
                        `O atalho da posição ${index} não possui id.`
                    );
                }

                if (registeredIds.has(id)) {
                    throw new Error(
                        `O identificador de atalho "${id}" está duplicado.`
                    );
                }

                registeredIds.add(id);

                return {
                    id,
                    label: String(
                        shortcut.label ?? id
                    ),
                    iconSrc: String(
                        shortcut.iconSrc ?? ""
                    ),
                    iconAlt: String(
                        shortcut.iconAlt ??
                        shortcut.label ??
                        id
                    ),
                    action:
                        typeof shortcut.action === "function"
                            ? shortcut.action
                            : () => {}
                };
            }
        );
    }

    /**
     * Cria uma camada exclusiva para os atalhos.
     */
    static #createShortcutLayer() {
        const layer =
            document.createElement("section");

        layer.className =
            "desktop-shortcuts-layer no-select";

        layer.setAttribute(
            "aria-label",
            "Atalhos da área de trabalho"
        );

        Desktop.#shortcutLayer = layer;
        Desktop.#container.appendChild(layer);
    }

    /**
     * Recupera posições salvas e resolve posições inválidas ou duplicadas.
     */
    static #restorePositions() {
        const storedPositions =
            LocalStorageManager.get(
                Desktop.#storageKey,
                {}
            );

        const occupiedSlots = new Set();

        Desktop.#shortcutConfigs.forEach(
            (shortcut, defaultSlot) => {
                const storedSlot = Number(
                    storedPositions?.[shortcut.id]
                );

                const validStoredSlot =
                    Number.isInteger(storedSlot) &&
                    storedSlot >= 0;

                const desiredSlot =
                    validStoredSlot
                        ? storedSlot
                        : defaultSlot;

                const availableSlot =
                    occupiedSlots.has(desiredSlot)
                        ? Desktop.#findFirstAvailableSlot(
                            occupiedSlots
                        )
                        : desiredSlot;

                occupiedSlots.add(availableSlot);

                Desktop.#positions.set(
                    shortcut.id,
                    availableSlot
                );
            }
        );

        Desktop.#savePositions();
    }

    /**
     * Cria os elementos dos atalhos e registra seus eventos.
     */
    static #renderShortcuts() {
        Desktop.#shortcutConfigs.forEach(
            shortcut => {
                const button =
                    document.createElement("button");

                const icon =
                    document.createElement("img");

                const label =
                    document.createElement("span");

                button.type = "button";
                button.className =
                    "desktop-shortcut";

                button.dataset.shortcutId =
                    shortcut.id;

                button.setAttribute(
                    "aria-label",
                    `Abrir ${shortcut.label}`
                );

                button.setAttribute(
                    "aria-selected",
                    "false"
                );

                icon.className =
                    "desktop-shortcut-icon";

                icon.src = shortcut.iconSrc;
                icon.alt = shortcut.iconAlt;
                icon.draggable = false;

                label.className =
                    "desktop-shortcut-label";

                label.textContent =
                    shortcut.label;

                button.append(icon, label);

                Desktop.#configureShortcutEvents(
                    button,
                    shortcut
                );

                Desktop.#shortcutElements.set(
                    shortcut.id,
                    button
                );

                Desktop.#shortcutLayer.appendChild(
                    button
                );
            }
        );
    }

    /**
     * Registra seleção, abertura e movimentação por ponteiro.
     */
    static #configureShortcutEvents(
        button,
        shortcut
    ) {
        button.addEventListener(
            "pointerdown",
            event => {
                Desktop.#startShortcutDrag(
                    event,
                    shortcut.id
                );
            }
        );

        button.addEventListener(
            "pointermove",
            event => {
                Desktop.#moveShortcut(event);
            }
        );

        button.addEventListener(
            "pointerup",
            event => {
                Desktop.#finishShortcutInteraction(
                    event,
                    shortcut
                );
            }
        );

        button.addEventListener(
            "pointercancel",
            () => {
                Desktop.#cancelShortcutDrag();
            }
        );

        button.addEventListener(
            "click",
            event => {
                if (Desktop.#ignoreNextClick) {
                    event.preventDefault();
                    Desktop.#ignoreNextClick = false;

                    return;
                }

                Desktop.#selectShortcut(
                    shortcut.id
                );
            }
        );

        button.addEventListener(
            "dblclick",
            event => {
                event.preventDefault();

                if (
                    Desktop.#lastPointerType !==
                    "touch"
                ) {
                    shortcut.action();
                }
            }
        );

        button.addEventListener(
            "keydown",
            event => {
                Desktop.#handleShortcutKeydown(
                    event,
                    shortcut
                );
            }
        );
    }

    /**
     * Limpa a seleção quando o usuário interage com uma área vazia.
     */
    static #configureDesktopEvents() {
        Desktop.#container.addEventListener(
            "pointerdown",
            event => {
                const clickedShortcut =
                    event.target instanceof Element
                        ? event.target.closest(
                            ".desktop-shortcut"
                        )
                        : null;

                if (!clickedShortcut) {
                    Desktop.clearSelection();
                }
            }
        );
    }

    /**
     * Recalcula a grade quando o tamanho do desktop mudar.
     */
    static #configureResizeObserver() {
        Desktop.#resizeObserver =
            new ResizeObserver(() => {
                requestAnimationFrame(() => {
                    Desktop.#layoutShortcuts();
                });
            });

        Desktop.#resizeObserver.observe(
            Desktop.#container
        );
    }

    /**
     * Inicia uma possível movimentação do atalho.
     */
    static #startShortcutDrag(
        event,
        shortcutId
    ) {
        if (event.button !== 0) {
            return;
        }

        const element =
            Desktop.#shortcutElements.get(
                shortcutId
            );

        if (!element) {
            return;
        }

        Desktop.#selectShortcut(shortcutId);

        Desktop.#lastPointerType =
            event.pointerType || "mouse";

        const elementRect =
            element.getBoundingClientRect();

        Desktop.#dragState = {
            shortcutId,
            element,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            startX: event.clientX,
            startY: event.clientY,
            offsetX:
                event.clientX -
                elementRect.left,
            offsetY:
                event.clientY -
                elementRect.top,
            originalSlot:
                Desktop.#positions.get(
                    shortcutId
                ),
            moved: false
        };

        element.setPointerCapture?.(
            event.pointerId
        );
    }

    /**
     * Move visualmente o atalho antes do encaixe.
     */
    static #moveShortcut(event) {
        const state = Desktop.#dragState;

        if (
            !state ||
            state.pointerId !== event.pointerId
        ) {
            return;
        }

        const movement = Math.hypot(
            event.clientX - state.startX,
            event.clientY - state.startY
        );

        if (!state.moved && movement < 7) {
            return;
        }

        state.moved = true;
        event.preventDefault();

        const layerRect =
            Desktop.#shortcutLayer
                .getBoundingClientRect();

        const metrics =
            Desktop.#getGridMetrics();

        const maximumX = Math.max(
            0,
            layerRect.width -
            metrics.cellWidth
        );

        const maximumY = Math.max(
            0,
            layerRect.height -
            metrics.cellHeight
        );

        const x = Desktop.#clamp(
            event.clientX -
            layerRect.left -
            state.offsetX,
            0,
            maximumX
        );

        const y = Desktop.#clamp(
            event.clientY -
            layerRect.top -
            state.offsetY,
            0,
            maximumY
        );

        state.element.classList.add(
            "desktop-shortcut-dragging"
        );

        state.element.style.left = `${x}px`;
        state.element.style.top = `${y}px`;
    }

    /**
     * Decide entre clique, toque ou conclusão do arraste.
     */
    static #finishShortcutInteraction(
        event,
        shortcut
    ) {
        const state = Desktop.#dragState;

        if (
            !state ||
            state.pointerId !== event.pointerId
        ) {
            return;
        }

        state.element.releasePointerCapture?.(
            event.pointerId
        );

        if (state.moved) {
            Desktop.#dropShortcut(
                event,
                state
            );

            Desktop.#ignoreNextClick = true;

            setTimeout(() => {
                Desktop.#ignoreNextClick = false;
            }, 0);

            return;
        }

        if (state.pointerType === "touch") {
            Desktop.#handleTouchActivation(
                shortcut
            );
        }

        Desktop.#dragState = null;
    }

    /**
     * Encaixa o atalho no quadrante mais próximo.
     */
    static #dropShortcut(event, state) {
        const targetSlot =
            Desktop.#getClosestSlot(
                event.clientX,
                event.clientY
            );

        const occupiedShortcutId =
            Desktop.#findShortcutAtSlot(
                targetSlot,
                state.shortcutId
            );

        if (occupiedShortcutId) {
            Desktop.#positions.set(
                occupiedShortcutId,
                state.originalSlot
            );
        }

        Desktop.#positions.set(
            state.shortcutId,
            targetSlot
        );

        state.element.classList.remove(
            "desktop-shortcut-dragging"
        );

        /*
         * Deve ser limpo antes do layout para que
         * o atalho arrastado também seja reposicionado.
         */
        Desktop.#dragState = null;

        Desktop.#savePositions();
        Desktop.#layoutShortcuts();
    }

    /**
     * Cancela a movimentação.
     */
    static #cancelShortcutDrag() {
        if (!Desktop.#dragState) {
            return;
        }

        Desktop.#dragState.element
            .classList.remove(
                "desktop-shortcut-dragging"
            );

        Desktop.#dragState = null;
        Desktop.#layoutShortcuts();
    }

    /**
     * Em telas touch, o segundo toque abre o atalho.
     */
    static #handleTouchActivation(
        shortcut
    ) {
        const now = Date.now();

        const isSecondTap =
            Desktop.#lastTouch.shortcutId ===
            shortcut.id &&
            now -
            Desktop.#lastTouch.timestamp <= 550;

        if (isSecondTap) {
            shortcut.action();

            Desktop.#lastTouch = {
                shortcutId: null,
                timestamp: 0
            };

            return;
        }

        Desktop.#lastTouch = {
            shortcutId: shortcut.id,
            timestamp: now
        };
    }

    /**
     * Permite abrir o atalho usando Enter.
     */
    static #handleShortcutKeydown(
        event,
        shortcut
    ) {
        if (event.key !== "Enter") {
            return;
        }

        event.preventDefault();
        shortcut.action();
    }

    /**
     * Aplica destaque ao atalho selecionado.
     */
    static #selectShortcut(shortcutId) {
        if (
            Desktop.#selectedShortcutId ===
            shortcutId
        ) {
            return;
        }

        Desktop.clearSelection();

        const shortcutElement =
            Desktop.#shortcutElements.get(
                shortcutId
            );

        if (!shortcutElement) {
            return;
        }

        shortcutElement.classList.add(
            "desktop-shortcut-selected"
        );

        shortcutElement.setAttribute(
            "aria-selected",
            "true"
        );

        Desktop.#selectedShortcutId =
            shortcutId;
    }

    /**
     * Posiciona os atalhos nos quadrantes.
     */
    static #layoutShortcuts() {
        if (!Desktop.#shortcutLayer) {
            return;
        }

        const metrics =
            Desktop.#getGridMetrics();

        Desktop.#positions.forEach(
            (slot, shortcutId) => {
                const shortcutElement =
                    Desktop.#shortcutElements.get(
                        shortcutId
                    );

                if (
                    !shortcutElement ||
                    shortcutElement ===
                    Desktop.#dragState?.element
                ) {
                    return;
                }

                const safeSlot =
                    Desktop.#clamp(
                        slot,
                        0,
                        metrics.totalSlots - 1
                    );

                const column =
                    safeSlot % metrics.columns;

                const row = Math.floor(
                    safeSlot /
                    metrics.columns
                );

                const left =
                    metrics.paddingX +
                    column *
                    metrics.cellWidth;

                const top =
                    metrics.paddingY +
                    row *
                    metrics.cellHeight;

                shortcutElement.dataset.desktopSlot =
                    String(slot);

                shortcutElement.style.left =
                    `${left}px`;

                shortcutElement.style.top =
                    `${top}px`;
            }
        );
    }

    /**
     * Calcula as dimensões da grade.
     */
    static #getGridMetrics() {
        const styles = getComputedStyle(
            Desktop.#container
        );

        const cellWidth =
            Desktop.#readCssNumber(
                styles,
                "--desktop-grid-cell-width",
                104
            );

        const cellHeight =
            Desktop.#readCssNumber(
                styles,
                "--desktop-grid-cell-height",
                104
            );

        const paddingX =
            Desktop.#readCssNumber(
                styles,
                "--desktop-grid-padding-x",
                12
            );

        const paddingY =
            Desktop.#readCssNumber(
                styles,
                "--desktop-grid-padding-y",
                12
            );

        const availableWidth = Math.max(
            1,
            Desktop.#container.clientWidth -
            paddingX * 2
        );

        const availableHeight = Math.max(
            1,
            Desktop.#container.clientHeight -
            paddingY * 2
        );

        const columns = Math.max(
            1,
            Math.floor(
                availableWidth / cellWidth
            )
        );

        const rows = Math.max(
            1,
            Math.floor(
                availableHeight / cellHeight
            )
        );

        return {
            cellWidth,
            cellHeight,
            paddingX,
            paddingY,
            columns,
            rows,
            totalSlots: columns * rows
        };
    }

    /**
     * Converte a posição do ponteiro no quadrante mais próximo.
     */
    static #getClosestSlot(
        clientX,
        clientY
    ) {
        const layerRect =
            Desktop.#shortcutLayer
                .getBoundingClientRect();

        const metrics =
            Desktop.#getGridMetrics();

        const localX =
            clientX -
            layerRect.left -
            metrics.paddingX;

        const localY =
            clientY -
            layerRect.top -
            metrics.paddingY;

        const column = Desktop.#clamp(
            Math.floor(
                localX /
                metrics.cellWidth
            ),
            0,
            metrics.columns - 1
        );

        const row = Desktop.#clamp(
            Math.floor(
                localY /
                metrics.cellHeight
            ),
            0,
            metrics.rows - 1
        );

        return (
            row * metrics.columns +
            column
        );
    }

    /**
     * Localiza o atalho que ocupa um quadrante.
     */
    static #findShortcutAtSlot(
        slot,
        excludedId = null
    ) {
        for (
            const [
                shortcutId,
                shortcutSlot
            ] of Desktop.#positions
        ) {
            if (
                shortcutId !== excludedId &&
                shortcutSlot === slot
            ) {
                return shortcutId;
            }
        }

        return null;
    }

    /**
     * Encontra o primeiro quadrante livre.
     */
    static #findFirstAvailableSlot(
        occupiedSlots
    ) {
        let slot = 0;

        while (occupiedSlots.has(slot)) {
            slot++;
        }

        return slot;
    }

    /**
     * Persiste as posições no LocalStorage.
     */
    static #savePositions() {
        LocalStorageManager.save(
            Desktop.#storageKey,
            Object.fromEntries(
                Desktop.#positions
            )
        );
    }

    /**
     * Lê uma variável CSS numérica.
     */
    static #readCssNumber(
        styles,
        propertyName,
        fallback
    ) {
        const value = Number.parseFloat(
            styles.getPropertyValue(
                propertyName
            )
        );

        return (
            Number.isFinite(value) &&
            value > 0
        )
            ? value
            : fallback;
    }

    /**
     * Limita um valor dentro de um intervalo.
     */
    static #clamp(
        value,
        minimum,
        maximum
    ) {
        return Math.max(
            minimum,
            Math.min(value, maximum)
        );
    }

    /**
     * Abre uma nova janela de aplicação.
     *
     * @param {object} config Configuração da janela.
     * @param {string} config.title Título da aplicação.
     * @param {string} config.iconSrc Ícone da aplicação.
     */
    static #openApplicationWindow({
        title,
        iconSrc
    }) {
        new Window(Desktop.#container, {
            title,
            iconSrc,
            iconAlt: title,
            contentSrc:
                "./components/window/content/wip.html"
        });
    }
}