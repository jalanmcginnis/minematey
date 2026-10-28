export type RequiredDocItem = {
    documentType: string; // stable id used in Firestore + Storage path
    title: string;
    description: string;
  };
  
  export type RequiredDocSection = {
    sectionTitle: string;
    items: RequiredDocItem[];
  };
  
  export const REQUIRED_DOC_SECTIONS: RequiredDocSection[] = [
    {
      sectionTitle: "Core Mine Documents",
      items: [
        {
          documentType: "legal-identity-report",
          title: "Legal Identity Report",
          description: "Upload the mine’s legal identity report.",
        },
        {
          documentType: "mine-commencements",
          title: "Commencements",
          description: "Upload mine commencement documentation.",
        },
        {
          documentType: "contractor-list",
          title: "Contractor List",
          description: "Maintain a current list of contractors working on-site.",
        },
        {
          documentType: "quarterly-reports",
          title: "Quarterly Reports",
          description: "Upload quarterly production/compliance reports (latest).",
        },
        {
          documentType: "accident-reports",
          title: "Accidents",
          description: "Upload accident reports and related documentation.",
        },
      ],
    },
    {
      sectionTitle: "Safety & Health Programs",
      items: [
        {
          documentType: "hazcom-program",
          title: "HazCom Program",
          description: "Hazard Communication program documentation.",
        },
        {
          documentType: "mobile-haulage-safety-plan",
          title: "Mobile Haulage Safety Plan",
          description: "Upload the site mobile haulage safety plan.",
        },
        {
          documentType: "hearing-conservation-plan",
          title: "Hearing Conservation Plan",
          description: "Upload hearing conservation plan documentation.",
        },
        {
          documentType: "respiratory-protection-program",
          title: "Respirator Protection Program",
          description: "Upload respiratory protection program documentation.",
        },
        {
          documentType: "emergency-plan",
          title: "Emergency Plan",
          description: "Upload the mine emergency plan.",
        },
        {
          documentType: "evacuation-plan",
          title: "Evacuation Plan",
          description: "Upload the evacuation plan and procedures.",
        },
      ],
    },
    {
      sectionTitle: "Equipment & Technical",
      items: [
        {
          documentType: "continuity-resistance-testing",
          title: "Continuity & Resistance",
          description: "Upload continuity and resistance test documentation.",
        },
        {
          documentType: "compressor-pressure-vessel-inspections",
          title: "Compressor / Pressure Vessel Inspections",
          description: "Upload inspection records for compressors/pressure vessels.",
        },
      ],
    },
    {
      sectionTitle: "Underground Documentation",
      items: [
        {
          documentType: "underground-ventilation-plan",
          title: "Underground Ventilation Plan",
          description: "Upload ventilation plan documentation (if applicable).",
        },
        {
          documentType: "underground-maps-escapeways",
          title: "Underground Maps & Escapeways",
          description: "Upload mine maps, escapeway maps, and updates.",
        },
        {
          documentType: "ground-control-plan",
          title: "Ground Control Plan",
          description: "Upload ground control plan documentation (if applicable).",
        },
      ],
    },
  ];
  