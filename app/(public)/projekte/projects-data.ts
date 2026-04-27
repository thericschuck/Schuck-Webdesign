export type ProjectEntry = {
  slug: string;
  name: string;
  category: string;
  url: string;
  shortDesc: string;
  intro: string;
  challenge: string;
  solution: string;
  stack: string[];
  accent: string;
};

export const projects: ProjectEntry[] = [
  {
    slug: "bendix-official",
    name: "Bendix Official",
    category: "Artist Website",
    url: "https://bendixofficial.de/",
    shortDesc:
      "Markanter Webauftritt fuer DJ und Producer Bendix mit klarer Buehne fuer Persona und Sound.",
    intro:
      "Eine reduzierte Artist-Seite, die Persoenlichkeit, Energie und Wiedererkennung direkt im ersten Screen transportiert.",
    challenge:
      "Die Seite sollte nicht wie eine klassische Firmenwebsite wirken, sondern wie eine digitale Buehne fuer einen Kuenstler. Wichtig war ein Auftritt, der schnell laedt, visuell fokussiert bleibt und die Marke Bendix sofort greifbar macht.",
    solution:
      "Ich habe den Auftritt bewusst schlank gehalten: starke Typografie, klare Hero-Fuehrung und ein modernes Dark-Layering, das die Person und den Sound in den Vordergrund stellt. Dadurch wirkt die Seite praesent, ohne ueberladen zu sein.",
    stack: ["Next.js", "React", "Tailwind CSS", "Responsive UI"],
    accent: "from-[#7F77DD]/20 via-[#7F77DD]/5 to-transparent",
  },
  {
    slug: "eric-schuck-dev",
    name: "EricSchuck.dev",
    category: "Privates Portfolio",
    url: "https://ericschuck.dev/",
    shortDesc:
      "Mein persoenliches Portfolio fuer eigene Projekte, Skills, Interessen und Experimente ausserhalb von Kundenarbeit.",
    intro:
      "Kein Kundenprojekt, sondern mein privater Raum im Web: persoenlicher, technischer und freier in der Sprache.",
    challenge:
      "Das Portfolio sollte nicht wie eine zweite Verkaufsseite wirken. Es musste persoenlicher sein, Einblicke in meinen Hintergrund geben und trotzdem sauber strukturiert bleiben.",
    solution:
      "Dafuer habe ich das Projekt bewusst offener aufgebaut: mit Projekten, Interessen und persoenlichen Schwerpunkten. So zeigt die Seite nicht nur, was ich fuer Kunden baue, sondern auch, wie ich denke, lerne und eigene Ideen umsetze.",
    stack: ["HTML", "CSS", "JavaScript", "Portfolio Copy"],
    accent: "from-white/16 via-[#7F77DD]/10 to-transparent",
  },
  {
    slug: "three-flies-bar",
    name: "Three Flies Bar",
    category: "Hospitality & Events",
    url: "https://threefliesbar.de/",
    shortDesc:
      "Atmosphaerischer Auftritt fuer eine mobile Cocktailbar mit Fokus auf Events, Drinks und Anfragen.",
    intro:
      "Eine Website fuer ein junges Cocktail-Kollektiv, das Stil, Erlebnis und Buchungsanfragen in einem Auftritt verbinden will.",
    challenge:
      "Die Seite musste Stimmung transportieren und gleichzeitig Vertrauen fuer Anfragen aufbauen. Neben dem Look war deshalb auch die Struktur wichtig: Leistungen, Drinks und Event-Eindruck mussten schnell erfassbar sein.",
    solution:
      "Ich habe den Auftritt auf Atmosphaere und Conversion ausgelegt: dunkle Bildwelt, elegante Typografie, klare Inhaltsbloecke und ein roter Faden von der ersten Impression bis zur Anfrage. So wirkt die Marke charakterstark und professionell.",
    stack: ["Next.js", "React", "Tailwind CSS", "Content Structure"],
    accent: "from-[#d8a14a]/18 via-[#7F77DD]/8 to-transparent",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
