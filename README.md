# California Walkability Index Dashboard

An interactive data visualization dashboard built on the [EPA National Walkability Index (NWI)](https://www.epa.gov/smartgrowth/national-walkability-index-user-guide-and-methodology) dataset. Explore walkability scores across all California census block groups through an interactive choropleth map, a county-level breakdown chart, and an AI-powered chatbot that answers questions about the data.

---

## Features

- **Interactive Map** — Choropleth map of 23,000+ California census block groups color-coded by NWI score, powered by MapLibre GL JS. Sidebar updates dynamically with average score, tier breakdown, and score distribution histogram as you pan and zoom.
- **County Breakdown Chart** — Horizontal stacked bar chart showing walkability tier distribution across all 58 California counties, sorted by average NWI score.
- **AI Chatbot** — Floating chat widget powered by Google Gemini. Context-aware: on the map page it sees your current viewport's statistics and can answer questions like *"Why is this area less walkable?"* or *"Which county has the most walkable block groups?"*

---

## Tech Stack

| Layer | Technology |
|---|---|
| Map | MapLibre GL JS v4 |
| Charts | Chart.js 4.4.4 |
| Server | Node.js + Express |
| AI | Google Gemini (`@google/genai`) |
| Data | EPA National Walkability Index 2021 (GDB → GeoJSON via GDAL) |

---

## Project Structure

```
VIZ/
├── server.js                  # Express server — static files + /api/chat endpoint
├── package.json
├── .env                       # API keys (not committed — create this yourself)
├── .gitignore
│
├── src/
│   ├── frontend/
│   │   ├── index.html         # Map view page
│   │   └── barchart.html      # County breakdown page
│   └── js/
│       ├── script.js          # MapLibre map logic + histogram
│       └── chat.js            # Gemini chat widget (shared by both pages)
│
├── data/
│   ├── CA_Walkability.geojson # 175MB — gitignored, must be generated (see below)
│   └── county_walkability.json# Pre-aggregated county stats (committed)
│
├── scripts/
│   └── aggregate.js           # One-time script: GeoJSON → county_walkability.json
│
└── docs/
    └── NWI_Methodology_June2021.pdf
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Google Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com) *(create a new project to use the free tier)*
- [GDAL](https://gdal.org/) — only needed if you need to regenerate `CA_Walkability.geojson`

---

## Setup & Running

### 1. Clone the repository

```bash
git clone https://github.com/vedant1100/Walkability-Index.git
cd Walkability-Index
```

### 2. Install dependencies

```bash
npm install
```

### 3. Generate the GeoJSON data file

The GeoJSON file (`data/CA_Walkability.geojson`) is ~175MB and is not stored in the repo. You need to generate it once from the EPA source data.

**a.** Download `WalkabilityIndex.zip` from the [EPA website](https://www.epa.gov/smartgrowth/national-walkability-index-user-guide-and-methodology) and place it in your `Downloads` folder.

**b.** Run this `ogr2ogr` command (requires GDAL):

```bash
ogr2ogr -f GeoJSON \
  -t_srs EPSG:4326 \
  -where "STATEFP='06'" \
  -select "GEOID10,NatWalkInd,D2A_Ranked,D2B_Ranked,D3B_Ranked,D4A_Ranked" \
  "data/CA_Walkability.geojson" \
  "/vsizip/path/to/WalkabilityIndex.zip/Natl_WI.gdb" \
  NationalWalkabilityIndex
```

Replace `path/to/WalkabilityIndex.zip` with the actual path on your machine.

> **Note:** `county_walkability.json` is already committed — you do not need to re-run `scripts/aggregate.js` unless you change the source data.

### 4. Create the `.env` file

Create a file named `.env` in the `VIZ/` root directory:

```
GEMINI_API_KEY=AIza...your_key_here...
GEMINI_MODEL=gemini-2.0-flash
```

Available models (free tier): `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`

### 5. Start the server

```bash
npm start
```

Open your browser to:

- **Map view:** `http://localhost:3000/src/frontend/index.html`
- **County chart:** `http://localhost:3000/src/frontend/barchart.html`

---

## NWI Score Tiers

| Score Range | Tier |
|---|---|
| 1.00 – 5.75 | Least Walkable |
| 5.76 – 10.50 | Below Average |
| 10.51 – 15.25 | Above Average |
| 15.26 – 20.00 | Most Walkable |

The NWI score is the average of four component scores (D2a, D2b, D3b, D4a), each ranked 1–20 based on national percentiles.

---

## Data Source

**EPA National Walkability Index (2021)**  
United States Environmental Protection Agency, Office of Sustainable Communities  
[https://www.epa.gov/smartgrowth/national-walkability-index-user-guide-and-methodology](https://www.epa.gov/smartgrowth/national-walkability-index-user-guide-and-methodology)
