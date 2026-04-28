export type ProjectEntry = {
  slug: string;
  name: string;
  category: string;
  url: string;
  image: string;
  blurDataURL: string;
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
    image: "/bendixofficial.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAAAwAQCdASoQAAkABUB8JYwAA3AA/vAi9c8cGZ3lHS6ohkvAAAA=",
    shortDesc:
      "Markanter Webauftritt für DJ und Producer Bendix mit klarer Bühne für Persona und Sound.",
    intro:
      "Eine reduzierte Artist-Seite, die Persönlichkeit, Energie und Wiedererkennung direkt im ersten Screen transportiert.",
    challenge:
      "Die Seite sollte nicht wie eine klassische Firmenwebsite wirken, sondern wie eine digitale Bühne für einen Künstler. Wichtig war ein Auftritt, der schnell lädt, visuell fokussiert bleibt und die Marke Bendix sofort greifbar macht.",
    solution:
      "Ich habe den Auftritt bewusst schlank gehalten: starke Typografie, klare Hero-Führung und ein modernes Dark-Layering, das die Person und den Sound in den Vordergrund stellt. Dadurch wirkt die Seite präsent, ohne überladen zu sein.",
    stack: ["Next.js", "React", "Tailwind CSS", "Responsive UI"],
    accent: "from-[#7F77DD]/20 via-[#7F77DD]/5 to-transparent",
  },
  {
    slug: "eric-schuck-dev",
    name: "EricSchuck.dev",
    category: "Privates Portfolio",
    url: "https://ericschuck.dev/",
    image: "/ericschuckdev.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRkgAAABXRUJQVlA4IDwAAADQAQCdASoQAAkABUB8JZwAAu12OGJG4AD+7Vtp0l7BmI3e5OTQYj6LD9LVoKpVEcIhsxLgLHfTUIs8jgA=",
    shortDesc:
      "Mein persönliches Portfolio für eigene Projekte, Skills, Interessen und Experimente außerhalb von Kundenarbeit.",
    intro:
      "Kein Kundenprojekt, sondern mein privater Raum im Web: persönlicher, technischer und freier in der Sprache.",
    challenge:
      "Das Portfolio sollte nicht wie eine zweite Verkaufsseite wirken. Es musste persönlicher sein, Einblicke in meinen Hintergrund geben und trotzdem sauber strukturiert bleiben.",
    solution:
      "Dafür habe ich das Projekt bewusst offener aufgebaut: mit Projekten, Interessen und persönlichen Schwerpunkten. So zeigt die Seite nicht nur, was ich für Kunden baue, sondern auch, wie ich denke, lerne und eigene Ideen umsetze.",
    stack: ["HTML", "CSS", "JavaScript", "Portfolio Copy"],
    accent: "from-white/16 via-[#7F77DD]/10 to-transparent",
  },
  {
    slug: "three-flies-bar",
    name: "Three Flies Bar",
    category: "Hospitality & Events",
    url: "https://threefliesbar.de/",
    image: "/threefliesbar.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAACwAQCdASoQAAkABUB8JYwAAsaU/RqAAP7r/yOJW6F5USgoAAA=",
    shortDesc:
      "Atmosphärischer Auftritt für eine mobile Cocktailbar mit Fokus auf Events, Drinks und Anfragen.",
    intro:
      "Eine Website für ein junges Cocktail-Kollektiv, das Stil, Erlebnis und Buchungsanfragen in einem Auftritt verbinden will.",
    challenge:
      "Die Seite musste Stimmung transportieren und gleichzeitig Vertrauen für Anfragen aufbauen. Neben dem Look war deshalb auch die Struktur wichtig: Leistungen, Drinks und Event-Eindruck mussten schnell erfassbar sein.",
    solution:
      "Ich habe den Auftritt auf Atmosphäre und Conversion ausgelegt: dunkle Bildwelt, elegante Typografie, klare Inhaltsblöcke und ein roter Faden von der ersten Impression bis zur Anfrage. So wirkt die Marke charakterstark und professionell.",
    stack: ["Next.js", "React", "Tailwind CSS", "Content Structure"],
    accent: "from-[#d8a14a]/18 via-[#7F77DD]/8 to-transparent",
  },
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
