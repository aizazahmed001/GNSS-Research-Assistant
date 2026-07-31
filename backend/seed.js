const { pool, initDb } = require("./db");

// ── Grants sample data ──────────────────────────────────────────────────
const sampleGrants = [
  {
    title: "NSF Geodesy and GNSS Research Grant",
    country: "United States",
    funding_agency: "National Science Foundation",
    eligibility: "PhD candidates and postdoctoral researchers",
    deadline: "2026-10-15",
    required_documents: "CV, Research Proposal, 2 Reference Letters",
    application_link: "https://www.nsf.gov",
    research_domain: "Geodesy",
    funding_type: "Research Grant",
    grant_category: "STEM",
    description: "Supports research into geodetic applications of GNSS, including crustal deformation monitoring and precise positioning techniques.",
  },
  {
    title: "Horizon Europe Space Navigation Fund",
    country: "European Union",
    funding_agency: "European Commission",
    eligibility: "Institutions and consortia based in EU member states",
    deadline: "2026-09-01",
    required_documents: "Project Proposal, Budget Plan, Consortium Agreement",
    application_link: "https://ec.europa.eu/info/funding-tenders",
    research_domain: "Satellite Navigation",
    funding_type: "Research Grant",
    grant_category: "STEM",
    description: "Funds collaborative research on next-generation GNSS resilience, including anti-spoofing and anti-jamming technologies.",
  },
  {
    title: "HEC Pakistan PhD Scholarship in Space Technology",
    country: "Pakistan",
    funding_agency: "Higher Education Commission Pakistan",
    eligibility: "Pakistani nationals enrolled in PhD programs",
    deadline: "2026-08-20",
    required_documents: "Transcript, Research Statement, CNIC",
    application_link: "https://hec.gov.pk",
    research_domain: "Space Technology",
    funding_type: "Scholarship",
    grant_category: "STEM",
    description: "Scholarship supporting doctoral research in satellite navigation, remote sensing, and space applications for Pakistani students.",
  },
  {
    title: "ISRO RESPOND Research Grant",
    country: "India",
    funding_agency: "Indian Space Research Organisation",
    eligibility: "Faculty and researchers at Indian universities",
    deadline: "2026-11-30",
    required_documents: "Research Proposal, Institutional Approval Letter",
    application_link: "https://www.isro.gov.in/respond",
    research_domain: "GNSS Applications",
    funding_type: "Research Grant",
    grant_category: "STEM",
    description: "Funds university research in GNSS-based applications including NavIC integration, precision agriculture, and disaster management.",
  },
  {
    title: "ESA NAVISP Element 1 Innovation Grant",
    country: "European Union",
    funding_agency: "European Space Agency",
    eligibility: "Companies and research institutions in ESA member states",
    deadline: "2026-07-31",
    required_documents: "Technical Proposal, Team CVs, Cost Breakdown",
    application_link: "https://www.esa.int/navisp",
    research_domain: "PNT Innovation",
    funding_type: "Research Grant",
    grant_category: "STEM",
    description: "Supports development of innovative PNT (Positioning Navigation Timing) technologies beyond traditional GNSS, including LEO-PNT and hybrid navigation.",
  },
  {
    title: "IGS Data Analysis Centre Fellowship",
    country: "International",
    funding_agency: "International GNSS Service",
    eligibility: "Early-career researchers with GNSS data processing experience",
    deadline: "2026-12-01",
    required_documents: "CV, Cover Letter, Code Samples",
    application_link: "https://igs.org",
    research_domain: "GNSS Data Processing",
    funding_type: "Fellowship",
    grant_category: "STEM",
    description: "Fellowship for researchers contributing to global GNSS data analysis, orbit determination, and clock products within the IGS network.",
  },
];

