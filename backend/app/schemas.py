from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ------------- Auth ----------------
class LoginInput(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(_Base):
    id: int
    email: str
    full_name: str


# ------------- Levels --------------
class LevelIn(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    sort_order: Optional[int] = 0


class LevelOut(_Base):
    id: int
    name: str
    color: str
    sort_order: int


# ------------- Subjects ------------
class SubjectIn(BaseModel):
    name: str
    color: Optional[str] = "#0ea5e9"
    icon: Optional[str] = "book"


class SubjectOut(_Base):
    id: int
    name: str
    color: str
    icon: str


# ------------- Classes -------------
class ClassIn(BaseModel):
    name: str
    level_id: int
    school_year: Optional[str] = "2025-2026"
    student_count: Optional[int] = 0
    notes: Optional[str] = ""


class ClassOut(_Base):
    id: int
    name: str
    level_id: int
    school_year: str
    student_count: int
    notes: str
    level: Optional[LevelOut] = None


# ------------- Files ---------------
class FileMetaIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = ""
    kind: Optional[str] = "cours"
    level_id: Optional[int] = None
    subject_id: Optional[int] = None
    tags: Optional[str] = ""


class FileOut(_Base):
    id: int
    title: str
    description: str
    kind: str
    level_id: Optional[int]
    subject_id: Optional[int]
    tags: str
    original_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None


# ------------- Exercises -----------
class ExerciseIn(BaseModel):
    title: str
    statement: Optional[str] = ""
    solution: Optional[str] = ""
    difficulty: Optional[str] = "moyen"
    level_id: Optional[int] = None
    subject_id: Optional[int] = None
    tags: Optional[str] = ""
    file_id: Optional[int] = None


class ExerciseOut(_Base):
    id: int
    title: str
    statement: str
    solution: str
    difficulty: str
    level_id: Optional[int]
    subject_id: Optional[int]
    tags: str
    file_id: Optional[int]
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None
    file: Optional[FileOut] = None


# ------------- Schedule ------------
class ScheduleEventIn(BaseModel):
    title: str
    description: Optional[str] = ""
    event_type: Optional[str] = "cours"
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    room: Optional[str] = ""
    color: Optional[str] = "#6366f1"


class ScheduleEventOut(_Base):
    id: int
    title: str
    description: str
    event_type: str
    class_id: Optional[int]
    subject_id: Optional[int]
    start_time: datetime
    end_time: datetime
    room: str
    color: str
    school_class: Optional[ClassOut] = None
    subject: Optional[SubjectOut] = None


# ------------- Grades --------------
class GradeIn(BaseModel):
    class_id: int
    subject_id: Optional[int] = None
    student_name: str
    assessment_title: Optional[str] = "Évaluation"
    score: float
    max_score: Optional[float] = 20
    date: Optional[datetime] = None
    notes: Optional[str] = ""


class GradeOut(_Base):
    id: int
    class_id: int
    subject_id: Optional[int]
    student_name: str
    assessment_title: str
    score: float
    max_score: float
    date: datetime
    notes: str
    school_class: Optional[ClassOut] = None
    subject: Optional[SubjectOut] = None


# ------------- Todos ---------------
class TodoIn(BaseModel):
    title: str
    done: Optional[bool] = False
    due_date: Optional[datetime] = None
    priority: Optional[str] = "normal"


class TodoOut(_Base):
    id: int
    title: str
    done: bool
    due_date: Optional[datetime]
    priority: str
    created_at: datetime


# ------------- Dashboard -----------
class DashboardStats(BaseModel):
    files_count: int
    exercises_count: int
    classes_count: int
    upcoming_events: int
    storage_used_mb: float
    files_by_kind: dict
    files_by_level: list
    next_events: List[ScheduleEventOut]
    pending_todos: int


TokenOut.model_rebuild()
