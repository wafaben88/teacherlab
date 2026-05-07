import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
