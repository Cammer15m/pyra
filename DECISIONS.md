# PYRA — DECISIONS.md

Running log of every non-trivial design choice on PYRA. Format per `CLAUDE.md` §3.7.

Entry format:
- **ID**: `D-NNN`, sequential, never renumbered.
- **Date**: YYYY-MM-DD.
- **Decided by**: name(s). "Default (agent-proposed)" = agent set a working default pending confirmation.
- **Options considered**: two-line max per option.
- **Decision**: what we're going with.
- **Rationale**: why.
- **Reversible?**: Y / N, with flip conditions if Y.
- **Supersedes / Superseded by**: prior / future D-IDs.

---

## D-001 — Baseline documents

- **Date:** 2026-04-18
- **Decided by:** Chris Marcotte + Claude (agent)
- **Options considered:**
  1. Start from `PYRA_Project_Brief.md` v0.1 + `PYRA_Starter_BOM.xlsx` v0.1 as-is.
  2. Rewrite brief before starting any engineering.
  3. Fork brief into a Phase-1-only minimum doc.
- **Decision:** (1). Baseline for Phase 0–1 is the brief v0.1 + BOM v0.1 as present in the working tree. Amendments to either are logged as separate D-entries, never as silent edits to the brief.
- **Rationale:** brief is internally coherent enough to start from; rewrite delays Phase 0 artifacts; fork risks divergence.
- **Reversible?** Y — any brief section is amendable via a superseding D-entry.

---

## D-002 — Working-agreement process choices

- **Date:** 2026-04-18
- **Decided by:** Chris Marcotte
- **Options considered:** see Decision list below.
- **Decision:**
  1. Daily status logs live in `status/YYYY-MM-DD.md`. Not in this file.
  2. `DECISIONS.md` contains decisions only — no status lines, no task lists, no plan edits.
  3. Clarifications on the seven §16 open questions live in `docs/clarifications.md`. Agent flags defaults; Chris overrides in-line (approve-by-silence).
  4. No Plane ticket tracking until Phase 0 artifacts land (clarifications answered + power-budget v1 + BOM v0.2 + regulatory gap analysis delivered).
- **Rationale:** minimize ceremony during Phase 0; keep the audit trail concentrated in this file rather than diluted across multiple trackers.
- **Reversible?** Y — any of (1)–(4) can flip with a new D-entry.

---

## D-003 — Pilot geography: working default (reversible, pending §16 Q1)

- **Date:** 2026-04-18
- **Decided by:** Default (agent-proposed), confirmed as working assumption by Chris Marcotte pending formal answer in `docs/clarifications.md` §Q1.
- **Options considered:**
  1. Quebec / SOPFEU partnership track.
  2. US Pacific Northwest.
  3. Both in parallel.
- **Decision:** (1) Quebec / SOPFEU. Working assumption for all Phase 0 artifacts until the clarifications doc is resolved.
- **Rationale:**
  - Fire-science alignment — brief §8 centers the Canadian FWI/FBP systems (operational reference for CWFIS and SOPFEU).
  - Partner access — brief §15 names SOPFEU as natural first partner; user is Montréal-based.
  - Regulatory surface — single-country path (ISED RSS-247/210 + Quebec Law 25 + CUSMA import) keeps Phase 0 focused.
