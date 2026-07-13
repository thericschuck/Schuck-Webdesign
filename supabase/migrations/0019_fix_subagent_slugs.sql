-- ============================================================
-- 0019 – agents.slug der 6 Sub-Agenten an lib/jarvis/subagents.ts angleichen
-- ============================================================
-- 0017 hat die Sub-Agenten mit Bindestrich-Slugs ('design-agent', 'finanzen-agent', …)
-- geseedet. lib/jarvis/tools/subagents.ts#buildScopedRegistry löst Sub-Agenten aber über
-- `agents.slug = SubAgentDefinition.name` auf, und SUBAGENTS (lib/jarvis/subagents.ts)
-- nutzt Unterstrich-Namen ('design_agent', 'finance_agent' — Englisch statt 'finanzen'),
-- exakt wie beim Haupt-Orchestrator als Tool-Namen aufgerufen. Ohne diese Angleichung
-- findet buildScopedRegistry nie einen agents-Eintrag und jeder Sub-Agenten-Aufruf würde
-- fehlschlagen. orchestrator/executor/care-agent-ähnliche Grund-Agenten sind nicht
-- betroffen (kein Gegenstück in SUBAGENTS, das care-agent-Slug stimmt zufällig schon).

update public.agents set slug = 'design_agent'   where slug = 'design-agent';
update public.agents set slug = 'code_agent'     where slug = 'code-agent';
update public.agents set slug = 'seo_agent'      where slug = 'seo-agent';
update public.agents set slug = 'care_agent'     where slug = 'care-agent';
update public.agents set slug = 'akquise_agent'  where slug = 'akquise-agent';
update public.agents set slug = 'finance_agent'  where slug = 'finanzen-agent';
