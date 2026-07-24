const { pool, initDb } = require("./db");

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
    description:
      "Supports research into geodetic applications of GNSS, including crustal deformation monitoring and precise positioning techniques.",
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
    description:
      "Funds collaborative research on next-generation GNSS resilience, including anti-spoofing and anti-jamming technologies.",
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
    description:
      "Scholarship supporting doctoral research in satellite navigation, remote sensing, and space applications for Pakistani students.",
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
    description:
      "Funds university research in GNSS-based applications including NavIC integration, precision agriculture, and disaster management.",
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
    description:
      "Supports development of innovative PNT (Positioning Navigation Timing) technologies beyond traditional GNSS, including LEO-PNT and hybrid navigation.",
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
    description:
      "Fellowship for researchers contributing to global GNSS data analysis, orbit determination, and clock products within the IGS network.",
  },
];

async function seed() {
  await initDb();

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
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error FULL:", err);
  process.exit(1);
});