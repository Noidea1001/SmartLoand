"""Seeds a realistic demo tenant: roles for every stage of the approval
hierarchy, one user per role, a product catalog, clients, and loans in
every lifecycle status (pending approval, active, overdue, closed).

Idempotent: safe to re-run — it skips creation if the demo tenant already
exists, so `docker compose up` restarts won't duplicate data.

Usage:
    docker compose exec backend python -m app.db.seed_data
"""

import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.client import Client
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.payment import Payment
from app.models.permission import Permission, Role, RolePermission, UserRole
from app.models.product import Product
from app.models.tenant import Tenant, TenantSettings
from app.models.user import User
from app.services import loan_approval
from app.services.loan_calculator import generate_schedule
from app.services.permission_catalog import PERMISSION_CATALOG

DEMO_SLUG = "example-motors"

# Role -> permission codes. Deliberately layered so the approval workflow
# has someone who can request (Loan Officer / Cashier) and someone who
# must approve (Owner / Branch Manager) — that gap is the whole point of
# the demo data.
ROLE_DEFINITIONS = {
    "Owner": None,  # None = every permission in the catalog
    "Branch Manager": [
        "loans.view", "loans.approve", "loans.lifecycle", "loans.edit_rate",
        "clients.view", "clients.create", "clients.edit", "clients.delete",
        "products.view", "products.manage",
        "payments.record",
        "activity_log.view", "reports.view", "dashboard.view",
    ],
    "Loan Officer": [
        "loans.view", "loans.create",
        "clients.view", "clients.create", "clients.edit",
        "products.view",
        "payments.record",
        "dashboard.view",
    ],
    "Cashier": [
        "loans.view",
        "clients.view",
        "payments.record",
        "dashboard.view",
    ],
}

DEMO_USERS = [
    # (name, email, password, role_name, manager_email)
    ("Sokha Owner", "owner@example.com", "Owner123!", "Owner", None),
    ("Dara Manager", "manager@example.com", "Manager123!", "Branch Manager", None),
    ("Ratana Officer", "officer@example.com", "Officer123!", "Loan Officer", "manager@example.com"),
    ("Sreymom Cashier", "cashier@example.com", "Cashier123!", "Cashier", "manager@example.com"),
]

DEMO_PRODUCTS = [
    ("vehicle", "Toyota Camry 2020", Decimal("18000.00"), "USD"),
    ("vehicle", "Honda Dream 125", Decimal("1500.00"), "USD"),
    ("phone", "iPhone 14", Decimal("800.00"), "USD"),
    ("phone", "Samsung Galaxy A54", Decimal("320.00"), "USD"),
]

DEMO_CLIENTS = [
    ("Chan Sopheak", "012345678", "KH0001"),
    ("Ly Sreyneang", "098765432", "KH0002"),
    ("Pich Vibol", "011223344", "KH0003"),
    ("Heng Chanthou", "070112233", "KH0004"),
]


def get_or_create_permissions(db) -> dict[str, Permission]:
    existing = {p.code: p for p in db.execute(select(Permission)).scalars().all()}
    for perm in PERMISSION_CATALOG:
        if perm["code"] not in existing:
            p = Permission(**perm)
            db.add(p)
            db.flush()
            existing[perm["code"]] = p
    return existing


