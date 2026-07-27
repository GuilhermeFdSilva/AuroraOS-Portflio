import { ApplicationManager } from "../../aplications/applicationManager.js";
import { Task } from "../../task/task.js";
import { SessionScreem } from "../../sessionScreem/sessionScreem.js";
import { StartMenuItemManager } from "./startMenuItemManager.js";

export class StartMenu {
    static #startMenu = null;
    static #startMenuButton = null;
    static #startMenuVisible = false;
    static #startMenuTemplateCache = null;
    static #itemManager = null;
    static #powerEntry = null;
    
    static async configInstance(button) {
        if (StartMenu.#startMenu) {
            return StartMenu.#startMenu;
        }

        if (!(button instanceof HTMLElement)) {
            throw new TypeError("A valid start menu button is required.");
        }

        StartMenu.#startMenu = await StartMenu.#loadStartMenu();
        StartMenu.#startMenuButton = button;

        StartMenu.#configureMenuItems();
        StartMenu.#configureSystemActions();
        StartMenu.#configureVisibilityEvents();

        return StartMenu.#startMenu;
    }

    static getInstance() {
        if (!StartMenu.#startMenuButton) {
            throw new Error("StartMenu instance not created yet.");
        }

        return StartMenu.#startMenuButton;
    }

    static async #loadStartMenuTemplate() {
        if (StartMenu.#startMenuTemplateCache) {
            return StartMenu.#startMenuTemplateCache;
        }

        const response = await fetch("./components/taskbar/startMenu/startMenu.html");
        StartMenu.#startMenuTemplateCache = await response.text();

        return StartMenu.#startMenuTemplateCache;
    }

    static async #loadStartMenu() {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = await StartMenu.#loadStartMenuTemplate();

        return wrapper.firstElementChild;
    }

    static #configureMenuItems() {
        const programsContainer = StartMenu.#startMenu.querySelector(
            "#start-menu-programs-container"
        );

        StartMenu.#itemManager = new StartMenuItemManager(
            programsContainer,
            {
                onApplicationSelected: () => StartMenu.#hideStartMenu(),
                onListOpened: () => StartMenu.#closePowerOptions()
            }
        );

        StartMenu.#itemManager.render([
            {
                type: "list",
                label: "Aplicativos",
                iconSrc: "assets/apps.png",
                iconAlt: "Aplicativos",
                items: [
                    {
                        type: "application",
                        label: "Bloco de notas",
                        iconSrc: "assets/bloco_de_notas.png",
                        iconAlt: "Bloco de notas",
                        action: () => ApplicationManager.open(
                            "notepad"
                        )
                    },
                    {
                        type: "application",
                        label: "Calculadora",
                        iconSrc: "assets/calculadora.png",
                        iconAlt: "Calculadora",
                        action: () => ApplicationManager.open(
                            "calculator"
                        )
                    }
                ]
            },
            {
                type: "list",
                label: "Documentos",
                iconSrc: "assets/docs.png",
                iconAlt: "Documentos",
                items: [
                    {
                        type: "application",
                        label: "Currículo",
                        iconSrc: "assets/doc.png",
                        iconAlt: "Currículo",
                        action: () => ApplicationManager.open(
                            "resume"
                        )
                    },
                    {
                        type: "application",
                        label: "Projetos",
                        iconSrc: "assets/docs.png",
                        iconAlt: "Projetos",
                        action: () => ApplicationManager.open(
                            "projects"
                        )
                    }
                ]
            }
        ]);
    }

    static #configureSystemActions() {
        const logoffButton = StartMenu.#startMenu.querySelector(
            "#start-menu-logoff-button"
        );
        const powerButton = StartMenu.#startMenu.querySelector(
            "#start-menu-power-button"
        );
        const restartButton = StartMenu.#startMenu.querySelector(
            "#restart-button"
        );
        const shutdownButton = StartMenu.#startMenu.querySelector(
            "#shutdown-button"
        );

        StartMenu.#powerEntry = StartMenu.#startMenu.querySelector(
            "#start-menu-power-entry"
        );

        logoffButton.addEventListener("click", async event => {
            event.stopPropagation();
            StartMenu.#hideStartMenu();

            Task.getOpenTasks().forEach(task => task.removeTask());

            await SessionScreem.getSessionScreem(
                document.getElementById("session-container")
            );
        });

        powerButton.addEventListener("click", event => {
            event.stopPropagation();

            const shouldOpen = !StartMenu.#powerEntry.classList.contains(
                "start-menu-list-open"
            );

            StartMenu.#itemManager.closeLists();
            StartMenu.#closePowerOptions();

            if (shouldOpen) {
                StartMenu.#powerEntry.classList.add("start-menu-list-open");
                powerButton.setAttribute("aria-expanded", "true");
            }
        });

        restartButton.addEventListener("click", event => {
            event.stopPropagation();
            window.location.reload();
        });

        shutdownButton.addEventListener("click", event => {
            event.stopPropagation();
            StartMenu.#shutdownSystem();
        });
    }

    static #configureVisibilityEvents() {
        StartMenu.#startMenuButton.addEventListener("click", event => {
            event.stopPropagation();

            if (StartMenu.#startMenuVisible) {
                StartMenu.#hideStartMenu();
            } else {
                StartMenu.#showStartMenu();
            }
        });

        document.addEventListener("click", event => {
            const clickedOutsideMenu = !StartMenu.#startMenu.contains(event.target);
            const clickedOutsideButton = !StartMenu.#startMenuButton.contains(event.target);

            if (
                StartMenu.#startMenuVisible &&
                clickedOutsideMenu &&
                clickedOutsideButton
            ) {
                StartMenu.#hideStartMenu();
            }
        });

        document.addEventListener("keydown", event => {
            if (StartMenu.#startMenuVisible && event.key === "Escape") {
                StartMenu.#hideStartMenu();
            }
        });
    }

    static #showStartMenu() {
        StartMenu.#startMenuVisible = true;
        StartMenu.#startMenu.style.display = "flex";
    }

    static #hideStartMenu() {
        StartMenu.#startMenuVisible = false;
        StartMenu.#startMenu.style.display = "none";
        StartMenu.#itemManager?.closeLists();
        StartMenu.#closePowerOptions();
    }

    static #closePowerOptions() {
        if (!StartMenu.#powerEntry) return;

        StartMenu.#powerEntry.classList.remove("start-menu-list-open");
        StartMenu.#powerEntry
            .querySelector(":scope > #start-menu-power-button")
            ?.setAttribute("aria-expanded", "false");
    }

    static #shutdownSystem() {
        StartMenu.#hideStartMenu();
        Task.getOpenTasks().forEach(task => task.removeTask());

        document.getElementById("desktop").style.display = "none";
        document.getElementById("taskbar").style.display = "none";

        const shutdownScreen = document.createElement("section");
        const message = document.createElement("p");
        const powerButton = document.createElement("button");

        shutdownScreen.id = "shutdown-screen";
        message.textContent = "AuroraOS foi desligado.";
        powerButton.type = "button";
        powerButton.classList.add("interface-button");
        powerButton.textContent = "Ligar";
        powerButton.addEventListener("click", () => window.location.reload());

        shutdownScreen.append(message, powerButton);
        document.body.appendChild(shutdownScreen);
    }
}
