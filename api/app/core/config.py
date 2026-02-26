from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite:///./bookmarks.db"
    GEMINI_API_KEY: str = ""
    AI_PROVIDER: str = "gemini"
    AI_ENABLED: bool = True


settings = Settings()
