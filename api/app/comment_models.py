"""Consented testimonials have no link to patient accounts or medical records."""
from datetime import datetime
from sqlalchemy import Boolean,DateTime,ForeignKey,Integer,Text
from sqlalchemy.orm import Mapped,mapped_column
from .database import Base
from .models import utcnow


class Comment(Base):
    __tablename__='public_comments'
    id:Mapped[int]=mapped_column(primary_key=True)
    revision:Mapped[int]=mapped_column(Integer,default=1)
    content_json:Mapped[str]=mapped_column(Text)
    published_json:Mapped[str|None]=mapped_column(Text)
    deleted:Mapped[bool]=mapped_column(Boolean,default=False)
    actor_id:Mapped[int]=mapped_column(ForeignKey('staff_users.id'))
    created_at:Mapped[datetime]=mapped_column(DateTime,default=utcnow)
    updated_at:Mapped[datetime]=mapped_column(DateTime,default=utcnow)
    published_at:Mapped[datetime|None]=mapped_column(DateTime)
    public_updated_at:Mapped[datetime|None]=mapped_column(DateTime)
