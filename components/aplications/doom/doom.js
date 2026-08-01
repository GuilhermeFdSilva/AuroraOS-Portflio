/**
 * Integra o js-dos ao AuroraOS sem adicionar o runtime ao carregamento inicial.
 *
 * O emulador é carregado dentro de um iframe da própria aplicação. Essa
 * separação impede que o CSS externo do js-dos altere cores, fontes ou outros
 * estilos globais do AuroraOS.
 */
export class Doom {
    static #runtimeScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
    static #runtimeStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";
    static #emulatorPath = "https://v8.js-dos.com/latest/emulators/";
    static #bundleUrl = "https://v8.js-dos.com/bundles/doom.jsdos";

    /**
     * Inicializa o emulador dentro do conteúdo da Window.
     *
     * @param {HTMLElement} container Corpo da janela do DOOM.
     */
    static async configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("O container do DOOM é inválido.");
        }

        if (container.dataset.doomConfigured === "true") {
            return;
        }

        container.dataset.doomConfigured = "true";
        container.classList.add("doom-window-content");

        const playerElement = container.querySelector("[data-doom-player]");
        const statusElement = container.querySelector("[data-doom-status]");
        const statusMessage = container.querySelector(
            "[data-doom-status-message]"
        );

        if (!(playerElement instanceof HTMLDivElement)) {
            throw new Error("A área de renderização do DOOM não foi encontrada.");
        }

        try {
            Doom.#setStatus(
                statusMessage,
                "Carregando o emulador somente para esta aplicação..."
            );

            const runtime = await Doom.#createIsolatedRuntime(playerElement);

            if (!container.isConnected) {
                runtime.frame.remove();
                return;
            }

            Doom.#setStatus(
                statusMessage,
                "Emulador pronto. Baixando os arquivos do DOOM..."
            );

            const dos = runtime.frameWindow.Dos(runtime.mountElement, {
                url: Doom.#bundleUrl,
                pathPrefix: Doom.#emulatorPath,
                autoStart: true,
                backend: "dosbox",
                backendLocked: true,
                workerThread: true,
                offscreenCanvas: false,
                kiosk: true,
                theme: "dark",
                renderBackend: "webgl",
                renderAspect: "Fit",
                imageRendering: "pixelated",
                mouseCapture: false,
                noCursor: false,
                volume: 0.7,
                fsChanges: {
                    local: true
                },
                onEvent: event => {
                    Doom.#handleEmulatorEvent(
                        event,
                        statusElement,
                        statusMessage
                    );
                }
            });

            dos.setNoCloud?.(true);
            Doom.#observeLifecycle(container, dos, runtime.frame);
        } catch (error) {
            console.error("Não foi possível iniciar o DOOM.", error);
            Doom.#showError(statusElement, statusMessage);
        }
    }

    /**
     * Cria um documento isolado para o js-dos.
     *
     * O stylesheet do emulador possui regras globais. Ao carregá-lo dentro de
     * um iframe, essas regras ficam restritas ao jogo e não mudam a aparência
     * do portfólio.
     *
     * @param {HTMLDivElement} playerElement Área reservada para o jogo.
     * @returns {Promise<{
     *   frame: HTMLIFrameElement,
     *   frameWindow: Window,
     *   mountElement: HTMLDivElement
     * }>}
     */
    static async #createIsolatedRuntime(playerElement) {
        const frame = document.createElement("iframe");

        frame.className = "doom-runtime-frame";
        frame.title = "DOOM executado pelo js-dos";
        frame.setAttribute("allow", "autoplay; fullscreen; gamepad");
        frame.setAttribute("aria-label", "Tela do jogo DOOM");

        const frameReady = new Promise((resolve, reject) => {
            frame.addEventListener("load", resolve, { once: true });
            frame.addEventListener(
                "error",
                () => reject(new Error("Falha ao criar a tela isolada do DOOM.")),
                { once: true }
            );
        });

        frame.srcdoc = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        html, body, #dos-root {
            width: 100%;
            height: 100%;
            min-width: 0;
            min-height: 0;
            margin: 0;
            overflow: hidden;
            background: #000;
        }

        * {
            box-sizing: border-box;
        }

        canvas {
            max-width: 100%;
            max-height: 100%;
            image-rendering: pixelated;
        }
    </style>
</head>
<body>
    <div id="dos-root"></div>
