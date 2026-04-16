# Graph Report - .  (2026-04-15)

## Corpus Check
- Corpus is ~21,820 words - fits in a single context window. You may not need a graph.

## Summary
- 179 nodes · 147 edges · 64 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Dashboard & Project Tabs|Admin Dashboard & Project Tabs]]
- [[_COMMUNITY_Admin Server Actions|Admin Server Actions]]
- [[_COMMUNITY_Tech Stack & Project Setup|Tech Stack & Project Setup]]
- [[_COMMUNITY_Page Components|Page Components]]
- [[_COMMUNITY_Auth Flow & DB Types|Auth Flow & DB Types]]
- [[_COMMUNITY_Portal Project Actions|Portal Project Actions]]
- [[_COMMUNITY_Portal ProjectTabs UI|Portal ProjectTabs UI]]
- [[_COMMUNITY_Backoffice + Portal Roles|Backoffice + Portal Roles]]
- [[_COMMUNITY_Admin Nav & Conventions|Admin Nav & Conventions]]
- [[_COMMUNITY_Admin Formatting Helpers|Admin Formatting Helpers]]
- [[_COMMUNITY_Hero Animation|Hero Animation]]
- [[_COMMUNITY_Portal Nav & Timeline|Portal Nav & Timeline]]
- [[_COMMUNITY_Supabase Proxy|Supabase Proxy]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Admin Layout|Admin Layout]]
- [[_COMMUNITY_Client Invite Action|Client Invite Action]]
- [[_COMMUNITY_Delete Client Action|Delete Client Action]]
- [[_COMMUNITY_Delete Client UI|Delete Client UI]]
- [[_COMMUNITY_Update Client Action|Update Client Action]]
- [[_COMMUNITY_Edit Client Form|Edit Client Form]]
- [[_COMMUNITY_Module 20|Module 20]]
- [[_COMMUNITY_Module 21|Module 21]]
- [[_COMMUNITY_Module 22|Module 22]]
- [[_COMMUNITY_Module 23|Module 23]]
- [[_COMMUNITY_Module 24|Module 24]]
- [[_COMMUNITY_Module 25|Module 25]]
- [[_COMMUNITY_Module 26|Module 26]]
- [[_COMMUNITY_Module 27|Module 27]]
- [[_COMMUNITY_Module 28|Module 28]]
- [[_COMMUNITY_Module 29|Module 29]]
- [[_COMMUNITY_Module 30|Module 30]]
- [[_COMMUNITY_Module 31|Module 31]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 33|Module 33]]
- [[_COMMUNITY_Module 34|Module 34]]
- [[_COMMUNITY_Module 35|Module 35]]
- [[_COMMUNITY_Module 36|Module 36]]
- [[_COMMUNITY_Module 37|Module 37]]
- [[_COMMUNITY_Module 38|Module 38]]
- [[_COMMUNITY_Module 39|Module 39]]
- [[_COMMUNITY_Module 40|Module 40]]
- [[_COMMUNITY_Module 41|Module 41]]
- [[_COMMUNITY_Module 42|Module 42]]
- [[_COMMUNITY_Module 43|Module 43]]
- [[_COMMUNITY_Module 44|Module 44]]
- [[_COMMUNITY_Module 45|Module 45]]
- [[_COMMUNITY_Module 46|Module 46]]
- [[_COMMUNITY_Module 47|Module 47]]
- [[_COMMUNITY_Module 48|Module 48]]
- [[_COMMUNITY_Module 49|Module 49]]
- [[_COMMUNITY_Module 50|Module 50]]
- [[_COMMUNITY_Module 51|Module 51]]
- [[_COMMUNITY_Module 52|Module 52]]
- [[_COMMUNITY_Module 53|Module 53]]
- [[_COMMUNITY_Module 54|Module 54]]
- [[_COMMUNITY_Module 55|Module 55]]
- [[_COMMUNITY_Module 56|Module 56]]
- [[_COMMUNITY_Module 57|Module 57]]
- [[_COMMUNITY_Module 58|Module 58]]
- [[_COMMUNITY_Module 59|Module 59]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]