- **Implications for Phase 0 artifacts (flagged so they're easy to revisit if flipped):**
  - Regulatory gap analysis: prioritize ISED, cover FCC as secondary.
  - Radio selection: LoRaWAN at 902–928 MHz (RSS-247 in Canada, same ISM band in US).
  - Data sovereignty: Canadian-hosted cloud assumption (AWS ca-central-1 or OVH Beauharnois).
  - BOM procurement: DigiKey Winnipeg + Mouser as Canadian-friendly primary vendors.
- **Reversible?** Y. A flip to (2) US Pacific Northwest invalidates only the regulatory gap-analysis section of Phase 0; BOM and power budget remain valid since the LoRa ISM band is shared.

---

## D-004 — Sprint 1 reframe: one-week rapid-validation sprint on owned hardware

- **Date:** 2026-04-18
- **Decided by:** Chris Marcotte
- **Options considered:**
  1. Stay on the four-artifact Phase 0 paper sprint (clarifications → BOM v0.2 → power budget → regulatory gap) before touching hardware.
  2. One-week rapid-validation sprint using the Keyestudio 48-in-1 kit, ESP32, Arduino, and Raspberry Pi already in hand; let empirical data from kit sensors inform BOM v0.2 rather than vice versa.
- **Decision:** (2). Sprint 1 is now a 7-day hands-on validation sprint. The four Phase 0 paper artifacts remain eventually required but are subordinate to sprint findings; regulatory gap analysis slips to Week 2.
- **Rationale:** Chris owns the hardware and is fluent in Arduino / ESP32 / Pi. Empirical kit-sensor behaviour beats datasheet-derived estimates for the trust / upgrade / skip calls that drive BOM v0.2. End-to-end integration (node → MQTT → Influx → Grafana) is validated on Day 1, catching integration issues a paper sprint would miss.
- **Reversible?** Y — if the sprint reveals a fundamental blocker (kit sensors teach us nothing useful; Pi/MQTT throughput insufficient; stack fundamentally mis-shaped for production), fall back to paper-first Phase 0 and order production parts directly.
- **Supersedes:** the implicit Phase-0-paper-first plan from the morning of 2026-04-18 (never formalized as a D-ID).
- **Effect on prior artifacts:**
  - `docs/clarifications.md` — still open, **no longer the Sprint 1 blocker**. Answer when convenient; sprint proceeds on the flagged defaults until overridden. Answered resolutions now transcribe to D-008 onward (D-004..D-007 taken by this reframe).
  - `docs/bom_inventory.md` — still valid as v0.1 baseline; sprint findings feed BOM v0.2.
  - `hardware/power_budget.csv` — skeleton still valid; sprint-measured currents on kit analogues will populate some rows, but most still require a datasheet pass on production parts.

---

## D-005 — Validation-sprint hardware and data stack

- **Date:** 2026-04-18
- **Decided by:** Chris Marcotte
- **Decision:**
  - **Server (Raspberry Pi):** Mosquitto MQTT broker + InfluxDB 2.x + Grafana + Telegraf as the MQTT → InfluxDB bridge.
  - **Primary MCU (ESP32):** sensor-bearing, 3.3 V logic; publishes MQTT over Wi-Fi.
  - **Standby MCU (Arduino Uno / Nano):** reserved for kit modules that are strictly 5 V (MQ-series gas sensors, older relays); bridges to ESP32 via UART or I²C where needed.
  - **MQTT topic schema `pyra/v1/node/{device_id}/{tel|hb|alert|evt|cmd}`** — prefigures LoRaWAN / ChirpStack topology. Sprint payloads are JSON (human-readable in `mosquitto_sub`). Day 7 write-up freezes a CBOR-mappable schema for the eventual LoRaWAN port.
- **Rationale:** maps cleanly to brief §5.3 (CBOR over MQTT via LoRaWAN network server). Swapping transport later (Wi-Fi → LoRaWAN) leaves topic taxonomy and payload shape intact. InfluxDB picked for sprint speed over TimescaleDB — Grafana integration is faster and no PostGIS is needed during the sprint. Production stack remains Timescale + PostGIS per brief §6.2.
- **Reversible?** Y. Sprint-only. Production stack unchanged.

---

## D-006 — Sprint schedule and per-day brief format

- **Date:** 2026-04-18
- **Decided by:** Chris Marcotte
- **Schedule:**
  - Day 1 — Plumbing (Pi stack + ESP32 hello-world) — `docs/sprint_day1_plumbing.md` ships 2026-04-18.
  - Day 2 — Weather (air T/RH, pressure, irradiance proxy).
  - Day 3 — Wet (soil moisture, rain, leaf wetness).
  - Day 4 — Fire-adjacent (smoke, gas, flame/IR, lightning analogue).
  - Day 5 — Motion + tamper (PIR, tilt, Hall, accelerometer if kit has one).
  - Day 6 — Toy FWI (feed Day-2/3 data into a Python cffdrs port — see D-007).
  - Day 7 — Write-up (sensor trust/upgrade/skip ratings, BOM v0.2 deltas, schema freeze).
- **Per-day brief format (`docs/sprint_dayN_{topic}.md`):**
  1. PYRA question being answered (one sentence linking to brief / clarifications).
  2. Kit sensors used (part, typical accuracy, the production analogue each stands in for).
  3. Wiring (ESP32 or Arduino pins, pullups, level-shift if any).
  4. Firmware snippet (extends the MQTT `tel` payload).
  5. Data to collect (duration, frequency, comparison reference — phone weather app, calibrated thermometer, nearby ECCC station, etc.).
  6. Rating criteria — **trust / upgrade / skip** with explicit thresholds.
- **Rationale:** uniform structure makes Day 7 synthesis trivial and keeps each evening scoped.
- **Reversible?** Y. If a day's theme needs a second evening, slip remaining days; don't compress quality.

---

## D-007 — cffdrs Python port: decision deferred to Day 6

- **Date:** 2026-04-18 (placeholder; decision to be made Day 6)
- **Context:** Day 6 needs a Python FWI implementation to compute indices from the sprint's air-T / RH / wind / rain data. NRCan's canonical `cffdrs` is an R package; no officially maintained Python port is known to me.
- **Candidates to evaluate on Day 6:** community Python ports (search terms: `cffdrs python`, `pyfwi`, `fwi-calculator`, `firebehaviour`), plus academic / one-off scripts. `rpy2`-backed wrappers are disqualified if they require shipping R at runtime.
- **Decision criteria (priority order):**
  1. Matches CFS reference values on published test cases (±0.1 on FFMC/DMC/DC/ISI/BUI/FWI).
  2. Maintenance — commits within last 18 months.
  3. Licence — permissive (Apache-2.0 / MIT / BSD / LGPL). AGPL disqualifies (would constrain OSS plan, `clarifications.md` Q4 default B).
  4. No R-runtime dependency.
- **If no candidate qualifies:** flag as a PYRA upstream dependency. Port `cffdrs` from R to Python ourselves, starting with FWI (~6 equations, ~1 week with reference-case tests); defer FBP (larger, fuel-type-dependent, ~4 weeks).
- **Reversible?** Decision itself is final on Day 6; the port-own-vs.-adopt choice is a one-way door only for the sprint — long-term we own both possibilities.

---
