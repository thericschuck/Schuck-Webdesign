-- ============================================================
-- 0022 – Modell-Zuteilung pro Sub-Agent an Aufgabenkomplexität anpassen
-- ============================================================
-- Alle 6 Sub-Agenten liefen bislang auf 'claude-opus-4-8' (Default-Wert aus
-- 0017_jarvis_phase1_agents.sql), unabhängig von ihrer tatsächlichen Aufgabe — der
-- Orchestrator selbst läuft dagegen schon auf 'claude-sonnet-5'. Keiner der 6 Sub-Agenten
-- macht frontier-schwere Reasoning-Arbeit; sie verarbeiten ausschließlich bereits über
-- ihre eigenen Tools abgerufene Daten (siehe lib/jarvis/tools/subagents.ts). Aufteilung:
--
-- 'claude-sonnet-5'    – design_agent, seo_agent, akquise_agent
--                        Output braucht Sprach-/Urteilsqualität: Design-Feedback,
--                        priorisierte SEO-Empfehlungen, kundenseitige Follow-up-Texte.
-- 'claude-haiku-4-5'   – code_agent, care_agent, finance_agent
--                        Reine Aggregations-/Triage-Aufgabe über bereits abgerufene
--                        Tool-Daten: Status-Zusammenfassung, Report-Verdichtung,
--                        Rechnungsfilterung nach Fälligkeit — keine tiefe Abwägung nötig.
--
-- orchestrator/executor unverändert. Wie schon bei 0021 (system_prompt): wirkt sich dank
-- lib/jarvis/tools/subagents.ts#buildScopedRegistry sofort auf den nächsten Sub-Agenten-
-- Lauf aus, jederzeit über das Cockpit (PATCH /api/admin/jarvis/agents/[id]) revidierbar.

update public.agents set model = 'claude-sonnet-5' where slug in ('design_agent', 'seo_agent', 'akquise_agent');
update public.agents set model = 'claude-haiku-4-5' where slug in ('code_agent', 'care_agent', 'finance_agent');
