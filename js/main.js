import CalculatorService from "./api.js";
import CalculatorUI from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
	const calculatorService = new CalculatorService();
	new CalculatorUI(calculatorService);
});
