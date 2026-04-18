# BOM v0.1 — Inventory & Baseline Observations

Agent inventory of `PYRA_Starter_BOM.xlsx` v0.1 (2026-04-18). Read-only snapshot of the starting BOM before any v0.2 substitutions. Source: XLSX rows extracted via openpyxl on 2026-04-18.

## Sheet structure

| Sheet | Rows | Purpose |
|---|---|---|
| README | 23 | Usage instructions, warnings, next steps |
| Node BOM | 65 | Full catalog (54 populated part lines + category headers + subtotals) |
| Phase 1 Kit | 35 | Minimal parts list for bench proof |
| Gateway BOM | 18 | PYRA Relay gateway sub-BOM |
| Procurement Notes | 39 | Vendors, Canadian considerations, lead times |

## Node BOM — rollup

Primary-part subtotals from the workbook (qty-1, USD):

| Tier | Subtotal (primary parts) |
|---|---|
| Scout | $541.30 |
| Sentinel | $2,292.30 |
| Vista | $2,422.30 |

Primary line counts per subsystem (ignoring section-header rows):

| Subsystem | Primary lines |
|---|---|
| MCU & Core | 8 (incl. microSD) |
| Weather | 8 |
| Soil & Fuel | 4 |
| Fire Detection | 6 |
| Environmental | 3 |
| Camera (Vista only) | 2 |
| Power | 4 |
| Deployment UX | 4 |
| Mechanical | 6 |
| Satellite | 1 |
| Cellular (optional) | 1 |

## Phase 1 Kit — rollup

- Hardware subtotal: **$984.00**
- Shipping + duties + tax (15 %): $147.60
- **Phase 1 kit estimate total: $1,131.60**

Phase 1 Kit intentionally excludes: satellite modem, camera, NPU, e-ink display, NFC, Hall sensor, ATECC608B, VOC/CO gas suite, PIR, research-grade soil (TEROS 10), ultrasonic anemometer (FT205).

## Gateway BOM — rollup

Gateway primary-path subtotal: **$1,779.00**, anchored on RAK7271 outdoor LoRaWAN gateway ($600). Alternative MultiTech MTCAP3 path replaces only the gateway itself (+$300).

## Observations & gaps for BOM v0.2

1. **Scout-tier price exceeds likely retail ceiling.** $541 BOM × 3–4× retail = ~$1,600–2,100 per Scout node. Too high for a semi-expendable dense deployment. See `docs/clarifications.md` Q3 — default proposed ceiling is $400 BOM, which forces substitutions.

2. **Charger / battery chemistry mismatch.** Node BOM Row 40 lists Adafruit bq24074 (Li-ion) as Scout-tier primary, but Row 41 specifies LiFePO4 cells. SparkFun Sunny Buddy (LT3652) is LiFePO4-configurable and should be the Scout primary, not the alternate. Explicit flip needed in v0.2.

3. **Secure-element scheduling inconsistency.** Node BOM Row 7 marks ATECC608B as Y/Y/Y (all tiers). Procurement Notes Row 39 says "Phase 1 software TLS keys; move to ATECC608B before Phase 2 fleet." Phase 1 Kit correctly excludes it. In v0.2 either move per-tier flag to "Phase 2+" for Scout or add a "phase introduced" column.

4. **Satellite subscription cost is missing.** Row 56 lists Swarm M138 hardware at $119 but there is no line for ongoing service (~$60/yr Swarm; $50–150/mo Starlink). BOM v0.2 should add a recurring-cost column or a separate services section so fleet TCO is derivable.

5. **Duff-moisture surrogate is engineering, not procurement.** Row 23 custom capacitive fuel-stick pad is priced at $8 (raw parts) but the deliverable requires: wood-dowel fabrication, capacitance-to-digital front end selection (FDC1004 vs. ESP32 touch), and calibration curve against a CS506 reference ($320, listed as Alt). Flag as firmware + mechanical deliverable.

6. **Ultrasonic anemometer dominates Sentinel cost.** FT205 at $850 is ~37 % of the Sentinel subtotal ($2,292). If Sentinel needs a comparable retail ceiling to Q3's Scout, FT205 is the first lever. No mid-priced ultrasonic exists in the BOM.

7. **Scout-tier lacks wind direction.** Row 13 (FT205) is Sentinel/Vista only; Row 14 (Mod Device Wind Rev P) is Scout-only and is speed-only. FWI / FBP's ISI (Initial Spread Index) uses wind direction for fire-spread modeling. Options for v0.2: accept the limitation and annotate provenance metadata (`wind_direction = null` on Scouts, and any derived ISI flagged lower-confidence); or swap Scout to Davis 6410 (+$180, busts the $400 ceiling); or add a cheaper cup-vane anemometer not currently listed.

8. **No per-row Canadian-stock / ISED-cert annotation.** Procurement Notes handle Canadian considerations in prose, but Node BOM rows lack a "Canada stock Y/N" and "ISED cert filed Y/N" column. Radio modules in particular (Heltec LoRa32, RAK3172, Quectel, Sequans) need explicit verification in v0.2.

9. **Enclosure penetrations audit incomplete.** Enclosure (Polycase WQ-10) is IP67, but sensor-probe feedthroughs rely on generic M16 cable glands (Row 52) with a cheap alternate flagged as "verify IP rating." For a stake exposed to freeze-thaw + UV + rodents, every penetration needs explicit IP-rating verification. Add a penetrations-audit column to v0.2.

## Lead-time critical path for Phase 1

From Procurement Notes:

| Item | Typical lead |
|---|---|
| Davis 6410 anemometer | Longest in kit — order first |
| FT205 (if committed) | 4–8 weeks, MOQ caveats (not in Phase 1) |
| TEROS 10 (if committed) | 2–4 weeks (not in Phase 1) |
| Custom SS spike + mast | 2 weeks local, ~1 week Xometry at 2–3× price |
| Secure-element pre-provisioned variants | Allocation-sensitive (deferred to Phase 2) |
| Heltec / RAK direct orders | 2–3 weeks |
| DigiKey Winnipeg / Mouser orders | Days |

## Next step per README

> "After the agent verifies current prices and substitutes parts, rename this file to v0.2 and commit it alongside DECISIONS.md."

BOM v0.2 work is blocked until:
- `docs/clarifications.md` answered (Q1 → vendor prioritization; Q3 → Scout substitution roster; Q6 → camera stays out).
- Current-price verification on DigiKey / Mouser / Adafruit (agent does not trust workbook prices without vendor-site check).
- Power-budget v1 first pass (drives MCU / radio power-mode assumptions, which may force a different MCU module choice).
