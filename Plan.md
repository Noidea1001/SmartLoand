**Smart Loan Platform — System Architecture Specification**  

|               |                                                         |
| ------------- | ------------------------------------------------------- |
| Document Type | System Architecture Specification                       |
| Version       | 1.2                                                     |
| Status        | Draft — Pending Decision on Interest Calculation Method |
| Prepared For  | Vy Sal                                                  |
| Stack         | React · FastAPI · PostgreSQL · Docker                   |
  
**Table of Contents**  
1. Executive Summary  
2. System Overview  
3. Non-Functional Requirements  
4. Multi-Tenancy Strategy  
5. Data Model  
6. Backend Architecture  
7. Frontend Architecture  
8. Infrastructure & Deployment  
9. Implementation Roadmap  
10. Design Decisions Summary  
11. Open Items Requiring a Decision  
12. Glossary  
  
**1. Executive Summary**  
This document defines the architecture for a multi-tenant loan and financing management platform intended for enterprises that sell goods on credit (vehicles, mobile devices, and similar products) within Cambodia. The system supports per-client, per-loan interest rates set at the discretion of authorized staff, a configurable role-and-permission model for access control, a loan approval workflow for staff-submitted requests, and bilingual (Khmer / English) operation with dual-currency (USD / KHR) support throughout.  
The platform is built as a decoupled system: a React single-page application communicating with a FastAPI backend over a REST API, backed by PostgreSQL. All components run in Docker containers for consistent local development and deployment.  
  
**2. System Overview**  

| Category | Decision |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | React (SPA) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL, containerized via Docker |
| Authentication | JWT, tenant-scoped |
| Localization | Khmer (km), English (en) |
| Currency | USD, KHR (dual-currency on all monetary fields) |
| Access Control | Modular, permission-based (tenant-defined roles) |
| Core Modules | Loans, Clients, Products, Payments, Roles & Permissions, Loan Approval Workflow, Activity Log, Notifications, Settings, Dashboard Analytics, Reports |
  
**3. Non-Functional Requirements**  
These requirements are not tied to a single module but govern the system as a whole.  
**3.1 Security**  
* Passwords stored as salted hashes; JWTs signed with a server-side secret and short-lived, with refresh tokens.  
* Tenant isolation enforced server-side on every request (see Section 4) — never trusted from client input.  
* Financial audit tables (activity_log, audit_log) are append-only at the database-role level.  
* All list and detail endpoints enforce the requesting user's permission set before returning data.  
**3.2 Data Integrity**  
* Financial entities (clients, loans, products, users) use soft deletion (deleted_at) rather than hard deletion.  
* Loan lifecycle changes (prepayment, restructuring, write-off, approval/rejection) are recorded as discrete, timestamped events rather than in-place field updates.  
* Currency conversions applied to historical records are frozen at the rate in effect at the time of the transaction.  
**3.3 Reliability & Recoverability**  
* The PostgreSQL data volume is paired with a scheduled pg_dump backup process, stored independently of the Docker volume.  
* Scheduled background jobs (overdue detection, notification dispatch) are idempotent and safe to re-run.  
**3.4 Performance & Scalability**  
* All list endpoints are paginated by default; no unbounded result sets.  
* The shared-schema multi-tenancy model (Section 4) avoids the operational overhead of per-tenant infrastructure while remaining compatible with row-level security if stricter isolation is required later.  
**3.5 Localization & Accessibility**  
* All user-facing strings are resolved through translation keys (Khmer and English); no hardcoded UI text.  
* Currency values are always displayed with an explicit currency indicator (USD/KHR), never assumed.  
**3.6 Maintainability**  
* Business logic (interest calculation, currency conversion, analytics aggregation) is isolated in a dedicated service layer, independent of the API and presentation layers, and covered by automated tests.  
  
**4. Multi-Tenancy Strategy**  
**Approach:** shared database, shared schema, with a tenant_id foreign key on every business table (row-level isolation).  
This approach was selected over schema-per-tenant or database-per-tenant because it is significantly simpler to build, deploy, and query across tenants for platform-level reporting, while remaining compatible with PostgreSQL row-level security (RLS) if stronger isolation guarantees are required in the future. Per-tenant infrastructure is unnecessary overhead at the current scale and is not recommended unless a specific enterprise client requires dedicated infrastructure for regulatory reasons.  
* Every business table carries a tenant_id foreign key referencing the tenants table.  
* Every API request is scoped to the authenticated user's tenant_id, resolved server-side from the JWT — never accepted as client input.  
* A platform-level superadmin permission allows cross-tenant visibility for the platform operator only.  
  
