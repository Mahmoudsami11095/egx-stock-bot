# 📐 EGX Stock & Gold Bot: Data Sources, Valuation Model & System Architecture

This document provides a comprehensive technical breakdown of where the bot retrieves live market data, how the **Automated Fair Value (القيمة العادلة)** is computed, how **Sharia Compliance** is audited, how **Trading Recommendations (Buy/Sell Signals)** are derived, and how the **Google Gemini AI Engine & Hybrid Infrastructure** are orchestrated.

---

## 📡 1. Live Data Sources (مصادر البيانات المباشرة)

The bot relies on three high-frequency, authoritative data streams:

| Data Type                              | Primary Source             | Endpoint / Protocol                                       | Data Parameters Retrieved                                                                                                            |
| :------------------------------------- | :------------------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **EGX Stocks (البورصة المصرية)**       | TradingView Scanner API    | `POST https://scanner.tradingview.com/egypt/scan`         | Live Price, Change %, Volume, 30D Avg Volume, Day High/Low, 52W High/Low, RSI(14), SMA20, SMA50, P/E Ratio, EPS (TTM), Analyst Score |
| **Gold & Forex (الذهب والدولار)**      | TradingView Scanner API    | `POST https://scanner.tradingview.com/global/scan`        | International Gold (`XAU/USD`), USD to EGP Exchange Rate (`FX_IDC:USDEGP`), Local Sagha 24K Gold Rates                               |
| **Sharia Compliance (التوافق الشرعي)** | Sharia Aggregator Database | `GET https://stocks.templatesnippet.com/data/stocks.json` | Core activity compliance, Interest-bearing debt ratio (<33%), Haram revenue ratio (<5%), Zakat calculation                           |

---

## 💎 2. Enhanced Automated Fair Value Model (نموذج القيمة العادلة المطور)

The Fair Value is dynamically computed using a **priority cascade** of fundamental valuation models when data is available, or structural Fibonacci ranges when earnings/book/dividend metrics are pending. When both EPS and BVPS are available, the two estimates are blended using instrument-aware weights. All models share a common set of macro adjustments:

### 🧮 Shared Macro Adjustments

1. **CBE Interest Rate Macro Discount (خصم سعر الفائدة)** — Central Bank of Egypt corridor rate (~27.25%) reduces fundamental multiples:
   $$\text{MacroDiscount} = \max\left(0.75, \, 1 - \max\left(0, (\text{CBE\_Rate} - 0.12) \times 0.80\right)\right)$$
   - When EPS confidence is **HIGH** (audited TTM / override), a documented confidence uplift is applied symmetrically to both the PE and PB models:
     $$\text{EffectiveMacroDiscount} = \min\left(1, \, \text{MacroDiscount} + 0.082\right)$$
2. **Consensus Growth Modifier (معدل نمو إجماع المحللين)** — adjusts multiples based on analyst consensus (`Recommend.All`, clamped to `[-1, +1]`):
   $$\text{GrowthModifier} = 1 + 0.05 \times \text{RecommendScore}$$
3. **FX Devaluation Adjustment (تعديل تعويم الجنيه)** — applied to **all fundamental models (PE, PB, and DDM)** based on sector sensitivity and USD/EGP deviation from a $48.0$ EGP baseline:
   $$\text{FXAdjustment} = 1 + \text{FxSensitivity}_{\text{sector}} \times \max\left(0, \frac{\text{USD/EGP} - 48.0}{48.0}\right)$$

### 🔹 Model A: Macro-Adjusted Fundamental P/E Valuation (عند توفر EPS)

When Trailing Twelve Months Earnings Per Share ($\text{EPS}_{\text{TTM}}$) is positive:

$$\text{FairValue}_{PE} = \text{EPS}_{\text{TTM}} \times \left(\text{SectorPE}_{\text{base}} \times \text{GrowthModifier} \times \text{EffectiveMacroDiscount} \times \text{FXAdjustment}\right)$$

Where:
- **Sector Base Multiplier ($\text{SectorPE}_{\text{base}}$):** Calibrated baseline (e.g. Pharmaceuticals: 18.0x, Banking: 8.0x, Food & Bev: 16.0x).

### 🔹 Model B: Macro-Adjusted P/B Valuation (عند توفر BVPS)

When positive Book Value Per Share ($\text{BVPS}$) is available:

$$\text{FairValue}_{PB} = \text{BVPS} \times \left(\text{SectorPB}_{\text{base}} \times \text{GrowthModifier} \times \text{EffectiveMacroDiscount} \times \text{FXAdjustment}\right)$$

