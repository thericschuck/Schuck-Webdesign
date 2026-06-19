import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen – Schuck Webdesign",
  description: "AGB von Schuck Webdesign – Eric Schuck",
};

const sections = [
  {
    title: "§ 1 – Geltungsbereich",
    body: (
      <p>
        Diese AGB gelten für alle Verträge zwischen Eric Schuck / Schuck Webdesign (nachfolgend »Auftragnehmer«) und Unternehmern im Sinne des § 14 BGB (nachfolgend »Auftraggeber«). Verträge mit Verbrauchern werden nicht geschlossen. Entgegenstehende AGB des Auftraggebers gelten nur bei ausdrücklicher schriftlicher Zustimmung.
      </p>
    ),
  },
  {
    title: "§ 2 – Leistungsgegenstand",
    body: (
      <>
        <p>
          Der Auftragnehmer erbringt Dienstleistungen in den Bereichen Webdesign, UI/UX-Gestaltung, Webentwicklung, Performance-Optimierung sowie digitale Beratung. Die konkrete Leistung ergibt sich aus dem jeweiligen schriftlichen Angebot.
        </p>
        <p className="mt-4 pl-4 border-l-2 border-[#7F77DD]/30 text-[#7A746B] italic">
          Hinweis: Der Auftragnehmer schuldet die sorgfältige Erbringung der vereinbarten Leistungen, nicht einen bestimmten wirtschaftlichen Erfolg (z. B. Umsatzsteigerung, Suchmaschinen-Rankings). Dritte – insbesondere Google, Meta, Vercel oder Supabase – können ihre Dienste und Algorithmen jederzeit einseitig ändern. Hierfür haftet der Auftragnehmer nicht.
        </p>
        <p className="mt-4">
          Der Auftragnehmer ist berechtigt, Dritte (Subunternehmer) zur Leistungserbringung einzusetzen, ohne dass hieraus zusätzliche Kosten für den Auftraggeber entstehen.
        </p>
      </>
    ),
  },
  {
    title: "§ 3 – Vertragsschluss & Angebote",
    body: (
      <p>
        Ein Vertrag kommt zustande durch: (a) schriftliche Annahme eines Angebots des Auftragnehmers oder (b) beidseitige Unterzeichnung eines Projektvertrags. Angebote sind freibleibend und gelten 14 Tage ab Ausstellungsdatum, sofern keine abweichende Frist angegeben ist.
      </p>
    ),
  },
  {
    title: "§ 4 – Mitwirkungspflichten des Auftraggebers",
    body: (
      <>
        <p>
          Der Auftraggeber stellt alle für das Projekt erforderlichen Materialien (Texte, Bilder, Zugangsdaten, Freigaben) vollständig und fristgemäß bereit. Verzögerungen, die aus unterlassener oder verspäteter Mitwirkung entstehen, gehen zu Lasten des Auftraggebers; der Vergütungsanspruch bleibt unberührt.
        </p>
        <p className="mt-4 font-medium text-[#1C1C1E]">Stillschweigen gilt als Freigabe:</p>
        <p className="mt-1">
          Gibt der Auftraggeber innerhalb von 14 Tagen nach Anforderung keine Rückmeldung, gilt die betreffende Leistung oder Zwischenstufe als freigegeben.
        </p>
        <p className="mt-4">
          Der Auftraggeber gewährleistet, dass alle von ihm bereitgestellten Materialien frei von Rechten Dritter sind. Er stellt den Auftragnehmer von Ansprüchen Dritter frei, die aus einer Verletzung dieser Pflicht entstehen.
        </p>
      </>
    ),
  },
  {
    title: "§ 5 – Preise, Zahlung & Verzug",
    body: (
      <>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mb-2">Projektaufträge (Einmalig)</p>
        <p>
          Bei Vertragsschluss ist eine Anzahlung von 50 % des vereinbarten Netto-Betrags fällig. Die verbleibenden 50 % sind vor Übergabe der fertigen Arbeitsergebnisse bzw. vor Go-Live zu begleichen. Projektfristen beginnen erst nach Eingang der Anzahlung und vollständiger Materialbereitstellung.
        </p>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mt-5 mb-2">Laufende Verträge (Retainer / Care-Pakete)</p>
        <p>
          Monatliche Pauschalbeträge sind jeweils zum 1. des Leistungsmonats im Voraus fällig. Die erste Rate ist mit Vertragsunterzeichnung fällig.
        </p>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mt-5 mb-2">Allgemein</p>
        <p>
          Alle Rechnungen sind innerhalb von 14 Tagen ab Rechnungsdatum netto ohne Abzug zu begleichen. Nach Ablauf tritt Verzug ohne Mahnung ein. Bei Verzug ist der Auftragnehmer berechtigt, weitere Leistungen bis zum vollständigen Zahlungseingang auszusetzen. Die Aufrechnung mit Gegenforderungen ist nur bei unbestrittenen oder rechtskräftig festgestellten Forderungen zulässig.
        </p>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mt-5 mb-2">Preisanpassung</p>
        <p>
          Der Auftragnehmer ist berechtigt, Preise für laufende Verträge (Care-Pakete, Retainer) einmal jährlich mit einer Ankündigungsfrist von 6 Wochen anzupassen. Übersteigt eine Anpassung 10 % des bisherigen Preises, hat der Auftraggeber ein außerordentliches Kündigungsrecht zum Zeitpunkt des Inkrafttretens der Anpassung.
        </p>
      </>
    ),
  },
  {
    title: "§ 6 – Revisionen & Änderungswünsche",
    body: (
      <>
        <p>
          Im Angebot enthaltene Korrekturschleifen (Revisionen) umfassen jeweils die Zusammenfassung aller Änderungswünsche des Auftraggebers zu einem festgelegten Zeitpunkt. Eine Revision beinhaltet bis zu 3 Stunden Umsetzungsaufwand; darüber hinausgehender Aufwand wird nach dem vereinbarten Stundensatz abgerechnet.
        </p>
        <p className="mt-4">
          Änderungswünsche, die über den vertraglich definierten Leistungsumfang hinausgehen, werden nach Aufwand vergütet. Der Auftragnehmer informiert den Auftraggeber vorab über entstehende Mehrkosten.
        </p>
      </>
    ),
  },
  {
    title: "§ 7 – Laufzeit & Kündigung",
    body: (
      <>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mb-2">Projektaufträge</p>
        <p>
          Enden mit vollständiger Leistungserbringung, Abnahme und Zahlung. Ein freies Kündigungsrecht des Auftraggebers ist ausgeschlossen.
        </p>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mt-5 mb-2">Laufende Verträge</p>
        <p>
          Laufende Verträge (Care-Pakete, SEO-Retainer, KI-Telefonbot-Betrieb) haben eine Mindestlaufzeit von 6 Monaten, sofern im Angebot keine abweichende Laufzeit vereinbart ist. Nach Ablauf der Mindestlaufzeit verlängern sie sich automatisch um jeweils 3 Monate, sofern nicht mit einer Frist von 4 Wochen zum Laufzeitende schriftlich gekündigt wird.
        </p>

        <p className="text-[10px] uppercase tracking-[0.14em] text-[#7A746B] font-semibold mt-5 mb-2">Außerordentliche Kündigung</p>
        <p>
          Beide Parteien können den Vertrag aus wichtigem Grund außerordentlich und fristlos kündigen. Ein wichtiger Grund liegt insbesondere vor bei: dauerhafter Zahlungsverweigerung, grober Verletzung vertraglicher Pflichten, oder bei Zahlungsunfähigkeit einer Partei.
        </p>
        <p className="mt-4">
          Kündigung und alle rechtserheblichen Erklärungen bedürfen der Schriftform (E-Mail genügt).
        </p>
      </>
    ),
  },
  {
    title: "§ 8 – Urheberrecht & Nutzungsrechte",
    body: (
      <>
        <p>
          Alle vom Auftragnehmer erstellten Arbeitsergebnisse (Designs, Code, Konzepte, Grafiken) sind urheberrechtlich geschützt und verbleiben bis zur vollständigen Zahlung im Eigentum des Auftragnehmers. Jede Nutzung vor vollständiger Zahlung ist untersagt.
        </p>
        <p className="mt-4">
          Nach vollständiger Zahlung erhält der Auftraggeber ein einfaches, zeitlich und räumlich unbeschränktes Nutzungsrecht am vereinbarten Verwendungszweck. Eine Übertragung an Dritte oder Bearbeitung gem. § 23 UrhG bedarf schriftlicher Zustimmung.
        </p>
        <p className="mt-4">
          <span className="font-medium text-[#1C1C1E]">Portfolio-Recht:</span> Der Auftragnehmer ist berechtigt, fertiggestellte Arbeiten in seinem Portfolio, auf seiner Website sowie in Marketingmaterialien zu präsentieren, sofern der Auftraggeber dem nicht ausdrücklich schriftlich widerspricht.
        </p>
      </>
    ),
  },
  {
    title: "§ 9 – Hosting, Infrastruktur & Übergabe",
    body: (
      <>
        <p>
          Verwaltet der Auftragnehmer im Rahmen des Projekts oder eines laufenden Vertrags Hosting, Domains oder externe Dienste (z. B. Vercel, Supabase, INWX) für den Auftraggeber, so verbleiben alle Zugänge und Verträge jederzeit im Einflussbereich des Auftraggebers. Der Auftraggeber ist Vertragspartner der jeweiligen Drittanbieter.
        </p>
        <p className="mt-4">
          Bei Vertragsende übergibt der Auftragnehmer dem Auftraggeber innerhalb von 14 Tagen sämtliche relevanten Zugangsdaten, Quellcodes und Dokumentationen. Der Auftraggeber trägt die Kosten für Drittanbieter-Dienste direkt oder erstattet sie dem Auftragnehmer monatlich nach Nachweis.
        </p>
      </>
    ),
  },
  {
    title: "§ 10 – Vertraulichkeit",
    body: (
      <>
        <p>
          Beide Parteien verpflichten sich, alle im Rahmen der Zusammenarbeit erlangten vertraulichen Informationen (Geschäftsdaten, Kundendaten, technische Details, Preise) vertraulich zu behandeln und nicht an Dritte weiterzugeben. Diese Pflicht gilt über das Vertragsende hinaus für einen Zeitraum von 3 Jahren.
        </p>
        <p className="mt-4">
          Ausgenommen sind Informationen, die öffentlich zugänglich sind, ohne dass eine der Parteien dagegen verstoßen hat.
        </p>
      </>
    ),
  },
  {
    title: "§ 11 – Haftung",
    body: (
      <>
        <p>
          Der Auftragnehmer haftet für Schäden aus Vorsatz und grober Fahrlässigkeit unbeschränkt. Bei einfacher Fahrlässigkeit haftet er ausschließlich für Schäden aus der Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und ist der Ersatz auf den vorhersehbaren, typischen Schaden begrenzt.
        </p>
        <p className="mt-4">
          <span className="font-medium text-[#1C1C1E]">Haftungsdeckel:</span> Die Haftung des Auftragnehmers ist – außer bei Vorsatz, grober Fahrlässigkeit sowie Schäden an Leben, Körper oder Gesundheit – auf den Netto-Rechnungsbetrag des jeweiligen Projekts bzw. auf drei Monatspauschalen bei laufenden Verträgen begrenzt.
        </p>
        <p className="mt-4">
          Für entgangenen Gewinn, ausgebliebene Umsätze oder mittelbare Schäden haftet der Auftragnehmer nicht.
        </p>
      </>
    ),
  },
  {
    title: "§ 12 – Datenschutz",
    body: (
      <p>
        Der Auftraggeber versichert, bei der Übermittlung personenbezogener Daten die Vorschriften der DS-GVO und des BDSG einzuhalten. Soweit der Auftragnehmer im Rahmen der Leistungserbringung personenbezogene Daten des Auftraggebers verarbeitet, schließen die Parteien einen gesonderten Auftragsverarbeitungsvertrag gem. Art. 28 DS-GVO.
      </p>
    ),
  },
  {
    title: "§ 13 – Schlussbestimmungen",
    body: (
      <p>
        Abweichende Vereinbarungen bedürfen der Schriftform und gehen diesen AGB vor. Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Erfüllungsort und ausschließlicher Gerichtsstand für alle Streitigkeiten ist – soweit der Auftraggeber Kaufmann ist – der Sitz des Auftragnehmers (Obernburg am Main). Einzelne unwirksame Bestimmungen berühren die Wirksamkeit der übrigen nicht.
      </p>
    ),
  },
];

export default function AGBPage() {
  return (
    <main data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-4xl mx-auto">
        <h1
          className="text-4xl md:text-5xl text-[#1C1C1E] mb-3"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Allgemeine Geschäftsbedingungen
        </h1>
        <p
          className="text-sm text-[#7A746B] mb-10"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Schuck Webdesign · Eric Schuck · Hubert-Nees-Str. 7 · 63785 Obernburg
        </p>

        <div className="space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-black/6 bg-white/70 p-6 md:p-8"
            >
              <h2
                className="text-2xl text-[#1C1C1E] mb-4"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {section.title}
              </h2>
              <div
                className="text-sm leading-relaxed text-[#55504A]"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <p
          className="mt-10 text-xs text-[#7A746B] text-center"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Stand: Juni 2026
        </p>
      </div>
    </main>
  );
}
