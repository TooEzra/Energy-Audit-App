# Wattcheck — Energy Analysis Engine

Wattcheck is a multi-institution energy-audit decision-support tool for schools, colleges, hospitals and offices. This document describes the **analysis engine** in detail — every metric it computes and the exact formula behind it — followed by a summary of the app's features.

The engine is implemented as **pure functions** in `server/src/services/` (no database access, no I/O). Plain data in, plain data out, which keeps it easy to test and reason about.

| File | Responsibility |
|---|---|
| `analysis.service.js` | 12-month window, annual totals, EUI, cross-building comparison |
| `anomaly.service.js` | Flags months that are unusually high |
| `reconciliation.service.js` | Equipment annual kWh, end-use shares, inventory-vs-billed gap |
| `payback.service.js` | Recommendation saving estimate and simple payback |

---

## Engine data flow

```mermaid
flowchart TD
    subgraph Inputs
        B[Building<br/>floor area, type, name]
        R[Energy records<br/>month, kWh, cost]
        E[Equipment<br/>category, rating W, qty,<br/>hours/day, days/year]
    end

    subgraph Engine["Pure analysis engine — services/"]
        W[12-month window<br/>annual kWh + cost]
        EUI[EUI<br/>kWh/m²/year]
        AN[Anomaly detection]
        EQ[Equipment annual kWh]
        EN[End-use shares]
        RC[Reconciliation gap]
        SG[Recommendation<br/>saving estimate]
        PB[Simple payback]
    end

    subgraph Outputs
        D[Dashboard / comparison]
        RP[PDF / print report]
        REC[Recommendations list]
    end

    B --> W
    R --> W
    R --> AN
    W --> EUI
    W --> RC
    E --> EQ
    EQ --> EN
    EQ --> RC
    EN --> SG
    SG --> PB
    H[Measure library<br/>typical saving %, cost] --> SG

    W --> D
    EUI --> D
    AN --> D
    EN --> D
    RC --> D
    PB --> REC
    D --> RP
    REC --> RP

    style Engine fill:#eef7f1,stroke:#1F7A4D
```

---

## 1. Inputs

The engine works from three kinds of input per building:

| Input | Fields used |
|---|---|
| **Building** | `floorAreaM2` (m²), `type`, `name` |
| **Energy records** | `month` (`YYYY-MM`), `kwh`, `cost` — one row per calendar month |
| **Equipment** | `category`, `ratingW`, `qty`, `hoursDay`, `daysYear` |

```mermaid
erDiagram
    BUILDING ||--o{ ENERGY_RECORD : has
    BUILDING ||--o{ EQUIPMENT : has
    BUILDING ||--o{ RECOMMENDATION : has

    BUILDING {
        bigint id PK
        float floor_area_m2
        string type
    }
    ENERGY_RECORD {
        string month
        float kwh
        float cost
    }
    EQUIPMENT {
        string category
        float rating_w
        int qty
        float hours_day
        int days_year
    }
    RECOMMENDATION {
        float estimated_cost
        float estimated_annual_saving
    }
```

---

## 2. Analysis window and annual totals

Annual figures are **not** a raw sum of every record ever entered. They use a rolling **12-month window** that ends at the building's most recent recorded month.

```mermaid
timeline
    title Rolling 12-month analysis window
    section Old history (ignored)
        2023 : months older than start
    section Analysis window
        start (end − 11 months) : first month used
        ... : months in window
        end (latest recorded) : last month used
```

Given the sorted records, let `end` be the latest recorded month:

$$
\text{start} = \text{end} - 11\ \text{months}, \qquad
W = \{\, r : \text{start} \le r.\text{month} \le \text{end} \,\}
$$

- `monthsInPeriod` = number of records inside the window (max 12).
- The window is **complete** when `monthsInPeriod = 12`.

Annual totals are summed over the window only:

$$
\text{annualKwh} = \sum_{r \in W} r.\text{kwh}
\qquad
\text{annualCost} = \sum_{r \in W} r.\text{cost}
$$

**Average cost per kWh:**

$$
\text{costPerKwh} =
\begin{cases}
\dfrac{\text{annualCost}}{\text{annualKwh}}, & \text{annualKwh} > 0 \\[6pt]
\text{null}, & \text{otherwise}
\end{cases}
$$

