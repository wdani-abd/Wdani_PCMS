# نظام إدارة الأملاك والعقود

تطبيق ويب عربي RTL لإدارة العقارات والوحدات والمستأجرين والعقود والاستحقاقات والدفعات والمصروفات والتقارير بالريال السعودي.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/property-management/src/App.tsx` — واجهة التطبيق ومسارات لوحة التحكم.
- `artifacts/property-management/src/index.css` — ثيم RTL والألوان والطباعة.
- `lib/api-spec/openapi.yaml` — عقد API ومصدر توليد hooks.
- `artifacts/api-server/src/routes/property-management.ts` — عمليات API وبيانات العينة الحالية.
- `supabase/schema.sql` — جداول Supabase والعلاقات والفهارس وRLS وAudit Log.

## Architecture decisions

- تستخدم الواجهة hooks مولدة من OpenAPI حتى يبقى عقد الخادم والعميل متزامناً.
- الوضع الحالي يعرض بيانات عينة قابلة للتجربة، مع طبقة اتصال Supabase جاهزة للتحويل إلى البيانات الفعلية بعد تشغيل `supabase/schema.sql`.
- واجهة المستخدم عربية بالكامل، بينما قيم enums في مخطط قاعدة البيانات محفوظة بالإنجليزية لتسهيل التكامل البرمجي.
- الحذف المالي والعقود مصمم على أساس soft delete عبر `deleted_at`.

## Product

تتضمن النسخة الأساسية لوحة تشغيل مالية وإشغال، إدارة العقارات والوحدات والمستأجرين والعقود، جداول السداد والدفعات والمصروفات، البحث العام، مركز التنبيهات، التقارير، المستندات والإعدادات.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
