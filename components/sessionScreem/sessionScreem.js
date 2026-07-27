export class SessionScreem {
    static #instance = null;
    static #context = null;
    static #sessionScreemTemplateCache = null;

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

        SessionScreem.#context = container;
        SessionScreem.#instance = wrapper.firstElementChild;

        SessionScreem.#instance
            .querySelector("#session-btn-login")
            .addEventListener("click", () => SessionScreem.destroy());

        SessionScreem.#context.appendChild(SessionScreem.#instance);

        return SessionScreem.#instance;
    }

    static destroy() {
        SessionScreem.#instance?.remove();
        SessionScreem.#instance = null;
        SessionScreem.#context = null;
    }

    static async #loadSessionScreemTemplate() {
        if (SessionScreem.#sessionScreemTemplateCache) {
            return SessionScreem.#sessionScreemTemplateCache;
        }

        const response = await fetch("./components/sessionScreem/sessionScreem.html");
        SessionScreem.#sessionScreemTemplateCache = await response.text();

        return SessionScreem.#sessionScreemTemplateCache;
    }
}
