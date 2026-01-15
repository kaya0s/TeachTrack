
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CAPSTONE"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    # Format: mysql+pymysql://<username>:<password>@<host>:<port>/<db_name>
    SQLALCHEMY_DATABASE_URL: str = "mysql+pymysql://root:kayaos@localhost/capstone_db"

    class Config:
        case_sensitive = True

settings = Settings()
