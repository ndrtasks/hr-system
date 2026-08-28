# NDR HR Intelligence

Main product track for NDR HR Intelligence / HR Audit & Control Center.

Architecture:
- GitHub: source and version history
- Vercel: public frontend / main product URL
- Supabase: audit engine, API, persistence and scheduled monitoring
- Odoo: read-only HR system of record

Product rules:
- Arabic RTL premium SaaS UI
- Odoo API key is never stored in frontend localStorage
- Per-company configurable rule thresholds and severity
- Manual audit plus scheduled monitoring
- Case Center, Employee 360, Odoo source drill-down, audit history
- NDR employee monitoring toggle is respected when available in Odoo Studio

This branch is isolated from the existing hr-system main branch so development does not affect the current production apps.