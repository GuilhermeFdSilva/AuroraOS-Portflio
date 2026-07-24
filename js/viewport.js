/**
 * Ajusta valores globais para responsividade.
 */
export class Viewport {
    static #resizeFrame = null;
    static #isConfigured = false;

    /**
     * Configura os listeners que ajustam o as variáveis do tamnaho de tela, para a responsividade do site.
     */
    static configure() {
        if (Viewport.#isConfigured) {
            return;
        }

        Viewport.#isConfigured = true;
        Viewport.#updateSize();

        window.addEventListener("resize", Viewport.#scheduleUpdate, { passive: true });
        window.addEventListener("orientationchange", Viewport.#scheduleUpdate, { passive: true });
        window.visualViewport?.addEventListener("resize", Viewport.#scheduleUpdate, { passive: true });
        window.visualViewport?.addEventListener("scroll", Viewport.#scheduleUpdate, { passive: true });
    }

    /**
     * Agenda a atualização das variáveis da viewport para o próximo repaint, cancelando qualquer atualização pendente.
     */
    static #scheduleUpdate = () => {
        if (Viewport.#resizeFrame !== null) {
            cancelAnimationFrame(Viewport.#resizeFrame);
        }

        Viewport.#resizeFrame = requestAnimationFrame(() => {
            Viewport.#resizeFrame = null;
            Viewport.#updateSize();
        });
    };

    /**
     * Obtem os valores de tamanho da janela atual para injetar nas variáveis globais do CSS
     */
    static #updateSize() {
        const visualViewport = window.visualViewport;
        const viewportHeight = visualViewport?.height ?? window.innerHeight;
        const viewportWidth = visualViewport?.width ?? window.innerWidth;
        const viewportTop = visualViewport?.offsetTop ?? 0;
        const viewportLeft = visualViewport?.offsetLeft ?? 0;

        const rootStyle = document.documentElement.style;

        rootStyle.setProperty("--viewport-height", `${Math.round(viewportHeight)}px`);
        rootStyle.setProperty("--viewport-width", `${Math.round(viewportWidth)}px`);
        rootStyle.setProperty("--viewport-top", `${Math.round(viewportTop)}px`);
        rootStyle.setProperty("--viewport-left", `${Math.round(viewportLeft)}px`);
    }
}
