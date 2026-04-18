# PYRA — Project Brief

**Forest-Floor Wildfire Intelligence Platform**

*Version 0.1 — Initial Brief for Development Agent*

---

## 1. Mission

PYRA is a ruggedized, stake-shaped sensor node driven into forest ground to continuously measure the physical conditions that govern wildfire ignition and spread. Each node streams data to a cloud platform that fuses on-device sensing with satellite, terrain, weather, and vegetation datasets to produce live fire-danger intelligence for two audiences:

1. **Operational:** firefighters, fire agencies, incident commanders, and dispatchers who need localized, real-time situational awareness.
2. **Scientific / managerial:** forest managers, ecologists, and researchers who need long-term data on fuel conditions, forest dynamics, and climate change impacts on fire regimes.

PYRA is **not** a new fire-danger model. It is a sensing-and-data platform that feeds established fire-science frameworks (Canadian FWI/FBP, US NFDRS2016, Nelson fuel-moisture models) with better, denser, ground-truth data than any current system.

---

## 2. Design Principles

1. **Measure, don't invent.** Whenever an established fire-science model exists, we compute it — we do not replace it.
2. **Sensor fusion over single signals.** No single sensor tells the truth; combinations do.
3. **Graceful degradation.** A node that loses comms should still store data locally. A node that loses power should still flash a last-gasp alert. A network that loses half its nodes should still be useful.
4. **Dual-use from day one.** The same raw data feeds firefighter dashboards and research pipelines — different consumers, same source of truth.
5. **Open interfaces.** Use open standards (OGC SensorThings, STAC, GeoJSON, MQTT) so PYRA data can flow into existing agency GIS tools.
6. **Never create false confidence.** Every derived value ships with an uncertainty estimate. Firefighters make life-and-death decisions; they must be able to trust — and appropriately distrust — our outputs.
7. **Expendable where necessary.** Nodes in a fire's path will be lost. Design the unit cost and the data pipeline around that reality.

---

## 3. System Architecture (one-page view)

```
 ┌──────────────────────────────────────────────────────────────┐
 │  FIELD LAYER                                                 │
 │  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
 │  │ PYRA Node  │  │ PYRA Node  │  │ PYRA Node  │  ... (N)     │
 │  │ sensors+   │  │ sensors+   │  │ sensors+   │              │
 │  │ MCU+radio  │  │ MCU+radio  │  │ MCU+radio  │              │
 │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘              │
 │        │ LoRaWAN / BLE mesh             │                    │
 │        ▼                                ▼                    │
 │  ┌──────────────────────────────────────────────────┐        │
 │  │ PYRA Gateway  (LoRaWAN + cellular/satellite)     │        │
 │  └──────────────────────┬───────────────────────────┘        │
 └─────────────────────────┼────────────────────────────────────┘
                           │  encrypted uplink
                           ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  CLOUD LAYER                                                 │
 │  Ingest  →  Time-series DB  →  GIS / PostGIS                 │
 │             (Timescale)        +  fire-science engine        │
 │                                (FWI, FBP, Nelson, etc.)      │
 │             ↘                                                │
 │              Alerting + Fleet Mgmt + OTA                     │
 │                                                              │
 │  External feeds: Sentinel-2, DEM, NOAA/ECCC, FIRMS, OSM,     │
 │                  CNFDB, LANDFIRE, lightning networks         │
 └────────────────────────┬─────────────────────────────────────┘
                          │  OGC SensorThings / GeoJSON / MQTT
                          ▼
 ┌──────────────────────────────────────────────────────────────┐
 │  CONSUMER LAYER                                              │
 │  Firefighter map app (iOS/Android)                           │
 │  Research/management web dashboard                           │
 │  Agency GIS plug-ins (ArcGIS / QGIS)                         │
 │  Public API + data catalogue                                 │
 └──────────────────────────────────────────────────────────────┘
```

---

## 4. Hardware — The PYRA Node

