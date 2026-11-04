"""Password-reset email. Sends through Resend when RESEND_API_KEY is set, otherwise logs the link."""

from __future__ import annotations

import html

import httpx

from .config import log, settings


def _reset_html(url: str) -> str:
    safe = html.escape(url, quote=True)
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eaf9ff;padding:32px 12px;font-family:Arial,Helvetica,sans-serif">
  <tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #b8c7d9;border-radius:10px;overflow:hidden">
      <tr><td style="background:#0a84c6;color:#ffffff;padding:10px 16px;font-weight:bold;letter-spacing:1px">&#9733; Y2KEDIT &mdash; reset.exe</td></tr>
      <tr><td style="padding:28px 30px;color:#0b0c10">
        <h1 style="margin:0 0 10px;font-size:24px">Reset your password</h1>
        <p style="margin:0 0 22px;color:#475569;font-size:14px;line-height:1.55">Someone (hopefully you) asked to reset the password on your Y2KEDIT account. The link works once and expires in 1 hour.</p>
        <p style="text-align:center;margin:0 0 22px"><a href="{safe}" style="display:inline-block;padding:12px 26px;background:#00b4d8;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:999px">Choose a new password</a></p>
        <p style="margin:0;color:#64748b;font-size:12px;word-break:break-all">{safe}</p>
        <p style="margin:22px 0 0;color:#94a3b8;font-size:11px">Didn't ask for this? Ignore this email and your password stays the same.</p>
      </td></tr>
    </table>
  </td></tr>
</table>"""


async def send_password_reset(to_email: str, reset_url: str) -> None:
    if not settings.resend_api_key:
        log.info("\n  ★ Password reset link for %s (no RESEND_API_KEY, so it's logged here):\n    %s\n", to_email, reset_url)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.email_from,
                    "to": [to_email],
                    "subject": "★ Reset your Y2KEDIT password",
                    "html": _reset_html(reset_url),
                },
            )
            resp.raise_for_status()
        log.info("Password reset email sent to %s", to_email)
    except httpx.HTTPError as exc:
        # Never surface delivery problems to the requester (that would reveal which emails exist).
        log.error("Resend delivery failed for %s: %s. Link: %s", to_email, exc, reset_url)
