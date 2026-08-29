import type { DocumentData, DocumentSender } from './types'

/**
 * Beispieldaten für den Vorlagen-Editor und den Layout-Stresstest.
 *
 * Bewusst unangenehm gebaut: überlanger Firmenname, Positionen mit mehrzeiligen
 * Beschreibungen unterschiedlicher Länge, eine Position mit Label-Overrides
 * (Care-Abo, zählt nicht in die Summe), ein mehrseitiger Schlusstext. Wenn das
 * Layout hiermit sauber umbricht, hält es auch echte Kundendaten aus.
 */

const BEISPIEL_ABSENDER: DocumentSender = {
  firma: 'Schuck Webdesign',
  inhaber: 'Eric Schuck',
  strasse: 'Musterstraße 12',
  plz: '63911',
  ort: 'Klingenberg am Main',
  land: 'Deutschland',
  email: 'info@schuck-webdesign.de',
  telefon: '+49 151 00000000',
  website: 'schuck-webdesign.de',
  iban: 'DE00 0000 0000 0000 0000 00',
  bic: 'GENODEF1XXX',
  bankName: 'Raiffeisenbank Musterstadt eG',
  steuernummer: '000/000/00000',
  ustId: null,
}

export const BEISPIEL_RECHNUNG: DocumentData = {
  kind: 'rechnung',
  titel: 'Rechnung',
  nummer: 'RE-2026-042',
  entwurf: false,
  empfaenger: {
    name: 'Dr. Maximiliane von Hohenbergstein-Wallersdorf',
    zusatz: 'Hohenbergstein Immobilien- und Projektentwicklungsgesellschaft mbH & Co. KG',
    strasse: 'Prinzregentenstraße 148a, Hinterhaus 3. OG',
    plz: '81677',
    ort: 'München',
    land: 'Deutschland',
  },
  absender: BEISPIEL_ABSENDER,
  meta: [
    { label: 'Rechnungsdatum', value: '29.08.2026' },
    { label: 'Leistungsdatum', value: '15.08.2026' },
    { label: 'Fälligkeitsdatum', value: '12.09.2026' },
    { label: 'Kundennummer', value: 'KD-2026-017' },
  ],
  anrede: 'Sehr geehrte Damen und Herren,',
  einleitungstext: 'vielen Dank für Ihren Auftrag bei Schuck Webdesign.',
  positionen: [
    {
      pos: 1,
      artNr: 'PKT-101',
      titel: 'Website-Paket „Business" – Konzeption, Design und Umsetzung',
      beschreibung:
        'Strategie-Workshop, Informationsarchitektur und Wireframes für sechs Seiten.\nVisuelles Konzept inklusive zweier Entwurfsrichtungen zur Auswahl.\nUmsetzung als statisch generierte Next.js-Anwendung mit Anbindung an ein Headless-CMS.\nResponsive Ausarbeitung für Mobil, Tablet und Desktop.',
      menge: 1,
      einzelpreis: 3400,
      gesamt: 3400,
    },
    {
      pos: 2,
      artNr: 'EX-02',
      titel: 'Mehrsprachigkeit (Deutsch / Englisch)',
      beschreibung: 'Sprachumschalter, übersetzte Navigationsstruktur, hreflang-Auszeichnung.',
      menge: 1,
      einzelpreis: 780,
      gesamt: 780,
    },
    {
      pos: 3,
      artNr: 'EX-03-B',
      titel: 'Redaktionelle Ersteinrichtung',
      beschreibung: 'Übertragung der bestehenden Inhalte, Bildoptimierung, Anlage der Redakteursrollen.',
      menge: 4.5,
      einzelpreis: 95,
      gesamt: 427.5,
    },
    {
      pos: 4,
      titel: 'Fotoshooting vor Ort (halber Tag)',
      beschreibung: 'Inklusive Anfahrt, Bildauswahl und Nachbearbeitung von 25 Motiven.',
      menge: 1,
      einzelpreis: 650,
      gesamt: 650,
    },
    {
      pos: 5,
      artNr: 'CP-01',
      titel: 'Care-Paket „Basis" – laufende Betreuung',
      beschreibung:
        'Monatliche Updates, Backups, Monitoring und bis zu 30 Minuten Änderungen.\nLäuft separat ab Übergabe und ist nicht Teil dieser Rechnung.',
      menge: 1,
      einzelpreis: 25,
      gesamt: 0,
      einzelpreisLabel: '25,00 € p.M.',
      betragLabel: '–',
      excludeFromSum: true,
    },
  ],
  summe: {
    netto: 5257.5,
    ustPflichtig: false,
    ustSatz: null,
    ustBetrag: null,
    brutto: null,
  },
  hinweise: [
    'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    'Bitte zahlen Sie die Rechnung bis zum oben angegebenen Fälligkeitsdatum.',
  ],
  schlusstext: `Die Abnahme der Leistungen erfolgte am 15.08.2026 im Rahmen der gemeinsamen Übergabesitzung. Sämtliche im Angebot AN-2026-031 vereinbarten Leistungsbestandteile wurden erbracht und protokolliert.

Der Quellcode sowie sämtliche Zugangsdaten wurden Ihnen im Zuge der Übergabe ausgehändigt. Die Nutzungsrechte an allen im Auftrag erstellten gestalterischen Arbeiten gehen mit vollständiger Bezahlung dieser Rechnung auf Sie über. Für die eingesetzten Schriften und Stockmotive gelten die jeweiligen Lizenzbedingungen der Anbieter, die dem Übergabeprotokoll als Anlage beiliegen.

Das Care-Paket „Basis" startet abweichend hiervon am 01.09.2026 und wird monatlich gesondert abgerechnet. Eine Kündigung ist mit einer Frist von vier Wochen zum Monatsende möglich. Sollten Sie im laufenden Betrieb Erweiterungen wünschen, die über den Umfang des Care-Pakets hinausgehen, erhalten Sie vorab ein gesondertes Angebot.

Für Rückfragen zur Rechnung oder zu den erbrachten Leistungen stehe ich Ihnen jederzeit gerne zur Verfügung. Ich bedanke mich für die angenehme und konstruktive Zusammenarbeit und freue mich, wenn wir das Projekt auch in Zukunft gemeinsam weiterentwickeln.`,
  grussformel: 'Freundliche Grüße',
  unterschrift: 'Eric Schuck',
}

export const BEISPIEL_ANGEBOT: DocumentData = {
  ...BEISPIEL_RECHNUNG,
  kind: 'angebot',
  titel: 'Angebot',
  nummer: 'AN-2026-031',
  meta: [
    { label: 'Angebotsdatum', value: '29.08.2026' },
    { label: 'Gültig bis', value: '28.09.2026' },
    { label: 'Kundennummer', value: 'KD-2026-017' },
  ],
  einleitungstext: 'vielen Dank für Ihr Interesse. Gerne unterbreite ich Ihnen folgendes Angebot.',
  hinweise: [
    'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
    'Dieses Angebot ist gültig bis zum 28.09.2026.',
  ],
}
