from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False, default="Enseignant")
    created_at = Column(DateTime, default=datetime.utcnow)


class Level(Base):
    __tablename__ = "levels"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366f1")
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    classes = relationship("SchoolClass", back_populates="level", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String, default="#0ea5e9")
    icon = Column(String, default="book")
    created_at = Column(DateTime, default=datetime.utcnow)


class SchoolClass(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="CASCADE"), nullable=False)
    school_year = Column(String, default="2025-2026")
    student_count = Column(Integer, default=0)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    level = relationship("Level", back_populates="classes")


class FileItem(Base):
    """Generic stored file (PDF, DOCX, image, etc.)."""
    __tablename__ = "files"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    kind = Column(String, default="cours", index=True)
    # cours, exercice, correction, devoir, autre
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    tags = Column(String, default="")  # comma separated
    storage_name = Column(String, nullable=False)  # uuid-prefixed file on disk
    original_name = Column(String, nullable=False)
    mime_type = Column(String, default="application/octet-stream")
    size_bytes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    level = relationship("Level")
    subject = relationship("Subject")


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    statement = Column(Text, default="")  # text content (markdown)
    solution = Column(Text, default="")
    difficulty = Column(String, default="moyen")  # facile, moyen, difficile
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    tags = Column(String, default="")
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    level = relationship("Level")
    subject = relationship("Subject")
    file = relationship("FileItem")


class ScheduleEvent(Base):
    __tablename__ = "schedule_events"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    event_type = Column(String, default="cours")  # cours, examen, reunion, autre
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    room = Column(String, default="")
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)

    school_class = relationship("SchoolClass")
    subject = relationship("Subject")


class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    student_name = Column(String, nullable=False)
    assessment_title = Column(String, default="Évaluation")
    score = Column(Float, nullable=False, default=0)
    max_score = Column(Float, nullable=False, default=20)
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, default="")

    school_class = relationship("SchoolClass")
    subject = relationship("Subject")


class TodoTask(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="normal")  # bas, normal, haut
    created_at = Column(DateTime, default=datetime.utcnow)
