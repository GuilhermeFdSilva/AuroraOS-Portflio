import { Viewport } from "./viewport.js";
import { SysBoot } from "../components/sysBoot/bootTerminal.js";
import { SessionScreem } from "../components/sessionScreem/sessionScreem.js";
import { Taskbar } from "../components/taskbar/taskbar.js";
import { Dialog } from "../components/dialog/dialog.js";
import { Window } from "../components/window/window.js";
import { Desktop } from "../components/desktop/desktop.js";

Viewport.configure();

const bootElement = document.getElementById("boot-container");
const sessionElement = document.getElementById("session-container");
const desktopElement = document.getElementById("desktop");
const taskbarElement = document.getElementById("taskbar");

const sysBoot = await SysBoot.getSysBoot(bootElement);
const sessionScreem = await SessionScreem.getSessionScreem(sessionElement);
const taskbar = await Taskbar.getTaskbar(taskbarElement);

const openApplicationWindow = ({ title, iconSrc }) => {
    new Window(desktopElement, {
        title,
        iconSrc,
        iconAlt: title,
        contentSrc: "./components/window/content/wip.html"
    });
};

new Desktop(desktopElement, {
    shortcuts: [
        {
            id: "notepad",
            label: "Bloco de notas",
            iconSrc: "./assets/bloco_de_notas.png",
            iconAlt: "Bloco de notas",
            action: () => openApplicationWindow({
                title: "Bloco de notas",
                iconSrc: "./assets/bloco_de_notas.png"
            })
        },
        {
            id: "calculator",
            label: "Calculadora",
            iconSrc: "./assets/calculadora.png",
            iconAlt: "Calculadora",
            action: () => openApplicationWindow({
                title: "Calculadora",
                iconSrc: "./assets/calculadora.png"
            })
        },
        {
            id: "resume",
            label: "Currículo",
            iconSrc: "./assets/doc.png",
            iconAlt: "Currículo",
            action: () => openApplicationWindow({
                title: "Currículo",
                iconSrc: "./assets/doc.png"
            })
        },
        {
            id: "projects",
            label: "Projetos",
            iconSrc: "./assets/docs.png",
            iconAlt: "Projetos",
            action: () => openApplicationWindow({
                title: "Projetos",
                iconSrc: "./assets/docs.png"
            })
        }
    ]
});

sysBoot.startBoot();
