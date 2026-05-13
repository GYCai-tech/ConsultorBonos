from dotenv import load_dotenv
import sqlalchemy
import os

load_dotenv(override=True)

_engine = None


def get_sqlserver_engine():
    global _engine
    if _engine is None:
        host = os.getenv("SQLSERVER_HOST")
        db   = os.getenv("SQLSERVER_DB")
        user = os.getenv("SQLSERVER_USER")
        pwd  = os.getenv("SQLSERVER_PASS")
        url  = (
            f"mssql+pyodbc://{user}:{pwd}@{host}/{db}"
            "?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        _engine = sqlalchemy.create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=1)
    return _engine
