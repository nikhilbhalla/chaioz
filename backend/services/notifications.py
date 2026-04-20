"""Email + SMS notifications with graceful dev-mode fallback (logs when keys missing)."""
import os
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("chaioz.notifications")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

_resend_ready = bool(RESEND_API_KEY)
_twilio_ready = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)

if _resend_ready:
    import resend
    resend.api_key = RESEND_API_KEY

if _twilio_ready:
    from twilio.rest import Client as TwilioClient
    _twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    _twilio_client = None


async def send_email(to_email: str, subject: str, html: str) -> dict:
    if not _resend_ready:
        logger.info("[DEV EMAIL] to=%s subject=%s", to_email, subject)
        logger.info("[DEV EMAIL html snippet] %s", html[:500])
        return {"status": "logged", "dev_mode": True}
    try:
        def _send():
            return resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
            })
        result = await asyncio.to_thread(_send)
        logger.info("Email sent id=%s", result.get("id"))
        return {"status": "sent", "id": result.get("id")}
    except Exception as e:
        logger.error("Email send failed: %s", e)
        return {"status": "error", "error": str(e)}


async def send_sms(to_phone: str, body: str) -> dict:
    """Send SMS. to_phone should be E.164 format (+61...)."""
    if not _twilio_ready:
        logger.info("[DEV SMS] to=%s body=%s", to_phone, body)
        return {"status": "logged", "dev_mode": True}
    try:
        def _send():
            return _twilio_client.messages.create(
                body=body,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone,
            )
        msg = await asyncio.to_thread(_send)
        return {"status": "sent", "sid": msg.sid}
    except Exception as e:
        logger.error("SMS send failed: %s", e)
        return {"status": "error", "error": str(e)}


def format_au_phone(raw: str) -> Optional[str]:
    """Convert common AU formats to E.164 (+61...)."""
    if not raw:
        return None
    digits = "".join(c for c in raw if c.isdigit() or c == "+")
    if digits.startswith("+"):
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "+61" + digits[1:]
    if digits.startswith("61"):
        return "+" + digits
    return None


# ----- Templated messages -----
def cart_recovery_email_html(name: str, items: list, resume_url: str) -> str:
    rows = "".join(
        f"<tr><td style='padding:8px 0'>{it['qty']}× {it['name']}</td>"
        f"<td style='padding:8px 0;text-align:right'>${it['line_total']:.2f}</td></tr>"
        for it in items
    )
    total = sum(i["line_total"] for i in items)
    return f"""
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:auto;background:#050B0A;color:#FDFBF7;padding:40px 28px;border-radius:16px">
  <h1 style="font-family:Georgia,serif;color:#E8A84A;margin:0 0 12px;font-size:32px">Your chai's waiting.</h1>
  <p style="color:#A3A3A3;margin:0 0 24px">Hey {name or 'there'} — looks like you left something in your cart. Shall we brew it?</p>
  <table style="width:100%;border-collapse:collapse;color:#FDFBF7;font-size:14px">{rows}
    <tr><td style="border-top:1px solid #1A2E2C;padding-top:12px;font-weight:600">Total</td>
        <td style="border-top:1px solid #1A2E2C;padding-top:12px;text-align:right;color:#E8A84A;font-weight:600">${total:.2f}</td></tr>
  </table>
  <div style="text-align:center;margin:32px 0">
    <a href="{resume_url}" style="background:#E8A84A;color:#050B0A;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:600;display:inline-block">Resume your order →</a>
  </div>
  <p style="color:#666;font-size:12px;text-align:center;margin:24px 0 0">Chaioz · Unit 2, 132 O'Connell St, North Adelaide</p>
</div>
"""


def cart_recovery_sms(name: str, resume_url: str) -> str:
    return f"Chaioz: hey {name or 'there'} — your chai's getting cold 🫖 Resume your order: {resume_url}"


def order_ready_sms(short_code: str, name: str) -> str:
    return f"Chaioz: hey {name}, order #{short_code} is ready for pickup. See you soon 🙏"


def order_confirmation_email_html(name: str, short_code: str, items: list, total: float, pickup_time: str) -> str:
    rows = "".join(
        f"<tr><td style='padding:6px 0'>{it['qty']}× {it['name']}</td>"
        f"<td style='padding:6px 0;text-align:right'>${it['line_total']:.2f}</td></tr>"
        for it in items
    )
    return f"""
<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:auto;background:#050B0A;color:#FDFBF7;padding:40px 28px;border-radius:16px">
  <h1 style="font-family:Georgia,serif;color:#E8A84A;margin:0 0 12px;font-size:28px">Chai's brewing.</h1>
  <p style="color:#A3A3A3">Thanks {name} — order #{short_code} is confirmed.</p>
  <p style="color:#FDFBF7;font-size:14px;margin-top:18px"><strong style="color:#E8A84A">Pickup time:</strong> {pickup_time}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:14px">{rows}
    <tr><td style="border-top:1px solid #1A2E2C;padding-top:10px;font-weight:600">Total</td>
        <td style="border-top:1px solid #1A2E2C;padding-top:10px;text-align:right;color:#E8A84A;font-weight:600">${total:.2f}</td></tr>
  </table>
  <p style="color:#666;font-size:12px;margin-top:24px;text-align:center">Chaioz · Unit 2, 132 O'Connell St, North Adelaide · (08) 7006 0222</p>
</div>
"""