> Rationale: a rolling window keeps figures current and comparable between buildings, and ignores stale records older than a year.

---

## 3. Energy Use Intensity (EUI)

EUI normalises consumption by floor area so buildings of different sizes can be compared.

$$
\text{EUI} = \frac{\text{annualKwh}}{\text{floorAreaM2}}
\quad \left[\mathrm{kWh\,/\,m^2\,/\,year}\right]
$$

Rules:

- If `floorAreaM2 ≤ 0`, EUI is `null` (unavailable).
- EUI is reported **only when the 12-month window is complete**. Otherwise the value is `null` and the label reads `incomplete (n of 12 months recorded)`.
- The engine never shows a partial-year EUI, because it would understate real intensity.

**Cross-building comparison** (`compareBuildings`):

- Each building contributes its EUI and annual kWh/cost.
- If the buildings have **different types** (case-insensitive), a warning is added noting that comparing their EUI may not be fair.
- Institution totals are the plain sums across buildings:

$$
\text{totalKwh} = \sum_{b} \text{annualKwh}_b
\qquad
\text{totalCost} = \sum_{b} \text{annualCost}_b
$$

- The monthly chart series puts every building on a shared month axis (the last 12 months any building has data for); missing months are `null`.

```mermaid
flowchart LR
    A[All building analyses] --> B{Same building type?}
    B -->|No| C[Add fairness warning]
    B -->|Yes| D[Compare EUIs directly]
    C --> E[Institution totals<br/>Σ kWh, Σ cost]
    D --> E
    E --> F[Monthly chart on shared axis<br/>missing months = null]
```

---

## 4. Anomaly detection

A month is flagged when its consumption is more than a threshold **above the average of the building's other months** (excluding the month being tested).

```mermaid
flowchart TD
    A[For each month r] --> B{n ≥ 2?}
    B -->|No| Z[Not flagged]
    B -->|Yes| C["avgOthers = (total − r.kwh) / (n − 1)"]
    C --> D{avgOthers > 0?}
    D -->|No| Z
    D -->|Yes| E["pctAbove = (r.kwh − avgOthers) / avgOthers × 100"]
    E --> F{"r.kwh > avgOthers × (1 + τ)?"}
    F -->|Yes| G[Flag as anomaly]
    F -->|No| Z
```

For each record `r` where there are at least two records:

$$
\text{avgOthers}_r = \frac{\displaystyle\sum_i \text{kwh}_i - \text{kwh}_r}{n - 1}
$$

$$
\text{pctAbove}_r = \frac{\text{kwh}_r - \text{avgOthers}_r}{\text{avgOthers}_r} \times 100
$$

$$
\text{anomaly}_r \iff \text{kwh}_r > \text{avgOthers}_r \,(1 + \tau)
$$

- Default `τ = 0.30` (30%), configurable via `ANOMALY_THRESHOLD` in `.env`.
- If `n < 2`, or `avgOthers ≤ 0` (no positive baseline), nothing is flagged.
- `pctAbove` is the percentage by which the month exceeds the others' average; it is reported with each flag.

> Rationale: comparing each month against the *other* months (rather than the mean of all months) prevents a single spike from hiding itself by inflating its own baseline.

---

## 5. Equipment annual consumption

For each equipment line, annual consumption is derived from its rating, quantity, daily usage and annual operating days:

$$
E_e = \frac{\text{ratingW}_e \times \text{qty}_e \times \text{hoursDay}_e \times \text{daysYear}_e}{1000}
\quad \left[\mathrm{kWh\,/\,year}\right]
$$

The `/1000` converts watts to kilowatts. Validation bounds: `ratingW > 0`, `qty ≥ 1` (whole), `0 ≤ hoursDay ≤ 24`, `0 ≤ daysYear ≤ 366` (whole).

**End-use shares** — equipment is grouped by category (`lighting`, `ac_ventilation`, `motors_pumps`, `ict`, `other`), then:

$$
\text{categoryKwh}_c = \sum_{e \in c} E_e
\qquad
\text{totalKwh} = \sum_{c} \text{categoryKwh}_c
$$

$$
\text{sharePct}_c =
\begin{cases}
\dfrac{\text{categoryKwh}_c}{\text{totalKwh}} \times 100, & \text{totalKwh} > 0 \\[6pt]
0, & \text{otherwise}
\end{cases}
$$

