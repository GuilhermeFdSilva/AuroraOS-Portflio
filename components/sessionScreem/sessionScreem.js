/**
 * Controla a tela de entrada exibida antes do acesso ao desktop.
 */
export class SessionScreem {
    static #instance = null;
    static #context = null;
    static #sessionScreemTemplateCache = null;

    /**
     * Cria a tela de sessão uma única vez e a adiciona ao container.
     */
    static async getSessionScreem(container) {
        if (SessionScreem.#instance) {
            return SessionScreem.#instance;
        }

        if (!(container instanceof HTMLElement)) {
            throw new TypeError("A valid session container is required.");
        }

        const sessionScreemHTML = await SessionScreem.#loadSessionScreemTemplate();
        const wrapper = document.createElement("div");

        wrapper.innerHTML = sessionScreemHTML;

        const sessionElement = wrapper.firstElementChild;

        if (!(sessionElement instanceof HTMLElement)) {
            throw new Error("O template da tela de sessão é inválido.");
        }

        const loginButton = sessionElement.querySelector("#session-btn-login");

        if (!(loginButton instanceof HTMLButtonElement)) {
            throw new Error("O botão de entrada não foi encontrado.");
        }

        SessionScreem.#context = container;
        SessionScreem.#instance = sessionElement;

        loginButton.addEventListener("click", () => SessionScreem.destroy());
        SessionScreem.#context.appendChild(SessionScreem.#instance);

        return SessionScreem.#instance;
    }

    /**
     * Remove a tela de sessão e libera suas referências.
     */
    static destroy() {
        SessionScreem.#instance?.remove();
        SessionScreem.#instance = null;
        SessionScreem.#context = null;
    }

    /**
     * Carrega e mantém em cache o HTML da tela de sessão.
     */
    static async #loadSessionScreemTemplate() {
        if (SessionScreem.#sessionScreemTemplateCache) {
            return SessionScreem.#sessionScreemTemplateCache;
        }

        const response = await fetch("./components/sessionScreem/sessionScreem.html");

        if (!response.ok) {
            throw new Error(`Não foi possível carregar a tela de sessão: ${response.status}`);
        }

        SessionScreem.#sessionScreemTemplateCache = await response.text();
        return SessionScreem.#sessionScreemTemplateCache;
    }
}
