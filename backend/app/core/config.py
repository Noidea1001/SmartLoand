from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Smart Loan Platform API"
    environment: str = "development"
    # Runtime connection: the restricted `smartloan_app` role (no UPDATE/DELETE
    # on activity_log / audit_log — see the initial Alembic migration).
    database_url: str = "postgresql://smartloan_app:smartloan_app_dev_password@localhost:5432/smartloan"
    # Migration connection: the table-owning role, used only by `alembic upgrade`.
    migration_database_url: str = "postgresql://smartloan:smartloan_dev_password@localhost:5432/smartloan"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