Categories with no equipment do not appear. Each equipment line also gets its own `sharePct = E_e / totalKwh × 100`.

---

## 6. Reconciliation (billed vs. inventory)

Reconciliation compares **billed consumption** (the 12-month window total) against the **inventory's calculated consumption**:

```mermaid
flowchart LR
    A[Billed kWh<br/>12-month window] --> C["gapKwh = billed − inventory"]
    B[Inventory kWh<br/>Σ equipment] --> C
    C --> D{"billed > 0?"}
    D -->|No| E[gapPct = null<br/>cannot reconcile]
    D -->|Yes| F["gapPct = gapKwh / billed × 100"]
    F --> G{"|gapPct| > 15%?"}
    G -->|Yes| H[Warning: investigate]
    G -->|No| I[Within tolerance]
```

$$
\text{gapKwh} = \text{billedKwh} - \text{inventoryKwh}
$$

$$
\text{gapPct} =
\begin{cases}
\dfrac{\text{gapKwh}}{\text{billedKwh}} \times 100, & \text{billedKwh} > 0 \\[6pt]
\text{null}, & \text{otherwise}
\end{cases}
$$

$$
\text{warning} \iff |\text{gapPct}| > 15
$$

- `WARN_PCT = 15%`. A normal inventory covers only the audited equipment, so a modest gap is expected.
- If no billed consumption exists (`billedKwh = 0`), `gapPct` is `null` and the inventory cannot be reconciled.
- `billedComplete` carries the 12-month completeness flag from the analysis so the UI can caveat partial data.
- The message text changes with the outcome (no data / within tolerance / outside tolerance), always showing the gap to one decimal place.

---

## 7. Recommendation saving estimate

When a recommendation is pre-filled from a measure in the library, the estimated annual saving is:

$$
\text{baselineCost} =
\begin{cases}
\text{annualCost}, & \text{whole-building} \\[6pt]
\text{annualCost} \times \dfrac{\text{endUseSharePct}}{100}, & \text{otherwise}
\end{cases}
$$

$$
\text{estimatedAnnualSaving} =
\operatorname{round}\!\left(\text{baselineCost} \times \frac{\text{typicalSavingPct}}{100},\ 2\right)
$$

Where:

- `annualCost` is the building's 12-month window cost.
- `endUseSharePct` is the measure category's share of **inventory** consumption (Section 5).
- `wholeBuilding` is **true** when the measure category is `operating_hours` or `practices`, **or** when no equipment inventory exists for that category (`endUseSharePct = null`).

`typicalSavingPct` and `typicalCost` come from the measure library. The suggested title is the measure name. Every pre-filled value is **editable** before saving and is always labelled an *estimate*.

```mermaid
flowchart TD
    A[Select library measure] --> B{Category is<br/>operating_hours / practices<br/>or no inventory?}
    B -->|Yes| C[baseline = whole-building annual cost]
    B -->|No| D[baseline = annual cost × category end-use share]
    C --> E[saving = baseline × typicalSavingPct]
    D --> E
    E --> F[Round to 2 dp, label as estimate]
```

**Built-in measures** (`npm run seed`):

| Measure | Category | Typical saving | Typical cost |
|---|---|---|---|
| LED lighting retrofit | lighting | 50% | 250,000 |
| Occupancy sensors | lighting | 25% | 80,000 |
| Efficient AC units | ac_ventilation | 30% | 600,000 |
| AC schedule / switch-off | ac_ventilation | 15% | 20,000 |
| VFD on pumps | motors_pumps | 30% | 350,000 |
| Power factor correction | other | 5% | 300,000 |
| Timer on water heating | other | 20% | 25,000 |
| Staff awareness programme | practices | 5% | 15,000 |

---

## 8. Simple payback

Simple payback is the number of years for the estimated annual saving to repay the estimated cost:

$$
\text{paybackYears} = \frac{\text{estimatedCost}}{\text{estimatedAnnualSaving}}
$$

```mermaid
flowchart TD
    A[Cost, annual saving] --> B{annualSaving > 0?}
    B -->|No| C[Not applicable]
    B -->|Yes| D{cost > 0?}
    D -->|No| E[Immediate / 0 years]
    D -->|Yes| F[payback = cost ÷ saving<br/>show to 1 dp + 'years']
```