**5. Data Model**  
```
tenants
  id, name, subdomain/slug, default_locale (km/en), created_at, is_active

tenant_settings
  id, tenant_id, base_currency (USD/KHR), usd_to_khr_rate, rate_updated_at,
  default_interest_type (flat/reducing), grace_period_days, late_fee_percent,
  locale, updated_at

exchange_rate_history
  id, tenant_id, usd_to_khr_rate, effective_from, created_by_user_id

users
  id, tenant_id, name, email, password_hash, is_active,
  manager_id (self-referencing FK, nullable), deleted_at, created_at

permissions
  id, code (e.g. "loans.create", "loans.approve", "loans.edit_rate",
             "clients.delete", "settings.manage", "users.manage", "reports.view"),
  module, description

roles
  id, tenant_id, name, is_system_default

role_permissions
  role_id, permission_id

user_roles
  user_id, role_id

clients
  id, tenant_id, current_name, phone, national_id, deleted_at, created_at
  -- unique constraint on (tenant_id, national_id)

client_name_history
  id, client_id, old_name, new_name, changed_at, changed_by_user_id

products
  id, tenant_id, category, name, price_amount, price_currency (USD/KHR),
  deleted_at, created_at

loans
  id, tenant_id, client_id, product_id, principal_amount, principal_currency (USD/KHR),
  interest_rate_percent, interest_type (flat/reducing), term_months, start_date,
  status (pending_approval/active/closed/rejected/overdue/defaulted/written_off/restructured),
  grace_period_days, late_fee_percent,
  deleted_at, requested_by_user_id, created_by_user_id, created_at

loan_approvals
  id, loan_id, requested_by_user_id, status (pending/approved/rejected),
  decided_by_user_id, decided_at, comments, created_at

loan_events
  id, loan_id, event_type (prepayment/restructure/write_off), details (jsonb),
  new_term_months, new_interest_rate_percent, amount, created_by_user_id, created_at

installments
  id, loan_id, due_date, amount_due, amount_paid, late_fee_applied,
  paid_at, status (upcoming/due/overdue/paid/waived)

payments
  id, loan_id, installment_id, amount, currency (USD/KHR), exchange_rate_used,
  paid_at, method, recorded_by_user_id

notifications
  id, tenant_id, recipient_user_id,
  type (loan_approval_requested/loan_approved/loan_rejected/installment_due/installment_overdue),
  entity_type, entity_id, channel (in_app/email/sms), is_read, sent_at, created_at

notification_schedule
  id, tenant_id, installment_id, send_at, notification_type, status (pending/sent)

activity_log                     -- append-only
  id, tenant_id, actor_user_id, action, entity_type, entity_id, metadata (jsonb), created_at

audit_log                        -- append-only
  id, tenant_id, entity_type, entity_id, field, old_value, new_value, changed_by, changed_at
```
**5.1 Design Rationale**  

| Requirement | Implementation |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-loan, per-client interest rate | interest_rate_percent set at loan creation; changes are audited, not overwritten silently. |
| Client name changes over time | clients.current_name reflects the present value; every change is preserved in client_name_history. |
| Configurable access control | Access derives from permissions→ role_permissions → user_roles, not a fixed role column; a tenant defines its own roles. |
| Dual currency | Every monetary field carries its own currency; exchange_rate_historyand payments.exchange_rate_usedfreeze the applicable rate so historical totals are stable. |
| No loss of financial history | Soft deletion (deleted_at) on clients, loans, products, and users. |
| Tamper-resistant history | activity_log and audit_log are append-only at the database level. |
| Duplicate client prevention | Unique constraint on (tenant_id, national_id), surfaced as a warning before hard-blocking. |
| Full loan lifecycle | loans.status covers the complete lifecycle; loan_events records prepayment, restructuring, and write-off as discrete events. |
| Late fees & grace periods | Defaults on tenant_settings, overridable per loan; enforced by a scheduled job (Section 6.3). |
| Loan approval workflow | See 5.2 below. |
  
**5.2 Loan Approval Workflow**  
A loan created by a user who does not hold the loans.approve permission is created with status = pending_approval and a corresponding loan_approvals record. The loan does not become active until a user holding loans.approve — typically a manager or owner — reviews and approves it.  
*Approval routing:*  
* **Default routing:** every user in the tenant holding loans.approve receives a notification. This is sufficient for small organizations where any manager or the owner can act.  
* **Targeted routing:** if the requester has a manager_id assigned, the alert is directed to that manager first, with a configurable fallback to all loans.approve holders if no action is taken within a defined window, or if no manager is assigned. This supports a formal reporting hierarchy as the organization grows.  
* Approval and rejection decisions are recorded on loan_approvals and reflected in activity_log. A rejected loan is retained with status = rejected (not deleted), with the reviewer's comments visible to the requester, who may revise and resubmit.  
  
