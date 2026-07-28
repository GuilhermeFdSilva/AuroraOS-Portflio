export class Resume {
    static #stylesheets = [
        {
            id: "system-root",
            url: new URL(
                "../../../css/main/root.css",
                import.meta.url
            ).href
        },
        {
            id: "resume",
            url: new URL(
                "./resume.css",
                import.meta.url
            ).href
        }
    ];

    /**
     * Registra o carregamento dos iframes do currículo.
     *
     * @param {HTMLElement} container Conteúdo da Window do currículo.
     */
    static configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError(
                "Um container válido é obrigatório."
            );
        }

        Resume.#configureActions(container);
        const frames = container.querySelectorAll(
            ".resume-iframe"
        );

        frames.forEach(frame => {
            if (!(frame instanceof HTMLIFrameElement)) {
                return;
            }

            if (frame.dataset.resumeConfigured !== "true") {
                frame.dataset.resumeConfigured = "true";

                frame.addEventListener(
                    "load",
                    () => Resume.#applyStyles(frame)
                );
            }

            if (
                frame.contentDocument?.readyState === "interactive" ||
                frame.contentDocument?.readyState === "complete"
            ) {
                Resume.#applyStyles(frame);
            }
        });
    }

    /**
     * Insere as folhas de estilo necessárias dentro do documento do iframe.
     *
     * @param {HTMLIFrameElement} frame Iframe de uma página do currículo.
     */
    static #applyStyles(frame) {
        const iframeDocument =
            frame.contentDocument ??
            frame.contentWindow?.document;

        if (!iframeDocument?.head) {
            return;
        }

        Resume.#stylesheets.forEach(stylesheetConfig => {
            const selector =
                `link[data-resume-stylesheet="${stylesheetConfig.id}"]`;

            if (iframeDocument.head.querySelector(selector)) {
                return;
            }

            const stylesheet =
                iframeDocument.createElement("link");

            stylesheet.rel = "stylesheet";
            stylesheet.href = stylesheetConfig.url;
            stylesheet.dataset.resumeStylesheet =
                stylesheetConfig.id;

            iframeDocument.head.appendChild(stylesheet);
        });
    }

    static #configureActions(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError(
                "Um container válido é obrigatório."
            );
        }

        const print = container.querySelector(".resume-print-button");
        const download = container.querySelector(".resume-download-button");

        print.addEventListener("click", () => {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';

            iframe.src = "./assets/CV - Guilherme França - back-end (29.26.26).pdf";

            iframe.onload = function () {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();

                setTimeout(() => document.body.removeChild(iframe), 1000);
            };

            document.body.appendChild(iframe);
        });

        download.addEventListener("click", () => {
            const link = document.createElement("a");
            link.href = "./assets/CV - Guilherme França - back-end (29.26.26).pdf";
            link.download = "CV_Guilherme_Franca_Backend.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}
