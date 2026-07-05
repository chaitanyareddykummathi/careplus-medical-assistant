import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class EmailService:
    def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str) -> None:
        smtp_host = settings.smtp_host
        smtp_port = settings.smtp_port
        smtp_username = settings.smtp_username
        smtp_password = settings.smtp_password
        from_email = settings.smtp_from_email
        from_name = settings.smtp_from_name

        if not smtp_host:
            logger.warning(
                "SMTP_HOST is not configured. Email NOT sent via SMTP.\n"
                f"--- SIMULATED EMAIL SUBMISSION ---\n"
                f"To: {to_email}\n"
                f"From: {from_name} <{from_email}>\n"
                f"Subject: {subject}\n"
                f"Body (Text):\n{text_content}\n"
                "-----------------------------------"
            )
            return

        try:
            # Create message container
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = to_email

            # Record the MIME types of both parts - text/plain and text/html.
            part1 = MIMEText(text_content, 'plain')
            part2 = MIMEText(html_content, 'html')

            # Attach parts into message container.
            msg.attach(part1)
            msg.attach(part2)

            # Connect to SMTP server
            if settings.smtp_ssl:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
                if settings.smtp_tls:
                    server.starttls()

            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)

            server.sendmail(from_email, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email successfully sent to {to_email} with subject: '{subject}'")

        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
            # Fallback output in case SMTP connection errors
            logger.info(
                f"[FALLBACK LOG] Email details:\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"Body (Text):\n{text_content}"
            )

    def send_verification_email(self, to_email: str, name: str, token: str) -> None:
        # Frontend verification URL
        verification_url = f"http://localhost:3000/verify-email?token={token}"
        subject = "Verify your CarePlus account"
        
        text_content = (
            f"Hello {name},\n\n"
            f"Thank you for registering with CarePlus Medical Assistant!\n"
            f"Please verify your email address by clicking the link below:\n\n"
            f"{verification_url}\n\n"
            f"This link will expire in 24 hours.\n\n"
            f"Best regards,\n"
            f"CarePlus Team"
        )
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to CarePlus!</h2>
                <p>Hello <strong>{name}</strong>,</p>
                <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="{verification_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
                <p>If the button doesn't work, copy and paste the following link into your browser:</p>
                <p><a href="{verification_url}">{verification_url}</a></p>
                <p>This verification link will expire in 24 hours.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 0.85rem; color: #64748b;">If you did not create a CarePlus account, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        self._send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(self, to_email: str, name: str, token: str) -> None:
        reset_url = f"http://localhost:3000/reset-password?token={token}"
        subject = "Reset your CarePlus password"
        
        text_content = (
            f"Hello {name},\n\n"
            f"We received a request to reset the password for your CarePlus account.\n"
            f"Please click the link below to set a new password:\n\n"
            f"{reset_url}\n\n"
            f"This link will expire in 1 hour.\n\n"
            f"If you did not request a password reset, please ignore this email.\n\n"
            f"Best regards,\n"
            f"CarePlus Team"
        )
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">Password Reset Request</h2>
                <p>Hello <strong>{name}</strong>,</p>
                <p>We received a request to reset the password for your CarePlus account. Click the button below to reset it:</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="{reset_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>If the button doesn't work, copy and paste the following link into your browser:</p>
                <p><a href="{reset_url}">{reset_url}</a></p>
                <p>This password reset link will expire in 1 hour.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 0.85rem; color: #64748b;">If you did not request a password reset, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        self._send_email(to_email, subject, html_content, text_content)

email_service = EmailService()
