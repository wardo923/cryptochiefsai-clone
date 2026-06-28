// Send an SMS via the Twilio REST API. No SDK needed — a single form-encoded
// POST keeps the dependency surface minimal. Reuses the same Twilio account as
// SightLine via shared env vars.
export async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio env vars are not configured" }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const auth = Buffer.from(`${sid}:${token}`).toString("base64")

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Twilio ${res.status}: ${text.slice(0, 200)}` }
  }
  return { ok: true }
}
