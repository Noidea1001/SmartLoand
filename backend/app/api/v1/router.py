from fastapi import APIRouter

from app.api.v1 import (
    activity_log, auth, clients, dashboard, loans, notifications,
    payments, products, reports, roles, settings,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(products.router)
api_router.include_router(loans.router)
api_router.include_router(payments.router)
api_router.include_router(roles.router)
api_router.include_router(settings.router)
api_router.include_router(activity_log.router)
api_router.include_router(notifications.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)