// ── Papers sample data ───────────────────────────────────────────────────
const papers = [
  {
    title: "Comparison of VTEC from GPS and IRI-2007, IRI-2012 and IRI-2016 over Sukkur Pakistan",
    authors: ["Rasim Shahzad", "Munawar Shah", "Arslan Ahmed"],
    year: 2021,
    journal: "Astrophys Space Sci",
    doi: "10.1007/s10509-021-03947-1",
    abstract: "Comparison of Vertical TEC derived from GPS with IRI-2007, IRI-2012, and IRI-2016 models over Sukkur, Pakistan across diurnal, monthly, seasonal, and geomagnetically disturbed conditions.",
    keywords: ["VTEC", "GPS", "IRI-2016", "ionosphere", "Sukkur"],
    main_topic: "VTEC Comparison",
    location: "Sukkur, Pakistan (27.7°N, 68.8°E)",
    magnitude: null,
    date_range: null,
    findings: [
      { category: "Diurnal", description: "IRI-2016 shows best correlation with GPS VTEC", value: "R>0.9", confidence: 90 },
      { category: "Seasonal", description: "Maximum deviation observed in spring/April", value: "Deviation peak", confidence: null },
      { category: "Solar Activity", description: "Under low solar activity, IRI-2016 shows minimal deviation from GPS", value: "Minimal deviation", confidence: null },
    ],
  },
  {
    title: "Machine learning-based thermal anomalies detection from MODIS LST associated with the Mw 7.7 Awaran, Pakistan earthquake",
    authors: ["Amna Hafeez"],
    year: 2021,
    journal: "Natural Hazards",
    doi: null,
    abstract: "Detection of thermal anomalies from MODIS Land Surface Temperature data prior to the Mw 7.7 Awaran earthquake using IQR, wavelet analysis, ARIMA, and NARX/MLP machine learning methods.",
    keywords: ["MODIS", "LST", "thermal anomalies", "machine learning", "earthquake precursor"],
    main_topic: "Thermal Anomalies",
    location: "Awaran, Pakistan",
    magnitude: "Mw 7.7",
    date_range: null,
    findings: [
      { category: "Pre-EQ", description: "LST anomalies detected 4-7 days before the earthquake", value: "4-7 days", confidence: null },
      { category: "ML Methods", description: "IQR, Wavelet, ARIMA, and NARX/MLP methods used for anomaly detection", value: null, confidence: null },
    ],
  },
  {
    title: "Multi-parameter precursor analysis of the 2023 Mw 7.8 Turkey earthquake",
    authors: [],
    year: 2023,
    journal: null,
    doi: null,
    abstract: "Analysis of OLR, RH, AP, AT, SST, LST, and TEC parameters at TUBI, RAMO, and SVTL stations preceding the 2023 Mw 7.8 Turkey earthquake using statistical bounds and NARX modeling.",
    keywords: ["OLR", "RH", "TEC", "earthquake precursor", "Turkey", "NARX"],
    main_topic: "Multi-parameter Earthquake Precursors",
    location: "Turkey (TUBI, RAMO, SVTL stations)",
    magnitude: "Mw 7.8",
    date_range: "2023",
    findings: [
      { category: "Pre-EQ", description: "Anomalies detected in all parameters 6-7 days before the earthquake", value: "6-7 days", confidence: null },
      { category: "Methods", description: "Statistical bounds combined with NARX modeling used across all parameters", value: null, confidence: null },
    ],
  },
  {
    title: "POSSIBLE SEISMO-IONOSPHERIC ANOMALIES ASSOCIATED WITH EARTHQUAKES OCCURRED IN 2018 USING GNSS TEC: A STATISTICAL ANALYSIS",
    authors: ["Muhammad Arqim Adil", "Dr. Munawar Shah"],
    year: 2021,
    journal: "Master of Science in Global Navigation Satellite Systems, Institute of Space Technology, Islamabad, Pakistan",
    doi: null,
    abstract: "Investigate the relationship between earthquakes and seismo-ionospheric anomalies (SIAs) using GNSS Total Electron Content (TEC) for global Mw > 5.0 earthquakes during 2018. Methodology utilized statistical analysis using sliding median and Interquartile Range (IQR) on 30-second resolution TEC data covering 15 days before and 5 days after each mainshock.",
    keywords: ["GNSS", "TEC", "Seismo-Ionospheric Anomalies", "IQR", "Earthquake Precursors"],
    main_topic: "Seismo-Ionospheric Anomalies",
    location: "Global (Alaska, Argentina, Chile, Greece, Honduras, Russia, Taiwan)",
    magnitude: "Mw > 5.0",
    date_range: "2018",
    findings: [
      { category: "Temporal Window", description: "Statistically significant TEC deviations observed within 10 days before all analyzed earthquakes.", value: "< 10 days", confidence: null },
      { category: "SIA vs UB", description: "Seismic TEC anomalies deviated on average by ~4 TECU (~44%) above the upper bound (UB) during quiet geomagnetic periods.", value: "~4 TECU (~44%)", confidence: null },
      { category: "GIA vs UB", description: "Moderate geomagnetic storms (Kp ~ 4) induced smaller average deviations of ~3 TECU (~37%).", value: "~3 TECU (~37%)", confidence: null },
      { category: "Sequential EQs", description: "Sequential earthquakes (foreshocks/aftershocks) exhibit temporal symmetry, showing anomalies at nearly identical lead times prior to each event.", value: "Symmetrical lead times", confidence: null }
    ],
  }
];

