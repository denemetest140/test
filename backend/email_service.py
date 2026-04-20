"""Resend email service. If RESEND_API_KEY is not configured, log to stdout."""
import os
import asyncio
import logging

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    if not api_key:
        logger.warning(
            "RESEND_API_KEY missing - email to %s not sent. Subject: %s", to, subject
        )
        logger.info("--- EMAIL PREVIEW ---\nTO: %s\nSUBJECT: %s\n%s\n---", to, subject, html)
        return False

    try:
        import resend

        resend.api_key = api_key
        params = {"from": sender, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Email sent id=%s", result.get("id") if isinstance(result, dict) else result)
        return True
    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        return False


def render_verification(code: str, user_name: str) -> str:
    return f"""
    <div style='font-family: Arial, sans-serif; background:#070A0F; color:#F8FAFC; padding:32px; border-radius:12px; max-width:520px;'>
      <h2 style='color:#DCA335;'>Coinberx - E-posta Doğrulama</h2>
      <p>Merhaba {user_name},</p>
      <p>Hesabınızı aktifleştirmek için aşağıdaki 6 haneli kodu kullanın. Kod 15 dakika geçerlidir.</p>
      <div style='font-size:34px; font-weight:700; letter-spacing:10px; background:#11151E; padding:16px; text-align:center; border-radius:8px; color:#DCA335;'>{code}</div>
      <p style='color:#94A3B8; font-size:12px; margin-top:24px;'>Bu e-postayı siz talep etmediyseniz göz ardı edebilirsiniz.</p>
    </div>
    """


def render_status(title: str, body_html: str) -> str:
    return f"""
    <div style='font-family: Arial, sans-serif; background:#070A0F; color:#F8FAFC; padding:32px; border-radius:12px; max-width:520px;'>
      <h2 style='color:#DCA335;'>Coinberx</h2>
      <h3>{title}</h3>
      {body_html}
      <p style='color:#94A3B8; font-size:12px; margin-top:24px;'>Coinberx Yatırım Hizmetleri</p>
    </div>
    """
