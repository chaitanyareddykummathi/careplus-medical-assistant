from sqlalchemy.orm import Session

from app.models.symptom_log import SymptomLog


class SymptomLogRepository:
    def create_log(self, db: Session, payload: dict[str, object]) -> SymptomLog:
        log_entry = SymptomLog(**payload)
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry


symptom_log_repository = SymptomLogRepository()
