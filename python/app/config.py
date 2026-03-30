import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PORT: int = 8000
    GROQ_API_KEY: str = ""
    MAX_FILE_SIZE_MB: int = 500
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