### 🔹 Model C: Dividend Discount Model (DDM) (عند توفر DPS فقط)

When only positive Dividends Per Share ($\text{DPS}$) are available (no EPS/BVPS):

$$\text{FairValue}_{DDM} = \frac{\text{DPS}}{\text{RequiredReturn}} \times \text{GrowthModifier} \times \text{MacroDiscount} \times \text{FXAdjustment}$$

Where the **Required Return** is derived from the CBE corridor rate rather than a fixed assumption, to remain consistent with the prevailing interest-rate environment:

$$\text{RequiredReturn} = \max\left(0.12, \, \text{CBE\_Rate} \times 0.60\right)$$

### 🎯 Instrument-Aware Blending (عند توفر EPS و BVPS معاً)

When both Model A and Model B produce a value, they are blended with weights tailored to the instrument type:

| Instrument Type                  | Weights             | Confidence |
| :------------------------------- | :------------------ | :--------: |
| **Fund (صندوق استثمار)**         | $0.15 \times PE + 0.85 \times PB$ | MEDIUM |
| **Real Estate (عقاري)**          | $0.35 \times PE + 0.65 \times PB$ | HIGH |
| **Bank (بنك)**                   | $0.40 \times PE + 0.60 \times PB$ | HIGH |
| Equity — PE far above PB ($>1.5\times$) | $0.90 \times PE + 0.10 \times PB$ | HIGH |
| Equity — PE above PB ($>1.2\times$)     | $0.75 \times PE + 0.25 \times PB$ | HIGH |
| Equity — otherwise               | $0.50 \times PE + 0.50 \times PB$ | HIGH |

### 🔹 Model D: Structural Fibonacci Range Valuation (عند عدم توفر أي أساسيات)

If EPS, BVPS, and DPS are all absent or non-positive, valuation falls back to structural 52-week price bounds:

$$\text{FairValue} = \left(\text{Low}_{52\text{W}} + 0.618 \times \left(\text{High}_{52\text{W}} - \text{Low}_{52\text{W}}\right)\right) \times \left(0.85 + 0.15 \times \text{VolWeight}\right) \times \left(1 + 0.10 \times \text{RecommendScore}\right) \times \text{MacroDiscount} \times \text{FXAdjustment}$$

Where $\text{VolWeight} = \min(\text{VolRatio}, 2.0)$. A score floor of `currentPrice × (1 + 0.10 × RecommendScore)` is enforced when the score is positive. Labeled with confidence badge `🟡 نطاق فني هيكلي (Fibonacci Range)` for transparent disclosure.

### 🛡️ Expanded Safety Guardrails

To prevent irrational extremes while unlocking detection of true **Deep Value** stocks:

$$\text{Fair Value} \in \left[0.75 \times P_{\text{current}}, \, 2.00 \times P_{\text{current}}\right]$$

### ✅ Input Validation

Before any computation, the engine validates inputs to guarantee numerical integrity:
- `currentPrice`, `low52`, and `high52` must be finite positive numbers.
- If `high52 < low52`, the bounds are normalized (swap) or rejected with a fallback to the current-price corridor.
- `NaN`, `Infinity`, or negative fundamental inputs are treated as unavailable, routing to the next available model.
- `recommendScore` is clamped to $[-1, +1]$; `volRatio` is clamped to $[0, 2]$.

---

## 📊 3. Recommendation Scoring Engine (آلية حساب التوصية)

The bot computes a composite **Signal Score ($S$)** evaluating momentum, moving average crossovers, institutional volume spikes, and valuation upside:

| Indicator / Metric                     | Condition                                                    | Score Contribution |
| :------------------------------------- | :----------------------------------------------------------- | :----------------: |
| **Relative Strength Index (RSI 14)**   | $\text{RSI} < 35$ (Oversold Rebound Zone)                    |        $+2$        |
|                                        | $35 \le \text{RSI} < 45$ (Accumulation Zone)                 |        $+1$        |
|                                        | $65 < \text{RSI} \le 75$ (Overbought Warning)                |        $-1$        |
|                                        | $\text{RSI} > 75$ (Overbought Peak)                          |        $-2$        |
| **Trend Crossover (SMA 20 vs SMA 50)** | $\text{SMA20} > \text{SMA50}$ (Bullish Uptrend)              |        $+1$        |
|                                        | $\text{SMA20} < \text{SMA50}$ (Bearish Downtrend)            |        $-1$        |
| **Institutional Volume Spike**         | $\text{Volume} \ge 1.3 \times \text{AvgVolume}_{30\text{D}}$ |        $+1$        |
| **Fair Value Upside %**                | $\text{Upside} \ge +20\%$ (Undervalued)                      |        $+1$        |
|                                        | $\text{Upside} \le -10\%$ (Overvalued)                       |        $-1$        |

