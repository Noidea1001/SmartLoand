"""Import every model so Base.metadata is fully populated for create_all()
and for Alembic's autogenerate to see the whole schema."""

from app.models.tenant import Tenant, TenantSettings, ExchangeRateHistory  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.permission import Permission, Role, RolePermission, UserRole  # noqa: F401
from app.models.client import Client, ClientNameHistory  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.loan import Loan, LoanApproval, LoanEvent  # noqa: F401
from app.models.installment import Installment  # noqa: F401
from app.models.payment import Payment  # noqa: F401
from app.models.notification import Notification, NotificationSchedule  # noqa: F401
from app.models.logs import ActivityLog, AuditLog  # noqa: F401
