export type TimelineNode = {
  id: string;
  year: string;
  era: string;
  title: string;
  org: string;
  location: string;
  summary: string;
  tags: string[];
  prompt: string; // suggested chat question for this node
};

const timelineData: TimelineNode[] = [
  {
    id: "shaldag",
    year: "2007–2013",
    era: "military",
    title: "Sergeant First Class",
    org: "IDF — Unit 5101 (SHALDAG)",
    location: "Israel",
    summary:
      "Six years in the Israeli Air Force's elite unit. High-stakes precision operations. Shaped everything about discipline, accountability, and team-first execution.",
    tags: ["Leadership", "Ops", "Elite Unit"],
    prompt: "Tell me about your military service and how it shaped your work ethic",
  },
  {
    id: "maisha",
    year: "2013–2015",
    era: "intelligence",
    title: "Project Manager",
    org: "Maisha Group",
    location: "West Africa",
    summary:
      "Lived and worked in West Africa for extended periods. Global intelligence and security consultancy — operated at the intersection of intelligence, law, and on-the-ground fieldwork in high-stakes environments.",
    tags: ["Intelligence", "Field Ops", "Africa"],
    prompt: "What did you do at Maisha Group in West Africa?",
  },
  {
    id: "idc",
    year: "2015–2017",
    era: "education",
    title: "BA Economics & Business",
    org: "IDC Herzliya (Reichman University)",
    location: "Herzliya, Israel",
    summary:
      "Studied Economics and Business at one of Israel's leading universities. Built the analytical and business foundation that underpins every role since.",
    tags: ["Economics", "Business", "Academia"],
    prompt: "Tell me about your educational background",
  },
  {
    id: "blackcube",
    year: "2017–2018",
    era: "intelligence",
    title: "Senior Analyst & Project Manager",
    org: "Black Cube",
    location: "Tel Aviv",
    summary:
      "Managed business intelligence, due diligence, and anti-fraud operations for corporate clients globally. Team of 4 analysts. Precision, discretion, zero margin for error.",
    tags: ["Due Diligence", "Analytics", "Intelligence"],
    prompt: "What was your role at Black Cube?",
  },
  {
    id: "ironsource",
    year: "2018–2021",
    era: "tech",
    title: "Technical Project Manager",
    org: "ironSource",
    location: "Tel Aviv",
    summary:
      "Joined as one of the top-50 employees. Main technical point of contact for major US OEM and telco clients. Coordinated product, engineering, BI, and legal through IPO and Unity acquisition.",
    tags: ["Android", "B2B", "Product", "OEM"],
    prompt: "Tell me about your time at ironSource",
  },
  {
    id: "unity",
    year: "2021–Present",
    era: "tech",
    title: "Senior Strategic Partnerships Manager",
    org: "Unity (via ironSource)",
    location: "New York",
    summary:
      "Leads T-Mobile partnership — 12x revenue increase through value-added services. Owns full enterprise lifecycle. Senior IC (L7) who functionally manages 4 team members across product, BI, and ops.",
    tags: ["Partnerships", "T-Mobile", "BD", "Revenue"],
    prompt: "What are you working on at Unity right now?",
  },
];

export default timelineData;
