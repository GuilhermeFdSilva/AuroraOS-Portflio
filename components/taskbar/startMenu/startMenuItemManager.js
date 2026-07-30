/**
 * Cria as listas e os botões de aplicação usados pelo menu iniciar.
 */
export class StartMenuItemManager {
    #container = null;
    #openList = null;
    #onApplicationSelected = null;
    #onListOpened = null;

    /**
     * Recebe o container e as funções chamadas durante a interação.
     */
    constructor(container, callbacks = {}) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("A valid start menu items container is required.");
        }

        this.#container = container;
        this.#onApplicationSelected = callbacks.onApplicationSelected ?? (() => { });
        this.#onListOpened = callbacks.onListOpened ?? (() => { });
    }

    /** Limpa o container e renderiza a configuração recebida. */
    render(items = []) {
        this.#container.innerHTML = "";

        items.forEach(item => {
            const element = this.#createItem(item);

            if (element) {
                this.#container.appendChild(element);
            }
        });
    }

    /** Fecha a lista atualmente aberta. */
    closeLists() {
        if (!this.#openList) return;

        this.#openList.classList.remove("start-menu-list-open");
        this.#openList
            .querySelector(":scope > .start-menu-option")
            ?.setAttribute("aria-expanded", "false");

        this.#openList = null;
    }

    /** Direciona cada configuração para o tipo correto de elemento. */
    #createItem(item) {
        if (item?.type === "list") {
            return this.#createListItem(item);
        }

        if (item?.type === "application") {
            return this.#createApplicationItem(item);
        }

        return null;
    }

    /** Cria uma opção que abre uma lista secundária. */
    #createListItem(item) {
        const entry = document.createElement("section");
        const button = this.#createButton(item, true);
        const suboptions = document.createElement("section");

        entry.classList.add("start-menu-list-entry");
        suboptions.classList.add("start-menu-suboptions", "interface-window");
        suboptions.setAttribute("role", "menu");

        item.items?.forEach(childItem => {
            const childElement = this.#createItem(childItem);

            if (childElement) {
                suboptions.appendChild(childElement);
            }
        });

        button.addEventListener("click", event => {
            event.stopPropagation();

            const shouldOpen = this.#openList !== entry;

            this.closeLists();

            if (!shouldOpen) return;

            this.#onListOpened();
            entry.classList.add("start-menu-list-open");
            button.setAttribute("aria-expanded", "true");
            this.#openList = entry;
        });

        entry.append(button, suboptions);

        return entry;
    }

    /** Cria uma opção que executa a ação de uma aplicação. */
    #createApplicationItem(item) {
        const button = this.#createButton(item, false);

        button.addEventListener("click", event => {
            event.stopPropagation();
            this.closeLists();
            this.#onApplicationSelected();
            item.action?.();
        });

        return button;
    }

    /** Monta a parte visual compartilhada por listas e aplicações. */
    #createButton(item, isList) {
        const button = document.createElement("button");
        const icon = document.createElement("img");
        const label = document.createElement("span");

        button.type = "button";
        button.classList.add("start-menu-option");
        button.setAttribute("role", "menuitem");

        icon.classList.add("start-menu-option-label-img");
        icon.src = item.iconSrc ?? "";
        icon.alt = item.iconAlt ?? item.label ?? "";

        label.classList.add("start-menu-option-label-txt");
        label.textContent = item.label ?? "Item";

        button.append(icon, label);

        if (isList) {
            const arrow = document.createElement("span");

            arrow.classList.add("start-menu-option-label-arrow");
            arrow.textContent = "▶";
            arrow.setAttribute("aria-hidden", "true");

            button.appendChild(arrow);
            button.setAttribute("aria-haspopup", "menu");
            button.setAttribute("aria-expanded", "false");
        }

        return button;
    }
}
