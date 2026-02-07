# QuiqP3Mapper Dashboard (BETA)

An experimental, AI‑assisted clinical pipeline dashboard for high-fidelity monitoring of the global pharmaceutical landscape. Currently in **Beta** development.

## Scope

This dashboard focuses on Active Phase 3 interventional trials for the global top‑20 pharmaceutical companies by market capitalization (as of Jan 2026).

- **Strict Filter:** Pure Phase 3 only (excludes Phase 1, 1/2, 2, 2/3).
- **Sample Size:** N ≥ 100 patients to exclude very small studies.
- **Included statuses:** Recruiting, Active (not recruiting), Enrolling by invitation, and Not yet recruiting.
- **Rationale:** Filters are tuned to highlight large, registration‑intent Phase 3 programs rather than exploratory or post‑marketing studies.

## Scientific Methodology

Clinical trial data are aggregated via high‑fidelity synchronization with the ClinicalTrials.gov API v2. The “Pure P3” filter is a specialized heuristic designed to separate registrational‑intent studies from earlier exploratory research.

**Primary Data Sources:**

- U.S. National Institutes of Health, ClinicalTrials.gov API v2 (synchronized Feb 2026).
- S&P Global / CompaniesMarketCap sector rankings (January 2026) for top‑20 pharmaceutical companies.
- WHO International Clinical Trials Registry Platform (ICTRP) for cross‑registry verification where applicable.

## Project Structure

- **index.html**: Main entry point handling the structure.
- **assets/style.css**: All styling and visual effects.
- **src/app.js**: Application logic, data filtering, and rendering.
- **data/readouts _pureP3.json**: The dataset containing clinical trial information.

## 🌐 Live Dashboard

The live version of this dashboard is hosted on **GitHub Pages**. 

> [!TIP]
> **[Click here to view the live dashboard](https://kirakuda.github.io/QuickP3Mapper/)**

---

## 🛠️ For Developers: Running Locally

If you want to run this project on your own computer or make changes to the code, follow these steps:

### Why a local server?
Because this project uses the `fetch()` API to load JSON data, you cannot simply open `index.html` in a browser directly from your file system (due to browser security "CORS" policies).

### How to run locally:
1. Open a terminal in the project folder.
2. Start a simple web server:
   ```bash
   python -m http.server 8001
   ```
3. Open your browser to **[http://localhost:8001](http://localhost:8001)**.

## Disclaimer & Legal

**Disclaimer**

This is an experimental, AI‑assisted platform provided for general informational and educational purposes only. It does not constitute medical, regulatory, financial, or professional investment advice. Data are aggregated from public registries and may be incomplete, outdated, or inaccurate. Always confirm critical information directly on official trial registries and company disclosures. Use at your own risk.

## Acknowledgement & Citation

If you use this dashboard, the "Pure P3" heuristic, or the aggregated data for your own research or publications, please provide proper acknowledgement:

**Citation:** 
> _kirakuda. (2026). QuickP3Mapper: High-Fidelity Clinical Pipeline Dashboard. [https://github.com/kirakuda/QuickP3Mapper](https://github.com/kirakuda/QuickP3Mapper)_

**Legal Compliance**

This is a free intelligence service provided for scientific research and educational use. All product names, logos, and brands are property of their respective owners. Nominative use is applied solely for accurate sponsorship identification.