**6. Backend Architecture**  
**6.1 Application Structure**  
```
backend/
  app/
    main.py                  # FastAPI app, router registration, CORS
    core/
      config.py              # environment configuration (DB URL, JWT secret)
      security.py            # password hashing, JWT issuance/verification
      deps.py                # get_db, get_current_user, tenant-scoping dependency
      permissions.py         # require_permission(...) dependency factory
      i18n.py                # km/en message catalogs for API responses
    db/
      base.py
      session.py
      models/
        tenant.py, tenant_settings.py, exchange_rate_history.py
        user.py, permission.py, role.py
        client.py
        product.py
        loan.py, loan_event.py, loan_approval.py
        installment.py
        payment.py
        notification.py, notification_schedule.py
        activity_log.py
        audit_log.py
    schemas/
      client.py, loan.py, role.py, dashboard.py, ...
    api/
      v1/
        auth.py
        clients.py
        loans.py               # includes prepay/restructure/write-off/approve/reject actions
        products.py
        payments.py
        roles.py
        settings.py
        activity_log.py
        dashboard.py
        reports.py
        notifications.py
    services/
      loan_calculator.py       # interest and schedule calculation, pure/testable
      loan_lifecycle.py        # prepayment, restructuring, write-off, overdue transitions
      loan_approval.py         # submit/approve/reject, approver resolution
      audit.py                 # writes to audit_log and activity_log
      fx.py                    # currency conversion, rate history lookups
      analytics.py             # time-bucketed aggregation for the dashboard
      notifications.py         # notification creation and dispatch
      pdf.py                   # loan statement / receipt generation
    jobs/
      overdue_check.py         # scheduled: overdue detection, late fee application
      reminder_sender.py       # scheduled: promotes due notification_schedule entries
    alembic/                  # database migrations
  tests/
    test_loan_calculator.py
    test_analytics.py
    test_permissions.py
  requirements.txt
  Dockerfile
```
**6.2 Design Notes**  
* deps.py is the single point at which every protected route resolves tenant_id from the JWT; correctness here is the basis of tenant isolation.  
* loan_calculator.py is kept pure and independently testable, isolated from the API layer.  
* permissions.py exposes require_permission("loans.create") as a reusable FastAPI dependency.  
* Scheduled jobs (jobs/) — not the request/response cycle — are the sole mechanism by which grace periods, late fees, and overdue transitions are applied, ensuring loan state changes are predictable and auditable.  
* Automated tests are prioritized for the components with the highest cost of failure: interest/currency calculations and the permission guard.  
**6.3 Dashboard Analytics Endpoint**  
```
GET /api/v1/dashboard/series?metric=new_loans|collections|disbursed_amount
                              &granularity=week|month|year
                              &from=...&to=...&currency=USD|KHR
```
A single endpoint serves all reporting granularities via PostgreSQL date_trunc(), avoiding duplicated aggregation logic per time period.  
**6.4 Pagination & Filtering**  
Every list endpoint (loans, clients, activity_log, payments) accepts page, page_size, and entity-appropriate filters, returning a consistent {items, total, page, page_size} envelope.  
**6.5 Backup Strategy**  
The PostgreSQL data volume is paired with a scheduled pg_dump process writing to storage independent of the Docker volume.  
  
