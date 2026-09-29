"""The fixed, platform-wide permission catalog. Tenants cannot add to this
list — they can only decide which of these each of their roles grants."""

PERMISSION_CATALOG: list[dict] = [
    {"code": "loans.create", "module": "loans", "description": "Submit a new loan request"},
    {"code": "loans.approve", "module": "loans", "description": "Approve or reject submitted loan requests"},
    {"code": "loans.edit_rate", "module": "loans", "description": "Edit a loan's interest rate after creation"},
    {"code": "loans.view", "module": "loans", "description": "View loans"},
    {"code": "loans.lifecycle", "module": "loans", "description": "Record prepayment, restructuring, or write-off"},
    {"code": "payments.record", "module": "payments", "description": "Record a payment against an installment"},
    {"code": "clients.create", "module": "clients", "description": "Create a client"},
    {"code": "clients.edit", "module": "clients", "description": "Edit a client, including name changes"},
    {"code": "clients.delete", "module": "clients", "description": "Soft-delete a client"},
    {"code": "clients.view", "module": "clients", "description": "View clients"},
    {"code": "products.manage", "module": "products", "description": "Create, edit, or remove products"},
    {"code": "products.view", "module": "products", "description": "View products"},
    {"code": "roles.manage", "module": "users", "description": "Create roles and assign permissions"},
    {"code": "users.manage", "module": "users", "description": "Invite, edit, or deactivate users"},
    {"code": "settings.manage", "module": "settings", "description": "Manage tenant settings"},
    {"code": "activity_log.view", "module": "reports", "description": "View the activity log"},
    {"code": "reports.view", "module": "reports", "description": "View and export reports"},
    {"code": "dashboard.view", "module": "reports", "description": "View dashboard analytics"},
]
