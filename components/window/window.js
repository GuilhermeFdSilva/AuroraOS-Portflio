import { Task } from "../task/task.js";

/**
 * Representa uma janela de aplicação.
 */
export class Window extends Task {
    static #windowTemplateCache = null;

    #context = null;
    #windowElement = null;
    #maximizeButton = null;
    #canMaximize = true;
    #lockMaximized = false;
    #isMaximized = false;
    #restorePosition = null;

    /**
     * Cria uma janela de aplicação dentro do contexto informado.
     *
     * @param {HTMLElement} context Elemento que receberá a janela.
     * @param {object} config Configuração visual e de conteúdo da janela.
     */
    constructor(context, config = {}) {
        super(context);

        this.#context = context;
        this.#openWindow(config);
    }

    /**
     * Carrega e mantém em cache o template estrutural da Window.
     *
     * @returns {Promise<string>} HTML do template.
     */
    static async #loadWindowTemplate() {
        if (Window.#windowTemplateCache) {
            return Window.#windowTemplateCache;
        }

        const response = await fetch("./components/window/window.html");

        if (!response.ok) {
            throw new Error(
                `Não foi possível carregar o template da Window: ${response.status}`
            );
        }

        Window.#windowTemplateCache = await response.text();

        return Window.#windowTemplateCache;
    }

    /**
     * Monta a janela, carrega seu conteúdo e registra a tarefa no sistema.
     *
     * @param {object} config Configuração da janela.
     */
    async #openWindow(config = {}) {
        const {
            title = "Aplicação",
            iconSrc = "",
            iconAlt = "Ícone da aplicação",
            contentSrc = "",
            width = "",
            height = "",
            canMaximize = true,
            startMaximized = false,
            lockMaximized = false,
            onContentLoaded = null
        } = config;

        const html = await Window.#loadWindowTemplate();
        const wrapper = document.createElement("div");

        wrapper.innerHTML = html;

        const windowElement = wrapper.firstElementChild;

        if (!(windowElement instanceof HTMLElement)) {
            throw new Error("O template da Window não possui um elemento válido.");
        }

        this.#windowElement = windowElement;
        this.#lockMaximized = Boolean(lockMaximized);
        this.#canMaximize = Boolean(canMaximize) || this.#lockMaximized;
        this.#maximizeButton = windowElement.querySelector(
            ".application-window-maximize"
        );

        this.#configureIdentity(windowElement, {
            title,
            iconSrc,
            iconAlt
        });

        this.#configureDimensions(windowElement, { width, height });

        const contentElement = await this.#loadContent(
            windowElement,
            contentSrc
        );

        const closeButton = windowElement.querySelector(
            ".application-window-close"
        );
        const minimizeButton = windowElement.querySelector(
            ".application-window-minimize"
        );

        this.openTask(windowElement, [closeButton], {
            title,
            icon: {
                src: iconSrc,
                alt: iconAlt
            }
        });

        this.#configureMaximizeAvailability();
        this.#configureControls(minimizeButton, this.#maximizeButton);
        this.#centerWindow();

        if ((startMaximized || this.#lockMaximized) && this.#canMaximize) {
            this.#maximizeWindow();
        }

        if (this.#lockMaximized) {
            this.#lockMaximizedWindow();
        }

        if (
            contentElement &&
            typeof onContentLoaded === "function"
        ) {
            try {
                await onContentLoaded(contentElement);
            } catch (error) {
                console.error(
                    `Não foi possível inicializar a aplicação "${title}".`,
                    error
                );
            }
        }
    }

    /**
     * Preenche título, ícone e nome acessível da janela.
     *
     * @param {HTMLElement} windowElement Elemento principal da janela.
     * @param {object} identity Dados de identificação.
     */
    #configureIdentity(windowElement, identity) {
        const titleElement = windowElement.querySelector(
            ".interface-title-text"
        );
        const iconElement = windowElement.querySelector(
            ".application-window-icon"
        );

        windowElement.setAttribute("aria-label", identity.title);

        if (titleElement) {
            titleElement.textContent = identity.title;
        }

        if (iconElement instanceof HTMLImageElement) {
            iconElement.alt = identity.iconAlt;

            if (identity.iconSrc) {
                iconElement.src = identity.iconSrc;
            }
        }
    }

    /**
     * Aplica dimensões opcionais sem ultrapassar o desktop.
     *
     * @param {HTMLElement} windowElement Elemento principal da janela.
     * @param {object} dimensions Largura e altura opcionais.
     */
    #configureDimensions(windowElement, dimensions) {
        if (dimensions.width) {
            windowElement.style.width = Window.#normalizeDimension(
                dimensions.width
            );
        }

        if (dimensions.height) {
            windowElement.style.height = Window.#normalizeDimension(
                dimensions.height
            );
        }
    }

    /**
     * Carrega o componente HTML solicitado no corpo da janela.
     *
     * @param {HTMLElement} windowElement Elemento principal da janela.
     * @param {string} contentSrc Caminho do componente HTML.
     * @returns {Promise<HTMLElement|null>} Container carregado.
     */
    async #loadContent(windowElement, contentSrc) {
        const contentElement = windowElement.querySelector(
            ".application-window-content"
        );

        if (!(contentElement instanceof HTMLElement)) {
            return null;
        }

        if (!contentSrc) {
            contentElement.textContent = "Nenhum conteúdo foi informado.";
            return contentElement;
        }

        try {
            const response = await fetch(contentSrc);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            contentElement.innerHTML = await response.text();

            return contentElement;
        } catch (error) {
            console.error(error);
            contentElement.textContent =
                "Não foi possível carregar o conteúdo desta aplicação.";

            return null;
        }
    }

    /**
     * Ativa ou bloqueia a maximização conforme a configuração da aplicação.
     */
    #configureMaximizeAvailability() {
        if (!this.#maximizeButton) return;

        if (this.#canMaximize) {
            this.#maximizeButton.disabled = false;
            this.#maximizeButton.removeAttribute("aria-disabled");
            return;
        }

        this.#disableMaximizeButton(
            "Maximização indisponível",
            "windowMaximizeDisabled"
        );
    }

    /**
     * Impede que uma aplicação maximizada volte ao tamanho normal.
     * A janela continua podendo ser minimizada e fechada.
     */
    #lockMaximizedWindow() {
        if (!this.#windowElement || !this.#maximizeButton) return;

        this.#lockMaximized = true;
        this.#disableMaximizeButton(
            "Janela bloqueada no modo maximizado",
            "windowMaximizeLocked"
        );
    }

    /**
     * Desativa o botão de maximização e registra o motivo no elemento.
     *
     * @param {string} label Texto acessível e tooltip do botão.
     * @param {string} datasetKey Chave adicionada ao dataset da janela.
     */
    #disableMaximizeButton(label, datasetKey) {
        if (!this.#maximizeButton || !this.#windowElement) return;

        this.#maximizeButton.disabled = true;
        this.#maximizeButton.setAttribute("aria-disabled", "true");
        this.#maximizeButton.title = label;
        this.#maximizeButton.setAttribute("aria-label", label);
        this.#windowElement.dataset[datasetKey] = "true";
    }

    /**
     * Configura os eventos dos botões exclusivos da Window.
     *
     * @param {HTMLElement|null} minimizeButton Botão de minimizar.
     * @param {HTMLElement|null} maximizeButton Botão de maximizar.
     */
    #configureControls(minimizeButton, maximizeButton) {
        minimizeButton?.addEventListener("click", event => {
            event.stopPropagation();
            this.minimizeTask();
        });

        if (this.#canMaximize && !this.#lockMaximized) {
            maximizeButton?.addEventListener("click", event => {
                event.stopPropagation();
                this.#toggleMaximize();
            });
        }
    }

    /**
     * Alterna entre o tamanho normal e o tamanho máximo da janela.
     */
    #toggleMaximize() {
        if (!this.#canMaximize || this.#lockMaximized) return;

        if (this.#isMaximized) {
            this.#restoreWindowSize();
            return;
        }

        this.#maximizeWindow();
    }

    /**
     * Salva a posição atual e ocupa toda a área disponível do desktop.
     */
    #maximizeWindow() {
        if (
            !this.#canMaximize ||
            !this.#windowElement ||
            this.#isMaximized
        ) return;
        
        this.#restorePosition = {
            left: this.#windowElement.style.left,
            top: this.#windowElement.style.top,
            width: this.#windowElement.style.width,
            height: this.#windowElement.style.height
        };

        this.#isMaximized = true;
        this.#windowElement.dataset.windowMaximized = "true";
        this.#windowElement.style.left = "0px";
        this.#windowElement.style.top = "0px";
        this.#windowElement.style.width = "100%";
        this.#windowElement.style.height = "100%";

        this.#updateMaximizeButton("Restaurar", "⧉");
    }

    /**
     * Recupera a posição e o tamanho anteriores à maximização.
     */
    #restoreWindowSize() {
        if (
            !this.#windowElement ||
            !this.#isMaximized ||
            !this.#restorePosition ||
            this.#lockMaximized
        ) {
            return;
        }

        this.#isMaximized = false;
        delete this.#windowElement.dataset.windowMaximized;

        Object.assign(this.#windowElement.style, this.#restorePosition);

        this.#restorePosition = null;
        requestAnimationFrame(() => this.#constrainToContext());
        this.#updateMaximizeButton("Maximizar", "🗖");
        this.focusTask();
    }

    /**
     * Atualiza texto acessível e símbolo do botão maximizar/restaurar.
     *
     * @param {string} label Rótulo acessível.
     * @param {string} symbol Símbolo visual.
     */
    #updateMaximizeButton(label, symbol) {
        if (!this.#maximizeButton) return;

        this.#maximizeButton.title = label;
        this.#maximizeButton.setAttribute("aria-label", label);

        const symbolElement = this.#maximizeButton.querySelector("span");

        if (symbolElement) {
            if (symbol === "⧉") {
                this.#maximizeButton.classList.remove("interface-maximize-button");
                this.#maximizeButton.classList.add("interface-restore-button");
            } else {
                this.#maximizeButton.classList.remove("interface-restore-button");
                this.#maximizeButton.classList.add("interface-maximize-button");
            }

            symbolElement.textContent = symbol;
        }
    }

    /**
     * Corrige a posição restaurada quando a viewport ficou menor.
     */
    #constrainToContext() {
        if (!this.#windowElement || !this.#context || this.#isMaximized) return;

        const maximumX = Math.max(
            0,
            this.#context.clientWidth - this.#windowElement.offsetWidth
        );
        const maximumY = Math.max(
            0,
            this.#context.clientHeight - this.#windowElement.offsetHeight
        );
        const currentX = Number.parseFloat(this.#windowElement.style.left) || 0;
        const currentY = Number.parseFloat(this.#windowElement.style.top) || 0;

        this.#windowElement.style.left = `${Math.max(0, Math.min(currentX, maximumX))}px`;
        this.#windowElement.style.top = `${Math.max(0, Math.min(currentY, maximumY))}px`;
    }

    /**
     * Posiciona a janela inicialmente no centro do desktop.
     */
    #centerWindow() {
        if (!this.#windowElement || !this.#context) return;

        const maximumX = Math.max(
            0,
            this.#context.clientWidth - this.#windowElement.offsetWidth
        );
        const maximumY = Math.max(
            0,
            this.#context.clientHeight - this.#windowElement.offsetHeight
        );

        this.#windowElement.style.left = `${maximumX / 2}px`;
        this.#windowElement.style.top = `${maximumY / 2}px`;
    }

    /**
     * Normaliza números em pixels e mantém strings CSS válidas.
     *
     * @param {number|string} dimension Dimensão recebida.
     * @returns {string} Dimensão pronta para uso no style.
     */
    static #normalizeDimension(dimension) {
        return typeof dimension === "number"
            ? `${dimension}px`
            : String(dimension);
    }
}
