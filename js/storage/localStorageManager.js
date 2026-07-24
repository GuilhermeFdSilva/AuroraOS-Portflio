/**
 * Centraliza o acesso ao localStorage da aplicação.
 *
 * Todos os valores são serializados em JSON e recebem um prefixo para evitar conflitos.
 */
export class LocalStorageManager {
    static #prefix = "aurora-os";

    constructor() {
        throw new Error(
            "LocalStorageManager é uma classe estática e não pode ser instanciada."
        );
    }

    /**
     * Salva qualquer valor serializável em JSON.
     *
     * @param {string} key Identificador do dado sem o prefixo da aplicação.
     * @param {*} value Valor que será persistido.
     * @returns {boolean} `true` quando o valor foi salvo com sucesso.
     */
    static save(key, value) {
        try {
            const storageKey = LocalStorageManager.#createKey(key);
            const serializedValue = JSON.stringify(value);

            localStorage.setItem(storageKey, serializedValue);
            return true;
        } catch (error) {
            console.error(`Não foi possível salvar "${key}".`, error);
            return false;
        }
    }

    /**
     * Recupera e desserializa um valor salvo.
     *
     * @template T
     * @param {string} key Identificador do dado sem o prefixo da aplicação.
     * @param {T} [defaultValue=null] Valor retornado quando não há dado válido.
     * @returns {T} Valor recuperado ou o valor padrão informado.
     */
    static get(key, defaultValue = null) {
        try {
            const storageKey = LocalStorageManager.#createKey(key);
            const storedValue = localStorage.getItem(storageKey);

            if (storedValue === null) {
                return defaultValue;
            }

            return JSON.parse(storedValue);
        } catch (error) {
            console.error(`Não foi possível recuperar "${key}".`, error);
            return defaultValue;
        }
    }

    /**
     * Verifica se uma chave existe no armazenamento.
     *
     * @param {string} key Identificador do dado.
     * @returns {boolean}
     */
    static has(key) {
        try {
            return localStorage.getItem(
                LocalStorageManager.#createKey(key)
            ) !== null;
        } catch (error) {
            console.error(`Não foi possível verificar "${key}".`, error);
            return false;
        }
    }

    /**
     * Remove somente o valor associado à chave informada.
     *
     * @param {string} key Identificador do dado.
     * @returns {boolean} `true` quando a operação foi concluída.
     */
    static remove(key) {
        try {
            localStorage.removeItem(LocalStorageManager.#createKey(key));
            return true;
        } catch (error) {
            console.error(`Não foi possível remover "${key}".`, error);
            return false;
        }
    }

    /**
     * Remove apenas as chaves pertencentes ao AuroraOS.
     */
    static clear() {
        try {
            const prefix = `${LocalStorageManager.#prefix}.`;

            Object.keys(localStorage)
                .filter(key => key.startsWith(prefix))
                .forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.error("Não foi possível limpar os dados do AuroraOS.", error);
        }
    }

    /**
     * Monta a chave final usada pelo navegador.
     *
     * @param {string} key Identificador parcial.
     * @returns {string}
     */
    static #createKey(key) {
        if (typeof key !== "string" || !key.trim()) {
            throw new TypeError("A chave deve ser uma string não vazia.");
        }

        return `${LocalStorageManager.#prefix}.${key.trim()}`;
    }
}
