import logging
import re

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import AppException
from app.models.health_profile import UserHealthProfile
from app.models.user import User
from app.repositories.health_profile_repository import health_profile_repository
from app.schemas.health_profile import HealthProfileCreate, HealthProfileUpdate

logger = logging.getLogger(__name__)


class HealthProfileService:
    _bp_pattern = re.compile(r'^\s*(\d{2,3})\s*[/\-]\s*(\d{2,3})\s*$')

    def upsert_profile(
        self,
        db: Session,
        current_user: User,
        payload: HealthProfileCreate,
    ) -> UserHealthProfile:
        logger.info('health_profile.upsert.started', extra={'user_id': current_user.id})
        normalized_bp, systolic, diastolic = self._normalize_blood_pressure(
            blood_pressure=payload.blood_pressure,
            systolic_bp=payload.systolic_bp,
            diastolic_bp=payload.diastolic_bp,
        )
        self._validate_medical_ranges(
            age=payload.age,
            height_cm=payload.height_cm,
            weight_kg=payload.weight_kg,
            heart_rate=payload.heart_rate,
            systolic_bp=systolic,
            diastolic_bp=diastolic,
        )

        bmi = self.calculate_bmi(weight_kg=payload.weight_kg, height_cm=payload.height_cm)
        repository_payload = {
            'age': payload.age,
            'gender': payload.gender,
            'height_cm': payload.height_cm,
            'weight_kg': payload.weight_kg,
            'bmi': bmi,
            'blood_pressure': normalized_bp,
            'systolic_bp': systolic,
            'diastolic_bp': diastolic,
            'heart_rate': payload.heart_rate,
            'existing_conditions': payload.existing_conditions,
        }

        try:
            profile = health_profile_repository.upsert_profile(
                db=db,
                user_id=current_user.id,
                payload=repository_payload,
            )
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception('health_profile.upsert.failed', extra={'user_id': current_user.id})
            raise AppException(
                status_code=500,
                error_code='HEALTH_PROFILE_SAVE_FAILED',
                message='Unable to save health profile at the moment.',
            ) from exc

        logger.info('health_profile.upsert.completed', extra={'user_id': current_user.id})
        return profile

    def get_profile(self, db: Session, current_user: User) -> UserHealthProfile:
        logger.info('health_profile.get.started', extra={'user_id': current_user.id})
        profile = health_profile_repository.get_profile_by_user(db=db, user_id=current_user.id)
        if not profile:
            raise AppException(
                status_code=404,
                error_code='HEALTH_PROFILE_NOT_FOUND',
                message='Health profile was not found for this user.',
            )
        return profile

    def update_profile(
        self,
        db: Session,
        current_user: User,
        payload: HealthProfileUpdate,
    ) -> UserHealthProfile:
        logger.info('health_profile.update.started', extra={'user_id': current_user.id})
        existing = health_profile_repository.get_profile_by_user(db=db, user_id=current_user.id)
        if not existing:
            raise AppException(
                status_code=404,
                error_code='HEALTH_PROFILE_NOT_FOUND',
                message='Health profile does not exist yet. Create one first.',
            )

        merged = {
            'age': payload.age if payload.age is not None else existing.age,
            'gender': payload.gender if payload.gender is not None else existing.gender,
            'height_cm': payload.height_cm if payload.height_cm is not None else existing.height_cm,
            'weight_kg': payload.weight_kg if payload.weight_kg is not None else existing.weight_kg,
            'heart_rate': payload.heart_rate if payload.heart_rate is not None else existing.heart_rate,
            'existing_conditions': (
                payload.existing_conditions
                if payload.existing_conditions is not None
                else existing.existing_conditions
            ),
            'blood_pressure': payload.blood_pressure,
            'systolic_bp': payload.systolic_bp,
            'diastolic_bp': payload.diastolic_bp,
        }

        bp_text_input = (
            payload.blood_pressure
            if payload.blood_pressure is not None
            else (None if payload.systolic_bp is not None or payload.diastolic_bp is not None else existing.blood_pressure)
        )
        normalized_bp, systolic, diastolic = self._normalize_blood_pressure(
            blood_pressure=bp_text_input,
            systolic_bp=merged['systolic_bp'] if merged['systolic_bp'] is not None else existing.systolic_bp,
            diastolic_bp=merged['diastolic_bp'] if merged['diastolic_bp'] is not None else existing.diastolic_bp,
        )
        self._validate_medical_ranges(
            age=int(merged['age']),
            height_cm=float(merged['height_cm']),
            weight_kg=float(merged['weight_kg']),
            heart_rate=int(merged['heart_rate']) if merged['heart_rate'] is not None else None,
            systolic_bp=systolic,
            diastolic_bp=diastolic,
        )

        bmi = self.calculate_bmi(weight_kg=float(merged['weight_kg']), height_cm=float(merged['height_cm']))
        update_payload = {
            'age': int(merged['age']),
            'gender': str(merged['gender']),
            'height_cm': float(merged['height_cm']),
            'weight_kg': float(merged['weight_kg']),
            'bmi': bmi,
            'blood_pressure': normalized_bp,
            'systolic_bp': systolic,
            'diastolic_bp': diastolic,
            'heart_rate': int(merged['heart_rate']) if merged['heart_rate'] is not None else None,
            'existing_conditions': list(merged['existing_conditions'] or []),
        }

        try:
            profile = health_profile_repository.update_profile(db=db, profile=existing, payload=update_payload)
        except SQLAlchemyError as exc:
            db.rollback()
            logger.exception('health_profile.update.failed', extra={'user_id': current_user.id})
            raise AppException(
                status_code=500,
                error_code='HEALTH_PROFILE_UPDATE_FAILED',
                message='Unable to update health profile right now.',
            ) from exc

        logger.info('health_profile.update.completed', extra={'user_id': current_user.id})
        return profile

    @staticmethod
    def calculate_bmi(weight_kg: float, height_cm: float) -> float:
        if height_cm <= 0:
            raise AppException(
                status_code=422,
                error_code='INVALID_HEIGHT',
                message='Height must be greater than zero.',
            )
        height_m = height_cm / 100.0
        bmi = weight_kg / (height_m * height_m)
        return round(bmi, 2)

    def _normalize_blood_pressure(
        self,
        blood_pressure: str | None,
        systolic_bp: int | None,
        diastolic_bp: int | None,
    ) -> tuple[str | None, int | None, int | None]:
        parsed_systolic = systolic_bp
        parsed_diastolic = diastolic_bp

        if blood_pressure:
            match = self._bp_pattern.match(blood_pressure)
            if not match:
                raise AppException(
                    status_code=422,
                    error_code='INVALID_BLOOD_PRESSURE_FORMAT',
                    message="Blood pressure must be provided as 'systolic/diastolic'.",
                )
            parsed_from_text_systolic = int(match.group(1))
            parsed_from_text_diastolic = int(match.group(2))
            if (
                systolic_bp is not None
                and diastolic_bp is not None
                and (
                    systolic_bp != parsed_from_text_systolic
                    or diastolic_bp != parsed_from_text_diastolic
                )
            ):
                raise AppException(
                    status_code=422,
                    error_code='BLOOD_PRESSURE_MISMATCH',
                    message='blood_pressure does not match systolic/diastolic component values.',
                )
            parsed_systolic = parsed_from_text_systolic
            parsed_diastolic = parsed_from_text_diastolic

        if (parsed_systolic is None) != (parsed_diastolic is None):
            raise AppException(
                status_code=422,
                error_code='INCOMPLETE_BLOOD_PRESSURE',
                message='Provide both systolic and diastolic blood pressure values.',
            )

        if parsed_systolic is None or parsed_diastolic is None:
            return None, None, None

        normalized = f'{parsed_systolic}/{parsed_diastolic}'
        return normalized, parsed_systolic, parsed_diastolic

    @staticmethod
    def _validate_medical_ranges(
        age: int,
        height_cm: float,
        weight_kg: float,
        heart_rate: int | None,
        systolic_bp: int | None,
        diastolic_bp: int | None,
    ) -> None:
        if age < 0 or age > 120:
            raise AppException(
                status_code=422,
                error_code='INVALID_AGE_RANGE',
                message='Age should be between 0 and 120 years.',
            )
        if height_cm < 30 or height_cm > 300:
            raise AppException(
                status_code=422,
                error_code='INVALID_HEIGHT_RANGE',
                message='Height should be between 30 and 300 cm.',
            )
        if weight_kg < 1 or weight_kg > 500:
            raise AppException(
                status_code=422,
                error_code='INVALID_WEIGHT_RANGE',
                message='Weight should be between 1 and 500 kg.',
            )
        if heart_rate is not None and (heart_rate < 20 or heart_rate > 250):
            raise AppException(
                status_code=422,
                error_code='INVALID_HEART_RATE_RANGE',
                message='Heart rate should be between 20 and 250 bpm.',
            )
        if systolic_bp is not None and (systolic_bp < 60 or systolic_bp > 260):
            raise AppException(
                status_code=422,
                error_code='INVALID_SYSTOLIC_BP_RANGE',
                message='Systolic blood pressure should be between 60 and 260 mmHg.',
            )
        if diastolic_bp is not None and (diastolic_bp < 30 or diastolic_bp > 180):
            raise AppException(
                status_code=422,
                error_code='INVALID_DIASTOLIC_BP_RANGE',
                message='Diastolic blood pressure should be between 30 and 180 mmHg.',
            )
        if (
            systolic_bp is not None
            and diastolic_bp is not None
            and diastolic_bp >= systolic_bp
        ):
            raise AppException(
                status_code=422,
                error_code='INVALID_BLOOD_PRESSURE_VALUES',
                message='Diastolic blood pressure must be lower than systolic blood pressure.',
            )


health_profile_service = HealthProfileService()
