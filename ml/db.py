"""
Postgres-backed patient store — implements dbMigration.md. Only active when
PATIENT_STORE=postgres (see app.py); the in-memory InMemoryPatientStore in
patient_store.py remains the default and the required fallback if Postgres
is unreachable at startup.

Importable two ways: as `db` (bare — when ml/ is the process's script
directory, e.g. app.py's own import, or `uvicorn app:app` run from inside
ml/) and as `ml.db` (from the project root, per the seeding command in
dbMigration.md). The sys.path insertion below mirrors rag_routes.py's
existing cross-boundary import pattern so `from patient_store import
PATIENTS` resolves either way.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import ForeignKey, String, create_engine, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

_ML_DIR = Path(__file__).resolve().parent
if str(_ML_DIR) not in sys.path:
    sys.path.insert(0, str(_ML_DIR))

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


class PatientRow(Base):
    """Mirrors patient_store.PATIENTS' keys. The current in-memory shape has
    no patient-level fields beyond the id itself, so that's all this table
    has — see dbMigration.md STEP 0 (mirror the real shape, don't invent
    one)."""

    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    assessments: Mapped[list["AssessmentRow"]] = relationship(
        back_populates="patient", order_by="AssessmentRow.seq", cascade="all, delete-orphan"
    )


class AssessmentRow(Base):
    """Mirrors patient_store.Assessment exactly: patient_id, assessment_id,
    assessment_time, features. `features` is dict[str, Any] in the TypedDict
    (disease-agnostic, per schemas.py's own convention) so it maps to JSONB
    rather than individual columns per clinical field.

    `seq` is the one addition beyond Assessment's fields: SQL rows have no
    inherent order, but app.py's trajectory scoring depends on "oldest-first"
    (patient_store.py's own docstring), so something has to pin insertion
    order explicitly rather than relying on assessment_time string sort."""

    __tablename__ = "assessments"

    assessment_id: Mapped[str] = mapped_column(String, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"), nullable=False)
    assessment_time: Mapped[str] = mapped_column(String, nullable=False)
    features: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    seq: Mapped[int] = mapped_column(nullable=False)

    patient: Mapped["PatientRow"] = relationship(back_populates="assessments")

    def to_assessment(self) -> dict[str, Any]:
        """Same shape as patient_store.Assessment (a TypedDict — a plain
        dict with these four keys satisfies it structurally)."""
        return {
            "patient_id": self.patient_id,
            "assessment_id": self.assessment_id,
            "assessment_time": self.assessment_time,
            "features": self.features,
        }


class PostgresPatientStore:
    """Same interface as InMemoryPatientStore (patient_store.py) — app.py
    uses either as a drop-in via the PATIENT_STORE env var."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def list_patient_ids(self) -> list[str]:
        with self._session_factory() as session:
            return sorted(session.scalars(select(PatientRow.id)).all())

    def get_assessments(self, patient_id: str) -> list[dict[str, Any]] | None:
        with self._session_factory() as session:
            patient = session.get(PatientRow, patient_id)
            if patient is None:
                return None
            return [a.to_assessment() for a in patient.assessments]


def _make_engine(database_url: str, connect_timeout: int | None = None):
    connect_args = {"connect_timeout": connect_timeout} if connect_timeout is not None else {}
    return create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)


def make_session_factory(database_url: str, connect_timeout: int | None = None) -> sessionmaker[Session]:
    return sessionmaker(bind=_make_engine(database_url, connect_timeout), expire_on_commit=False)


def init_db(database_url: str | None = None) -> None:
    """Idempotent: creates tables if absent, inserts demo-1/demo-2 from
    patient_store.PATIENTS (the exact existing seeded data, not a
    hand-copied duplicate) if not already present. Safe to call twice."""
    from patient_store import PATIENTS  # bare import; see module docstring

    url = database_url or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")

    engine = _make_engine(url)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        for patient_id, assessments in PATIENTS.items():
            if session.get(PatientRow, patient_id) is not None:
                continue  # already seeded — idempotent, no duplicate rows
            session.add(PatientRow(id=patient_id))
            for seq, assessment in enumerate(assessments):
                session.add(
                    AssessmentRow(
                        assessment_id=assessment["assessment_id"],
                        patient_id=patient_id,
                        assessment_time=assessment["assessment_time"],
                        features=assessment["features"],
                        seq=seq,
                    )
                )
        session.commit()


def try_create_postgres_store() -> PostgresPatientStore | None:
    """Attempts to connect to and verify Postgres is reachable. Returns None
    (never raises, and never blocks startup for long) on any failure so
    app.py can fall back to the in-memory store instead of crashing — or
    hanging — at startup. `localhost` can resolve to ::1 before 127.0.0.1 on
    Windows; if nothing answers on that address (e.g. a stopped Docker
    container's port mapping) libpq's default connect has no timeout and
    can stall for a long time, so the reachability probe uses a short one."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        logger.warning("PATIENT_STORE=postgres but DATABASE_URL is not set — falling back to in-memory store.")
        return None
    try:
        session_factory = make_session_factory(url, connect_timeout=3)
        with session_factory() as session:
            session.execute(select(1))
        return PostgresPatientStore(session_factory)
    except Exception as exc:  # any connection/driver failure
        logger.warning("Could not connect to Postgres (%s) — falling back to in-memory store.", exc)
        return None