**7. Frontend Architecture**  
**7.1 Application Structure**  
```
frontend/
  src/
    api/
      client.ts               # HTTP client with auth interceptor
      loans.ts, clients.ts, roles.ts, settings.ts, activityLog.ts, dashboard.ts
    i18n/
      en.json, km.json
      i18n.ts                  # react-i18next configuration
    components/
      layout/
        Sidebar.tsx            # collapsible icon-only / icon-and-label navigation
        Topbar.tsx              # language switch, currency toggle, notification indicator
        AppLayout.tsx
      ui/                      # shared buttons, inputs, tables, modals
    features/
      loans/
        LoanList.tsx, LoanDetail.tsx, LoanForm.tsx
        PendingApprovals.tsx    # approval queue for users with loans.approve
        MyRequests.tsx          # requester's own submissions and status
      clients/
        ClientList.tsx, ClientDetail.tsx
      roles/
        RoleList.tsx, RoleForm.tsx
      settings/
        Settings.tsx
      activity-log/
        ActivityLog.tsx
      reports/
        LoanStatement.tsx
      dashboard/
        Dashboard.tsx, AnalyticsLineChart.tsx
      auth/
        Login.tsx
    hooks/
      usePermission.ts
    context/
      AuthContext.tsx
    styles/
      tokens.css               # neutral base palette + single accent color
    App.tsx
  package.json
  Dockerfile
```
**7.2 Navigation Specification**  
* Sidebar collapses between icon-and-label and icon-only states; state persisted across sessions.  
* Menu items are filtered by the current user's permission set.  
* Visual design uses a neutral base palette with a single accent color for active states; no decorative color variety, no emoji, plain line icons throughout.  
**7.3 Localization Specification**  
* react-i18next with English and Khmer locale files; all UI strings resolved through translation keys.  
* Locale preference is persisted per user and applied without a page reload.  
**7.4 Dashboard Analytics Specification**  
* A single reusable line chart component, parameterized by metric and granularity (week/month/year).  
* Currency display toggle applies the tenant's stored exchange rate.  
**7.5 Notifications & Approval Specification**  
* A topbar indicator displays unread notification count, polling on a fixed interval (upgradeable to a push-based channel if required later).  
* Loans requiring approval appear in the approver's notification feed and dedicated approval queue; rejection requires a recorded comment.  
* Requesters are notified of the outcome and can track status via a dedicated view.  
  
**8. Infrastructure & Deployment**  
```
docker-compose.yml
  services:
    db:        postgres:16, persistent volume, environment-configured credentials
    backend:   FastAPI application, depends on db, served via uvicorn
    frontend:  React application, Vite dev server (or compiled static build in production)
```
The backend addresses the database via the Docker network hostname; direct localhost references are not used between containers.  
  
**9. Implementation Roadmap**  

| Phase | Deliverable |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| 1 | Docker, PostgreSQL, and FastAPI skeleton with a health-check endpoint |
| 2 | Authentication and permissions: tenant/user models, permission catalog, roles, JWT, tenant-scoping dependency |
| 3 | Clients: CRUD, name-change history, duplicate detection, soft delete |
| 4 | Products: CRUD, dual-currency pricing, soft delete |
| 5 | Loans and approval workflow: creation, flexible interest/currency/grace period, approval routing |
| 6 | Payments and installments |
| 7 | Loan lifecycle: prepayment, restructuring, write-off, automated overdue detection |
| 8 | Activity log and audit log, wired into all prior modules |
| 9 | Notifications: approval alerts and installment reminders |
| 10 | React application shell: layout, sidebar, localization, routing |
| 11 | Feature screens for all modules, with pagination from initial implementation |
| 12 | Dashboard analytics |
| 13 | Reporting: PDF loan statements and receipts |
| 14 | Operational hardening: automated backups, test coverage for financial and access-control logic |
  
**10. Design Decisions Summary**  
* **Localization:** Khmer and English, persisted per user.  
* **Currency:** USD and KHR on all monetary fields, with historical rate snapshots preserved.  
* **Access Control:** modular, permission-based, tenant-defined roles.  
* **Core Modules:** Roles & Permissions, Activity Log, Settings, Dashboard Analytics, Notifications, Reports, and Loan Approval Workflow are treated as first-class components of the initial build.  
* **Data Integrity:** soft deletion on financial entities, append-only audit trails, duplicate-client detection, pagination on all list endpoints.  
* **Loan Lifecycle:** overdue detection, late fees, prepayment, restructuring, and write-off are modeled as explicit, auditable events.  
* **Approval Workflow:** loans submitted by staff without loans.approve require sign-off from a manager or owner before activation.  
  
**11. Open Items Requiring a Decision**  
* **Interest calculation method:** flat rate, reducing balance, or both (selectable per loan). This determines the installment-schedule calculation and should be resolved before Phase 5.  
  
**12. Glossary**  

| Term | Definition |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Tenant | An enterprise customer of the platform; data is isolated per tenant. |
| Principal | The original amount financed, before interest. |
| Reducing Balance | An interest method where interest is calculated on the outstanding balance, which decreases over time. |
| Flat Rate | An interest method where interest is calculated on the full original principal for the entire loan term. |
| Grace Period | The number of days after a due date before an installment is marked overdue. |
| Write-off | The formal recognition that a loan will not be recovered. |
| RLS | Row-Level Security, a PostgreSQL feature restricting which rows a query can access |
  