Zero-handling, in this order:

| Condition | Result |
|---|---|
| `annualSaving ≤ 0` | `Not applicable` (no saving to repay anything) |
| `annualSaving > 0` and `cost ≤ 0` | `Immediate` (0 years) |
| `annualSaving > 0` and `cost > 0` | `cost / saving`, shown to 1 decimal place + "years" |

> Rationale: check the saving first, so a zero saving always reads "Not applicable" even if the cost is also zero.

---

## 9. Worked example

A building with a 1,800 m² floor area and a complete 12-month window:

- `annualKwh = 252,000`, `annualCost = 6,048,000`
- EUI: $\;252{,}000 / 1{,}800 = 140.0\ \mathrm{kWh/m^2/year}$
- Cost per kWh: $\;6{,}048{,}000 / 252{,}000 = 24.00$
- Its lighting inventory totals `60,000 kWh`; total inventory `120,000 kWh` → $\;\text{lighting share} = 50\%$
- **LED retrofit** (50% typical saving), inventory exists:
  - $\text{baselineCost} = 6{,}048{,}000 \times 0.50 = 3{,}024{,}000$
  - $\text{estimatedAnnualSaving} = 3{,}024{,}000 \times 0.50 = 1{,}512{,}000$
  - $\text{payback} = 250{,}000 / 1{,}512{,}000 \approx 0.2\ \text{years}$
- **Reconciliation**: billed `252,000` vs. inventory `120,000` →
  $\;\text{gapPct} = (252{,}000 - 120{,}000)/252{,}000 \times 100 \approx 52.4\%$ → warning (inventory covers only part of the building).

---

## 10. Model assumptions and limits

- All annual figures use the rolling 12-month window, not the calendar year or the full history.
- EUI is hidden until all 12 months are present.
- Anomaly detection is a simple relative-to-other-months rule; it does not model weather or occupancy.
- Savings and paybacks are **estimates**, never verified measured savings.
- The engine does no weather normalisation, NPV/IRR, carbon accounting or forecasting.

---

## App features

**Multi-institution, multi-tenant**
- Each institution's data is isolated with PostgreSQL row-level security; cross-tenant records behave as if they do not exist.
- Roles: **Admin** (full access plus users, settings and deletion) and **Auditor** (create/edit audit data). New auditors get a one-time temporary password and must change it at first login.

**Audit workflow**
- **Buildings** — register buildings with type, floor area and operating hours.
- **Energy records** — enter monthly kWh and cost manually or import from CSV (`month,kwh,cost`) with per-row validation and duplicate-month checks. Imports are dry-run first and only write valid rows on confirm.
- **Dashboard** — institution-wide overview: annual consumption/cost, EUI per building, monthly trend chart, EUI comparison and flagged anomalies.
- **Equipment inventory** — per-building equipment lines by category with automatic annual kWh and end-use share calculations.
- **Reconciliation** — billed vs. inventory comparison with a 15% tolerance warning.
- **Audit findings** — record findings by area (lighting, AC & ventilation, motors & pumps, operating hours, practices) with priority and optional photo.
- **Recommendations** — pre-fill from a measure library, then edit cost/saving; automatic simple payback. Library includes system measures plus institution-specific ones.
- **Reports** — per-building audit report with KPIs, energy summary table, EUI, monthly chart (anomalies highlighted), findings, recommendations and an editable conclusion. Export to PDF (Puppeteer) or print to PDF.
- **Data export** — download the institution's own data as JSON or CSV.

**Charts and data**
- Monthly consumption, trend, EUI comparison and end-use breakdown charts (Chart.js), each with an accessible data-table alternative.

**Security and operations**
- JWT in an httpOnly cookie; tenant id taken only from the token, never from the URL or body.
- Login rate limiting, Zod validation on every input, tenant-scoped file storage for finding photos and reports.
- Seeded demo institutions and a Vitest/Supertest suite covering the formulas, validation, roles and cross-tenant isolation.

---

## Running the app

```bash
npm install            # root (concurrently)
npm run install:all    # server + client
npm run migrate        # tables, RLS policies, auth functions
npm run seed           # measure library + demo institutions
npm run dev            # API :4000, app :5173
```

Open **http://localhost:5173**. Run tests with `npm test`.

See `docs/README.md` for full local setup, architecture and tenancy details.
