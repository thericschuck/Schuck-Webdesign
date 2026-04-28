export default function DatenschutzPage() {
  return (
    <main data-cursor="dark" className="bg-[#F7F5F0] px-6 md:px-12 py-24">
      <div className="max-w-4xl mx-auto">
        <h1
          className="text-4xl md:text-5xl text-[#1C1C1E] mb-3"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Datenschutz
        </h1>
        <p
          className="text-sm text-[#7A746B] mb-10"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Informationen zum Datenschutz auf dieser Website gemäß DSGVO
        </p>

        <div className="space-y-5">
          {[
            {
              title: "1. Verantwortlicher",
              body: (
                <>
                  <p>Eric Schuck<br />Hubert-Nees-Str. 7<br />63785 Obernburg<br />Deutschland</p>
                  <p className="mt-4">E-Mail: <a href="mailto:thericschuck@gmail.com" className="text-[#1C1C1E] hover:text-[#7F77DD]">thericschuck@gmail.com</a><br />Telefon: <a href="tel:+4917634445821" className="text-[#1C1C1E] hover:text-[#7F77DD]">+49 176 3444 5821</a></p>
                </>
              ),
            },
            {
              title: "2. Hosting",
              body: (
                <>
                  <p>Diese Website wird bei GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA gehostet. Beim Aufruf werden Server-Logfiles wie IP-Adresse, Datum und Uhrzeit des Zugriffs, Browsertyp und Betriebssystem verarbeitet. Diese Verarbeitung erfolgt zur Bereitstellung und Sicherheit der Website.</p>
                  <p className="mt-4">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
                  <p className="mt-4">Weitere Informationen: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">GitHub Privacy Statement</a>.</p>
                  <p className="mt-4">Die Domain wird über Namecheap Inc., 4600 East Washington Street, Suite 305, Phoenix, AZ 85034, USA verwaltet. Datenschutzerklärung: <a href="https://www.namecheap.com/legal/general/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">Namecheap Privacy Policy</a>.</p>
                  <p className="mt-4">Datenübermittlungen in die USA erfolgen auf Grundlage geeigneter Garantien, insbesondere des EU-US Data Privacy Frameworks, soweit anwendbar.</p>
                </>
              ),
            },
            {
              title: "3. Externe Inhalte / Drittanbieter",
              body: <p>Zur Darstellung von Animationen und externen Inhalten können Verbindungen zu Servern von Drittanbietern aufgebaut werden. Dabei können IP-Adresse und technische Metadaten übermittelt werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, sofern keine Einwilligung erforderlich ist.</p>,
            },
            {
              title: "4. Kontaktaufnahme",
              body: <p>Wenn Sie per E-Mail Kontakt aufnehmen, werden Ihre Angaben wie Name, E-Mail-Adresse und Nachricht zur Bearbeitung Ihrer Anfrage verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO beziehungsweise Art. 6 Abs. 1 lit. f DSGVO. Die Daten werden nur so lange gespeichert, wie dies zur Bearbeitung und aufgrund gesetzlicher Aufbewahrungsfristen erforderlich ist.</p>,
            },
            {
              title: "5. WhatsApp-Kontakt",
              body: <p>Sofern auf dieser Website ein WhatsApp-Link genutzt wird, wird erst durch das aktive Anklicken eine Verbindung zu WhatsApp aufgebaut. Dabei können Metadaten an WhatsApp übertragen werden. Es gilt zusätzlich die <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1C1C1E] hover:text-[#7F77DD]">Datenschutzrichtlinie von WhatsApp</a>.</p>,
            },
            {
              title: "6. Social-Media-Links",
              body: <p>Es sind ausschließlich Links zu externen Profilen eingebunden. Beim bloßen Aufruf dieser Website findet keine Datenübertragung an diese Anbieter statt. Erst beim Anklicken der Links gelten die Datenschutzhinweise der jeweiligen Plattform.</p>,
            },
            {
              title: "7. Cookies / Tracking",
              body: <p>Derzeit werden keine eigenen Cookies zu Tracking-Zwecken gesetzt und keine Tracking-Dienste wie Google Analytics eingesetzt. Sollte sich dies ändern, wird diese Erklärung entsprechend aktualisiert und gegebenenfalls eine Einwilligung eingeholt.</p>,
            },
            {
              title: "8. Sicherheit",
              body: <p>Wir verwenden übliche technische und organisatorische Maßnahmen zur Sicherung der Website. Bei der Übertragung von Daten empfehlen wir die Nutzung verschlüsselter Verbindungen per SSL beziehungsweise TLS.</p>,
            },
            {
              title: "9. Ihre Rechte",
              body: <p>Sie haben insbesondere das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch gegen die Verarbeitung sowie Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft. Außerdem steht Ihnen ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde zu.</p>,
            },
            {
              title: "10. Speicherdauer",
              body: <p>Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.</p>,
            },
            {
              title: "11. Änderungen dieser Erklärung",
              body: <p>Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen abzubilden.</p>,
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
