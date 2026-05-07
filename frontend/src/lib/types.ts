export interface User {
  id: number;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
  avatar_color?: string;
  bio?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  kind: string; // info | success | warning | alert
  link: string;
  read: boolean;
  created_at: string;
}

export interface Level {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface SchoolClass {
  id: number;
  name: string;
  level_id: number;
  school_year: string;
  student_count: number;
  notes: string;
  level?: Level | null;
}

export interface FileItem {
  id: number;
  title: string;
  description: string;
  kind: string;
  level_id: number | null;
  subject_id: number | null;
  tags: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  level?: Level | null;
  subject?: Subject | null;
}

export interface Exercise {
  id: number;
  title: string;
  statement: string;
  solution: string;
  difficulty: string;
  level_id: number | null;
  subject_id: number | null;
  tags: string;
  file_id: number | null;
  created_at: string;
  level?: Level | null;
  subject?: Subject | null;
  file?: FileItem | null;
}

export interface ScheduleEvent {
  id: number;
  title: string;
  description: string;
  event_type: string;
  class_id: number | null;
  subject_id: number | null;
  start_time: string;
  end_time: string;
  room: string;
  color: string;
  recurrence_weeks: number;
  reminder_minutes: number;
  school_class?: SchoolClass | null;
  subject?: Subject | null;
}

export interface Grade {
  id: number;
  class_id: number;
  subject_id: number | null;
  student_name: string;
  assessment_title: string;
  score: number;
  max_score: number;
  date: string;
  notes: string;
  school_class?: SchoolClass | null;
  subject?: Subject | null;
}

export interface TodoTask {
  id: number;
  title: string;
  done: boolean;
  due_date: string | null;
  priority: string;
  created_at: string;
}

export interface Student {
  id: number;
  class_id: number;
  first_name: string;
  last_name: string;
  email: string;
  parent_email: string;
  notes: string;
  created_at: string;
}

export type AttendanceStatus = "present" | "absent" | "retard" | "justifie";

export interface Attendance {
  id: number;
  class_id: number;
  student_id: number;
  event_id: number | null;
  date: string;
  status: AttendanceStatus;
  notes: string;
  student?: Student | null;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  class_id: number;
  subject_id: number | null;
  due_date: string | null;
  file_id: number | null;
  max_score: number;
  created_at: string;
  subject?: Subject | null;
}

export type SubmissionStatus =
  | "pending"
  | "submitted"
  | "late"
  | "missing"
  | "graded";

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  status: SubmissionStatus;
  submitted_at: string | null;
  score: number | null;
  feedback: string;
  student?: Student | null;
}

export interface Competency {
  id: number;
  code: string;
  name: string;
  description: string;
  level_id: number | null;
  subject_id: number | null;
  color: string;
  created_at: string;
  level?: Level | null;
  subject?: Subject | null;
}

export type CompetencyRating = "acquis" | "en_cours" | "non_acquis";

export interface CompetencyAssessment {
  id: number;
  student_id: number;
  competency_id: number;
  rating: CompetencyRating;
  date: string;
  notes: string;
  competency?: Competency | null;
}

export interface QuizChoice {
  id: number;
  position: number;
  text: string;
  is_correct: boolean;
}

export type QuizQuestionKind = "single" | "multiple" | "text";

export interface QuizQuestion {
  id: number;
  position: number;
  kind: QuizQuestionKind;
  prompt: string;
  code_snippet: string;
  explanation: string;
  points: number;
  expected_text: string;
  choices: QuizChoice[];
}

export interface Quiz {
  id: number;
  title: string;
  description: string;
  level_id: number | null;
  subject_id: number | null;
  time_limit_min: number;
  shuffle: boolean;
  is_published: boolean;
  created_at: string;
  level?: Level | null;
  subject?: Subject | null;
  questions: QuizQuestion[];
}

export interface QuizSubmitAnswer {
  question_id: number;
  choice_ids: number[];
  text?: string;
}

export interface QuizAttemptResult {
  id: number;
  quiz_id: number;
  student_id: number | null;
  student_label: string;
  score: number;
  max_score: number;
  started_at: string;
  finished_at: string | null;
  detail: {
    questions: Array<{
      id: number;
      kind: string;
      ok: boolean;
      points: number;
      chosen?: number[];
      correct?: number[];
      user?: string;
      expected?: string;
    }>;
  };
}

export interface Resource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  level_id: number | null;
  subject_id: number | null;
  tags: string;
  favorite: boolean;
  created_at: string;
  level?: Level | null;
  subject?: Subject | null;
}

export interface DashboardStats {
  files_count: number;
  exercises_count: number;
  classes_count: number;
  upcoming_events: number;
  storage_used_mb: number;
  files_by_kind: Record<string, number>;
  files_by_level: { id: number; name: string; color: string; count: number }[];
  next_events: ScheduleEvent[];
  pending_todos: number;
}