def seed() -> None:
    db = SessionLocal()
    try:
        existing_tenant = db.execute(select(Tenant).where(Tenant.slug == DEMO_SLUG)).scalar_one_or_none()
        if existing_tenant:
            print(f"Demo tenant '{DEMO_SLUG}' already exists — skipping seed (safe to ignore).")
            return

        print("Creating tenant...")
        tenant = Tenant(name="Example Motors", slug=DEMO_SLUG, default_locale="en")
        db.add(tenant)
        db.flush()
        db.add(TenantSettings(tenant_id=tenant.id))

        permissions_by_code = get_or_create_permissions(db)
        all_permissions = list(permissions_by_code.values())

        print("Creating roles...")
        roles_by_name: dict[str, Role] = {}
        for role_name, codes in ROLE_DEFINITIONS.items():
            role = Role(tenant_id=tenant.id, name=role_name, is_system_default=(role_name == "Owner"))
            db.add(role)
            db.flush()
            grant_list = all_permissions if codes is None else [permissions_by_code[c] for c in codes]
            for perm in grant_list:
                db.add(RolePermission(role_id=role.id, permission_id=perm.id))
            roles_by_name[role_name] = role
        db.flush()

        print("Creating users...")
        users_by_email: dict[str, User] = {}
        for name, email, password, role_name, manager_email in DEMO_USERS:
            manager = users_by_email.get(manager_email) if manager_email else None
            user = User(
                tenant_id=tenant.id, name=name, email=email,
                password_hash=hash_password(password),
                manager_id=manager.id if manager else None,
            )
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=roles_by_name[role_name].id))
            users_by_email[email] = user
        db.flush()

        owner = users_by_email["owner@example.com"]
        manager = users_by_email["manager@example.com"]
        officer = users_by_email["officer@example.com"]
        cashier = users_by_email["cashier@example.com"]

        print("Creating products...")
        products = []
        for category, name, price, currency in DEMO_PRODUCTS:
            product = Product(tenant_id=tenant.id, category=category, name=name,
                               price_amount=price, price_currency=currency)
            db.add(product)
            products.append(product)
        db.flush()

        print("Creating clients...")
        clients = []
        for name, phone, national_id in DEMO_CLIENTS:
            client = Client(tenant_id=tenant.id, current_name=name, phone=phone, national_id=national_id)
            db.add(client)
            clients.append(client)
        db.flush()

        def new_loan(client, product, principal, rate, interest_type, term, start_date, requester):
            return Loan(
                tenant_id=tenant.id, client_id=client.id, product_id=product.id,
                principal_amount=principal, principal_currency=product.price_currency,
                interest_rate_percent=rate, interest_type=interest_type, term_months=term,
                start_date=start_date, requested_by_user_id=requester.id, created_by_user_id=requester.id,
            )

        print("Creating loans (pending approval, active, overdue, closed)...")

        # 1. Pending approval — Loan Officer requests, no loans.approve permission.
        loan_pending = new_loan(clients[0], products[2], Decimal("800.00"), Decimal("2.5"), "flat", 6, date.today(), officer)
        loan_approval.submit_loan(db, loan_pending, requester=officer, can_auto_approve=False)

        # 2. Active, flat rate — created directly by the Manager (auto-approved).
        loan_active_flat = new_loan(clients[1], products[3], Decimal("320.00"), Decimal("3.0"), "flat", 4,
                                     date.today() - timedelta(days=20), manager)
        loan_approval.submit_loan(db, loan_active_flat, requester=manager, can_auto_approve=True)

        # 3. Active, reducing balance — created by the Owner.
        loan_active_reducing = new_loan(clients[2], products[0], Decimal("18000.00"), Decimal("1.8"), "reducing", 24,
                                         date.today() - timedelta(days=10), owner)
        loan_approval.submit_loan(db, loan_active_reducing, requester=owner, can_auto_approve=True)

        # 4. Overdue — backdated far enough that the first installment's
        #    grace period has already elapsed.
        loan_overdue = new_loan(clients[3], products[1], Decimal("1500.00"), Decimal("2.0"), "flat", 10,
                                 date.today() - timedelta(days=95), owner)
        loan_approval.submit_loan(db, loan_overdue, requester=owner, can_auto_approve=True)
        db.flush()
        first_installment = db.execute(
            select(Installment)
            .where(Installment.loan_id == loan_overdue.id)
            .order_by(Installment.installment_number)
        ).scalars().first()
        if first_installment:
            late_fee = (first_installment.amount_due * Decimal("2.0") / 100).quantize(Decimal("0.01"))
            first_installment.late_fee_applied = late_fee
            first_installment.amount_due += late_fee
            first_installment.status = "overdue"
            loan_overdue.status = "overdue"

        # 5. Closed — fully paid off (short 2-month loan, both installments paid).
        loan_closed = new_loan(clients[0], products[3], Decimal("320.00"), Decimal("2.0"), "flat", 2,
                                date.today() - timedelta(days=70), cashier)
        loan_approval.submit_loan(db, loan_closed, requester=cashier, can_auto_approve=False)
        # Cashier can't auto-approve; have the manager approve it in the seed
        # to demonstrate the full request -> approve -> pay -> close cycle.
        from app.models.loan import LoanApproval
        approval = db.execute(
            select(LoanApproval).where(LoanApproval.loan_id == loan_closed.id, LoanApproval.status == "pending")
        ).scalar_one()
        loan_approval.decide_loan(db, loan_closed, approval, approver=manager, approve=True, comments="Approved — regular customer.")
        db.flush()
        closed_installments = db.execute(
            select(Installment).where(Installment.loan_id == loan_closed.id).order_by(Installment.installment_number)
        ).scalars().all()
        for inst in closed_installments:
            db.add(Payment(
                loan_id=loan_closed.id, installment_id=inst.id, amount=inst.amount_due,
                currency=loan_closed.principal_currency, paid_at=datetime.utcnow(),
                method="cash", recorded_by_user_id=cashier.id,
            ))
            inst.amount_paid = inst.amount_due
            inst.status = "paid"
            inst.paid_at = datetime.utcnow()
        loan_closed.status = "closed"

        db.commit()

        print("\nDone. Demo tenant:", DEMO_SLUG)
        print("\nLogin accounts (all on tenant 'example-motors'):")
        for name, email, password, role_name, _ in DEMO_USERS:
            print(f"  {role_name:16s} {email:24s} password: {password}")
        print("\nLoan states created: 1 pending_approval, 2 active, 1 overdue, 1 closed.")
        print("Log in as the Owner or Branch Manager and check Pending Approvals")
        print("to see the loan requested by the Loan Officer.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    try:
        seed()
    except Exception as exc:  # pragma: no cover - operational script
        print(f"Seeding failed: {exc}", file=sys.stderr)
        sys.exit(1)
