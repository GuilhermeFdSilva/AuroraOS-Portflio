export class Calculator {
    static #calculator = null;
    static #operationDisplay = null;
    static #resultDisplay = null;
    static #memoryIndicator = null;

    static #currentValue = "0";
    static #previousValue = null;
    static #selectedOperation = null;
    static #memoryValue = 0;
    static #shouldResetDisplay = false;

    static configure(container) {
        Calculator.#calculator = container.querySelector(".calculator-container");

        if (!Calculator.#calculator) {
            console.error("Calculadora não encontrada.");
            return;
        }

        Calculator.#operationDisplay = Calculator.#calculator.querySelector(
            "#calculator-operation"
        );

        Calculator.#resultDisplay = Calculator.#calculator.querySelector(
            "#calculator-result"
        );

        Calculator.#memoryIndicator = Calculator.#calculator.querySelector(
            ".calculator-memory-indicator"
        );

        Calculator.#calculator.addEventListener(
            "click",
            Calculator.#handleCalculatorClick
        );

        Calculator.#updateDisplay();
    }

    static #handleCalculatorClick = (event) => {
        const button = event.target.closest(
            "[data-calculator-action]"
        );

        if (!button || !Calculator.#calculator.contains(button)) {
            return;
        }

        const action = button.dataset.calculatorAction;

        switch (action) {
            case "input-number":
                Calculator.#inputNumber(
                    button.dataset.calculatorValue
                );
                break;

            case "input-decimal":
                Calculator.#inputDecimal();
                break;

            case "toggle-sign":
                Calculator.#toggleSign();
                break;

            case "select-operation":
                Calculator.#selectOperation(
                    button.dataset.calculatorOperation
                );
                break;

            case "calculate":
                Calculator.#calculate();
                break;

            case "backspace":
                Calculator.#backspace();
                break;

            case "clear-entry":
                Calculator.#clearEntry();
                break;

            case "clear-all":
                Calculator.#clearAll();
                break;

            case "square-root":
                Calculator.#calculateSquareRoot();
                break;

            case "percentage":
                Calculator.#calculatePercentage();
                break;

            case "reciprocal":
                Calculator.#calculateReciprocal();
                break;

            case "memory-clear":
                Calculator.#clearMemory();
                break;

            case "memory-recall":
                Calculator.#recallMemory();
                break;

            case "memory-store":
                Calculator.#storeMemory();
                break;

            case "memory-add":
                Calculator.#addToMemory();
                break;

            default:
                console.warn(
                    `Ação desconhecida: ${action}`
                );
        }
    };

    static #inputNumber(number) {
        if (number === undefined) {
            return;
        }

        if (
            Calculator.#currentValue === "0" ||
            Calculator.#shouldResetDisplay
        ) {
            Calculator.#currentValue = number;
            Calculator.#shouldResetDisplay = false;
        } else {
            Calculator.#currentValue += number;
        }

        Calculator.#updateDisplay();
    }

    static #inputDecimal() {
        if (Calculator.#shouldResetDisplay) {
            Calculator.#currentValue = "0";
            Calculator.#shouldResetDisplay = false;
        }

        if (!Calculator.#currentValue.includes(".")) {
            Calculator.#currentValue += ".";
        }

        Calculator.#updateDisplay();
    }

    static #toggleSign() {
        const currentNumber = Calculator.#getCurrentNumber();

        if (currentNumber === 0) {
            return;
        }

        Calculator.#currentValue = String(currentNumber * -1);

        Calculator.#updateDisplay();
    }

    static #selectOperation(operation) {
        if (!operation) {
            return;
        }

        if (
            Calculator.#selectedOperation !== null &&
            !Calculator.#shouldResetDisplay
        ) {
            Calculator.#calculate();
        }

        Calculator.#previousValue = Calculator.#getCurrentNumber();
        Calculator.#selectedOperation = operation;
        Calculator.#shouldResetDisplay = true;

        Calculator.#updateOperationDisplay();
    }

    static #calculate() {
        if (
            Calculator.#previousValue === null ||
            Calculator.#selectedOperation === null
        ) {
            return;
        }

        const currentNumber = Calculator.#getCurrentNumber();

        const result = Calculator.#executeOperation(
            Calculator.#previousValue,
            currentNumber,
            Calculator.#selectedOperation
        );

        if (result === null) {
            return;
        }

        const operationSymbol = Calculator.#getOperationSymbol(
            Calculator.#selectedOperation
        );

        Calculator.#operationDisplay.textContent =
            `${Calculator.#formatDisplayValue(Calculator.#previousValue)} ` +
            `${operationSymbol} ` +
            `${Calculator.#formatDisplayValue(currentNumber)} =`;

        Calculator.#currentValue = String(result);
        Calculator.#previousValue = null;
        Calculator.#selectedOperation = null;
        Calculator.#shouldResetDisplay = true;

        Calculator.#updateDisplay();
    }

    static #executeOperation(
        firstNumber,
        secondNumber,
        operation
    ) {
        switch (operation) {
            case "add":
                return firstNumber + secondNumber;

            case "subtract":
                return firstNumber - secondNumber;

            case "multiply":
                return firstNumber * secondNumber;

            case "divide":
                if (secondNumber === 0) {
                    Calculator.#showError("Não é possível dividir por zero");
                    return null;
                }

                return firstNumber / secondNumber;

            default:
                console.warn(
                    `Operação desconhecida: ${operation}`
                );

                return null;
        }
    }

    static #backspace() {
        if (Calculator.#shouldResetDisplay) {
            return;
        }

        if (
            Calculator.#currentValue.length === 1 ||
            (
                Calculator.#currentValue.startsWith("-") &&
                Calculator.#currentValue.length === 2
            )
        ) {
            Calculator.#currentValue = "0";
        } else {
            Calculator.#currentValue = Calculator.#currentValue.slice(
                0,
                -1
            );
        }

        Calculator.#updateDisplay();
    }

    static #clearEntry() {
        Calculator.#currentValue = "0";
        Calculator.#shouldResetDisplay = false;

        Calculator.#updateDisplay();
    }

    static #clearAll() {
        Calculator.#currentValue = "0";
        Calculator.#previousValue = null;
        Calculator.#selectedOperation = null;
        Calculator.#shouldResetDisplay = false;

        Calculator.#clearOperationDisplay();
        Calculator.#updateDisplay();
    }

    static #calculateSquareRoot() {
        const currentNumber = Calculator.#getCurrentNumber();

        if (currentNumber < 0) {
            Calculator.#showError(
                "Não é possível calcular a raiz de um número negativo"
            );

            return;
        }

        Calculator.#currentValue = String(
            Math.sqrt(currentNumber)
        );

        Calculator.#shouldResetDisplay = true;
        Calculator.#updateDisplay();
    }

    static #calculatePercentage() {
        const currentNumber = Calculator.#getCurrentNumber();

        /*
         * Com uma operação anterior:
         * 200 + 10% transforma 10 em 20.
         *
         * Sem operação anterior:
         * 10% transforma 10 em 0.1.
         */
        if (
            Calculator.#previousValue !== null &&
            Calculator.#selectedOperation !== null
        ) {
            Calculator.#currentValue = String(
                Calculator.#previousValue *
                (currentNumber / 100)
            );
        } else {
            Calculator.#currentValue = String(
                currentNumber / 100
            );
        }

        Calculator.#updateDisplay();
    }

    static #calculateReciprocal() {
        const currentNumber = Calculator.#getCurrentNumber();

        if (currentNumber === 0) {
            Calculator.#showError(
                "Não é possível dividir por zero"
            );

            return;
        }

        Calculator.#currentValue = String(
            1 / currentNumber
        );

        Calculator.#shouldResetDisplay = true;
        Calculator.#updateDisplay();
    }

    static #clearMemory() {
        Calculator.#memoryValue = 0;
        Calculator.#updateMemoryIndicator();
    }

    static #recallMemory() {
        Calculator.#currentValue = String(
            Calculator.#memoryValue
        );

        Calculator.#shouldResetDisplay = true;
        Calculator.#updateDisplay();
    }

    static #storeMemory() {
        Calculator.#memoryValue = Calculator.#getCurrentNumber();
        Calculator.#updateMemoryIndicator();
    }

    static #addToMemory() {
        Calculator.#memoryValue += Calculator.#getCurrentNumber();
        Calculator.#updateMemoryIndicator();
    }

    static #getCurrentNumber() {
        return Number(Calculator.#currentValue);
    }

    static #updateDisplay() {
        if (!Calculator.#resultDisplay) {
            return;
        }

        Calculator.#resultDisplay.textContent =
            Calculator.#formatDisplayValue(
                Calculator.#currentValue
            );
    }

    static #updateOperationDisplay() {
        if (!Calculator.#operationDisplay) {
            return;
        }

        const symbol = Calculator.#getOperationSymbol(
            Calculator.#selectedOperation
        );

        Calculator.#operationDisplay.textContent =
            `${Calculator.#formatDisplayValue(
                String(Calculator.#previousValue)
            )} ${symbol}`;
    }

    static #clearOperationDisplay() {
        if (Calculator.#operationDisplay) {
            Calculator.#operationDisplay.textContent = "";
        }
    }

    static #updateMemoryIndicator() {
        if (!Calculator.#memoryIndicator) {
            return;
        }

        const hasMemory = Calculator.#memoryValue !== 0;

        Calculator.#memoryIndicator.textContent =
            hasMemory ? "M" : "";

        Calculator.#memoryIndicator.setAttribute(
            "aria-label",
            hasMemory
                ? "Há um valor salvo na memória"
                : "Memória vazia"
        );
    }

    static #getOperationSymbol(operation) {
        switch (operation) {
            case "add":
                return "+";

            case "subtract":
                return "−";

            case "multiply":
                return "×";

            case "divide":
                return "÷";

            default:
                return "";
        }
    }

    static #formatDisplayValue(value) {
        return String(value).replace(".", ",");
    }

    static #showError(message) {
        Calculator.#currentValue = "Erro";
        Calculator.#previousValue = null;
        Calculator.#selectedOperation = null;
        Calculator.#shouldResetDisplay = true;

        Calculator.#clearOperationDisplay();

        if (Calculator.#resultDisplay) {
            Calculator.#resultDisplay.textContent = "Erro";
            Calculator.#resultDisplay.setAttribute(
                "aria-label",
                message
            );
        }
    }
}