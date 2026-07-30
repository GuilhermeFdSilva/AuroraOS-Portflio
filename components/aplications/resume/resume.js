/**
 * Controla o visualizador do currículo, suas páginas e ações do cabeçalho.
 */
export class Resume {
    static #pdfUrl = new URL(
        "../../../assets/CV_Guilherme_Franca_Backend.pdf",
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

    static #pageWidth = 210 * 96 / 25.4;
    static #pageHeight = 297 * 96 / 25.4;
    static #minimumZoom = 0.35;
    static #maximumZoom = 1.5;
    static #zoomStep = 0.1;

    /**
     * Inicializa os controles do currículo dentro da janela aberta.
     */
    static configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("Um container válido é obrigatório.");
        }

        if (container.dataset.resumeConfigured === "true") return;
        container.dataset.resumeConfigured = "true";

        const state = {
            currentPage: 1,
            totalPages: container.querySelectorAll(".resume-page-frame").length,
            zoom: 1,
            fitMode: true,
            scrollFrame: null
        };

        Resume.#prepareIframes(container);
        Resume.#configureHeaderActions(container);
        Resume.#configureNavigation(container, state);
        Resume.#configureZoom(container, state);
        Resume.#observeContainerSize(container, state);

        requestAnimationFrame(() => Resume.#fitToViewer(container, state));
    }

    /**
     * Aplica os estilos do currículo dentro dos iframes das páginas.
     */
    static #prepareIframes(container) {
        container.querySelectorAll(".resume-iframe").forEach(frame => {
            if (!(frame instanceof HTMLIFrameElement)) return;

            frame.addEventListener(
                "load",
                () => Resume.#applyStyles(frame),
                { once: true }
            );

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
     * Configura impressão, download e redirecionamentos externos do header.
     */
    static #configureHeaderActions(container) {
        container
            .querySelector(".resume-print-button")
            ?.addEventListener("click", () => Resume.#printPdf());

        container
            .querySelector(".resume-download-button")
            ?.addEventListener("click", () => Resume.#downloadPdf());

        container.querySelectorAll(".resume-redirect-button").forEach(button => {
            button.addEventListener("click", () => {
                const url = button.dataset.resumeUrl;

                if (url) Resume.#redirectTo(url);
            });
        });
    }

    /**
     * Abre links externos em outra aba e links de e-mail no aplicativo padrão.
     */
    static #redirectTo(url) {
        if (url.startsWith("mailto:")) {
            window.location.href = url;
            return;
        }

        const openedPage = window.open(url, "_blank", "noopener,noreferrer");

        if (openedPage) openedPage.opener = null;
    }

    /**
     * Sincroniza as âncoras do aside, a paginação e a página visível.
     */
    static #configureNavigation(container, state) {
        const viewer = container.querySelector(".resume-viewer");
        const pageLinks = container.querySelectorAll(
            ".resume-thumbnail-link, .resume-pagination-page"
        );
        const previousLink = container.querySelector(".resume-pagination-previous");
        const nextLink = container.querySelector(".resume-pagination-next");

        if (!(viewer instanceof HTMLElement) || !state.totalPages) return;

        pageLinks.forEach(link => {
            link.addEventListener("click", () => {
                const page = Number(link.dataset.resumePage);

                if (Number.isInteger(page)) {
                    Resume.#setCurrentPage(container, state, page);
                }
            });
        });

        previousLink?.addEventListener("click", event => {
            if (state.currentPage === 1) event.preventDefault();
        });

        nextLink?.addEventListener("click", event => {
            if (state.currentPage === state.totalPages) event.preventDefault();
        });

        viewer.addEventListener(
            "scroll",
            () => Resume.#scheduleVisiblePageUpdate(container, state),
            { passive: true }
        );

        Resume.#setCurrentPage(container, state, 1);
    }

    /**
     * Evita calcular a página atual várias vezes durante a mesma rolagem.
     */
    static #scheduleVisiblePageUpdate(container, state) {
        if (state.scrollFrame !== null) return;

        state.scrollFrame = requestAnimationFrame(() => {
            state.scrollFrame = null;
            Resume.#updateVisiblePage(container, state);
        });
    }

    /**
     * Localiza a página mais próxima do topo da área de visualização.
     */
    static #updateVisiblePage(container, state) {
        const viewer = container.querySelector(".resume-viewer");
        const pages = [...container.querySelectorAll(".resume-page-frame")];

        if (!(viewer instanceof HTMLElement) || !pages.length) return;

        const viewerTop = viewer.getBoundingClientRect().top;
        let closestPage = state.currentPage;
        let closestDistance = Number.POSITIVE_INFINITY;

        pages.forEach(pageElement => {
            const page = Number(pageElement.dataset.resumePage);
            const distance = Math.abs(pageElement.getBoundingClientRect().top - viewerTop);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestPage = page;
            }
        });

        Resume.#setCurrentPage(container, state, closestPage);
    }

    /**
     * Destaca a página atual e atualiza os links anterior e próximo.
     */
    static #setCurrentPage(container, state, page) {
        const normalizedPage = Math.max(1, Math.min(page, state.totalPages));

        state.currentPage = normalizedPage;

        container.querySelectorAll(
            ".resume-thumbnail-link, .resume-pagination-page"
        ).forEach(element => {
            const isCurrent = Number(element.dataset.resumePage) === normalizedPage;

            element.classList.toggle("is-active", isCurrent);

            if (isCurrent) {
                element.setAttribute("aria-current", "page");
            } else {
                element.removeAttribute("aria-current");
            }
        });

        const currentPageElement = container.querySelector(".resume-current-page");
        const totalPagesElement = container.querySelector(".resume-total-pages");
        const previousLink = container.querySelector(".resume-pagination-previous");
        const nextLink = container.querySelector(".resume-pagination-next");
        const previousPage = Math.max(1, normalizedPage - 1);
        const nextPage = Math.min(state.totalPages, normalizedPage + 1);

        if (currentPageElement) currentPageElement.textContent = normalizedPage;
        if (totalPagesElement) totalPagesElement.textContent = state.totalPages;

        Resume.#updatePaginationControl(
            previousLink,
            previousPage,
            normalizedPage === 1
        );
        Resume.#updatePaginationControl(
            nextLink,
            nextPage,
            normalizedPage === state.totalPages
        );
    }

    /**
     * Atualiza o destino e o estado visual de um controle de paginação.
     */
    static #updatePaginationControl(control, page, disabled) {
        if (!(control instanceof HTMLAnchorElement)) return;

        control.href = `#resume-page-${page}`;
        control.setAttribute("aria-disabled", String(disabled));
        control.classList.toggle("is-disabled", disabled);
    }

    /**
     * Configura os botões de aumentar, diminuir e ajustar o zoom.
     */
    static #configureZoom(container, state) {
        container
            .querySelector(".resume-zoom-out")
            ?.addEventListener("click", () => {
                state.fitMode = false;
                Resume.#applyZoom(container, state, state.zoom - Resume.#zoomStep);
            });

        container
            .querySelector(".resume-zoom-in")
            ?.addEventListener("click", () => {
                state.fitMode = false;
                Resume.#applyZoom(container, state, state.zoom + Resume.#zoomStep);
            });

        container
            .querySelector(".resume-zoom-fit")
            ?.addEventListener("click", () => {
                state.fitMode = true;
                Resume.#fitToViewer(container, state);
            });
    }

    /**
     * Ajusta automaticamente a largura da folha ao espaço disponível.
     */
    static #fitToViewer(container, state) {
        const viewer = container.querySelector(".resume-viewer");

        if (!(viewer instanceof HTMLElement)) return;

        const viewerStyle = getComputedStyle(viewer);
        const horizontalPadding =
            Number.parseFloat(viewerStyle.paddingLeft) +
            Number.parseFloat(viewerStyle.paddingRight);
        const availableWidth = Math.max(0, viewer.clientWidth - horizontalPadding - 2);
        const fittedZoom = Math.min(1, availableWidth / Resume.#pageWidth);

        Resume.#applyZoom(container, state, fittedZoom);
    }

    /**
     * Redimensiona os quadros e escala somente o conteúdo dos iframes.
     */
    static #applyZoom(container, state, requestedZoom) {
        const zoom = Math.max(
            Resume.#minimumZoom,
            Math.min(Resume.#maximumZoom, requestedZoom)
        );
        const frameWidth = Resume.#pageWidth * zoom;
        const frameHeight = Resume.#pageHeight * zoom;

        state.zoom = zoom;

        container.querySelectorAll(".resume-page-frame").forEach(frame => {
            frame.style.width = `${frameWidth}px`;
            frame.style.height = `${frameHeight}px`;
        });

        container.querySelectorAll(".resume-viewer-iframe").forEach(frame => {
            frame.style.transform = `scale(${zoom})`;
        });

        const zoomValue = container.querySelector(".resume-zoom-value");
        const zoomOut = container.querySelector(".resume-zoom-out");
        const zoomIn = container.querySelector(".resume-zoom-in");

        if (zoomValue) zoomValue.textContent = `${Math.round(zoom * 100)}%`;
        if (zoomOut) zoomOut.disabled = zoom <= Resume.#minimumZoom;
        if (zoomIn) zoomIn.disabled = zoom >= Resume.#maximumZoom;
    }

    /**
     * Recalcula o zoom quando a própria janela do currículo muda de tamanho.
     */
    static #observeContainerSize(container, state) {
        if (typeof ResizeObserver !== "function") return;

        const observer = new ResizeObserver(() => {
            if (!container.isConnected) {
                observer.disconnect();
                return;
            }

            if (state.fitMode) Resume.#fitToViewer(container, state);
        });

        observer.observe(container);
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
     * Cria um link temporário para baixar o PDF do currículo.
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
