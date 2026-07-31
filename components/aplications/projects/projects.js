import { PROJECTS } from "./projects.config.js";

/** Renderiza projetos configurados e seus arquivos README do GitHub. */
export class Projects {
    static async configure(container) {
        if (!(container instanceof HTMLElement)) {
            throw new TypeError("Um container válido para Projetos é obrigatório.");
        }

        const list = container.querySelector("#projects-list");
        const count = container.querySelector("#projects-count");
        const emptyState = container.querySelector("#projects-empty-state");
        const documentView = container.querySelector("#projects-document");
        const title = container.querySelector("#projects-document-title");
        const description = container.querySelector("#projects-document-description");
        const repositoryLink = container.querySelector("#projects-repository-link");
        const readme = container.querySelector("#projects-readme");

        if (
            !(list instanceof HTMLElement) ||
            !(count instanceof HTMLElement) ||
            !(emptyState instanceof HTMLElement) ||
            !(documentView instanceof HTMLElement) ||
            !(title instanceof HTMLElement) ||
            !(description instanceof HTMLElement) ||
            !(repositoryLink instanceof HTMLAnchorElement) ||
            !(readme instanceof HTMLElement)
        ) {
            throw new Error("A interface de Projetos está incompleta.");
        }

        const projects = Projects.#normalizeProjects(PROJECTS);
        count.textContent = `${projects.length} ${projects.length === 1 ? "item" : "itens"}`;

        projects.forEach(project => {
            const button = document.createElement("button");
            const icon = document.createElement("span");
            const label = document.createElement("span");

            button.type = "button";
            button.className = "projects-file";
            button.dataset.projectId = project.id;
            button.setAttribute("aria-label", `Abrir projeto ${project.name}`);

            icon.className = "projects-file-icon";
            icon.textContent = project.icon;
            icon.setAttribute("aria-hidden", "true");

            label.className = "projects-file-name";
            label.textContent = `${project.name}.md`;

            button.append(icon, label);
            button.addEventListener("click", async () => {
                list.querySelectorAll(".projects-file-active").forEach(item => {
                    item.classList.remove("projects-file-active");
                });
                button.classList.add("projects-file-active");

                emptyState.style.display = "none";
                documentView.hidden = false;
                title.textContent = project.name;
                description.textContent = project.description;
                repositoryLink.href = project.repositoryUrl;
                readme.innerHTML = '<section class="projects-message"><p>Carregando README...</p></section>';

                try {
                    const markdown = await Projects.#fetchReadme(project.repositoryUrl);
                    readme.innerHTML = Projects.#renderMarkdown(markdown, project.repositoryUrl);
                } catch (error) {
                    console.error(error);
                    readme.innerHTML = '<section class="projects-message projects-error"><p>Não foi possível carregar o README deste repositório.</p><p>Verifique se o repositório é público e possui um README.</p></section>';
                }
            });

            list.appendChild(button);
        });
    }

    static #normalizeProjects(projects) {
        if (!Array.isArray(projects)) {
            throw new TypeError("PROJECTS deve ser um array.");
        }

        const ids = new Set();

