import { LocalStorageManager } from "../../../js/storage/localStorageManager.js";

/** Controla edição, contagem e persistência do Bloco de notas. */
export class Notepad {
    static #storageKey = "applications.notepad.content";

    static configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("Um container válido para o Bloco de notas é obrigatório.");
        }

        const editor = container.querySelector("#notepad-editor");
        const saveButton = container.querySelector("#notepad-save-button");
        const wordCount = container.querySelector("#notepad-word-count");
        const characterCount = container.querySelector("#notepad-character-count");
        const saveStatus = container.querySelector("#notepad-save-status");

        if (
            !(editor instanceof HTMLTextAreaElement) ||
            !(saveButton instanceof HTMLButtonElement) ||
            !(wordCount instanceof HTMLElement) ||
            !(characterCount instanceof HTMLElement) ||
            !(saveStatus instanceof HTMLElement)
        ) {
            throw new Error("A interface do Bloco de notas está incompleta.");
        }

        editor.value = LocalStorageManager.get(Notepad.#storageKey, "");

        const updateCounters = () => {
            const text = editor.value;
            const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
            const characters = text.length;

            wordCount.textContent = `${words} ${words === 1 ? "palavra" : "palavras"}`;
            characterCount.textContent = `${characters} ${characters === 1 ? "caractere" : "caracteres"}`;
        };

        const markAsChanged = () => {
            updateCounters();
            saveStatus.textContent = "Alterações não salvas";
        };

        const save = () => {
            LocalStorageManager.save(Notepad.#storageKey, editor.value);
            saveStatus.textContent = "Salvo localmente";
        };

        editor.addEventListener("input", markAsChanged);
        editor.addEventListener("keydown", event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                save();
            }
        });
        saveButton.addEventListener("click", save);

        updateCounters();
        saveStatus.textContent = editor.value ? "Anotação carregada" : "Nenhuma alteração";
    }
}
