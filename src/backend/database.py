from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# Choose database based on mode
DATABASE_MODE = os.getenv('DATABASE_MODE', 'local')

if DATABASE_MODE == 'rds':
    URL_DATABASE = os.getenv('RDS_DATABASE_URL')
    print(f"Using AWS RDS database")
else:
    URL_DATABASE = os.getenv('DATABASE_URL', 'postgresql://dev:dev@db:5432/mydb')
    print(f"Using local PostgreSQL database")

print(f"Connecting to: {URL_DATABASE.split('@')[1] if '@' in URL_DATABASE else 'unknown'}")

engine = create_engine(URL_DATABASE)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()