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
    role: str = "teacher"
    is_active: bool = True
    avatar_color: str = "#6366f1"
    bio: str = ""


class UserIn(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str
    role: Optional[str] = "teacher"
    avatar_color: Optional[str] = "#6366f1"
    bio: Optional[str] = ""
    is_active: Optional[bool] = True


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequestIn(BaseModel):
    email: str


class PasswordResetIn(BaseModel):
    token: str
    new_password: str


class NotificationOut(_Base):
    id: int
    user_id: int
    title: str
    body: str
    kind: str
    link: str
    read: bool
    created_at: datetime


class NotificationIn(BaseModel):
    title: str
    body: Optional[str] = ""
    kind: Optional[str] = "info"
    link: Optional[str] = ""


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
    version: int = 1
    ocr_text: str = ""
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None


class FileVersionOut(_Base):
    id: int
    file_id: int
    version: int
    original_name: str
    mime_type: str
    size_bytes: int
    note: str
    created_at: datetime


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
    recurrence_weeks: Optional[int] = 0
    reminder_minutes: Optional[int] = 0


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
    recurrence_weeks: int = 0
    reminder_minutes: int = 0
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


# ------------- Search --------------
SchoolClassOut = ClassOut


class SearchPayload(BaseModel):
    files: List[FileOut]
    exercises: List[ExerciseOut]
    classes: List[ClassOut]
    schedule: List[ScheduleEventOut]


# ------------- Students ------------
class StudentIn(BaseModel):
    class_id: int
    first_name: str
    last_name: str
    email: Optional[str] = ""
    parent_email: Optional[str] = ""
    notes: Optional[str] = ""


class StudentOut(_Base):
    id: int
    class_id: int
    first_name: str
    last_name: str
    email: str
    parent_email: str
    notes: str
    created_at: datetime


# ------------- Attendance ----------
class AttendanceIn(BaseModel):
    class_id: int
    student_id: int
    event_id: Optional[int] = None
    date: datetime
    status: str = "present"
    notes: Optional[str] = ""


class AttendanceOut(_Base):
    id: int
    class_id: int
    student_id: int
    event_id: Optional[int]
    date: datetime
    status: str
    notes: str
    student: Optional[StudentOut] = None


class AttendanceBulkIn(BaseModel):
    class_id: int
    event_id: Optional[int] = None
    date: datetime
    entries: List["AttendanceEntry"]


class AttendanceEntry(BaseModel):
    student_id: int
    status: str = "present"
    notes: Optional[str] = ""


# ------------- Assignments ---------
class AssignmentIn(BaseModel):
    title: str
    description: Optional[str] = ""
    class_id: int
    subject_id: Optional[int] = None
    due_date: Optional[datetime] = None
    file_id: Optional[int] = None
    max_score: Optional[float] = 20


class AssignmentOut(_Base):
    id: int
    title: str
    description: str
    class_id: int
    subject_id: Optional[int]
    due_date: Optional[datetime]
    file_id: Optional[int]
    max_score: float
    created_at: datetime
    subject: Optional[SubjectOut] = None


class SubmissionIn(BaseModel):
    assignment_id: int
    student_id: int
    status: Optional[str] = "pending"
    submitted_at: Optional[datetime] = None
    score: Optional[float] = None
    feedback: Optional[str] = ""


class SubmissionOut(_Base):
    id: int
    assignment_id: int
    student_id: int
    status: str
    submitted_at: Optional[datetime]
    score: Optional[float]
    feedback: str
    student: Optional[StudentOut] = None


# ------------- Competencies --------
class CompetencyIn(BaseModel):
    code: Optional[str] = ""
    name: str
    description: Optional[str] = ""
    level_id: Optional[int] = None
    subject_id: Optional[int] = None
    color: Optional[str] = "#6366f1"


class CompetencyOut(_Base):
    id: int
    code: str
    name: str
    description: str
    level_id: Optional[int]
    subject_id: Optional[int]
    color: str
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None


class CompetencyAssessmentIn(BaseModel):
    student_id: int
    competency_id: int
    rating: str = "en_cours"
    date: Optional[datetime] = None
    notes: Optional[str] = ""


class CompetencyAssessmentOut(_Base):
    id: int
    student_id: int
    competency_id: int
    rating: str
    date: datetime
    notes: str
    competency: Optional[CompetencyOut] = None


# ------------- Quizzes -------------
class QuizChoiceIn(BaseModel):
    position: Optional[int] = 0
    text: str
    is_correct: Optional[bool] = False


class QuizChoiceOut(_Base):
    id: int
    position: int
    text: str
    is_correct: bool


class QuizQuestionIn(BaseModel):
    position: Optional[int] = 0
    kind: Optional[str] = "single"  # single, multiple, text
    prompt: str
    code_snippet: Optional[str] = ""
    explanation: Optional[str] = ""
    points: Optional[float] = 1.0
    expected_text: Optional[str] = ""
    choices: List[QuizChoiceIn] = []


class QuizQuestionOut(_Base):
    id: int
    position: int
    kind: str
    prompt: str
    code_snippet: str
    explanation: str
    points: float
    expected_text: str
    choices: List[QuizChoiceOut] = []


class QuizIn(BaseModel):
    title: str
    description: Optional[str] = ""
    level_id: Optional[int] = None
    subject_id: Optional[int] = None
    time_limit_min: Optional[int] = 0
    shuffle: Optional[bool] = False
    is_published: Optional[bool] = True
    questions: List[QuizQuestionIn] = []


class QuizOut(_Base):
    id: int
    title: str
    description: str
    level_id: Optional[int]
    subject_id: Optional[int]
    time_limit_min: int
    shuffle: bool
    is_published: bool
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None
    questions: List[QuizQuestionOut] = []


class QuizSubmitAnswer(BaseModel):
    question_id: int
    choice_ids: List[int] = []
    text: Optional[str] = ""


class QuizSubmitIn(BaseModel):
    student_id: Optional[int] = None
    student_label: Optional[str] = ""
    answers: List[QuizSubmitAnswer] = []


class QuizSubmitOut(_Base):
    id: int
    quiz_id: int
    student_id: Optional[int]
    student_label: str
    score: float
    max_score: float
    started_at: datetime
    finished_at: Optional[datetime]
    detail: dict


# ------------- Rubrics -------------
class RubricCriterionIn(BaseModel):
    position: Optional[int] = 0
    name: str
    description: Optional[str] = ""
    weight: Optional[float] = 1.0
    max_score: Optional[float] = 4.0


class RubricCriterionOut(_Base):
    id: int
    position: int
    name: str
    description: str
    weight: float
    max_score: float


class RubricIn(BaseModel):
    title: str
    description: Optional[str] = ""
    subject_id: Optional[int] = None
    level_id: Optional[int] = None
    max_score: Optional[float] = 20
    criteria: List[RubricCriterionIn] = []


class RubricOut(_Base):
    id: int
    title: str
    description: str
    subject_id: Optional[int]
    level_id: Optional[int]
    max_score: float
    created_at: datetime
    subject: Optional[SubjectOut] = None
    level: Optional[LevelOut] = None
    criteria: List[RubricCriterionOut] = []


class RubricEvaluationIn(BaseModel):
    rubric_id: int
    student_id: Optional[int] = None
    student_label: Optional[str] = ""
    class_id: Optional[int] = None
    scores: dict = {}
    notes: Optional[str] = ""
    date: Optional[datetime] = None


class RubricEvaluationOut(_Base):
    id: int
    rubric_id: int
    student_id: Optional[int]
    student_label: str
    class_id: Optional[int]
    scores_json: str
    final_score: float
    notes: str
    date: datetime
    student: Optional[StudentOut] = None
    rubric: Optional[RubricOut] = None


# ------------- Resources -----------
class ResourceIn(BaseModel):
    title: str
    url: str
    description: Optional[str] = ""
    category: Optional[str] = "autre"
    level_id: Optional[int] = None
    subject_id: Optional[int] = None
    tags: Optional[str] = ""
    favorite: Optional[bool] = False


class ResourceOut(_Base):
    id: int
    title: str
    url: str
    description: str
    category: str
    level_id: Optional[int]
    subject_id: Optional[int]
    tags: str
    favorite: bool
    created_at: datetime
    level: Optional[LevelOut] = None
    subject: Optional[SubjectOut] = None


AttendanceBulkIn.model_rebuild()
TokenOut.model_rebuild()