### 4.1 Form factor

- **Stake geometry.** ~15 cm conical stainless-steel ground spike, ~40 cm above-ground tube housing electronics, ~25 cm mast for wind sensor / solar panel. Total height ~80 cm deployed.
- **Ground coupling.** Soil-contact sensors on the buried spike; above-ground sensors in the tube; wind and sun on the mast.
- **Enclosure.** IP67 minimum, UV-stable polymer + stainless hardware, powder-coated safety-orange for visibility to ground crews. Ceramic-lined upper cap to extend heat survival (will not survive direct crown fire — don't pretend otherwise).
- **Deployment methods to support:**
  - Hand-deployed by ground crew (primary)
  - Drone-dropped version (lighter, spike-weighted)
  - Vehicle-launched or helicopter-dropped for rapid pre-positioning ahead of fire seasons

### 4.2 Core electronics

| Component       | Suggested part                               | Rationale                                                               |
|-----------------|----------------------------------------------|-------------------------------------------------------------------------|
| MCU             | ESP32-S3 (Wi-Fi/BLE) + LoRa SX1262 companion | Mature toolchain, cheap, strong community. Or single-chip nRF9160 for cellular. |
| Storage         | 8–32 MB flash + microSD slot                 | Local buffer for days of data during comms outage                       |
| GNSS            | u-blox MAX-M10S                              | Low-power, multi-constellation                                          |
| RTC             | DS3231 w/ coin cell                          | Accurate timestamps during sleep                                        |
| Security        | ATECC608B secure element                     | Key storage, device attestation, tamper evidence                        |

### 4.3 Sensor suite

| Parameter                     | Sensor / technique                           | Notes                                                  |
|-------------------------------|----------------------------------------------|--------------------------------------------------------|
| Soil moisture (2 depths)       | Capacitive probe (e.g. Teros 10 class)       | Proxy for drought stress; calibrate per soil type      |
| Soil temp (2 depths)           | DS18B20 on buried cable                      | Pairs with moisture for energy balance                 |
| Duff moisture (surface)        | Fuel-stick replica + capacitive reading       | Approximates FFMC inputs                               |
| Air temp + RH                  | SHT45                                        | Core input to FWI and fuel-moisture models             |
| Barometric pressure            | BMP390                                       | Weather context, altitude check                        |
| Wind speed + direction         | Ultrasonic anemometer (e.g. FT205)           | No moving parts; longer life; critical for ISI / FBP   |
| Solar irradiance               | Silicon pyranometer (Apogee SP-110 class)    | Drives fuel drying, evapotranspiration                 |
| UV index                       | SI1133 / LTR390                              | Cheap supplement to pyranometer                        |
| Rain / leaf wetness            | Tipping-bucket + capacitive leaf-wetness pad | Rainfall is the most important FFMC driver             |
| Smoke / particulates (PM2.5/10)| Plantower PMS7003 or Sensirion SPS30         | Early fire signal; air-quality ecosystem value         |
| Gas: CO, CO₂, VOC              | MQ-series + CCS811 / SGP41                   | Multi-sensor for fire signature; high false-positive — fuse with PM and thermal |
| Thermopile / IR hotspot        | Melexis MLX90640 (32×24 IR array)            | Detects nearby heat anomalies; also vegetation canopy temp |
| Lightning                      | AS3935 Franklin detector                     | Ignition-cause tracking; storm arrival warning         |
| Acoustic                       | MEMS mic + TinyML classifier                 | Chainsaw, vehicle, gunshot, fire-crackle, wildlife vocalizations |
| PIR motion                     | Low-power passive IR                         | Large-mammal and human presence (fused with acoustic)  |
| Accelerometer + magnetometer   | ICM-20948                                    | Slope/aspect at install, tamper/knockdown detection    |
| Camera (optional, higher SKU)  | OV5640 + small NPU (e.g. Himax WE-I Plus)    | On-device vision for fuel density, ladder fuels, snow presence, canopy closure |

Not everything ships in every SKU. See §10 "Product tiers."

### 4.4 Power

- **Solar:** 5–10 W panel, MPPT charge controller (CN3791 or similar).
- **Battery:** LiFePO₄ 18650 pack (safer thermal behaviour than Li-ion in forest environments, tolerates wider temperature range).
- **Budget target:** survive 14 consecutive days of full canopy shade / cloud cover.
- **Power modes:** deep sleep default; wake on schedule + interrupt (lightning, accelerometer shock, thermopile threshold, rain start).
- **Tell the agent:** measure average current draw per subsystem empirically and build a power budget spreadsheet before designing the PCB.

### 4.5 Deployment-side niceties

- **QR code** on each node, ties physical unit to its cloud record.
- **NFC tag** for firefighter to tap with phone and pull last 24h of data offline.
- **E-ink display** (tiny, 1.5") confirms successful install: shows node ID, GPS lock, radio signal, battery — critical so a deployer knows the stake is alive before walking away.
- **Hall-effect "arm" sensor:** magnet on a lanyard activates the node; removes shelf/shipping drain.
- **Capacitive touch / button** to trigger a manual alert or self-test.

---

## 5. Communications

### 5.1 Decision matrix

| Link               | Range       | Power        | Bandwidth        | Good for                                     |
|--------------------|-------------|--------------|------------------|----------------------------------------------|
| BLE mesh (node↔node)| ~50 m       | Very low     | Low              | Close-in redundancy, firefighter phone link  |
| LoRaWAN            | 2–15 km LOS | Low          | Very low         | Primary backhaul in populated-ish forest     |
| LTE-M / NB-IoT     | Carrier-dep.| Moderate     | Low-mid          | Where cellular exists                        |
| Satellite (Swarm, Iridium SBD, Astrocast) | Global | Moderate | Very low (bytes/day) | Backcountry; the killer feature for firefighting |
| Wi-Fi (gateway only)| 50–200 m    | High         | High             | Gateway uplink / maintenance                 |

### 5.2 Topology

- **Node → Gateway → Internet** is the primary path (LoRaWAN).
- **Gateway** sits in a tower, ridge, or mobile command post. One gateway supports 100+ nodes in a 5–10 km radius.
- **Satellite-equipped "super-node"** option: every Nth node in a cluster has satellite backup so a cluster isolated from gateway still reports critical alerts.
- **BLE local-dump** fallback: firefighter walks near any node, phone app pulls buffered data even if no network exists.

### 5.3 Protocol & payload

- **Uplink:** CBOR-encoded payloads over MQTT (via LoRaWAN network server like ChirpStack) or directly over MQTT-SN for cellular.
- **Schema:** publish a versioned schema; include schema version in every payload.
- **Priorities:** routine telemetry ≠ alert. Design 3 message classes:
  1. Heartbeat (every N minutes, lossy OK)
  2. Telemetry (every M minutes, retry-with-backoff)
  3. Alert (lightning near / smoke detected / thermal anomaly — immediate, duplicated across all available radios)

### 5.4 Security

- TLS on every hop that can support it.
- ATECC608B device keys; mutual auth with the network server.
- Signed OTA updates; rollback slot mandatory.
- Rate-limit alerts to prevent a compromised node from DoS'ing the dispatch channel.

---

## 6. Software Stack

### 6.1 Firmware (node)

- **Language:** C/C++ via ESP-IDF or Zephyr RTOS (Zephyr if you want portability across MCUs).
- **Key modules:** sensor drivers, sensor-fusion layer, power manager, comms stack, local alert engine, OTA agent, log store.
- **Edge ML:** TFLite-Micro for acoustic classifier and optional vision. Keep models < 512 KB; quantize to int8.
- **Local alert engine:** runs simple thresholds even with no network — e.g. thermopile > 80 °C AND PM2.5 rising AND RH falling = local alarm, store-and-forward.

### 6.2 Cloud backend

- **Ingest:** MQTT broker (EMQX / Mosquitto) behind a TLS-terminating proxy.
- **Stream processor:** lightweight worker (Rust or Go) that validates, decodes, and routes payloads.
- **Storage:**
  - Time-series: TimescaleDB (preferred — SQL + time-series + PostGIS in one) or InfluxDB.
  - Spatial: PostGIS (same Postgres instance if using Timescale).
  - Blob: S3-compatible for images, raw audio snippets, firmware binaries.
- **Fire-science engine:** scheduled + event-driven worker computing FWI/FBP/NFDRS/Nelson values per node on each update; output stored alongside raw data with provenance.
- **External data pipeline:** daily/weekly ETL for satellite (Sentinel-2, MODIS, VIIRS FIRMS), weather forecasts, lightning, OSM basemaps — cached and attached to each node's spatial record.
- **Alert engine:** rule DSL, writable by agency users; escalation tiers (watch / warning / emergency); pluggable notifications (SMS, email, Slack/Teams, radio tone via external bridge, push to mobile app).
- **Fleet management:** device inventory, health dashboard, OTA rollout control, recall / decommission workflow.

### 6.3 Consumer apps

- **Firefighter mobile app** (React Native, iOS + Android):
  - Map-first UI, offline tiles (MapLibre + MBTiles).
  - Node status + derived fire-danger index at each stake.
  - Install/commission workflow (photo of surrounding fuels, fuel-type tagging, install confirmation).
  - BLE local-dump for stakes out of network.
  - Incident overlay: wind vectors, slope shading, predicted spread.
- **Research / management web app** (React + MapLibre):
  - Historical query across time + space.
  - Export (CSV, GeoJSON, NetCDF for scientific use).
  - Model validation tools: compare observed vs. predicted fuel moisture, etc.
- **Agency GIS plug-ins:** ArcGIS Pro toolbox and QGIS plug-in that consume PYRA's SensorThings API.
- **Public/open data portal:** subset of data available under an appropriate licence (see §13).

### 6.4 APIs

- **OGC SensorThings API** for sensor observations (standard in environmental monitoring).
- **STAC** catalogue for the satellite/raster derivatives.
- **REST + GeoJSON** for map clients.
- **Webhooks** for alert subscribers.
- **IRWIN** (Integrated Reporting of Wildland-Fire Information) adapter for US fire agencies.

---

## 7. External Data Integrations

Tell the agent to build adapters, not one-offs. Every integration should be a pluggable module with caching, rate-limiting, and provenance logging.

| Dataset                               | Source                                    | Use                                         |
|---------------------------------------|-------------------------------------------|---------------------------------------------|
| Digital Elevation Model               | USGS 3DEP (US) / CDEM (Canada) / Copernicus GLO-30 (global) | Slope, aspect, sun exposure, fire spread modeling |
| Sentinel-2 / Landsat                  | Copernicus / USGS                          | NDVI, EVI, NBR, NDMI (live fuel moisture proxy) |
| MODIS / VIIRS active fire (FIRMS)     | NASA                                      | Nearby active fires                         |
| Hansen Global Forest Change           | UMD / Google                              | Forest age, disturbance history             |
| LANDFIRE (US) / Canadian NFIS         | USGS / NRCan                              | Fuel-type classification                    |
| Fire perimeter history                | NIFC (US), CNFDB (Canada), EFFIS (EU)     | Burn history, repeat-burn risk              |
| Weather forecast                      | NWS / ECCC GeoMet / Open-Meteo            | Derived fire-danger forecasting             |
| Lightning                             | Vaisala NLDN / CLDN / Earth Networks      | Ignition cause + storm warning              |
| Snow cover                            | MODIS MOD10 / Sentinel-1 SAR              | Spring start-of-fire-season                 |
| Road / river / structure vectors      | OpenStreetMap / agency cadastre           | Natural and man-made barriers, access routes |
| Drought indices                       | NOAA CPC / Canadian Drought Monitor       | Regional context                            |
| Air quality                           | AirNow / ECCC AQHI                        | Context for PM readings                     |

---

## 8. Fire-Science Frameworks (compute, don't invent)

These are the models PYRA data feeds into. The agent should implement each as a versioned library module with tests against published reference cases.

- **Canadian Forest Fire Weather Index (FWI) System** — FFMC, DMC, DC, ISI, BUI, FWI. *Especially important in Quebec; aligns with SOPFEU operations.*
- **Canadian Fire Behaviour Prediction (FBP) System** — uses FWI + fuel type + slope to predict rate of spread, fire intensity, crown fire likelihood.
- **US NFDRS2016** — for cross-border compatibility.
- **Nelson dead-fuel moisture model** — 1-hr, 10-hr, 100-hr, 1000-hr fuel moistures from weather time series.
- **Fosberg Fire Weather Index** — quick, widely-understood instantaneous index.
- **Haines Index** — atmospheric instability contribution to plume-dominated fires.
- **KBDI (Keetch-Byram Drought Index)** — cumulative drought proxy.

Every output should carry:
1. Model name and version (e.g. `fwi_cfs_2019`).
2. Input provenance (which sensors / external feeds contributed).
3. Uncertainty estimate where derivable.

---

## 9. What the Node Cannot Tell You (and How We Fill It)

You listed several things a buried stake cannot physically measure. Here's how we get them anyway:

| Wish-list item                     | How we get it                                                        |
|-----------------------------------|----------------------------------------------------------------------|
| Forest age                         | Hansen Global Forest Change + national forest inventory (per-pixel lookup) |
| Forest density / canopy closure    | Sentinel-2 NDVI/LAI + LiDAR where available + install-time photo     |
| Species / type of trees            | LANDFIRE / NFIS classification + optional install-time tagging       |
| Ladder fuels, dead-and-down        | Install-time photo + ML classifier on the deployment app             |
| Human presence                     | Acoustic (chainsaw/vehicle) + PIR + proximity to OSM roads/trails    |
| Natural barriers                   | OSM + hydrography layers                                             |
| Snow state                         | MODIS snow cover + node air-temp + optional camera                   |
| "Old bush with dead interior"      | Install-time photo → vision model scoring "fuel-load severity"        |

The **install-time app workflow** is therefore a core product surface, not a nice-to-have.

---

## 10. Product Tiers (SKUs)

Suggest three tiers so agencies can mix-and-match based on value of the site:

| Tier              | What's in it                                                                 | Target price |
|-------------------|------------------------------------------------------------------------------|--------------|
| **PYRA Scout**     | Core weather + soil + smoke + thermopile + LoRaWAN                           | Low (dense deployment, treated as semi-expendable) |
| **PYRA Sentinel**  | Scout + anemometer + lightning + gas suite + satellite backup                | Mid          |
| **PYRA Vista**     | Sentinel + camera + edge ML + higher-res IR array                            | High (hero nodes at strategic points) |

Gateways are a separate SKU: **PYRA Relay** (solar-powered LoRaWAN gateway with cellular + satellite uplink).

---

## 11. MVP Roadmap

**Phase 0 — Paper & bench (weeks 0–6)**

- Power budget spreadsheet. Sensor BOM with two candidate parts per slot. Comms decision locked per target geography. Regulatory gap analysis.

**Phase 1 — Single-node proof (weeks 6–16)**

- One hand-soldered node: ESP32-S3 + SHT45 + BMP390 + capacitive soil probe + ultrasonic anemometer + PMS7003 + LoRa.
- ChirpStack + TimescaleDB + PostGIS on a single VM.
- Canadian FWI computed and graphed over a week of data.
- Web map showing the one stake.

**Phase 2 — Small fleet + external data (weeks 16–28)**

- 10 nodes + 1 gateway in a pilot forest (partner with SOPFEU or a university research forest).
- DEM + Sentinel-2 + weather forecast integrations live.
- OGC SensorThings API published.
- Install-time mobile app (basic: photo + GPS + fuel tagging + commissioning check).

**Phase 3 — Operational pilot (weeks 28–52)**

- Satellite-backed super-nodes.
- Alerting with escalation rules.
- Firefighter mobile app v1 with offline maps.
- OTA update pipeline.
- First operational trial with a fire agency partner.

**Phase 4 — Scale (year 2)**

- Edge ML (vision + acoustic).
- Drone-droppable form factor.
- Research-grade data products (monthly QA/QC'd open datasets).
- Integration with IRWIN, ArcGIS, etc.

---

## 12. Risks & Mitigations

| Risk                                                              | Mitigation                                                        |
|-------------------------------------------------------------------|-------------------------------------------------------------------|
| False positives overwhelm firefighters and erode trust            | Multi-sensor fusion; tiered alerts; uncertainty estimates; human-in-loop for operational alerts |
| Sensor drift (esp. soil moisture, gas sensors)                    | Seasonal calibration protocol; anomaly detection vs. neighbour nodes |
| Node destruction in fires                                         | Design unit economics assuming % loss per season; cheap Scout tier; satellite super-nodes survive longer |
| Wildlife / vandalism / theft                                      | Tamper detection via accelerometer; safety-orange + "Scientific Equipment — Do Not Disturb" label; GPS theft alerts |
| Comms blackout at the critical moment                             | BLE local dump; satellite backup on super-nodes; store-and-forward |
| Privacy (cameras, acoustic, human detection)                      | On-device classification only; no raw audio/video leaves node; privacy-by-design review; clear public-facing policy |
| Data sovereignty (Canadian / provincial data)                     | Canadian-hosted cloud option (AWS ca-central-1 / Azure Canada / OVH Beauharnois); ISED compliance audit |
| Regulatory delays on radio certification                          | Use pre-certified LoRa/cellular modules; budget for FCC/ISED testing early |
| "Firefighter trusts PYRA alone" — bad outcomes                    | UX + training explicitly positions PYRA as *decision support*, never as sole authority; always display uncertainty |

---

## 13. Regulatory, Standards & Compliance

- **Radio certification:** FCC Part 15 (US), ISED RSS-247/210 (Canada), CE RED (EU).
- **Safety of use near firefighters:** review against relevant NFPA standards (e.g. NFPA 1977 for PPE compatibility of markings, NFPA 1500 programme compatibility) and CAN/ULC equivalents.
- **Battery transport:** UN 38.3 for LiFePO₄ cells.
- **Data standards:** OGC SensorThings, OGC API – Features, STAC, NetCDF-CF for research exports.
- **Open licences:** consider CC-BY-4.0 for public-facing derived datasets; separate commercial-use licence for real-time feeds.
- **Privacy:** PIPEDA (Canada), Quebec Law 25, and equivalents per deployment region. Commit to data-protection impact assessments before any camera/acoustic SKU ships.

---

## 14. Operational & Lifecycle Considerations

- **Deployment planning.** Provide a GIS tool that suggests stake locations based on terrain, fuel type, and access — avoid dense clustering; target ridge-lines, saddles, fuel-type boundaries, and historical ignition hotspots.
- **Field maintenance.** Batteries and desiccants replaceable without tools; firmware updateable OTA; calibration routines runnable from the mobile app.
- **End-of-life.** Standardized return-and-recycle programme; lithium cells recycled through partner; enclosure polymer selected for recyclability.
- **Training.** Short deployment course (half-day) with e-learning and printed field card; training materials version-controlled alongside firmware.
- **Chain of custody.** Every observation signed with device key; audit log immutable; important for evidence in post-fire investigations.

---

## 15. Integration Targets (existing systems to play nice with)

- **SOPFEU** (Société de protection des forêts contre le feu — Quebec) — natural first partner given your location.
- **Parks Canada** and provincial fire agencies.
- **USFS / CAL FIRE / NIFC / IRWIN** (US).
- **ALERTCalifornia / ALERTWildfire** camera networks — overlay PYRA data on the same operational maps.
- **WIFIRE Lab (UCSD)** — research collaboration on fire-spread modeling.
- **NIST Public Safety Communications Research** — interoperability testing.
- **Copernicus Emergency Management Service** (EU).

---

## 16. Open Questions for the Agent

Claude/agent should surface these to the human team early rather than guess:

1. Primary geography for pilot — Quebec (SOPFEU partnership track) or US Pacific Northwest (easier regulatory path in some respects)?
2. Do we bundle our own gateway hardware or certify against existing LoRaWAN gateways?
3. Unit-cost ceiling for the Scout tier (drives sensor selection and radio choice).
4. Open-source the firmware? The mobile app? The models? Which layers stay proprietary?
5. Business model — hardware sale + SaaS? Data-as-a-service? Grant-funded non-profit? Public-private?
6. Camera SKU yes/no for v1 — privacy complexity vs. enormous analytic payoff.
7. Any mandated IRWIN/CAD integrations from a launch-customer agency?

---

## 17. Appendix A — Suggested Libraries & Tooling

- **Firmware:** ESP-IDF, Zephyr RTOS, TFLite-Micro, CBOR-C, LoRaMAC-node.
- **Backend:** Rust (ingest), Python (analytics), TimescaleDB, PostGIS, ChirpStack, EMQX, Apache Airflow (ETL), DuckDB (ad-hoc spatial queries).
- **Frontend:** React, React Native, MapLibre GL, deck.gl, Tailwind.
- **Geospatial:** GDAL, rasterio, xarray, pystac, rio-tiler, Titiler, QGIS, h3-py.
- **Fire-science references:** `cffdrs` (R, CFS reference implementation of FWI/FBP — port to Python/Rust as needed), `firebehaviour` Python packages, NFDRS2016 reference code from USFS.
- **ML:** PyTorch for training, ONNX export, TFLite-Micro for embedded inference. Label tooling: Label Studio.
- **DevOps:** Terraform, Docker, GitHub Actions, OTA via Memfault or homegrown.

## 18. Appendix B — Naming & Branding Notes

- **Product name:** PYRA (from *pyre* / *pyros* — Greek for fire). Short, memorable, unique in trademark searches at time of drafting (*the agent should verify and do a TM/USPTO/CIPO clearance before any public launch*).
- **Tier names:** Scout, Sentinel, Vista. Gateway: Relay.
- **Tone:** tools-for-serious-work. Not gamified. Not hype. Firefighters and researchers both respect understated, precise language.
- **Visual identity:** safety-orange accent, muted greys, topographic contour motif. Avoid stock flame imagery — agencies find it tacky.

---

## 19. First Instructions to the Agent

When you begin work, in this order:

1. **Clarify the seven open questions in §16** with the human lead before spending engineering budget.
2. **Build the power-budget spreadsheet** and the **sensor BOM with two candidates per slot**. Share for review.
3. **Stand up the Phase 1 single-node stack** end-to-end on a bench — one stake, one laptop, one MQTT broker, FWI computed and graphed.
4. **Do NOT build a new fire-danger model.** Port or wrap `cffdrs`. If you think you've found an improvement, document it as a research hypothesis, not a product change.
5. **Every output must carry provenance and uncertainty.** No naked numbers.
6. **Prefer open standards** (SensorThings, STAC, GeoJSON, MQTT) over bespoke APIs. An agency that cannot ingest our data will not buy our platform.
7. **Keep a running `DECISIONS.md`** — every non-trivial design choice, who made it, and why. This document becomes our audit trail.

---

*End of brief. Iterate freely — this is v0.1 and the first commit of `DECISIONS.md` should be "replaced §X with …".*
