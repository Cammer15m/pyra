# PYRA — Clarifications (open, not blocking)

Seven open questions from `PYRA_Project_Brief.md` §16. Agent-recommended defaults are flagged **[DEFAULT]**. Approve by silence; override in-line where you disagree. Answered resolutions transcribe to `DECISIONS.md` as **D-008 onward** (D-004..D-007 taken by the Sprint-1 reframe).

**Status:** open — **no longer the Sprint 1 blocker** (superseded by D-004 on 2026-04-18 afternoon, which reframed Sprint 1 as a one-week rapid-validation sprint on owned hardware). The sprint proceeds on the flagged defaults. Answer at your convenience; nothing in the sprint depends on your answer.

---

## Q1 — Primary geography for Phase 1/2 pilot

| | Option | Pros | Cons |
|---|---|---|---|
| A | **Quebec / SOPFEU partnership track** **[DEFAULT]** | FWI is the Canadian reference system — direct fire-science alignment. SOPFEU is the natural first partner (brief §15). Single-country regulatory surface (ISED + Law 25 + CUSMA). User is Montréal-based → partner meetings are face-to-face. | SOPFEU is large and bureaucratic — partnership agreement may take months. Smaller total addressable market than US alone. |
| B | US Pacific Northwest | Larger market; USFS/CAL FIRE/NIFC are well-funded. FCC cert path is well-trodden for LoRa modules. ALERTWildfire + IRWIN ecosystems already in place. | FWI is Canadian; US agencies run NFDRS2016 (we'd still implement both, but prioritization flips). Cross-border data flows introduce additional compliance. No local partner access. |
| C | Both in parallel | Optionality. | Doubles reg + partner-engagement effort during a capital-constrained Phase 0. Not recommended for Phase 0. |

**Recommended default:** A. **Rationale:** fire-science alignment + local partner access + single reg surface for Phase 0.

**Your answer:**

---

## Q2 — Gateway strategy: bundle our own, or certify against existing?

| | Option | Pros | Cons |
|---|---|---|---|
| A | **Certify against existing LoRaWAN gateways** (RAK7268 dev / RAK7271 outdoor; MultiTech/Kerlink as alts) — don't build our own hardware in Phase 0–1 **[DEFAULT]** | Mature commodity; zero hardware dev-time cost; drop-in to ChirpStack; Phase 1 ships in weeks, not months. | We depend on third-party HW roadmaps; higher per-unit cost than a custom design at volume; less differentiation. |
| B | Design our own **PYRA Relay** from day one (BOM v0.1 Gateway sheet specs this at $1,779 primary) | Full control of form factor, power budget, integrated satellite backup. Long-term margin. | Months of hardware dev + FCC/ISED cert testing + firmware pulled out of Phase 1. Delays node shipping. |
| C | Start with (A); re-enter Relay at Phase 2+ when pilot gaps are known | De-risks Phase 1 while keeping Relay SKU on the roadmap. | Needs a calendar revisit point, not a vague "later." |

**Recommended default:** A, with implicit re-entry to C as a Phase 3+ decision. **Rationale:** gateway hardware is not where our IP is; delaying node development to reinvent a gateway is bad value. BOM v0.1 Gateway sheet stays as reference.

**Your answer:**

---

## Q3 — Unit-cost ceiling for the Scout tier (BOM, not retail)

**Context:** BOM v0.1 Scout subtotal = **US$541** at qty-1 (primary parts). Retail multiplier typically 3–4× BOM → Scout would retail at ~$1,600–2,100. Too expensive for a semi-expendable, dense-deployment node.

| | BOM ceiling | Implication |
|---|---|---|
| A | $150 | Forces: single-chip radio, no thermopile, hobby soil probe only, no GNSS (use gateway-assisted positioning), shared mechanical design. Probably unreachable in Phase 1. |
| B | $250 | Forces: nRF9160 or RAK3172 single-module radio, thermopile replaced with AMG8833, capacitive soil only, mechanical anemometer. Tight but possible. |
| C | **$400** **[DEFAULT]** | Allows: MCU + LoRa (Heltec-class dev → discrete modules for production), SHT45 + BMP390, capacitive soil + DS18B20, PM2.5, AMG8833 or MLX90640, mechanical anemometer (Davis 6410). Matches current Scout intent minus non-essentials. |
| D | $600 | Breathing room — ultrasonic anemometer within reach, nicer enclosure. Eats into Sentinel territory. |

**Recommended default:** C ($400 BOM). **Rationale:** BOM v0.1 Scout rolls up ~35 % over this ceiling; a $400 target forces deliberate substitution in BOM v0.2. Indicative levers:

| Swap | Savings |
|---|---|
| MLX90640 → AMG8833 | ~$15 |
| Apogee SP-110 → VEML7700 lux sensor | ~$220 (loses research-grade irradiance) |
| Vegetronix VH400 → DFRobot SEN0193 (×2 probes) | ~$94 (drift risk rises) |
| Davis 6410 → Mod Device Wind Rev P (speed-only) | ~$150 (loses direction — see Observation 7 in `docs/bom_inventory.md`) |

A $400 Scout needs 2–3 of these.

**Your answer:**

---

## Q4 — Open-source posture

| | Option | Rationale |
|---|---|---|
| A | Everything open (firmware + backend + mobile + fire-science models) | Max trust, max community, min monetizable moat. |
| B | **Firmware + fire-science models open; backend + mobile proprietary** **[DEFAULT]** | Firmware openness is expected in scientific/agency deployments (Zephyr culture, academic collaborations). Fire-science code MUST be auditable for life-safety. Backend and mobile embed product/UX investment and aren't scientifically load-bearing. |
| C | Everything proprietary | Conflicts with brief §2 ("open interfaces") and §3.4 ("open standards"). Agencies won't buy black boxes for life-safety. Not recommended. |
| D | Open-core firmware (drivers open, proprietary app/alert layer), everything else proprietary | Compromise position (Balena / Particle pattern). Preserves monetization surface. |

**Recommended default:** B. **Suggested licences:** Apache-2.0 on firmware + fire-science models. Backend + mobile: proprietary, source-available to agency partners under NDA if required.

**Revisit at Phase 3** if Q5 answer drives toward DaaS — DaaS favours open firmware (we sell data, not code).

**Your answer:**

---

## Q5 — Business model

| | Model | Fit |
|---|---|---|
| A | Hardware sale + SaaS per-node annual fee | Straightforward for agencies used to Motorola / Garmin / Davis purchasing. Annualized recurring revenue. |
| B | Data-as-a-service (DaaS) — we own the stakes, sell the feed | Great margin, slow to scale, capital-intensive. Fits research orgs and non-ops customers. |
| C | Grant-funded non-profit (NRCan, NSF, SOPFEU) | De-risks Phase 0–2 R&D; mission-aligned with public-safety domain. |
| D | **Public-private staged** — grants fund Phase 0–2, commercial (hybrid A + B) from Phase 3+ **[DEFAULT]** | De-risks validation without mortgaging margin. Quebec grant ecosystem (MITACS, IRAP, Prompt, FRQNT) is strong. |

**Recommended default:** D. **Rationale:** life-safety validation cycles are incompatible with seed-stage venture timelines; grants bridge that gap. Matches SOPFEU's non-commercial posture for initial pilot. Brand, firmware, and data stack remain ours when commercial phase begins.

**Phase 0 implications:** assume grant-funded; factor in-kind SOPFEU pilot costs (nodes at cost, no licensing). Don't bake in per-node SaaS infrastructure cost yet; build the stack cloud-cheap (single VM, Postgres, MQTT) per brief §11.

**Your answer:**

---

## Q6 — Camera (Vista) SKU in v1?

| | Option | Rationale |
|---|---|---|
| A | **No on-node camera in Phase 1–3. Install-time photos only (mobile phone, per brief §9)** **[DEFAULT]** | Brief §9 already covers the analytic payoff (fuel density, ladder fuels, canopy) via install-time photo → vision classifier. On-node camera simultaneously triggers Quebec Law 25 DPIA, data-sovereignty escalation, NPU selection, bandwidth, and power-budget hit. Not worth it for Phase 1–3. |
| B | Camera Vista SKU from Phase 2 | Earlier differentiation vs. ALERTWildfire. But privacy review + camera-specific data pipeline must complete before Phase 2 starts — slips the 10-node pilot. |
| C | Camera in Phase 4 only (matches original brief roadmap) | Matches brief §11 roadmap. Same outcome as A for Phase 0–3 purposes. |

**Recommended default:** A (equivalent to C with the install-time photo workflow handled earlier via the mobile app). **Rationale:** on-node cameras bundle four distinct hard problems. Defer until those have a dedicated track.

**Your answer:**

---

## Q7 — IRWIN / CAD integrations — mandated?

| | Option | Rationale |
|---|---|---|
| A | **None mandated. SOPFEU-first for Phase 1–2; IRWIN deferred to Phase 3+ for US expansion** **[DEFAULT]** | IRWIN is US-only. If Q1 answer is A (Quebec), IRWIN is not on the Phase 1–2 critical path. SOPFEU runs its own stack (Prometheus fire-behaviour model, GAFi). We integrate with those directly. |
| B | IRWIN required from Phase 2 | Only applies if Q1 answer is B (US-first). |
| C | Both SOPFEU + IRWIN from Phase 3 | Standard expansion path; re-ask at Phase 3 entry. |

**Recommended default:** A. **Rationale:** mirrors Q1. OGC SensorThings API already covers general-purpose agency integration; IRWIN is additional, not substitutive.

**Your answer:**

---

## Summary — agent defaults at a glance

| # | Question | Default |
|---|---|---|
| 1 | Pilot geography | Quebec / SOPFEU |
| 2 | Gateway strategy | Certify against existing LoRaWAN; no Relay dev in Phase 0–1 |
| 3 | Scout BOM ceiling | $400 |
| 4 | OSS posture | Firmware + fire-science open; backend + mobile proprietary |
| 5 | Business model | Public-private staged (grants → commercial at Phase 3) |
| 6 | Camera v1 | No on-node camera; install-time photos via mobile app |
| 7 | IRWIN | Not mandated; SOPFEU-first |

Approve by silence. After you answer, each resolution becomes `DECISIONS.md` D-004 through D-010 and BOM v0.2 + power-budget + regulatory gap analysis proceed on those assumptions.
