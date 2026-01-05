from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from .database import Base
from sqlalchemy import DateTime

class Photos(Base):
    __tablename__ = 'photos'

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, index=True)
    upload_time = Column(DateTime, index=True)
    tags = Column(String, index=True)
    alt_text = Column(String, index=True)
