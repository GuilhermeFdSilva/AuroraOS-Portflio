/**
 * Inicializa o visualizador do currículo e suas ações já existentes.
 */
export class Resume {
    static #pdfUrl = new URL(
        "../../../assets/CV - Guilherme França - back-end (29.26.26).pdf",
        import.meta.url
    ).href;

    static #stylesheets = [
        {
            id: "system-root",
            url: new URL("../../../css/main/root.css", import.meta.url).href
        },
        {
            id: "resume",
            url: new URL("./resume.css", import.meta.url).href
        }
    ];

    /**
     * Configura os botões e prepara cada iframe do currículo.
     */
    static configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("Um container válido é obrigatório.");
        }

        Resume.#configureActions(container);

        container.querySelectorAll(".resume-iframe").forEach(frame => {
            if (!(frame instanceof HTMLIFrameElement)) return;

            if (frame.dataset.resumeConfigured !== "true") {
                frame.dataset.resumeConfigured = "true";
                frame.addEventListener("load", () => Resume.#applyStyles(frame));
            }

            if (["interactive", "complete"].includes(frame.contentDocument?.readyState)) {
                Resume.#applyStyles(frame);
            }
        });
    }

    /**
     * Injeta no iframe as folhas de estilo usadas pelas páginas A4.
     */
    static #applyStyles(frame) {
        const iframeDocument = frame.contentDocument ?? frame.contentWindow?.document;

        if (!iframeDocument?.head) return;

        Resume.#stylesheets.forEach(stylesheetConfig => {
            const selector = `link[data-resume-stylesheet="${stylesheetConfig.id}"]`;

            if (iframeDocument.head.querySelector(selector)) return;

            const stylesheet = iframeDocument.createElement("link");

            stylesheet.rel = "stylesheet";
            stylesheet.href = stylesheetConfig.url;
            stylesheet.dataset.resumeStylesheet = stylesheetConfig.id;
            iframeDocument.head.appendChild(stylesheet);
        });
    }

    /**
     * Mantém as ações existentes de impressão e download do PDF.
     */
    static #configureActions(container) {
        const printButton = container.querySelector(".resume-print-button");
        const downloadButton = container.querySelector(".resume-download-button");

        printButton?.addEventListener("click", () => Resume.#printPdf());
        downloadButton?.addEventListener("click", () => Resume.#downloadPdf());
    }

    /**
     * Abre o PDF em um iframe temporário e chama a impressão do navegador.
     */
    static #printPdf() {
        const iframe = document.createElement("iframe");

        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.src = Resume.#pdfUrl;

        iframe.addEventListener("load", () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => iframe.remove(), 1000);
        }, { once: true });

        document.body.appendChild(iframe);
    }

    /**
     * Cria um link temporário para baixar o mesmo PDF exibido.
     */
    static #downloadPdf() {
        const link = document.createElement("a");

        link.href = Resume.#pdfUrl;
        link.download = "CV_Guilherme_Franca_Backend.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