</body>
</html>`;

        playerElement.replaceChildren(frame);
        await frameReady;

        const frameDocument = frame.contentDocument;
        const frameWindow = frame.contentWindow;

        if (!frameDocument || !frameWindow) {
            throw new Error("Não foi possível acessar a tela isolada do DOOM.");
        }

        const mountElement = frameDocument.querySelector("#dos-root");

        if (!(mountElement instanceof frameWindow.HTMLDivElement)) {
            throw new Error("A área interna do emulador não foi criada.");
        }

        await Promise.all([
            Doom.#loadStyle(frameDocument),
            Doom.#loadScript(frameDocument)
        ]);

        if (typeof frameWindow.Dos !== "function") {
            throw new Error("A API do js-dos não foi disponibilizada.");
        }

        return {
            frame,
            frameWindow,
            mountElement
        };
    }

    /** Carrega o CSS do js-dos apenas dentro do iframe do jogo. */
    static #loadStyle(frameDocument) {
        return new Promise((resolve, reject) => {
            const link = frameDocument.createElement("link");

            link.rel = "stylesheet";
            link.href = Doom.#runtimeStyleUrl;
            link.addEventListener("load", resolve, { once: true });
            link.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar o CSS do js-dos.")),
                { once: true }
            );

            frameDocument.head.appendChild(link);
        });
    }

    /** Carrega o JavaScript do js-dos apenas dentro do iframe do jogo. */
    static #loadScript(frameDocument) {
        return new Promise((resolve, reject) => {
            const script = frameDocument.createElement("script");

            script.src = Doom.#runtimeScriptUrl;
            script.async = true;
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar o js-dos.")),
                { once: true }
            );

            frameDocument.head.appendChild(script);
        });
    }

    /** Atualiza a tela de carregamento conforme os eventos do emulador. */
    static #handleEmulatorEvent(event, statusElement, statusMessage) {
        if (event === "emu-ready") {
            Doom.#setStatus(
                statusMessage,
                "Preparando o DOSBox e os dispositivos de áudio..."
            );
            return;
        }

        if (event === "bnd-play") {
            Doom.#setStatus(statusMessage, "Iniciando o DOOM...");
            return;
        }

        if (event === "ci-ready" && statusElement instanceof HTMLElement) {
            statusElement.hidden = true;
        }
    }

    /**
     * Pausa a emulação ao minimizar e libera os recursos ao fechar a Window.
     */
    static #observeLifecycle(container, dos, frame) {
        const windowElement = container.closest(".application-window");
        const desktopElement = windowElement?.parentElement;
        let disposed = false;
        let observer = null;

        const dispose = () => {
            if (disposed) return;

            disposed = true;
            observer?.disconnect();

            Promise.resolve(dos.stop?.())
                .catch(error => {
                    console.warn("Não foi possível encerrar o emulador.", error);
                })
                .finally(() => {
                    frame.remove();
                });
        };

        const updatePauseState = () => {
            if (!container.isConnected) {
                dispose();
                return;
            }

            if (!(windowElement instanceof HTMLElement)) {
                return;
            }

            const minimized =
                windowElement.hidden ||
                windowElement.dataset.taskMinimized === "true" ||
                windowElement.style.display === "none";

            dos.setPaused?.(minimized);
        };

        observer = new MutationObserver(updatePauseState);

        if (desktopElement instanceof HTMLElement) {
            observer.observe(desktopElement, {
                childList: true
            });
        }

        if (windowElement instanceof HTMLElement) {
            observer.observe(windowElement, {
                attributes: true,
                attributeFilter: ["hidden", "style", "data-task-minimized"]
            });
        }
    }

    /** Mostra uma mensagem amigável quando o CDN ou o navegador falha. */
    static #showError(statusElement, statusMessage) {
        if (statusElement instanceof HTMLElement) {
            statusElement.hidden = false;
            statusElement.dataset.doomError = "true";

            const title = statusElement.querySelector(".doom-loading-title");

            if (title) {
                title.textContent = "Não foi possível iniciar o DOOM";
            }
        }

        Doom.#setStatus(
            statusMessage,
            "Verifique a conexão e recarregue o portfólio. O restante do AuroraOS continua funcionando normalmente."
        );
    }

    /** Atualiza apenas quando o elemento de status existe. */
    static #setStatus(element, message) {
        if (element instanceof HTMLElement) {
            element.textContent = message;
        }
    }
}
