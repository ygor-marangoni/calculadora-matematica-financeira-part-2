# Calculadora Matemática Financeira — Parte 2

![Capa da Calculadora Financeira](./capa.png)

Calculadora web para operações de **capitalização composta**, conversão de taxas e cálculo de taxas equivalentes. O projeto utiliza JavaScript puro e mantém uma interface responsiva, com formatação monetária e percentual no padrão brasileiro.

## Autores

- Ygor Marangoni
- Raphael Muniz

## Funcionalidades

### Capitalização composta

Permite calcular:

- Capital ou Valor Presente (VP)
- Montante ou Valor Futuro (VF)
- Juros (J)
- Taxa de juros (i)
- Tempo (n)

Fórmulas utilizadas:

```text
VF = VP × (1 + i)ⁿ
VP = VF ÷ (1 + i)ⁿ
J  = VF - VP
i  = (VF ÷ VP)^(1 ÷ n) - 1
n  = log(VF ÷ VP) ÷ log(1 + i)
```

A calculadora também permite encontrar o capital diretamente a partir dos juros:

```text
VP = J ÷ [(1 + i)ⁿ - 1]
```

### Conversão de períodos

A taxa é informada em porcentagem e convertida internamente para decimal. O tempo é ajustado automaticamente ao período da taxa.

Períodos disponíveis:

- Dia
- Mês
- Semestre
- Ano

Exemplo: uma taxa de `1,5% ao mês` aplicada durante `45 dias` utiliza `n = 1,5 mês`.

### Conversão de taxas — capitalização

- Taxa nominal para proporcional/efetiva:

```text
i proporcional = i nominal ÷ k
```

- Taxa proporcional/efetiva para nominal:

```text
i nominal = i proporcional × k
```

### Taxas equivalentes

- Período menor para maior:

```text
i equivalente = (1 + i)ⁿ - 1
```

- Período maior para menor:

```text
i equivalente = (1 + i)^(1 ÷ n) - 1
```

As conversões disponíveis incluem taxas mensais, semestrais e anuais.

## Validações

O projeto impede resultados inválidos e apresenta mensagens amigáveis para:

- Campos obrigatórios vazios
- Taxas menores ou iguais a `-100%`
- Tempo, capital, montante ou quantidade de períodos inválidos
- Divisão por zero
- Resultados `NaN` ou infinitos
- Incoerência entre VP, VF e J

Quando os três valores são informados, a relação abaixo é validada:

```text
J = VF - VP
```

## Tecnologias

- HTML5
- CSS3
- JavaScript ES Modules
- Tailwind CSS via CDN
- Phosphor Icons
- Google Fonts — Poppins

## Como executar

Clone o repositório:

```bash
git clone https://github.com/ygor-marangoni/calculadora-matematica-financeira-part-2.git
```

Entre na pasta:

```bash
cd calculadora-matematica-financeira-part-2
```

Inicie um servidor local:

```bash
python -m http.server 8000
```

Depois, acesse:

```text
http://localhost:8000
```

## Estrutura

```text
.
├── index.html
├── style.css
├── capa.png
├── README.md
└── js
    ├── api.js
    ├── main.js
    └── ui.js
```

- `api.js`: cálculos, conversões, validações e formatação.
- `ui.js`: interação dos formulários e exibição dos resultados.
- `main.js`: inicialização da aplicação.

## Exemplo

Para calcular o capital que rende `R$ 500,00` de juros a `1,8% ao mês` durante `45 dias`:

```text
J = R$ 500,00
i = 1,8% ao mês
n = 45 dias = 1,5 mês
```

Resultado aproximado:

```text
VP = R$ 18.435,80
```
