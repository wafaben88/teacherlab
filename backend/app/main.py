from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import (
    assignments_routes,
    attendance_routes,
    auth_routes,
    classes_routes,
    competencies_routes,
    dashboard_routes,
    exercises_routes,
    exports_routes,
    files_routes,
    grades_routes,
    levels_routes,
    schedule_routes,
    search_routes,
    students_routes,
    subjects_routes,
    todos_routes,
)
from .seed import init_database

app = FastAPI(title="Teacher Hub API", version="0.1.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
def _startup():
    init_database()


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


app.include_router(auth_routes.router)
app.include_router(levels_routes.router)
app.include_router(subjects_routes.router)
app.include_router(classes_routes.router)
app.include_router(files_routes.router)
app.include_router(files_routes.download_router)
app.include_router(exercises_routes.router)
app.include_router(schedule_routes.router)
app.include_router(grades_routes.router)
app.include_router(todos_routes.router)
app.include_router(dashboard_routes.router)
app.include_router(search_routes.router)
app.include_router(students_routes.router)
app.include_router(attendance_routes.router)
app.include_router(assignments_routes.router)
app.include_router(competencies_routes.router)
app.include_router(exports_routes.router)
