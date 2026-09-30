import uuid
from datetime import datetime, UTC
import bcrypt
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

# Import Engine និង Models ទាំងអស់ដែលពាក់ព័ន្ធ
from app.db.session import engine 
from app.models.user import User  
from app.models.tenant import Tenant, TenantSettings
from app.models.permission import Permission, Role, RolePermission, UserRole # បន្ថែម Models គ្រប់គ្រងសិទ្ធិ
from app.services.permission_catalog import PERMISSION_CATALOG

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password_fixed(password: str) -> str:
    salt = bcrypt.gensalt(prefix=b"2b")
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def setup_superadmin():
    session = SessionLocal()
    try:
        print("កំពុងចាប់ផ្ដើមបង្កើត ឬធ្វើបច្ចុប្បន្នភាព Superadmin ជាមួយសិទ្ធិពេញលេញ...")

        # ១. ពិនិត្យមើល និងទាញយក ឬបង្កើត Tenant ថ្មី
        existing_tenant = session.query(Tenant).first()
        
        if existing_tenant:
            default_tenant_id = existing_tenant.id
            print(f"បានរកឃើញ Tenant ដែលមានស្រាប់ ID: {default_tenant_id}")
        else:
            default_tenant_id = uuid.uuid4()
            print(f"មិនទាន់មាន Tenant ទេ! កំពុងបង្កើត Default Tenant ថ្មី...")
            
            existing_tenant = Tenant(
                id=default_tenant_id, name="Default Tenant", slug="default-tenant",
                default_locale="en", is_active=True, created_at=datetime.now(UTC)
            )
            session.add(existing_tenant)
            
            new_settings = TenantSettings(
                id=uuid.uuid4(), tenant_id=default_tenant_id, base_currency="USD",
                usd_to_khr_rate=4100.0, rate_updated_at=datetime.now(UTC),
                default_interest_type="flat", grace_period_days=3, late_fee_percent=2.0,
                locale="en", updated_at=datetime.now(UTC)
            )
            session.add(new_settings)
            session.commit()

        # ២. ធានាថាមានកាតាឡុកសិទ្ធិ (Permission Catalog) នៅក្នុង Database
        existing_codes = {p.code for p in session.execute(select(Permission)).scalars().all()}
        for perm in PERMISSION_CATALOG:
            if perm["code"] not in existing_codes:
                session.add(Permission(**perm))
        session.flush()

        # ៣. ពិនិត្យមើល ឬបង្កើតតួនាទី "Owner" សម្រាប់ Tenant នេះ
        owner_role = session.query(Role).filter(Role.tenant_id == default_tenant_id, Role.name == "Owner").first()
        if not owner_role:
            print("កំពុងបង្កើតតួនាទី 'Owner' លំនាំដើម...")
            owner_role = Role(tenant_id=default_tenant_id, name="Owner", is_system_default=True)
            session.add(owner_role)
            session.flush()

        # ៤. ផ្ដល់សិទ្ធិទាំងអស់ទៅឱ្យតួនាទី Owner
        all_permissions = session.execute(select(Permission)).scalars().all()
        existing_role_perms = {rp.permission_id for rp in session.query(RolePermission).filter(RolePermission.role_id == owner_role.id).all()}
        
        for perm in all_permissions:
            if perm.id not in existing_role_perms:
                session.add(RolePermission(role_id=owner_role.id, permission_id=perm.id))
        session.flush()

        # ៥. កំណត់ព័ត៌មាន Superadmin
        admin_email = "superadmin@smartloan.com"
        raw_password = "admin123"
        
        superadmin = session.query(User).filter(User.email == admin_email).first()
        if superadmin:
            print(f"កំពុងធ្វើបច្ចុប្បន្នភាពកូដសម្ងាត់សម្រាប់ {admin_email}...")
            superadmin.password_hash = hash_password_fixed(raw_password)
        else:
            print("កំពុងបង្កើតគណនី Superadmin ថ្មី...")
            superadmin = User(
                id=uuid.uuid4(), tenant_id=default_tenant_id, name="Super Administrator",
                email=admin_email, password_hash=hash_password_fixed(raw_password),
                manager_id=None, is_active=True, created_at=datetime.now(UTC)
            )
            session.add(superadmin)
            session.flush()

        # ៦. ភ្ជាប់គណនី Superadmin ទៅកាន់តួនាទី Owner
        existing_user_role = session.query(UserRole).filter(UserRole.user_id == superadmin.id, UserRole.role_id == owner_role.id).first()
        if not existing_user_role:
            print("កំពុងភ្ជាប់សិទ្ធិ Owner ទៅកាន់គណនី Superadmin...")
            session.add(UserRole(user_id=superadmin.id, role_id=owner_role.id))

        # ៧. រក្សាទុកទិន្នន័យទាំងអស់ចូល Database
        session.commit()
        
        print("\n=== រៀបចំ Superadmin និងសិទ្ធិពេញលេញជោគជ័យ! ===")
        print(f"Email: {admin_email}")
        print("សូមសាកល្បង Log out រួច Login ម្ដងទៀតនៅលើ UI ដើម្បីទាញយកសិទ្ធិថ្មី។")
        print("===================================\n")

    except Exception as e:
        session.rollback()
        print(f"មានកំហុសក្នុងការបង្កើត៖ {e}")
    finally:
        session.close()

if __name__ == "__main__":
    setup_superadmin()
