from sqlalchemy.orm import Session

from app.models.health_profile import UserHealthProfile


class HealthProfileRepository:
    def create_profile(
        self,
        db: Session,
        user_id: int,
        payload: dict[str, object],
    ) -> UserHealthProfile:
        profile = UserHealthProfile(user_id=user_id, **payload)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    def get_profile_by_user(self, db: Session, user_id: int) -> UserHealthProfile | None:
        return db.query(UserHealthProfile).filter(UserHealthProfile.user_id == user_id).first()

    def update_profile(
        self,
        db: Session,
        profile: UserHealthProfile,
        payload: dict[str, object],
    ) -> UserHealthProfile:
        for key, value in payload.items():
            setattr(profile, key, value)

        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    def upsert_profile(
        self,
        db: Session,
        user_id: int,
        payload: dict[str, object],
    ) -> UserHealthProfile:
        existing = self.get_profile_by_user(db=db, user_id=user_id)
        if existing:
            return self.update_profile(db=db, profile=existing, payload=payload)
        return self.create_profile(db=db, user_id=user_id, payload=payload)


health_profile_repository = HealthProfileRepository()
