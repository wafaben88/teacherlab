import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FilesPage } from "./pages/FilesPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { ClassesPage } from "./pages/ClassesPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { GradesPage } from "./pages/GradesPage";
import { TodosPage } from "./pages/TodosPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { SandboxPage } from "./pages/SandboxPage";
import { QuizzesPage } from "./pages/QuizzesPage";
import { QuizEditPage } from "./pages/QuizEditPage";
import { QuizTakePage } from "./pages/QuizTakePage";
import { RubricsPage } from "./pages/RubricsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot" element={<ForgotPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:id" element={<ClassDetailPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="todos" element={<TodosPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="sandbox" element={<SandboxPage />} />
        <Route path="quizzes" element={<QuizzesPage />} />
        <Route path="quizzes/new" element={<QuizEditPage />} />
        <Route path="quizzes/:id/edit" element={<QuizEditPage />} />
        <Route path="quizzes/:id/take" element={<QuizTakePage />} />
        <Route path="rubrics" element={<RubricsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
