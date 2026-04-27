export default function ImpressumPage() {
  return (
    <main data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-4xl mx-auto">
        <h1
          className="text-4xl md:text-5xl text-[#1C1C1E] mb-3"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Impressum
        </h1>
        <p
          className="text-sm text-[#7A746B] mb-10"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Angaben gemaess Paragraf 5 TMG
        </p>

        <div className="space-y-5">
          {[
            {
              title: "Diensteanbieter",
              body: (
                <>
                  <p>Eric Schuck<br />Hubert-Nees-Str. 7<br />63785 Obernburg<br />Deutschland</p>
                  <p className="mt-4">Kontakt:<br />Telefon: <a href="tel:+4917634445821" className="text-[#1C1C1E] hover:text-[#7F77DD]">+49 176 3444 5821</a><br />E-Mail: <a href="mailto:thericschuck@gmail.com" className="text-[#1C1C1E] hover:text-[#7F77DD]">thericschuck@gmail.com</a></p>
                  <p className="mt-4">Vertretungsberechtigte Person: Eric Schuck</p>
                </>
              ),
            },
            {
              title: "Verantwortlich fuer den Inhalt",
              body: <p>Verantwortlich nach Paragraf 18 Abs. 2 MStV: Eric Schuck, Anschrift wie oben.</p>,
            },
            {
              title: "EU-Streitschlichtung",
              body: (
                <>
                  <p>Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">https://ec.europa.eu/consumers/odr</a>.</p>
                  <p className="mt-4">Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, sofern keine gesetzliche Pflicht besteht.</p>
                </>
              ),
            },
            {
              title: "Haftung fuer Inhalte",
              body: <p>Als Diensteanbieter sind wir gemaess Paragraf 7 Abs. 1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach Paragrafen 8 bis 10 TMG sind wir jedoch nicht verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu ueberwachen oder nach Umstaenden zu forschen, die auf eine rechtswidrige Taetigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt. Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung moeglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>,
            },
            {
              title: "Hosting und Domain",
              body: (
                <>
                  <p>Diese Website wird gehostet auf den Servern von GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. Datenschutzerklaerung: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">GitHub Privacy Statement</a>.</p>
                  <p className="mt-4">Die Domain schuck-webdesign.de wurde ueber Namecheap Inc., 4600 East Washington Street, Suite 305, Phoenix, AZ 85034, USA registriert. Datenschutzerklaerung: <a href="https://www.namecheap.com/legal/general/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">Namecheap Privacy Policy</a>.</p>
                </>
              ),
            },
            {
              title: "Haftung fuer Links",
              body: <p>Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf moegliche Rechtsverstoesse ueberprueft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle ist jedoch ohne konkrete Anhaltspunkte nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>,
            },
            {
              title: "Urheberrecht",
              body: <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der Grenzen des Urheberrechts beduerfen der schriftlichen Zustimmung des jeweiligen Autors beziehungsweise Erstellers. Downloads und Kopien dieser Seite sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet. Soweit Inhalte nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.</p>,
            },
          ].map((section) => (
            <section key={section.title} className="rounded-[24px] border border-black/[0.06] bg-white/70 p-6 md:p-8">
              <h2 className="text-2xl text-[#1C1C1E] mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed text-[#55504A]" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
