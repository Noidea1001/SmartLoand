"""Importing this module (rather than app.db.session directly) guarantees
every model has been imported and registered on Base.metadata — required
before calling Base.metadata.create_all() or running Alembic autogenerate.
"""

from app.db.session import Base  # noqa: F401
import app.models  # noqa: F401,E402