// ── Additional Thesis Data (Formulas, Cases, Summaries, References) ──────

const mathFormulas = [
  { id: "EQ_1.1", name: "Group Refractive Index Definition", latex: "n_g = \\frac{c}{v_g}", description: "Ratio of speed of light in vacuum to group velocity." },
  { id: "EQ_1.2", name: "Refractive Index Frequency Derivative", latex: "n_g = n + f \\frac{dn}{df}", description: "Relationship between phase refractive index and group refractive index." },
  { id: "EQ_1.3", name: "Phase Refractive Index of Ionosphere", latex: "n = 1 - \\frac{40.3 N_e}{f^2}", description: "Approximation ignoring magnetic field effect, where Ne is electron density (el/m³) and f is frequency (Hz)." },
  { id: "EQ_1.4", name: "Group Refractive Index of Ionosphere", latex: "n_g = 1 + \\frac{40.3 N_e}{f^2}", description: "Group refractive index for modulated radio signals." },
  { id: "EQ_1.6_1.7", name: "Pseudorange & Phase Ranging Delays", latex: "\\rho_p = \\rho + \\frac{40.3}{f^2} \\int S N_e dS", description: "Integrated electron density along the signal ray path (TEC) causing code phase delay." },
  { id: "EQ_2.1", name: "Earthquake Preparation Zone Radius (Dobrovolsky et al., 1979)", latex: "R = 10^{0.43 M}", description: "Calculates radius R in km based on earthquake magnitude M." },
  { id: "EQ_2.2", name: "Slant TEC (STEC) Calculation", latex: "I = \\frac{40.3}{f^2} STEC", description: "Ionospheric phase/code delay equation." },
  { id: "EQ_2.8", name: "Smoothed STEC from Dual-Frequency Code/Phase", latex: "STEC = \\frac{f_2^2 f_1^2}{40.3(f_2^2 - f_1^2)} (\\tilde{P} - b_s - b_r - (\\varepsilon_p)_{arc} + \\varepsilon_l)", description: "Calculation of STEC incorporating receiver/satellite differential code biases." },
  { id: "EQ_2.9", name: "Slant to Vertical TEC Conversion (VTEC)", latex: "VTEC = STEC \\cdot \\cos\\left(\\sin^{-1}\\left(\\frac{R \\sin Z}{R + H}\\right)\\right)", description: "Thin shell mapping function with H = 350 km." },
  { id: "EQ_2.10_2.11", name: "IQR Confidence Bounds for Anomaly Detection", latex: "UB = \\tilde{X} + (1.5 \\times IQR), \\quad LB = \\tilde{X} - (1.5 \\times IQR)", description: "Upper and lower statistical bounds derived from a 10-day sliding median (X-tilde) and IQR (95% confidence interval)." },
  { id: "EQ_2.12_2.13", name: "Differential TEC (dTEC) and Percentage Deviation", latex: "\\Delta TEC = TEC_{obs} - TEC_{UB}, \\quad \\%\\Delta TEC = \\frac{TEC_{obs} - TEC_{UB}}{TEC_{UB}} \\times 100", description: "Quantifies positive TEC enhancements exceeding the upper bound." }
];

