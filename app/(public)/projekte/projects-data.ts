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
    slug: "athena-finance",
    name: "Athena Finance",
    category: "Finance & Portfolio Dashboard",
    url: "https://athena-finance.de",
    image: "/athena-finance.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAQAgCdASoQAAgAA4BaJZACdAEO9CH72IcAAPx1khb0MPcF8o6EyhT/6ia83Sbv1VPuXM1gqjsX2sfFTaVLIbH2tIfZQcAA",
    shortDesc:
      "Eine eigene Finanz-Plattform für Portfolio, Ausgaben, Verträge und Strategie in einem ruhigen, edlen Interface — Finanzen im vollen Überblick statt verstreut über zehn Apps.",
    intro:
      "Ein persönliches SaaS-Projekt, das Vermögensverwaltung so aufbereitet, wie sie sich anfühlen sollte: klar, kontrolliert und ohne Tabellen-Chaos.",
    challenge:
      "Finanz-Tools wirken oft entweder wie nüchterne Excel-Klone oder wie verspielte Consumer-Apps, denen man kein Vertrauen schenkt. Die Aufgabe war, Portfolio-Tracking, Ausgaben, Verträge und Strategie in einem Produkt zu bündeln, das seriös wirkt, ohne kalt zu sein — und das komplexe Daten auf einen Blick verständlich macht.",
    solution:
      "Entstanden ist ein editorial-geprägtes Interface mit warmer, vertrauensbildender Bildsprache und klarer Informationshierarchie: Portfolio, Ausgaben, Verträge und Strategie sind jeweils eigene, fokussierte Module statt einer überladenen Übersicht. Auth, Datenhaltung und Logik laufen vollständig über Supabase, das Frontend ist auf Next.js und TypeScript aufgebaut — technisch robust und gestalterisch auf Präzision statt Spielerei ausgelegt.",
    stack: ["Next.js", "TypeScript", "Supabase", "Vercel"],
    accent: "from-[#a5813a]/20 via-[#7F77DD]/8 to-transparent",
  },
  {
    slug: "vmp-kuenstlerpool",
    name: "VMP Künstlerpool",
    category: "Talent & Booking Platform",
    url: "https://v-m-p.com",
    image: "/vmp-kuenstlerpool.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAADwAQCdASoQAAkABUB8JYgCdAEORn6UGXAA/tT7AaPRJrYcslRqGEMewJC/AUlFXagE7TKUA/ChIzrXxsHhGaEAAAA=",
    shortDesc:
      "Für Vivid Music Productions — eine der etablierten Booking-Agentur für Live-Musik im Rhein-Main-Gebiet — haben wir eine neue digitale Präsenz entwickelt, die das Niveau der Acts widerspiegelt, die sie vertreten.",
    intro:
      "Ein digitaler Künstlerpool, der Talent und Buchungsinteresse auf kurzem Weg zusammenbringt – strukturiert, professionell und schnell erfassbar.",
    challenge:
      "Eine Plattform, die gleichzeitig als Showcase für das Künstler-Roster und als direktes Buchungstool funktioniert. Kein generischer Agentur-Auftritt, sondern eine Bühne — visuell stark, sofort vertrauenswürdig, conversion-orientiert.",
    solution:
      "Es wurde ein light-themed Design mit klarer Hierarchie umgesetzt: Bands werden in einem kompakten Grid präsentiert, das auf Hover Live-Infos, Genre-Tags und Direktkontakt freigibt. Keine überladenen Profilseiten — der Fokus liegt auf dem ersten Eindruck und dem schnellen Weg zur Anfrage.",
    stack: ["Next.js", "React", "Tailwind CSS", "Vercel"],
    accent: "from-[#4a9d8f]/20 via-[#7F77DD]/8 to-transparent",
  },
  {
    slug: "spirit-of-soul",
    name: "Spirit of Soul",
    category: "Live Entertainment & Booking",
    url: "https://www.spiritofsoul.com/",
    image: "/spiritofsoul.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAADwAQCdASoQAAgAAsBMJbAAD4TsfEYI6wAA/u9qRCqdy7gYCrO8F08NWMn7p0iXszZIw5277c7i0FGcEY5a0p7E6j0SP/rIoG//dF05uOqf+XgYvvbH7gAA",
    shortDesc:
      "Energiegeladener Web-Auftritt für die Soul-, Funk- und Motown-Band Spirit of Soul mit Fokus auf Buchungsanfragen für Events.",
    intro:
      "Eine Bühne im Web für eine Live-Band mit 25+ Jahren Bühnenerfahrung — gebaut, um Eventplaner und Firmenkunden direkt zur Anfrage zu führen.",
    challenge:
      "Die Band tritt in sehr unterschiedlichen Formaten auf, vom kleinen Dinner-Ensemble bis zur 12-köpfigen Bigband mit Bläsern. Die Website musste diese Flexibilität zeigen und gleichzeitig genug Vertrauen für Firmenkunden und Hochzeitsplaner aufbauen, um eine Anfrage auszulösen.",
    solution:
      "Ich habe den Auftritt auf Energie und Klarheit ausgelegt: starke Live-Bildwelt, klar strukturierte Paket-Übersicht und Referenzen (500+ Auftritte, 200+ Songs), die Kompetenz sofort greifbar machen. Der Weg zur Buchungsanfrage bleibt dabei immer nur einen Klick entfernt.",
    stack: ["Next.js", "React", "Tailwind CSS", "Content Structure"],
    accent: "from-[#c2487a]/18 via-[#7F77DD]/8 to-transparent",
  },
  {
    slug: "safe-untermain",
    name: "SAFE — Sven Zöller",
    category: "Sicherheitstraining & Coaching",
    url: "https://www.safe-untermain.de/",
    image: "/safe-untermain.webp",
    blurDataURL:
      "data:image/webp;base64,UklGRkQAAABXRUJQVlA4IDgAAADwAQCdASoQAAgAAsBMJZwAAt41Vt9N14AA/u45OtK6rp+KLP1L56jIxwFQUOSM07qXA6oLdAAAAA==",
    shortDesc:
      "Klarer, vertrauensbildender Webauftritt für Sicherheitstrainer Sven Zöller mit Fokus auf Deeskalation und Konfliktprävention.",
    intro:
      "Eine Coaching- und Trainings-Website, die Fachkompetenz und Nahbarkeit gleichzeitig vermitteln muss — für Sicherheitspersonal, soziale Berufe und Privatpersonen.",
    challenge:
      "Sicherheitstraining wirkt schnell entweder zu hart (reine Kampfsport-Optik) oder zu weich (generische Coaching-Seite). Sven brauchte einen Auftritt, der seine über 20 Jahre Erfahrung glaubwürdig zeigt, ohne einschüchternd zu wirken, und der Interessenten niedrigschwellig zu einem Erstgespräch führt.",
    solution:
      "Ich habe den Auftritt auf Vertrauen statt Härte ausgelegt: ruhige Typografie, klare Leistungsübersicht (Deeskalation, Antiaggressionstraining, Selbstbehauptung) und ein direkter, unaufdringlicher Weg zur kostenlosen Erstberatung. So wirkt die Seite professionell und zugänglich zugleich.",
    stack: ["Next.js", "React", "Tailwind CSS", "Responsive UI"],
    accent: "from-[#4a6fa5]/20 via-[#7F77DD]/6 to-transparent",
  },
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
];

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}
