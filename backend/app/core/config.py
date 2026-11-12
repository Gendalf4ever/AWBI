from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "VR Club BI"
    SECRET_KEY: str = "secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 14 #14 часов чтоб на всю смену было
    DATABASE_URL: str = "sqlite:///./vr_club.db"

settings = Settings()