const earthquakeCaseStudies = [
  { event_id: 1, region: "Alaska", magnitude_Mw: 5.6, date: "2018-11-21", latitude: "59.955 N", longitude: "153.266 W", depth_km: 143.3, prep_zone_km: 255.86, igs_stations_used: JSON.stringify([{station: "FAIR", max_dtec_TECU: 1.9661, percent_dev: 60.40}, {station: "WHIT", max_dtec_TECU: 1.4726, percent_dev: 58.87}, {station: "GCGO", max_dtec_TECU: 1.4103, percent_dev: 54.31}]), lead_time_days: "2-3 days prior" },
  { event_id: 2, region: "Alaska", magnitude_Mw: 7.1, date: "2018-11-30", latitude: "61.346 N", longitude: "149.955 W", depth_km: 46.7, prep_zone_km: 1129.80, igs_stations_used: JSON.stringify([{station: "FAIR", max_dtec_TECU: 1.5995, percent_dev: 56.70}, {station: "WHIT", max_dtec_TECU: 1.1516, percent_dev: 26.71}, {station: "GCGO", max_dtec_TECU: 1.2682, percent_dev: 73.20}]), lead_time_days: "3 days prior" },
  { event_id: 3, region: "Argentina", magnitude_Mw: 5.4, date: "2018-01-28", latitude: "31.273 S", longitude: "68.668 W", depth_km: 86.9, prep_zone_km: 209.89, igs_stations_used: JSON.stringify([{station: "SANT", max_dtec_TECU: 6.6600, percent_dev: 28.04}, {station: "ANTC", max_dtec_TECU: 5.7777, percent_dev: 43.58}, {station: "CORD", max_dtec_TECU: 7.2442, percent_dev: 29.01}]), lead_time_days: "3 days prior" },
  { event_id: 4, region: "Argentina", magnitude_Mw: 5.2, date: "2018-02-01", latitude: "31.562 S", longitude: "70.040 W", depth_km: 100.7, prep_zone_km: 155.96, igs_stations_used: JSON.stringify([{station: "SANT", max_dtec_TECU: 3.6215, percent_dev: 31.47}, {station: "ANTC", max_dtec_TECU: 6.6847, percent_dev: 48.66}, {station: "CORD", max_dtec_TECU: 5.9479, percent_dev: 29.09}]), lead_time_days: "3 days prior" },
  { event_id: 5, region: "Chile", magnitude_Mw: 5.6, date: "2018-02-08", latitude: "37.439 S", longitude: "73.979 W", depth_km: 4.3, prep_zone_km: 255.86, igs_stations_used: JSON.stringify([{station: "SANT", max_dtec_TECU: 4.9666, percent_dev: 36.90}, {station: "ANTC", max_dtec_TECU: 7.1465, percent_dev: 37.49}, {station: "CORD", max_dtec_TECU: 6.3939, percent_dev: 25.01}]), lead_time_days: "3 days prior" },
  { event_id: 6, region: "Greece", magnitude_Mw: 6.8, date: "2018-10-25", latitude: "37.520 N", longitude: "20.557 E", depth_km: 14.0, prep_zone_km: 839.46, igs_stations_used: JSON.stringify([{station: "MATE", max_dtec_TECU: 2.7546, percent_dev: 19.23}, {station: "ORID", max_dtec_TECU: 3.4679, percent_dev: 27.61}, {station: "SOFI", max_dtec_TECU: 3.7315, percent_dev: 32.90}]), lead_time_days: "4 days prior" },
  { event_id: 7, region: "Honduras", magnitude_Mw: 7.5, date: "2018-01-10", latitude: "17.483 N", longitude: "83.520 W", depth_km: 19.0, prep_zone_km: 1678.80, igs_stations_used: JSON.stringify([{station: "MANA", max_dtec_TECU: 7.8909, percent_dev: 53.03}, {station: "SCUB", max_dtec_TECU: 7.3697, percent_dev: 55.83}, {station: "SSIA", max_dtec_TECU: 7.3811, percent_dev: 54.36}]), lead_time_days: "8-9 days prior" },
  { event_id: 8, region: "Russia", magnitude_Mw: 7.3, date: "2018-12-20", latitude: "55.100 N", longitude: "164.699 E", depth_km: 16.6, prep_zone_km: 1373.21, igs_stations_used: JSON.stringify([{station: "PETS", max_dtec_TECU: 1.7447, percent_dev: 46.26}, {station: "MAG0", max_dtec_TECU: 1.4571, percent_dev: 27.53}, {station: "STK2", max_dtec_TECU: 2.7757, percent_dev: 43.35}]), lead_time_days: "2 days prior" },
  { event_id: 9, region: "Russia", magnitude_Mw: 6.2, date: "2018-12-25", latitude: "55.542 N", longitude: "166.450 E", depth_km: 11.2, prep_zone_km: 463.45, igs_stations_used: JSON.stringify([{station: "PETS", max_dtec_TECU: 1.1710, percent_dev: 22.74}, {station: "MAG0", max_dtec_TECU: 1.9099, percent_dev: 48.14}, {station: "STK2", max_dtec_TECU: 2.2381, percent_dev: 53.48}]), lead_time_days: "2 days prior" },
  { event_id: 10, region: "Taiwan", magnitude_Mw: 6.1, date: "2018-02-04", latitude: "24.157 N", longitude: "121.708 E", depth_km: 12.0, prep_zone_km: 419.76, igs_stations_used: JSON.stringify([{station: "TWTF", max_dtec_TECU: 5.6903, percent_dev: 32.66}, {station: "CKSV", max_dtec_TECU: 7.7575, percent_dev: 43.54}, {station: "KMNM", max_dtec_TECU: 4.7150, percent_dev: 29.56}]), lead_time_days: "1 day prior" },
  { event_id: 11, region: "Taiwan", magnitude_Mw: 6.4, date: "2018-02-06", latitude: "24.134 N", longitude: "121.659 E", depth_km: 17.0, prep_zone_km: 564.94, igs_stations_used: JSON.stringify([{station: "TWTF", max_dtec_TECU: 10.2479, percent_dev: 52.69}, {station: "CKSV", max_dtec_TECU: 8.3275, percent_dev: 36.36}, {station: "KMNM", max_dtec_TECU: 8.4300, percent_dev: 37.64}]), lead_time_days: "1 day prior" }
];

