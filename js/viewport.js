/**
 * Mantém variáveis CSS sincronizadas com a área realmente visível da tela.
 */
export class Viewport {
    static #resizeFrame = null;
    static #isConfigured = false;

    /**
     * Registra os eventos de redimensionamento apenas uma vez.
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
     * Agrupa várias mudanças rápidas em uma única atualização visual.
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
     * Copia largura, altura e deslocamento da viewport para o CSS global.
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
