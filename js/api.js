export default class CalculatorService {
	constructor() {
		this.periodsInDays = {
			daily: 1,
			monthly: 30,
			semester: 180,
			annual: 360,
		};
		this.periodsInMonths = {
			monthly: 1,
			semester: 6,
			annual: 12,
		};
	}

	calculateCompound(target, params) {
		const values = this.validateCompoundFields(target, params);
		let result;
		let related = [];

		switch (target) {
			case "VP": {
				result = this.calculatePresentValueFromAvailableData(values);
				const futureValue = values.VF ?? result + values.J;
				const interest = values.J ?? futureValue - result;
				this.validateInterestConsistency(result, futureValue, interest);
				related = [
					this.relatedResult("Montante / VF", futureValue, "money"),
					this.relatedResult("Juros / J", interest, "money"),
				];
				break;
			}
			case "VF": {
				result = this.calculateFutureValue(
					values.VP,
					values.i,
					values.nInRatePeriods,
				);
				const interest = result - values.VP;
				if (values.J !== undefined) {
					this.validateInterestConsistency(values.VP, result, values.J);
				}
				related = [this.relatedResult("Juros / J", interest, "money")];
				break;
			}
			case "J": {
				if (values.VF !== undefined) {
					result = this.calculateInterest(values.VP, values.VF);
					if (values.i !== undefined && values.nInRatePeriods !== undefined) {
						this.validateCompoundConsistency(
							values.VP,
							values.VF,
							values.i,
							values.nInRatePeriods,
						);
					}
				} else {
					const futureValue = this.calculateFutureValue(
						values.VP,
						values.i,
						values.nInRatePeriods,
					);
					result = this.calculateInterest(values.VP, futureValue);
					related = [
						this.relatedResult("Montante / VF", futureValue, "money"),
					];
				}
				break;
			}
			case "i":
				this.validateInterestIfProvided(values);
				result = this.calculateRate(
					values.VP,
					values.VF,
					values.nInRatePeriods,
				);
				break;
			case "n": {
				this.validateInterestIfProvided(values);
				const timeInRatePeriods = this.calculateTime(
					values.VP,
					values.VF,
					values.i,
				);
				result = this.convertRatePeriodsToTime(
					timeInRatePeriods,
					params.ratePeriod,
					params.timePeriod,
				);
				break;
			}
			default:
				throw this.validationError(
					"Selecione uma variável válida para calcular.",
				);
		}

		return this.result(result, this.getResultType(target), related);
	}

	calculatePresentValueFromAvailableData(values) {
		const factor = this.calculateCompoundFactor(
			values.i,
			values.nInRatePeriods,
		);

		if (values.VF !== undefined) {
			const presentValue = this.calculatePresentValue(
				values.VF,
				values.i,
				values.nInRatePeriods,
			);

			if (values.J !== undefined) {
				this.validateInterestConsistency(
					presentValue,
					values.VF,
					values.J,
				);
			}
			return presentValue;
		}

		const interestFactor = factor - 1;
		if (Math.abs(interestFactor) < Number.EPSILON) {
			throw this.validationError(
				"A taxa e o tempo informados não geram juros. Não é possível calcular VP a partir de J.",
			);
		}

		// Capital a partir dos juros: VP = J / [(1 + i)^n - 1]
		const presentValue = this.ensureFinite(values.J / interestFactor);
		if (presentValue <= 0) {
			throw this.validationError(
				"Os dados informados não resultam em um Capital (VP) positivo.",
			);
		}
		return presentValue;
	}

	calculatePresentValue(futureValue, rate, time) {
		this.validatePositive(futureValue, "Montante (VF)");
		const divisor = this.calculateCompoundFactor(rate, time);
		if (divisor === 0) {
			throw this.validationError("Não é possível dividir por zero.");
		}

		// Valor presente: VP = VF / (1 + i)^n
		return this.ensureFinite(futureValue / divisor);
	}

	calculateFutureValue(presentValue, rate, time) {
		this.validatePositive(presentValue, "Capital (VP)");

		// Valor futuro: VF = VP × (1 + i)^n
		return this.ensureFinite(
			presentValue * this.calculateCompoundFactor(rate, time),
		);
	}

	calculateInterest(presentValue, futureValue) {
		// Juros acumulados: J = VF - VP
		return this.ensureFinite(futureValue - presentValue);
	}

	calculateRate(presentValue, futureValue, time) {
		this.validatePositive(presentValue, "Capital (VP)");
		this.validatePositive(futureValue, "Montante (VF)");
		this.validatePositive(time, "Tempo (n)");

		const ratio = futureValue / presentValue;

		// Taxa composta: i = (VF / VP)^(1 / n) - 1
		return this.ensureFinite(Math.pow(ratio, 1 / time) - 1);
	}

	calculateTime(presentValue, futureValue, rate) {
		this.validatePositive(presentValue, "Capital (VP)");
		this.validatePositive(futureValue, "Montante (VF)");
		this.validateRate(rate);

		const ratio = futureValue / presentValue;
		const logarithmBase = Math.log(1 + rate);

		if (logarithmBase === 0) {
			throw this.validationError(
				"A taxa não pode ser 0% quando VP e VF são diferentes.",
			);
		}

		// Tempo: n = log(VF / VP) / log(1 + i)
		const time = Math.log(ratio) / logarithmBase;
		if (time <= 0) {
			throw this.validationError(
				"Os valores informados resultam em tempo menor ou igual a zero.",
			);
		}
		return this.ensureFinite(time);
	}

	calculateCompoundFactor(rate, time) {
		this.validateRate(rate);
		this.validatePositive(time, "Tempo (n)");
		return this.ensureFinite(
			Math.pow(1 + rate, time),
			"A taxa e o tempo informados geraram um fator inválido.",
		);
	}

	convertNominalToProportional(nominalRate, periods) {
		this.validateRate(nominalRate);
		this.validatePositive(periods, "k");

		// Taxa proporcional: i proporcional = i nominal / k
		return this.ensureFinite(nominalRate / periods);
	}

	convertProportionalToNominal(proportionalRate, periods) {
		this.validateRate(proportionalRate);
		this.validatePositive(periods, "k");

		// Taxa nominal: i nominal = i proporcional × k
		return this.ensureFinite(proportionalRate * periods);
	}

	calculateEquivalentSmallerToLarger(rate, periods) {
		this.validateRate(rate);
		this.validatePositive(periods, "n");

		// Período menor para maior: i equivalente = (1 + i)^n - 1
		return this.ensureFinite(Math.pow(1 + rate, periods) - 1);
	}

	calculateEquivalentLargerToSmaller(rate, periods) {
		this.validateRate(rate);
		this.validatePositive(periods, "n");

		// Período maior para menor: i equivalente = (1 + i)^(1 / n) - 1
		return this.ensureFinite(Math.pow(1 + rate, 1 / periods) - 1);
	}

	calculateRateConversion(mode, params) {
		const rate = this.percentageToDecimal(
			this.getRequiredNumber(params.rate, "A taxa"),
		);
		const k = this.getRequiredNumber(params.k, "k");

		if (mode === "nominal-to-proportional") {
			return this.result(
				this.convertNominalToProportional(rate, k),
				"rate",
			);
		}
		if (mode === "proportional-to-nominal") {
			return this.result(
				this.convertProportionalToNominal(rate, k),
				"rate",
			);
		}
		throw this.validationError("Selecione um tipo de conversão válido.");
	}

	calculateEquivalentRate(params) {
		const rate = this.percentageToDecimal(
			this.getRequiredNumber(params.rate, "A taxa efetiva"),
		);
		const n = this.getRequiredNumber(params.n, "n");
		const sourceMonths = this.getEquivalentPeriodMonths(params.sourcePeriod);
		const targetMonths = this.getEquivalentPeriodMonths(params.targetPeriod);

		if (sourceMonths === targetMonths) {
			throw this.validationError(
				"Escolha períodos de origem e destino diferentes.",
			);
		}

		const value =
			sourceMonths < targetMonths
				? this.calculateEquivalentSmallerToLarger(rate, n)
				: this.calculateEquivalentLargerToSmaller(rate, n);

		return this.result(value, "rate");
	}

	validateCompoundFields(target, params) {
		const values = {
			VP: this.getOptionalNumber(params.VP, "Capital (VP)"),
			VF: this.getOptionalNumber(params.VF, "Montante (VF)"),
			J: this.getOptionalNumber(params.J, "Juros (J)"),
			i: this.getOptionalNumber(params.i, "Taxa (i)"),
			n: this.getOptionalNumber(params.n, "Tempo (n)"),
		};

		this.validateRequiredCompoundData(target, values);

		if (values.i !== undefined) {
			values.i = this.percentageToDecimal(values.i);
			this.validateRate(values.i);
		}
		if (values.n !== undefined) {
			this.validatePositive(values.n, "Tempo (n)");
			values.nInRatePeriods = this.convertTimeToRatePeriods(
				values.n,
				params.ratePeriod,
				params.timePeriod,
			);
		}

		if (
			values.VP !== undefined &&
			values.VF !== undefined &&
			values.J !== undefined
		) {
			this.validateInterestConsistency(values.VP, values.VF, values.J);
		}

		return values;
	}

	validateRequiredCompoundData(target, values) {
		const requireFields = (fields) => {
			fields.forEach((field) => {
				if (values[field] === undefined) {
					const labels = {
						VP: "Capital (VP)",
						VF: "Montante (VF)",
						J: "Juros (J)",
						i: "Taxa (i)",
						n: "Tempo (n)",
					};
					throw this.validationError(`${labels[field]} é obrigatório.`);
				}
			});
		};

		switch (target) {
			case "VP":
				requireFields(["i", "n"]);
				if (values.VF === undefined && values.J === undefined) {
					throw this.validationError(
						"Informe o Montante (VF) ou os Juros (J) para calcular o Capital (VP).",
					);
				}
				break;
			case "VF":
				requireFields(["VP", "i", "n"]);
				break;
			case "J":
				requireFields(["VP"]);
				if (
					values.VF === undefined &&
					(values.i === undefined || values.n === undefined)
				) {
					throw this.validationError(
						"Informe VF, ou informe taxa e tempo, para calcular os Juros (J).",
					);
				}
				break;
			case "i":
				requireFields(["VP", "VF", "n"]);
				break;
			case "n":
				requireFields(["VP", "VF", "i"]);
				break;
			default:
				throw this.validationError(
					"Selecione uma variável válida para calcular.",
				);
		}
	}

	validateInterestIfProvided(values) {
		if (values.J !== undefined) {
			this.validateInterestConsistency(values.VP, values.VF, values.J);
		}
	}

	validateInterestConsistency(presentValue, futureValue, informedInterest) {
		const expectedInterest = futureValue - presentValue;
		const tolerance = Math.max(0.01, Math.abs(expectedInterest) * 0.0001);

		if (Math.abs(expectedInterest - informedInterest) > tolerance) {
			throw this.validationError(
				"Os valores informados são incoerentes. Lembre-se: J = VF - VP.",
			);
		}
	}

	validateCompoundConsistency(presentValue, futureValue, rate, time) {
		const expectedFutureValue = this.calculateFutureValue(
			presentValue,
			rate,
			time,
		);
		const tolerance = Math.max(0.01, Math.abs(expectedFutureValue) * 0.0001);

		if (Math.abs(expectedFutureValue - futureValue) > tolerance) {
			throw this.validationError(
				`VP, VF, taxa e tempo são incoerentes. Com os dados informados, o VF esperado seria ${this.formatCurrency(expectedFutureValue)}.`,
			);
		}
	}

	convertTimeToRatePeriods(time, ratePeriod, timePeriod) {
		const timeInDays = time * this.getPeriodDays(timePeriod);
		return timeInDays / this.getPeriodDays(ratePeriod);
	}

	convertRatePeriodsToTime(time, ratePeriod, timePeriod) {
		const timeInDays = time * this.getPeriodDays(ratePeriod);
		return timeInDays / this.getPeriodDays(timePeriod);
	}

	getPeriodDays(period) {
		const days = this.periodsInDays[period];
		if (!days) {
			throw this.validationError("Selecione um período válido.");
		}
		return days;
	}

	getEquivalentPeriodMonths(period) {
		const months = this.periodsInMonths[period];
		if (!months) {
			throw this.validationError(
				"Selecione um período válido para a taxa equivalente.",
			);
		}
		return months;
	}

	getRequiredNumber(rawValue, label) {
		const value = this.getOptionalNumber(rawValue, label);
		if (value === undefined) {
			throw this.validationError(`${label} é obrigatório.`);
		}
		return value;
	}

	getOptionalNumber(rawValue, label) {
		if (rawValue === undefined || rawValue === null || rawValue === "") {
			return undefined;
		}

		const normalized = this.normalizeNumber(rawValue);
		const value = Number(normalized);
		if (!Number.isFinite(value)) {
			throw this.validationError(`${label} deve ser um número válido.`);
		}
		return value;
	}

	normalizeNumber(rawValue) {
		const value = String(rawValue).trim().replace(/\s/g, "");
		if (value.includes(",") && value.includes(".")) {
			return value.replace(/\./g, "").replace(",", ".");
		}
		return value.replace(",", ".");
	}

	validateRate(rate) {
		if (rate <= -1) {
			throw this.validationError("A taxa deve ser maior que -100%.");
		}
	}

	validatePositive(value, label) {
		if (value <= 0) {
			throw this.validationError(`${label} deve ser maior que zero.`);
		}
	}

	percentageToDecimal(value) {
		return value / 100;
	}

	formatCurrency(value) {
		this.ensureFinite(value);
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	}

	formatPercentage(value) {
		this.ensureFinite(value);
		return new Intl.NumberFormat("pt-BR", {
			style: "percent",
			minimumFractionDigits: 2,
			maximumFractionDigits: 6,
		}).format(value);
	}

	formatTime(value) {
		this.ensureFinite(value);
		return new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 4,
		}).format(value);
	}

	ensureFinite(value, message = "O cálculo gerou um resultado inválido.") {
		if (!Number.isFinite(value)) {
			throw this.validationError(message);
		}
		return value;
	}

	getResultType(target) {
		if (target === "i") return "rate";
		if (target === "n") return "time";
		return "money";
	}

	relatedResult(label, value, type) {
		return { label, value: this.ensureFinite(value), type };
	}

	result(value, type, related = []) {
		return {
			value: this.ensureFinite(value),
			type,
			related,
		};
	}

	validationError(message) {
		return { isValidationError: true, message };
	}
}
