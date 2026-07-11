import logging
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


class NotificationService:
    def send_password_reset(self, to_email: str, name: str, token: str) -> None:
        """
        Notify user of password reset.
        """
        logger.info(f"Triggering password reset notification for {to_email}")
        email_service.send_password_reset_email(to_email, name, token)

    def send_verification(self, to_email: str, name: str, token: str) -> None:
        """
        Notify user of email verification.
        """
        logger.info(f"Triggering email verification notification for {to_email}")
        email_service.send_verification_email(to_email, name, token)

    def send_appointment_booking(self, to_email: str, name: str, details: dict) -> None:
        """
        Notify user of appointment booking confirmation.
        """
        logger.info(
            f"Simulating appointment email to {to_email} for Doctor {details.get('doctor_name')} "
            f"at {details.get('hospital_name')} on {details.get('date')} at {details.get('slot')}"
        )


notification_service = NotificationService()