const comparativeSummary = [
  { event_Mw: 5.6, region: "Alaska", ave_max_dtec_sia: 1.7193, ave_max_percent_sia: 59.62, ave_max_dtec_gia: 2.7431, ave_max_percent_gia: 88.35, max_kp: "4-" },
  { event_Mw: 7.1, region: "Alaska", ave_max_dtec_sia: 1.3756, ave_max_percent_sia: 52.20, ave_max_dtec_gia: 2.0459, ave_max_percent_gia: 69.35, max_kp: "4-" },
  { event_Mw: 5.4, region: "Argentina", ave_max_dtec_sia: 6.5606, ave_max_percent_sia: 33.54, ave_max_dtec_gia: 5.6546, ave_max_percent_gia: 26.68, max_kp: "4o" },
  { event_Mw: 5.2, region: "Argentina", ave_max_dtec_sia: 5.4180, ave_max_percent_sia: 36.41, ave_max_dtec_gia: 5.6546, ave_max_percent_gia: 26.68, max_kp: "4o" },
  { event_Mw: 5.6, region: "Chile", ave_max_dtec_sia: 6.1690, ave_max_percent_sia: 33.13, ave_max_dtec_gia: 5.6546, ave_max_percent_gia: 26.68, max_kp: "4o" },
  { event_Mw: 6.8, region: "Greece", ave_max_dtec_sia: 3.3180, ave_max_percent_sia: 26.58, ave_max_dtec_gia: null, ave_max_percent_gia: null, max_kp: "4+" },
  { event_Mw: 7.5, region: "Honduras", ave_max_dtec_sia: 7.5472, ave_max_percent_sia: 54.41, ave_max_dtec_gia: 4.3924, ave_max_percent_gia: 38.96, max_kp: "4-" },
  { event_Mw: 7.3, region: "Russia", ave_max_dtec_sia: 1.9925, ave_max_percent_sia: 39.05, ave_max_dtec_gia: 1.1133, ave_max_percent_gia: 29.18, max_kp: "4-" },
  { event_Mw: 6.2, region: "Russia", ave_max_dtec_sia: 1.7730, ave_max_percent_sia: 41.45, ave_max_dtec_gia: 1.1133, ave_max_percent_gia: 29.18, max_kp: "4-" },
  { event_Mw: 6.1, region: "Taiwan", ave_max_dtec_sia: 6.0543, ave_max_percent_sia: 42.75, ave_max_dtec_gia: 2.7532, ave_max_percent_gia: 19.82, max_kp: "4o" },
  { event_Mw: 6.4, region: "Taiwan", ave_max_dtec_sia: 9.0018, ave_max_percent_sia: 45.69, ave_max_dtec_gia: 2.7532, ave_max_percent_gia: 19.82, max_kp: "4o" }
];

