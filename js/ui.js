export default class CalculatorUI {
	constructor(calculatorService) {
		this.calculator = calculatorService;
		this.periodLabels = {
			daily: { rate: "ao dia", time: ["dia", "dias"], name: "diária" },
			monthly: { rate: "ao mês", time: ["mês", "meses"], name: "mensal" },
			semester: {
				rate: "ao semestre",
				time: ["semestre", "semestres"],
				name: "semestral",
			},
			annual: { rate: "ao ano", time: ["ano", "anos"], name: "anual" },
		};

		this.initElements();
		this.bindEvents();
		this.updateCompoundTarget();
		this.updateConversionLabels();
		this.updateEquivalentRelation();
	}

	initElements() {
		this.compoundForm = document.getElementById("compound-form");
		this.compoundTarget = document.getElementById("compound-target");
		this.compoundResult = document.getElementById("compound-result");
		this.compoundMessage = document.getElementById("compound-message");

		this.conversionForm = document.getElementById("conversion-form");
		this.conversionMode = document.getElementById("conversion-mode");
		this.conversionRateLabel = document.getElementById("conversion-rate-label");
		this.conversionResult = document.getElementById("conversion-result");
		this.conversionMessage = document.getElementById("conversion-message");

		this.equivalentForm = document.getElementById("equivalent-form");
		this.sourcePeriod = document.getElementById("source-period");
		this.targetPeriod = document.getElementById("target-period");
		this.equivalentN = document.getElementById("equivalent-n");
		this.equivalentHint = document.getElementById("equivalent-hint");
		this.equivalentResult = document.getElementById("equivalent-result");
		this.equivalentMessage = document.getElementById("equivalent-message");
	}

	bindEvents() {
		this.compoundTarget.addEventListener("change", () => this.updateCompoundTarget());
		this.conversionMode.addEventListener("change", () => this.updateConversionLabels());
		this.sourcePeriod.addEventListener("change", () => this.updateEquivalentRelation());
		this.targetPeriod.addEventListener("change", () => this.updateEquivalentRelation());

		this.compoundForm.addEventListener("submit", (event) => {
			event.preventDefault();
			this.handleCompoundCalculation();
		});
		this.conversionForm.addEventListener("submit", (event) => {
			event.preventDefault();
			this.handleRateConversion();
		});
		this.equivalentForm.addEventListener("submit", (event) => {
			event.preventDefault();
			this.handleEquivalentRate();
		});

		this.compoundForm.addEventListener("reset", () => {
			setTimeout(() => {
				this.updateCompoundTarget();
				this.clearFeedback(this.compoundResult, this.compoundMessage);
			});
		});
		this.conversionForm.addEventListener("reset", () => {
			setTimeout(() => {
				this.updateConversionLabels();
				this.clearFeedback(this.conversionResult, this.conversionMessage);
			});
		});
		this.equivalentForm.addEventListener("reset", () => {
			setTimeout(() => {
				this.updateEquivalentRelation();
				this.clearFeedback(this.equivalentResult, this.equivalentMessage);
			});
		});
	}

	updateCompoundTarget() {
		const target = this.compoundTarget.value;
		document.querySelectorAll("[data-compound-field]").forEach((group) => {
			const input = group.querySelector("input");
			const isCalculated = group.dataset.compoundField === target;

			group.classList.toggle("is-calculated", isCalculated);
			input.disabled = isCalculated;
			input.required = false;
			if (isCalculated) input.value = "";
		});
		this.clearFeedback(this.compoundResult, this.compoundMessage);
	}

	updateConversionLabels() {
		const isNominal =
			this.conversionMode.value === "nominal-to-proportional";
		this.conversionRateLabel.textContent = isNominal
			? "Taxa nominal"
			: "Taxa proporcional / efetiva";
		this.clearFeedback(this.conversionResult, this.conversionMessage);
	}

	updateEquivalentRelation() {
		const source = this.sourcePeriod.value;
		const target = this.targetPeriod.value;
		const sourceMonths = this.calculator.periodsInMonths[source];
		const targetMonths = this.calculator.periodsInMonths[target];

		if (sourceMonths === targetMonths) {
			this.equivalentHint.textContent = "Escolha períodos diferentes.";
			return;
		}

		const relation = Math.max(sourceMonths, targetMonths) / Math.min(sourceMonths, targetMonths);
		this.equivalentN.value = relation;
		this.equivalentHint.textContent = `${this.capitalize(this.periodLabels[source].name)} → ${this.periodLabels[target].name} utiliza normalmente n = ${relation}.`;
		this.clearFeedback(this.equivalentResult, this.equivalentMessage);
	}

	handleCompoundCalculation() {
		this.clearFeedback(this.compoundResult, this.compoundMessage);

		try {
			const params = this.formToObject(this.compoundForm);
			const target = this.compoundTarget.value;
			const result = this.calculator.calculateCompound(target, params);
			const formatted = this.formatResult(result);
			const detail = this.getCompoundDetail(target, params, result.value);

			this.showResult(
				this.compoundResult,
				`Resultado — ${this.getVariableName(target)}`,
				formatted,
				detail,
				result.related,
			);
		} catch (error) {
			this.showError(this.compoundMessage, error);
		}
	}

	handleRateConversion() {
		this.clearFeedback(this.conversionResult, this.conversionMessage);

		try {
			const params = this.formToObject(this.conversionForm);
			const result = this.calculator.calculateRateConversion(params.mode, params);
			const isNominal = params.mode === "nominal-to-proportional";

			this.showResult(
				this.conversionResult,
				isNominal ? "Taxa proporcional / efetiva" : "Taxa nominal",
				this.formatResult(result),
				isNominal ? "i proporcional = i nominal ÷ k" : "i nominal = i proporcional × k",
			);
		} catch (error) {
			this.showError(this.conversionMessage, error);
		}
	}

	handleEquivalentRate() {
		this.clearFeedback(this.equivalentResult, this.equivalentMessage);

		try {
			const params = this.formToObject(this.equivalentForm);
			const result = this.calculator.calculateEquivalentRate(params);
			const direction =
				this.calculator.periodsInMonths[params.sourcePeriod] <
				this.calculator.periodsInMonths[params.targetPeriod]
					? "período menor → maior"
					: "período maior → menor";

			this.showResult(
				this.equivalentResult,
				`Taxa equivalente ${this.periodLabels[params.targetPeriod].name}`,
				this.formatResult(result),
				`${this.periodLabels[params.sourcePeriod].name} → ${this.periodLabels[params.targetPeriod].name} (${direction})`,
			);
		} catch (error) {
			this.showError(this.equivalentMessage, error);
		}
	}

	formToObject(form) {
		return Object.fromEntries(new FormData(form).entries());
	}

	formatResult(result) {
		if (result.type === "money") {
			return this.calculator.formatCurrency(result.value);
		}
		if (result.type === "rate") {
			return this.calculator.formatPercentage(result.value);
		}
		if (result.type === "time") {
			return this.calculator.formatTime(result.value);
		}
		return String(result.value);
	}

	getCompoundDetail(target, params, resultValue) {
		if (target === "i") {
			return `Taxa ${this.periodLabels[params.ratePeriod].rate}`;
		}
		if (target === "n") {
			const labels = this.periodLabels[params.timePeriod].time;
			const unit =
				Math.abs(resultValue - 1) < 0.0001 ? labels[0] : labels[1];
			return `Tempo expresso em ${unit}`;
		}
		return `Taxa ${this.periodLabels[params.ratePeriod].rate}; tempo informado em ${this.periodLabels[params.timePeriod].time[1]}`;
	}

	getVariableName(target) {
		const names = {
			VP: "Capital / Valor Presente (VP)",
			VF: "Montante / Valor Futuro (VF)",
			J: "Juros (J)",
			i: "Taxa (i)",
			n: "Tempo (n)",
		};
		return names[target];
	}

	showResult(container, label, value, detail, related = []) {
		const relatedHtml = related.length
			? `<div class="result-related">${related
					.map(
						(item) => `
							<p>
								<span>${item.label}</span>
								<strong>${this.formatResult(item)}</strong>
							</p>
						`,
					)
					.join("")}</div>`
			: "";

		container.innerHTML = `
			<p class="result-label">${label}</p>
			<p class="result-value">${value}</p>
			<p class="result-detail">${detail}</p>
			${relatedHtml}
		`;
		container.classList.remove("hidden");
	}

	showError(container, error) {
		container.textContent =
			error && error.isValidationError
				? error.message
				: "Não foi possível concluir o cálculo. Revise os dados informados.";
		container.classList.remove("hidden");
	}

	clearFeedback(result, message) {
		result.classList.add("hidden");
		message.classList.add("hidden");
		result.innerHTML = "";
		message.textContent = "";
	}

	capitalize(value) {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
}