### 🎯 Signal Classification Matrix

$$
\text{Signal Score } (S) \longrightarrow \begin{cases}
\mathbf{STRONG\_BUY} & \text{if } S \ge +3 \\
\mathbf{BUY} & \text{if } S \in \{+1, +2\} \\
\mathbf{NEUTRAL} & \text{if } S = 0 \\
\mathbf{SELL} & \text{if } S \in \{-1, -2\} \\
\mathbf{STRONG\_SELL} & \text{if } S \le -3
\end{cases}
$$

---

## 🎯 4. Trading Plan Formulation (إعداد خطة التداول)

For every stock analyzed, the bot formulates an actionable 4-point trading plan:

- 📥 **Safe Entry Zone (نطاق الدخول الآمن):**
  $$\left[0.985 \times P_{\text{current}}, \, 1.005 \times P_{\text{current}}\right]$$
- 🎯 **Target 1 (الهدف الأول):**
  $$\max\left(\text{Resistance}, \, 1.05 \times P_{\text{current}}\right)$$
- 🚀 **Target 2 (الهدف الثاني - القيمة العادلة):**
  $$\text{Fair Value}$$
- 🛑 **Stop Loss (وقف الخسارة):**
  $$\min\left(\text{Support}, \, 0.94 \times P_{\text{current}}\right)$$

---

## 🕌 5. Sharia Compliance Audit Rules (التوافق الشرعي)

The bot automatically audits all EGX stocks against AAOIFI Sharia standards:

1. **Core Business Activity:** Must be halal (excluding conventional interest banking, pork, gambling, alcohol).
2. **Interest-Bearing Debt Ratio:** Total debt must not exceed **$33\%$** of market cap / total assets.
3. **Haram Revenue Ratio:** Non-halal revenue must not exceed **$5\%$** of total income.

_Stocks failing any of these three criteria (e.g. `SUGR` with a 57.59% loan ratio) are automatically purged from watchlists, Google Sheets, and analysis outputs._

---

## 🤖 6. Google Gemini AI Engine & Failover Architecture

The AI Chatbot and Deep Stock Analysis Modal utilize a robust, multi-tier failover mechanism:

```
[User Request] ──► [Vercel Serverless /api/chat]
                           │
                           ├──► Attempt 1: Gemini 3.6 Flash (Priority: 18s budget)
                           ├──► Attempt 2: Gemini 2.0 Flash
                           ├──► Attempt 3: Gemini 1.5 Flash
                           ├──► Attempt 4: Gemini 3.1 Flash Lite
                           └──► Attempt 5: Gemini Flash Latest (Alias)
                                   │
                                   └── (If Offline / Rate-Limited) ──► Smart Local Market Engine
```

### Key Technical Specs:

- **Primary Model (`gemini-3.6-flash`):** Allocated an **18-second priority budget** for complex financial synthesis and Markdown table formatting.
- **Failover Hierarchy:** Includes `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.0-flash`, and `gemini-1.5-flash`.
- **Authentication Header:** Passes API keys via `x-goog-api-key` in HTTP headers to support both standard keys (`AIzaSy...`) and Google Cloud OAuth2 keys (`AQ...`).
- **Smart Local Fallback (`generateLocalAiAnalysis`):** Guarantees zero downtime by instant fallback calculation if network endpoints time out.
- **Markdown & Table Renderer:** Client-side parser converts pipe tables (`|...|`) into HTML tables with dark glassmorphism styling and RTL alignment.

---

## 🏗️ 7. Infrastructure & Deployment Architecture

The application uses a **hybrid deployment** model:

1. **Vercel Cloud Platform (Frontend SPA & Serverless Functions)**
   - **URL:** [https://egx-stock-bot.vercel.app/](https://egx-stock-bot.vercel.app/)
   - **Framework:** Angular 22 Single-Page Application.
   - **Functions:** `/api/stocks`, `/api/gold`, `/api/chat` with `maxDuration: 30s`.

2. **Azure Linux VM (Background Worker & Cron Node)**
   - **IP:** `20.91.240.54` (Port 3000 & SSH 22)
   - **Runtime:** Node.js 22 (`v22.23.2`) + PM2 Process Manager.
   - **Services:** Long-running scraping processes, background cron tasks, and Telegram bot notification service.