/**
 * Integra o js-dos ao AuroraOS sem adicionar o runtime ao carregamento inicial.
 * O runtime e o bundle do jogo são requisitados apenas quando o app é aberto.
 */
export class Doom {
    static #runtimeScriptUrl = "https://v8.js-dos.com/latest/js-dos.js";
    static #runtimeStyleUrl = "https://v8.js-dos.com/latest/js-dos.css";
    static #emulatorPath = "https://v8.js-dos.com/latest/emulators/";
    static #localBundleUrl =
        "./components/aplications/doom/doom.jsdos";
    static #fallbackBundleUrl =
        "https://v8.js-dos.com/bundles/doom.jsdos";

    static #runtimePromise = null;
    static #stylePromise = null;

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

            const [, , bundleUrl] = await Promise.all([
                Doom.#loadRuntimeStyle(),
                Doom.#loadRuntimeScript(),
                Doom.#resolveBundleUrl()
            ]);

            if (!container.isConnected) {
                return;
            }

            if (typeof window.Dos !== "function") {
                throw new Error("A API do js-dos não foi disponibilizada.");
            }

            Doom.#setStatus(
                statusMessage,
                bundleUrl === Doom.#localBundleUrl
                    ? "Emulador pronto. Abrindo o DOOM local..."
                    : "Emulador pronto. Baixando os arquivos do DOOM..."
            );

            const dos = window.Dos(playerElement, {
                url: bundleUrl,
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
            Doom.#observeLifecycle(container, dos);
        } catch (error) {
            console.error("Não foi possível iniciar o DOOM.", error);
            Doom.#showError(statusElement, statusMessage);
        }
    }

    /**
     * Usa o bundle local quando ele existir e mantém o CDN como fallback.
     * A requisição HEAD só ocorre depois que o usuário abre a aplicação.
     */
    static async #resolveBundleUrl() {
        try {
            const response = await fetch(Doom.#localBundleUrl, {
                method: "HEAD",
                cache: "no-store"
            });

            if (response.ok) {
                return Doom.#localBundleUrl;
            }
        } catch {
            // GitHub Pages retorna 404 quando o bundle local não foi adicionado.
        }

        return Doom.#fallbackBundleUrl;
    }

    /** Carrega a folha de estilos do js-dos apenas uma vez. */
    static #loadRuntimeStyle() {
        if (Doom.#stylePromise) {
            return Doom.#stylePromise;
        }

        const existingLink = document.querySelector(
            'link[data-doom-runtime-style="true"]'
        );

        if (existingLink instanceof HTMLLinkElement) {
            Doom.#stylePromise = Promise.resolve();
            return Doom.#stylePromise;
        }

        Doom.#stylePromise = new Promise((resolve, reject) => {
            const link = document.createElement("link");

            link.rel = "stylesheet";
            link.href = Doom.#runtimeStyleUrl;
            link.dataset.doomRuntimeStyle = "true";
            link.addEventListener("load", resolve, { once: true });
            link.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar o CSS do js-dos.")),
                { once: true }
            );

            document.head.appendChild(link);
        }).catch(error => {
            Doom.#stylePromise = null;
            throw error;
        });

        return Doom.#stylePromise;
    }

    /** Carrega o JavaScript do js-dos apenas uma vez. */
    static #loadRuntimeScript() {
        if (typeof window.Dos === "function") {
            return Promise.resolve();
        }

        if (Doom.#runtimePromise) {
            return Doom.#runtimePromise;
        }

        const existingScript = document.querySelector(
            'script[data-doom-runtime-script="true"]'
        );

        if (existingScript instanceof HTMLScriptElement) {
            Doom.#runtimePromise = new Promise((resolve, reject) => {
                if (typeof window.Dos === "function") {
                    resolve();
                    return;
                }

                existingScript.addEventListener("load", resolve, { once: true });
                existingScript.addEventListener("error", reject, { once: true });
            });

            return Doom.#runtimePromise;
        }

        Doom.#runtimePromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");

            script.src = Doom.#runtimeScriptUrl;
            script.async = true;
            script.dataset.doomRuntimeScript = "true";
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar o js-dos.")),
                { once: true }
            );

            document.head.appendChild(script);
        }).catch(error => {
            Doom.#runtimePromise = null;
            throw error;
        });

        return Doom.#runtimePromise;
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
    static #observeLifecycle(container, dos) {
        const windowElement = container.closest(".application-window");
        const desktopElement = windowElement?.parentElement;
        let disposed = false;
        let observer = null;

        const dispose = () => {
            if (disposed) return;

            disposed = true;
            observer?.disconnect();

            Promise.resolve(dos.stop?.()).catch(error => {
                console.warn("Não foi possível encerrar o emulador.", error);
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
