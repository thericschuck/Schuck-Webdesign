-- ============================================================
-- 0024 – company_settings: Bankname ergänzen
-- ============================================================
-- Erics eigene Rechnungsvorlage (docs/vorlagen/Rechnung_Vorlage.pdf) zeigt in der
-- Fußzeile unter "Bankverbindung" den Namen der Bank (z.B. "Raiffeisen-Volksbank
-- Aschaffenburg") zusätzlich zu IBAN/BIC — dafür gab es bisher kein Feld.

alter table public.company_settings add column if not exists bank_name text;

comment on column public.company_settings.bank_name is
  'Name der Bank für die Fußzeile von Rechnungs-/Angebots-PDFs, z.B. "Raiffeisen-Volksbank Aschaffenburg".';

-- Bestehende Singleton-Zeile direkt mit den Werten aus Erics eigener Vorlage befüllen —
-- iban/bic/steuernummer standen dort bislang auf NULL, obwohl die Vorlage sie enthält
-- (nur dort eingetragen, nie ins Formular unter /admin/finanzen/einstellungen übernommen).
-- Nur befüllen, wo noch nichts gepflegt ist — keine bereits gesetzten Werte überschreiben.
update public.company_settings set bank_name    = 'Raiffeisen-Volksbank Aschaffenburg' where bank_name is null;
update public.company_settings set iban         = 'DE02501900000008000557'            where iban is null;
update public.company_settings set bic          = 'FFVBDEFF'                          where bic is null;
update public.company_settings set steuernummer = '202/271/41353'                     where steuernummer is null;