## God Nodes (most connected - your core abstractions)
1. `assertAdmin()` - 13 edges
2. `assertAdmin (Internal Helper)` - 12 edges
3. `AdminProjectTabs (Client Component)` - 10 edges
4. `Schuck-Redesign CLAUDE.md` - 8 edges
5. `Database (Supabase Schema Type)` - 8 edges
6. `Supabase (SSR Auth + DB)` - 5 edges
7. `ProjectTabs (Client Component)` - 5 edges
8. `formatDate()` - 4 edges
9. `Auth Flow (Admin + Client + Invite)` - 4 edges
10. `approveReview (Server Action)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `File/Document Icon (SVG)` --conceptually_related_to--> `Kundenportal (role=client)`  [INFERRED]
  public/file.svg → CLAUDE.md
- `Globe / Web Icon (SVG)` --conceptually_related_to--> `app/(public)/ â€“ Public Landing Page`  [INFERRED]
  public/globe.svg → CLAUDE.md
- `Browser Window / App Icon (SVG)` --conceptually_related_to--> `app/(admin)/admin/ â€“ Admin Route Group`  [INFERRED]
  public/window.svg → CLAUDE.md
- `Next.js Wordmark Logo (SVG)` --conceptually_related_to--> `Next.js 16 (App Router)`  [EXTRACTED]
  public/next.svg → CLAUDE.md
- `Vercel Triangle Logo (SVG)` --conceptually_related_to--> `Vercel (Deployment)`  [EXTRACTED]
  public/vercel.svg → CLAUDE.md

## Hyperedges (group relationships)
- **Schuck-Redesign Tech Stack** — claudemd_nextjs, claudemd_typescript, claudemd_tailwind, claudemd_supabase, claudemd_framer_motion, claudemd_vercel [EXTRACTED 1.00]
- **Auth Flow Components** — claudemd_app_auth_login, claudemd_auth_callback, claudemd_set_password, claudemd_middleware, claudemd_supabase [EXTRACTED 1.00]
- **Admin Area Components** — claudemd_app_admin, claudemd_admin_nav, claudemd_create_admin_client, claudemd_rls [EXTRACTED 0.90]
- **Portal Area Components** — claudemd_app_portal, claudemd_portal_nav, claudemd_status_timeline, claudemd_create_client [INFERRED 0.80]
- **Admin Project Detail: Parallel DB Fetches + Tab Rendering** — admin_projects_id_page_ProjectDetailPage, admin_projects_id_AdminProjectTabs, admin_projects_id_actions_addMeeting, admin_projects_id_actions_adminSendMessage, admin_projects_id_actions_approveReview, admin_projects_id_actions_updateChangeRequestStatus [INFERRED 0.85]
- **Review Lifecycle: Submit â†’ Approve/Reject â†’ Publish** — portal_project_actions_submitReview, admin_projects_id_actions_approveReview, admin_projects_id_actions_rejectReview, api_reviews_public_route_GET [INFERRED 0.85]
- **Bidirectional Messaging: Client sends, Admin reads/replies** — portal_project_actions_sendMessage, admin_projects_id_actions_adminSendMessage, admin_projects_id_actions_markMessagesRead, admin_projects_id_AdminProjectTabs, portal_project_ProjectTabs [INFERRED 0.85]
- **Admin Role Guard: All project actions use assertAdmin** — admin_projects_id_actions_assertAdmin, admin_projects_id_actions_updateProjectStatus, admin_projects_id_actions_addProjectUpdate, admin_projects_id_actions_addMeeting, admin_projects_id_actions_adminSendMessage, admin_projects_id_actions_approveReview, admin_projects_id_actions_updateProjectMeta [EXTRACTED 1.00]
- **Portal Project Page: Client reads project state + interacts** — portal_project_page_ProjectPage, portal_project_ProjectTabs, portal_project_actions_sendMessage, portal_project_actions_submitChangeRequest, portal_project_actions_submitReview [INFERRED 0.85]

## Communities

### Community 0 - "Admin Dashboard & Project Tabs"
Cohesion: 0.13
Nodes (26): DashboardPage (Admin), AdminProjectTabs (Client Component), addMeeting (Server Action), addProjectUpdate (Server Action), adminSendMessage (Server Action), approveReview (Server Action), assertAdmin (Internal Helper), deleteMeeting (Server Action) (+18 more)

### Community 1 - "Admin Server Actions"
Cohesion: 0.27
Nodes (13): addMeeting(), addProjectUpdate(), adminSendMessage(), approveReview(), assertAdmin(), deleteMeeting(), deleteProjectUpdate(), deleteUpdate() (+5 more)

### Community 2 - "Tech Stack & Project Setup"
Cohesion: 0.2
Nodes (11): Playfair Display + DM Sans Fonts, Framer Motion (Hero Animations), Graphify Knowledge Graph Workflow, Next.js 16 (App Router), Schuck-Redesign CLAUDE.md, Tailwind CSS 4, TypeScript, Vercel (Deployment) (+3 more)

### Community 3 - "Page Components"
Cohesion: 0.29
Nodes (2): formatDate(), formatRelative()

### Community 4 - "Auth Flow & DB Types"
Cohesion: 0.25
Nodes (8): app/(auth)/login/ â€“ Login Route, app/auth/callback/ â€“ PKCE + Implicit Flow Handler, Auth Flow (Admin + Client + Invite), types/database.ts â€“ Supabase DB Types, lib/supabase/middleware.ts â€“ Session Refresh + Route Guards, supabase/schema.sql â€“ Schema + Migrations, app/auth/set-password/ â€“ Invite Password Setup, Supabase (SSR Auth + DB)

### Community 5 - "Portal Project Actions"
Cohesion: 0.5
Nodes (0): 

### Community 6 - "Portal ProjectTabs UI"
Cohesion: 0.5
Nodes (0): 

### Community 7 - "Backoffice + Portal Roles"
Cohesion: 0.5
Nodes (4): Admin Backoffice (role=admin), Kundenportal (role=client), Schuck-Redesign Project Overview, File/Document Icon (SVG)

### Community 8 - "Admin Nav & Conventions"
Cohesion: 0.5
Nodes (4): components/admin/AdminNav.tsx, app/(admin)/admin/ â€“ Admin Route Group, Server Actions Convention (useActionState), Browser Window / App Icon (SVG)

### Community 9 - "Admin Formatting Helpers"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Hero Animation"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Portal Nav & Timeline"
Cohesion: 0.67
Nodes (3): app/(portal)/portal/ â€“ Portal Route Group, components/portal/PortalNav.tsx, components/portal/StatusTimeline.tsx

### Community 12 - "Supabase Proxy"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Admin Layout"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Client Invite Action"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Delete Client Action"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Delete Client UI"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Update Client Action"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Edit Client Form"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Module 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Module 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Module 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Module 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Module 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Module 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Module 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Module 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Module 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Module 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Module 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Module 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Module 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Module 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Module 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Module 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Module 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Module 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Module 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Module 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Module 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Module 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Module 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Module 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Module 44"
Cohesion: 1.0
Nodes (2): createAdminClient() â€“ Service Role Client, Row Level Security (RLS)

### Community 45 - "Module 45"
Cohesion: 1.0
Nodes (2): app/(public)/ â€“ Public Landing Page, Globe / Web Icon (SVG)

### Community 46 - "Module 46"
Cohesion: 1.0
Nodes (2): AdminLayout (Server Component), AdminNav (Client Component)

### Community 47 - "Module 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Module 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Module 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Module 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Module 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Module 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Module 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Module 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Module 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Module 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Module 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Module 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Module 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (1): createClient() â€“ Anon Key SSR Client

## Knowledge Gaps
- **32 isolated node(s):** `Admin Backoffice (role=admin)`, `TypeScript`, `Tailwind CSS 4`, `Framer Motion (Hero Animations)`, `Row Level Security (RLS)` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Supabase Proxy`** (2 nodes): `proxy()`, `proxy.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Layout`** (2 nodes): `layout.tsx`, `AdminLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Client Invite Action`** (2 nodes): `inviteClient()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Delete Client Action`** (2 nodes): `deleteClient()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Delete Client UI`** (2 nodes): `DeleteClientButton.tsx`, `handleDelete()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Client Action`** (2 nodes): `updateClient()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Edit Client Form`** (2 nodes): `EditClientForm.tsx`, `Field()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 20`** (2 nodes): `page.tsx`, `EditClientPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 21`** (2 nodes): `createProject()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 22`** (2 nodes): `page.tsx`, `NewProjectPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 23`** (2 nodes): `ProjectStatusControl.tsx`, `handleStatusChange()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 24`** (2 nodes): `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 25`** (2 nodes): `signIn()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 26`** (2 nodes): `layout.tsx`, `PortalLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 27`** (2 nodes): `changePassword()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 28`** (2 nodes): `uploadFile()`, `actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 29`** (2 nodes): `page.tsx`, `UploadPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 30`** (2 nodes): `layout.tsx`, `PublicLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 31`** (2 nodes): `page.tsx`, `AboutPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 32`** (2 nodes): `page.tsx`, `ContactPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 33`** (2 nodes): `page.tsx`, `ServicesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 34`** (2 nodes): `page.tsx`, `WorkPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 35`** (2 nodes): `route.ts`, `GET()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 36`** (2 nodes): `AuthCallbackHandler.tsx`, `AuthCallbackHandler()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 37`** (2 nodes): `route.ts`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 38`** (2 nodes): `AdminNav()`, `AdminNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 39`** (2 nodes): `StatusTimeline.tsx`, `stageIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 40`** (2 nodes): `createAdminClient()`, `admin.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 41`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 42`** (2 nodes): `middleware.ts`, `updateSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 43`** (2 nodes): `server.ts`, `createClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 44`** (2 nodes): `createAdminClient() â€“ Service Role Client`, `Row Level Security (RLS)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 45`** (2 nodes): `app/(public)/ â€“ Public Landing Page`, `Globe / Web Icon (SVG)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 46`** (2 nodes): `AdminLayout (Server Component)`, `AdminNav (Client Component)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 47`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 48`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 49`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 50`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 51`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 52`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 53`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 54`** (1 nodes): `NewProjectForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 55`** (1 nodes): `AddUpdateForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 56`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 57`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 58`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 59`** (1 nodes): `UploadForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (1 nodes): `PortalNav.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (1 nodes): `database.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (1 nodes): `createClient() â€“ Anon Key SSR Client`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Schuck-Redesign CLAUDE.md` connect `Tech Stack & Project Setup` to `Auth Flow & DB Types`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `Supabase (SSR Auth + DB)` connect `Auth Flow & DB Types` to `Tech Stack & Project Setup`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Database (Supabase Schema Type)` (e.g. with `DashboardPage (Admin)` and `ProjectDetailPage (Admin, Server Component)`) actually correct?**
  _`Database (Supabase Schema Type)` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Admin Backoffice (role=admin)`, `TypeScript`, `Tailwind CSS 4` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Dashboard & Project Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._