        return projects.map((project, index) => {
            const id = String(project?.id ?? "").trim();
            const name = String(project?.name ?? "").trim();
            const repositoryUrl = String(project?.repositoryUrl ?? "").replace(/\/$/u, "");

            if (!id || !name || !/^https:\/\/github\.com\/[^/]+\/[^/]+$/u.test(repositoryUrl)) {
                throw new Error(`O projeto da posição ${index} possui configuração inválida.`);
            }

            if (ids.has(id)) {
                throw new Error(`O id de projeto "${id}" está duplicado.`);
            }

            ids.add(id);

            return {
                id,
                name,
                repositoryUrl,
                description: String(project.description ?? ""),
                icon: String(project.icon ?? "📄")
            };
        });
    }

    static async #fetchReadme(repositoryUrl) {
        const [, owner, repository] = repositoryUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/u) ?? [];

        if (!owner || !repository) {
            throw new Error("URL de repositório inválida.");
        }

        const response = await fetch(`https://api.github.com/repos/${owner}/${repository}/readme`, {
            headers: { Accept: "application/vnd.github.raw+json" }
        });

        if (!response.ok) {
            throw new Error(`GitHub respondeu com HTTP ${response.status}.`);
        }

        return response.text();
    }

    static #renderMarkdown(markdown, repositoryUrl) {
        const escaped = Projects.#escapeHtml(markdown).replace(/\r\n?/gu, "\n");
        const lines = escaped.split("\n");
        const output = [];
        let inCodeBlock = false;
        let codeLanguage = "";
        let listType = null;

        const closeList = () => {
            if (listType) {
                output.push(`</${listType}>`);
                listType = null;
            }
        };

        for (const line of lines) {
            const codeFence = line.match(/^```\s*([^\s]*)/u);
            if (codeFence) {
                closeList();
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    codeLanguage = codeFence[1];
                    output.push(`<pre><code${codeLanguage ? ` data-language="${codeLanguage}"` : ""}>`);
                } else {
                    inCodeBlock = false;
                    codeLanguage = "";
                    output.push("</code></pre>");
                }
                continue;
            }

            if (inCodeBlock) {
                output.push(`${line}\n`);
                continue;
            }

            const heading = line.match(/^(#{1,6})\s+(.+)$/u);
            if (heading) {
                closeList();
                const level = heading[1].length;
                output.push(`<h${level}>${Projects.#formatInline(heading[2], repositoryUrl)}</h${level}>`);
                continue;
            }

            const unordered = line.match(/^\s*[-*+]\s+(.+)$/u);
            if (unordered) {
                if (listType !== "ul") {
                    closeList();
                    listType = "ul";
                    output.push("<ul>");
                }
                output.push(`<li>${Projects.#formatInline(unordered[1], repositoryUrl)}</li>`);
                continue;
            }

            const ordered = line.match(/^\s*\d+\.\s+(.+)$/u);
            if (ordered) {
                if (listType !== "ol") {
                    closeList();
                    listType = "ol";
                    output.push("<ol>");
                }
                output.push(`<li>${Projects.#formatInline(ordered[1], repositoryUrl)}</li>`);
                continue;
            }

            closeList();

            if (!line.trim()) {
                output.push("");
            } else if (/^&gt;\s?/u.test(line)) {
                output.push(`<blockquote>${Projects.#formatInline(line.replace(/^&gt;\s?/u, ""), repositoryUrl)}</blockquote>`);
            } else if (/^([-*_])\1{2,}$/u.test(line.trim())) {
                output.push("<hr>");
            } else {
                output.push(`<p>${Projects.#formatInline(line, repositoryUrl)}</p>`);
            }
        }

        closeList();
        if (inCodeBlock) output.push("</code></pre>");

        return output.join("\n");
    }

    static #formatInline(text, repositoryUrl) {
        return text
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/gu, (_, alt, source) => {
                const url = Projects.#resolveRepositoryUrl(source, repositoryUrl);
                return `<img src="${url}" alt="${alt}" loading="lazy">`;
            })
            .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, (_, label, target) => {
                const url = Projects.#resolveRepositoryUrl(target, repositoryUrl);
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
            })
            .replace(/`([^`]+)`/gu, "<code>$1</code>")
            .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
            .replace(/__([^_]+)__/gu, "<strong>$1</strong>")
            .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gu, "<em>$1</em>");
    }

    static #resolveRepositoryUrl(target, repositoryUrl) {
        const cleanTarget = target.replace(/&amp;/gu, "&");

        if (/^(https?:|mailto:|#)/u.test(cleanTarget)) {
            return cleanTarget;
        }

        const relativePath = cleanTarget.replace(/^\.\//u, "");
        return `${repositoryUrl}/blob/HEAD/${relativePath}`;
    }

    static #escapeHtml(value) {
        return String(value)
            .replace(/&/gu, "&amp;")
            .replace(/</gu, "&lt;")
            .replace(/>/gu, "&gt;")
            .replace(/"/gu, "&quot;")
            .replace(/'/gu, "&#039;");
    }
}
