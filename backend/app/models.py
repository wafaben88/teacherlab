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
    role = Column(String, default="teacher")  # teacher, admin
    is_active = Column(Boolean, default=True)
    avatar_color = Column(String, default="#6366f1")
    bio = Column(Text, default="")
    reset_token = Column(String, default="")
    reset_token_expires = Column(DateTime, nullable=True)
    twofa_secret = Column(String, default="")
    twofa_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, default="")
    kind = Column(String, default="info")  # info, success, warning, alert
    link = Column(String, default="")
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)  # login, logout, create, update, delete
    entity = Column(String, default="")  # file, exercise, etc.
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, default="")
    ip = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


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


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, default="")
    parent_email = Column(String, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    school_class = relationship("SchoolClass")


class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("schedule_events.id", ondelete="SET NULL"), nullable=True)
    date = Column(DateTime, nullable=False, index=True)
    status = Column(String, default="present")  # present, absent, retard, justifie
    notes = Column(String, default="")

    student = relationship("Student")
    school_class = relationship("SchoolClass")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime, nullable=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    max_score = Column(Float, default=20)
    created_at = Column(DateTime, default=datetime.utcnow)

    school_class = relationship("SchoolClass")
    subject = relationship("Subject")
    file = relationship("FileItem")


class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending")  # pending, submitted, late, missing, graded
    submitted_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, default="")

    assignment = relationship("Assignment")
    student = relationship("Student")


class Competency(Base):
    __tablename__ = "competencies"
    id = Column(Integer, primary_key=True)
    code = Column(String, default="")
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    color = Column(String, default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)

    level = relationship("Level")
    subject = relationship("Subject")


class CompetencyAssessment(Base):
    __tablename__ = "competency_assessments"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False)
    rating = Column(String, default="en_cours")  # acquis, en_cours, non_acquis
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, default="")

    student = relationship("Student")
    competency = relationship("Competency")


class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, default="")
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    time_limit_min = Column(Integer, default=0)  # 0 = unlimited
    shuffle = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    level = relationship("Level")
    subject = relationship("Subject")
    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.position",
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0)
    kind = Column(String, default="single")  # single, multiple, text
    prompt = Column(Text, nullable=False)
    code_snippet = Column(Text, default="")
    explanation = Column(Text, default="")
    points = Column(Float, default=1.0)
    expected_text = Column(Text, default="")  # used when kind = text

    quiz = relationship("Quiz", back_populates="questions")
    choices = relationship(
        "QuizChoice",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuizChoice.position",
    )


class QuizChoice(Base):
    __tablename__ = "quiz_choices"
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)

    question = relationship("QuizQuestion", back_populates="choices")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    student_label = Column(String, default="")
    score = Column(Float, default=0)
    max_score = Column(Float, default=0)
    answers_json = Column(Text, default="{}")
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)


class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    description = Column(Text, default="")
    category = Column(String, default="autre")  # cours, exercice, video, doc, outil, autre
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    tags = Column(String, default="")
    favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    level = relationship("Level")
    subject = relationship("Subject")
