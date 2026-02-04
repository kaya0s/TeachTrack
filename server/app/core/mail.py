
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_verification_email(email: EmailStr, code: str):
    message = MessageSchema(
        subject="TeachTrack Password Reset Code",
        recipients=[email],
        body=f"Your password reset code is: {code}. It will expire in 10 minutes.",
        subtype=MessageType.plain
    )

    fm = FastMail(conf)
    await fm.send_message(message)
