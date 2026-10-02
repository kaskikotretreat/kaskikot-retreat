import { NextResponse } from 'next/server';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function sendBrevo(label: string, payload: object) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY || '',
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log(`[Brevo] ${label} email sent (${res.status})`);
  } else {
    console.error(`[Brevo] ${label} email FAILED (${res.status}):`, body);
  }
  return { ok: res.ok, status: res.status, body };
}

export async function GET() {
  // Lets you open /api/booking in the browser to check env + route status
  return NextResponse.json({
    route: 'ok',
    BREVO_API_KEY: process.env.BREVO_API_KEY ? 'loaded' : 'MISSING',
    SENDER_EMAIL: process.env.SENDER_EMAIL ? 'loaded' : 'MISSING',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL ? 'loaded' : 'MISSING',
  });
}

export async function POST(req: Request) {
  try {
    // Fail early and clearly if env variables are missing
    if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
      console.error('Missing env: BREVO_API_KEY or SENDER_EMAIL. Check .env.local location and restart the server.');
      return NextResponse.json(
        { error: 'Server email settings are missing. Check .env.local and restart.' },
        { status: 500 }
      );
    }

    const d = await req.json();
    const { name, email, phone, nationality, guests, roomType, checkIn, checkOut, arrivalTime, specialRequests } = d;

    // Basic server-side validation
    if (!name || !email || !phone || !checkIn || !checkOut) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      return NextResponse.json({ error: 'Check-out must be after check-in.' }, { status: 400 });
    }

    const senderEmail = process.env.SENDER_EMAIL;
    const adminEmail = process.env.ADMIN_EMAIL || senderEmail;
    const sender = { name: 'Kaskikot Retreat', email: senderEmail };

    const details = `
      <p><strong>Room:</strong> ${esc(roomType)}</p>
      <p><strong>Check-in:</strong> ${esc(checkIn)}</p>
      <p><strong>Check-out:</strong> ${esc(checkOut)}</p>
      <p><strong>Guests:</strong> ${esc(guests)}</p>
      <p><strong>Arrival time:</strong> ${esc(arrivalTime) || 'Not specified'}</p>
      <p><strong>Special requests:</strong> ${esc(specialRequests) || 'None'}</p>
    `;

    // 1) Email to the guest
    const guestMail = sendBrevo('Guest', {
      sender,
      to: [{ email, name }],
      subject: 'We received your booking request – Kaskikot Retreat',
      htmlContent: `
        <h2>Thank you, ${esc(name)}!</h2>
        <p>We have received your request and will confirm availability shortly.</p>
        ${details}
        <p>Questions? Just reply to this email.</p>
      `,
    });

    // 2) Email to you (admin), reply-to set to the guest
    const adminMail = sendBrevo('Admin', {
      sender,
      to: [{ email: adminEmail, name: 'Admin Booking' }],
      replyTo: { email, name },
      subject: `New booking request – ${name}`,
      htmlContent: `
        <h2>New booking request</h2>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Phone/WhatsApp:</strong> ${esc(phone)}</p>
        <p><strong>Nationality:</strong> ${esc(nationality)}</p>
        ${details}
      `,
    });

    const [g, a] = await Promise.all([guestMail, adminMail]);

    // Admin email is the one that matters. Show the real Brevo message.
    if (!a.ok) {
      const reason = a.body?.message || a.body?.code || 'Email provider error';
      return NextResponse.json({ error: `Brevo: ${reason}` }, { status: 502 });
    }

    // Guest email failed but admin got the booking: still counts as success
    return NextResponse.json({
      message: 'Booking request sent successfully!',
      guestEmailSent: g.ok,
    });
  } catch (err) {
    console.error('Internal error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}