const academicReferences = [
  { ref_num: 1, citation: "R.B. Langley, P.J. Teunissen, O. Montenbruck, 'Introduction to GNSS', Springer Handbook of Global Navigation Satellite Systems, 2017." },
  { ref_num: 2, citation: "P. Misra, P. Enge, 'Global Positioning System: Signals, Measurements, and Performance', 2nd edn, Ganga-Jamuna, 2006." },
  { ref_num: 13, citation: "K.M. Larson, J.T. Freymueller, S. Philipsen, 'Global plate velocities from the Global Positioning System', J. Geophys. Res. Solid Earth 102(B5), 9961–9981, 1997." },
  { ref_num: 39, citation: "K. Davies, D.M. Baker, 'Ionospheric effects observed around the time of the Alaskan earthquake of March 28, 1964', J. Geophys. Res. 70(9), 2251–2253, 1965." },
  { ref_num: 43, citation: "S.A. Pulinets, K.A. Boyarchuk, 'Ionospheric Precursors of Earthquakes', Springer Verlag Publ., 131–171, 2004." },
  { ref_num: 46, citation: "J.Y. Liu, et al., 'Preearthquake ionospheric anomalies registered by continuous GPS-TEC measurements', Annales Geophysicae 22, 1585–1593, 2004." },
  { ref_num: 55, citation: "F. Freund, 'Earthquake forewarning — A multidisciplinary challenge from the ground up to space', Acta Geophysica, 61, 775–807, 2013." },
  { ref_num: 57, citation: "S.A. Pulinets, D.P. Ouzounov, A.V. Karelin, 'Physical bases of the generation of short-term earthquake precursors...', Geomagnetism and Aeronomy, 55, 521–538, 2015." },
  { ref_num: 59, citation: "V.M. Sorokin, Y.Y. Ruzhin, 'Electrodynamic model of atmospheric and ionospheric processes on the eve of an earthquake', Geomagnetism and Aeronomy, 55, 626–642, 2015." },
  { ref_num: 60, citation: "I. Dobrovolsky, S. Zubkov, V. Miachkin, 'Estimation of the size of earthquake preparation zones', Pure and Applied Geophysics, 117, 1025–1044, 1979." }
];

