import { Window } from "../window/window.js";
import { Dialog } from "../dialog/dialog.js";

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
                contentSrc: "./components/aplications/notepad/notepad.html",
                moduleSrc: "./notepad/notepad.js",
                exportName: "Notepad"
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
                contentSrc: "./components/aplications/projects/projects.html",
                moduleSrc: "./projects/projects.js",
                exportName: "Projects",
                startMaximized: true
            }
        ],
        [
            "doom",
            {
                title: "DOOM",
                iconSrc: "./assets/DOOM.png",
                iconAlt: "DOOM",
                contentSrc: "./components/aplications/doom/doom.html",
                moduleSrc: "./doom/doom.js",
                exportName: "Doom",
                startMaximized: true,
                lockMaximized: true,
                desktopOnly: true,
                singleInstance: true
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
     * @returns {Window|Dialog|import("../task/task.js").Task} Tarefa criada ou recuperada.
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
            desktopOnly = false,
            singleInstance = false,
            ...windowConfig
        } = application;

        if (desktopOnly && ApplicationManager.#isMobileDevice()) {
            return new Dialog(ApplicationManager.#context, {
                title: `${windowConfig.title} indisponível`,
                message:
                    "Esta versão do jogo foi preparada apenas para computadores. Abra o portfólio em um desktop ou notebook para jogar.",
                iconSrc: "./assets/alert.png",
                iconAlt: "Alerta"
            });
        }

        if (singleInstance) {
            const openApplication = Window.getOpenTasks().find(
                task => task.taskTitle === windowConfig.title
            );

            if (openApplication) {
                openApplication.focusTask();
                return openApplication;
            }
        }

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
     * Identifica celulares e tablets antes de criar aplicações incompatíveis.
     * Mantém notebooks com tela sensível ao toque fora do bloqueio sempre que
     * o navegador informa explicitamente que o dispositivo não é mobile.
     *
     * @returns {boolean} Verdadeiro quando a interface é de um dispositivo móvel.
     */
    static #isMobileDevice() {
        if (navigator.userAgentData?.mobile === true) {
            return true;
        }

        const mobileUserAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i;
        const isIPadDesktopMode =
            navigator.platform === "MacIntel" &&
            navigator.maxTouchPoints > 1;

        if (mobileUserAgent.test(navigator.userAgent) || isIPadDesktopMode) {
            return true;
        }

        return window.matchMedia(
            "(max-width: 900px) and (pointer: coarse)"
        ).matches;
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
