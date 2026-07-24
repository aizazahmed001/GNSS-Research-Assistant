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

async function seed() {
  await initDb();
  await seedGrants();
  await seedPapers();

  console.log("All seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error FULL:", err);
  process.exit(1);
});