async function seedGrants() {
  await pool.query("DELETE FROM grants");

  for (const g of sampleGrants) {
    await pool.query(
      `INSERT INTO grants
        (title, country, funding_agency, eligibility, deadline, required_documents,
         application_link, research_domain, funding_type, grant_category, description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [g.title, g.country, g.funding_agency, g.eligibility, g.deadline, g.required_documents,
       g.application_link, g.research_domain, g.funding_type, g.grant_category, g.description]
    );
  }

  console.log(`Seeded ${sampleGrants.length} grants.`);
}

async function seedPapers() {
  await pool.query("DELETE FROM key_findings");
  await pool.query("DELETE FROM papers");

  for (const p of papers) {
    const result = await pool.query(
      `INSERT INTO papers (title, authors, year, journal, doi, abstract, keywords, main_topic, location, magnitude, date_range)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING paper_id`,
      [p.title, p.authors, p.year, p.journal, p.doi, p.abstract, p.keywords, p.main_topic, p.location, p.magnitude, p.date_range]
    );
    const paperId = result.rows[0].paper_id;

    for (const f of p.findings) {
      await pool.query(
        `INSERT INTO key_findings (paper_id, category, description, value, confidence)
         VALUES ($1,$2,$3,$4,$5)`,
        [paperId, f.category, f.description, f.value, f.confidence]
      );
    }
  }

  console.log(`Seeded ${papers.length} papers with their key findings.`);
}

async function seedExtraThesisData() {
  // 1. Math Formulas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS math_formulas (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255),
      latex TEXT,
      description TEXT
    )
  `);
  await pool.query("DELETE FROM math_formulas");
  for (const f of mathFormulas) {
    await pool.query(
      `INSERT INTO math_formulas (id, name, latex, description) VALUES ($1,$2,$3,$4)`,
      [f.id, f.name, f.latex, f.description]
    );
  }

  // 2. Case Studies
  await pool.query(`
    CREATE TABLE IF NOT EXISTS thesis_case_studies (
      event_id INT PRIMARY KEY,
      region VARCHAR(100),
      magnitude_mw DECIMAL(3,1),
      date DATE,
      latitude VARCHAR(50),
      longitude VARCHAR(50),
      depth_km DECIMAL(6,1),
      prep_zone_km DECIMAL(8,2),
      igs_stations_used JSONB,
      lead_time_days VARCHAR(100)
    )
  `);
  await pool.query("DELETE FROM thesis_case_studies");
  for (const c of earthquakeCaseStudies) {
    await pool.query(
      `INSERT INTO thesis_case_studies (event_id, region, magnitude_mw, date, latitude, longitude, depth_km, prep_zone_km, igs_stations_used, lead_time_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [c.event_id, c.region, c.magnitude_Mw, c.date, c.latitude, c.longitude, c.depth_km, c.prep_zone_km, c.igs_stations_used, c.lead_time_days]
    );
  }

  // 3. Comparative Summary
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comparative_summary (
      id SERIAL PRIMARY KEY,
      event_mw DECIMAL(3,1),
      region VARCHAR(100),
      ave_max_dtec_sia DECIMAL(8,4),
      ave_max_percent_sia DECIMAL(8,2),
      ave_max_dtec_gia DECIMAL(8,4),
      ave_max_percent_gia DECIMAL(8,2),
      max_kp VARCHAR(10)
    )
  `);
  await pool.query("DELETE FROM comparative_summary");
  for (const s of comparativeSummary) {
    await pool.query(
      `INSERT INTO comparative_summary (event_mw, region, ave_max_dtec_sia, ave_max_percent_sia, ave_max_dtec_gia, ave_max_percent_gia, max_kp)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [s.event_Mw, s.region, s.ave_max_dtec_sia, s.ave_max_percent_sia, s.ave_max_dtec_gia, s.ave_max_percent_gia, s.max_kp]
    );
  }

  // 4. Academic References
  await pool.query(`
    CREATE TABLE IF NOT EXISTS academic_references (
      ref_num INT PRIMARY KEY,
      citation TEXT
    )
  `);
  await pool.query("DELETE FROM academic_references");
  for (const ref of academicReferences) {
    await pool.query(
      `INSERT INTO academic_references (ref_num, citation) VALUES ($1,$2)`,
      [ref.ref_num, ref.citation]
    );
  }

  console.log(`Seeded extra thesis data: formulas (${mathFormulas.length}), case studies (${earthquakeCaseStudies.length}), comparative summaries (${comparativeSummary.length}), and references (${academicReferences.length}).`);
}

async function seed() {
  await initDb();
  await seedGrants();
  await seedPapers();
  await seedExtraThesisData();

  console.log("All seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error FULL:", err);
  process.exit(1);
});