import { Window } from "../window/window.js";

/**
 * Centraliza a abertura das aplicações e carrega seus módulos sob demanda.
 */
export class ApplicationManager {
    static #context = null;

    static #applications = new Map([
        [
            "notepad",
            {
                title: "Bloco de notas",
                iconSrc: "./assets/bloco_de_notas.png",
                iconAlt: "Bloco de notas",
                contentSrc: "./components/window/content/wip.html"
            }
        ],
        [
            "calculator",
            {
                title: "Calculadora",
                iconSrc: "./assets/calculadora.png",
                iconAlt: "Calculadora",
                width: "fit-content",
                height: "fit-content",
                canMaximize: false,
                contentSrc:
                    "./components/aplications/calculator/calculator.html",
                moduleSrc: "./calculator/calculator.js",
                exportName: "Calculator"
            }
        ],
        [
            "resume",
            {
                title: "Currículo",
                iconSrc: "./assets/doc.png",
                iconAlt: "Currículo",
                contentSrc:
                    "./components/aplications/resume/resume.html",
                moduleSrc: "./resume/resume.js",
                exportName: "Resume",
                startMaximized: true
            }
        ],
        [
            "projects",
            {
                title: "Projetos",
                iconSrc: "./assets/docs.png",
                iconAlt: "Projetos",
                contentSrc: "./components/window/content/wip.html"
            }
        ]
    ]);

    /**
     * Define o elemento que receberá as janelas das aplicações.
     *
     * @param {HTMLElement} context Contexto principal das aplicações.
     */
    static configure(context) {
        if (!(context instanceof HTMLElement)) {
            throw new TypeError(
                "Um contexto válido para as aplicações é obrigatório."
            );
        }

        ApplicationManager.#context = context;
    }

    /**
     * Abre uma aplicação registrada pelo identificador.
     *
     * @param {string} applicationId Identificador da aplicação.
     * @param {object} overrides Ajustes opcionais da Window.
     * @returns {Window} Janela criada.
     */
    static open(applicationId, overrides = {}) {
        if (!(ApplicationManager.#context instanceof HTMLElement)) {
            throw new Error(
                "ApplicationManager ainda não foi configurado."
            );
        }

        const application =
            ApplicationManager.#applications.get(applicationId);

        if (!application) {
            throw new Error(
                `A aplicação "${applicationId}" não está registrada.`
            );
        }

        const {
            moduleSrc,
            exportName,
            ...windowConfig
        } = application;

        const onContentLoaded = moduleSrc
            ? container =>
                ApplicationManager.#initializeApplication(
                    container,
                    moduleSrc,
                    exportName
                )
            : null;

        return new Window(ApplicationManager.#context, {
            ...windowConfig,
            ...overrides,
            onContentLoaded
        });
    }

    /**
     * Importa o módulo apenas quando a aplicação for aberta e executa
     * configure(container), caso a classe exportada possua esse método.
     *
     * @param {HTMLElement} container Conteúdo interno da Window.
     * @param {string} moduleSrc Caminho relativo do módulo.
     * @param {string} exportName Nome da classe exportada.
     */
    static async #initializeApplication(
        container,
        moduleSrc,
        exportName
    ) {
        const moduleUrl = new URL(
            moduleSrc,
            import.meta.url
        );

        const applicationModule = await import(
            moduleUrl.href
        );

        const applicationClass =
            applicationModule[exportName];

        if (
            !applicationClass ||
            typeof applicationClass.configure !== "function"
        ) {
            return;
        }

        await applicationClass.configure(container);
    }
}
