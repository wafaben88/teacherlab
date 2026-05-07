import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FilesPage } from "./pages/FilesPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { SchedulePage } from "./pages/SchedulePage";
import { ClassesPage } from "./pages/ClassesPage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { GradesPage } from "./pages/GradesPage";
import { TodosPage } from "./pages/TodosPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
