"""Seed initial data on first run."""
from sqlalchemy.orm import Session

from . import config
from .auth import hash_password
from .database import SessionLocal, engine, Base
from .models import Level, Subject, User


def init_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Default user
        if not db.query(User).first():
            user = User(
                email=config.DEFAULT_USER_EMAIL.lower(),
                password_hash=hash_password(config.DEFAULT_USER_PASSWORD),
                full_name=config.DEFAULT_USER_NAME,
            )
            db.add(user)

        # Default levels (Tunisian secondary curriculum)
        if not db.query(Level).first():
            default_levels = [
                ("7ème", "#0ea5e9", 1),
                ("8ème", "#10b981", 2),
                ("9ème", "#f59e0b", 3),
                ("1ère année secondaire", "#a855f7", 4),
                ("2ème année (Sciences)", "#ec4899", 5),
                ("3ème année (Sciences Info)", "#8b5cf6", 6),
                ("Bac Informatique", "#ef4444", 7),
            ]
            for name, color, order in default_levels:
                db.add(Level(name=name, color=color, sort_order=order))

        # Default subjects
        if not db.query(Subject).first():
            default_subjects = [
                ("Algorithmique", "#6366f1", "code"),
                ("Programmation Python", "#0ea5e9", "code-2"),
                ("Bases de données", "#10b981", "database"),
                ("Réseaux", "#f59e0b", "network"),
                ("Systèmes", "#ef4444", "cpu"),
                ("Web", "#a855f7", "globe"),
                ("Bureautique", "#ec4899", "file-text"),
            ]
            for name, color, icon in default_subjects:
                db.add(Subject(name=name, color=color, icon=icon))

        db.commit()
    finally:
        db.close()
