import { Viewport } from "./viewport.js";
import { SysBoot } from "../components/sysBoot/bootTerminal.js";
import { SessionScreem } from "../components/sessionScreem/sessionScreem.js";
import { Taskbar } from "../components/taskbar/taskbar.js";
import { Dialog } from "../components/dialog/dialog.js";
import { Desktop } from "../components/desktop/desktop.js";
import { ApplicationManager } from "../components/aplications/applicationManager.js";

Viewport.configure();

const bootElement = document.getElementById("boot-container");
const sessionElement = document.getElementById("session-container");
const desktopElement = document.getElementById("desktop");
const taskbarElement = document.getElementById("taskbar");

const sysBoot = await SysBoot.getSysBoot(bootElement);
const sessionScreem = await SessionScreem.getSessionScreem(sessionElement);
const taskbar = await Taskbar.getTaskbar(taskbarElement);
const desktop = await Desktop.getDesktop(desktopElement);

sysBoot.startBoot();

ApplicationManager.configure(desktopElement);
ApplicationManager.open("resume");
