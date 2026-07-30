/**
 * Magic-link email delivery via Resend. Gated on RESEND_API_KEY — when unset,
 * sending is a no-op that returns false, and the caller falls back to the
 * coach-generated link flow (the coach copies the link and sends it manually).
 */
export async function sendMagicLink(email: string, link: string, clientName?: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.PORTAL_FROM_EMAIL || "SL Strength <onboarding@resend.dev>";
  const greeting = clientName ? `Hi ${clientName},` : "Hi,";
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;color:#111">
      <h2 style="color:#b91c1c">SL Strength — sign in</h2>
      <p>${greeting}</p>
      <p>Tap the button below to open your coaching portal. This link expires in 30 minutes.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#b91c1c;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open my portal</a>
      </p>
      <p style="font-size:12px;color:#666">If you didn't request this, you can ignore this email.</p>
    </div>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email, subject: "Your SL Strength login link", html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
