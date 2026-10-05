// lib/email-templates.ts
// Branded HTML + plain-text emails. Layout uses tables and inline styles
// because that is what email clients (Gmail, Outlook, Apple Mail) render reliably.

import { formatPrice } from './pricing';

// ─── Edit these to match your property ───────────────────────────────────────
export const BRAND = {
  name: 'Kaskikot Retreat & Holiday Home',
  shortName: 'Kaskikot Retreat',
  replyTime: 'within 24 hours',
  whatsapp: '', // digits only with country code, e.g. '9779812345678'. Leave empty to hide.
  colors: {
    primary: '#2f4a3a',
    accent: '#b5653a',
    cream: '#f7f3ec',
    text: '#2b2b2b',
    muted: '#6b6b6b',
    border: '#e6e0d5',
  },
};
// ─────────────────────────────────────────────────────────────────────────────

const c = BRAND.colors;

export type Booking = {
  reference: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  guests: number;
  roomType: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  arrivalTime: string;
  specialRequests: string;
  price?: { total: number; label: string }; // estimate shown to the guest
};

export type BuiltEmail = { subject: string; html: string; text: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const withLineBreaks = (value: string) => esc(value).replace(/\n/g, '<br>');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const toUtcMs = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function countNights(checkIn: string, checkOut: string): number {
  return Math.round((toUtcMs(checkOut) - toUtcMs(checkIn)) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(toUtcMs(iso)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

// ─── Reusable HTML pieces ────────────────────────────────────────────────────

const pill = (label: string) =>
  `<span style="display:inline-block;background:${c.cream};color:${c.accent};border:1px solid ${c.border};
    border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
    ${esc(label)}</span>`;

const sectionTitle = (title: string) =>
  `<h2 style="margin:32px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${c.primary};">
    ${esc(title)}</h2>`;

const row = (label: string, value: string) =>
  `<tr>
    <td style="padding:11px 0;border-bottom:1px solid ${c.border};font-size:14px;color:${c.muted};width:42%;">${esc(label)}</td>
    <td style="padding:11px 0;border-bottom:1px solid ${c.border};font-size:14px;color:${c.text};font-weight:600;text-align:right;">${esc(value)}</td>
  </tr>`;

const table = (rows: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

const button = (href: string, label: string, color = c.primary) =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;
    font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;margin:4px 6px 4px 0;">${esc(label)}</a>`;

const referenceBox = (reference: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
    <tr><td style="background:${c.cream};border:1px dashed ${c.accent};border-radius:10px;padding:16px;text-align:center;">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${c.muted};">Booking reference</div>
      <div style="font-size:22px;font-weight:700;letter-spacing:2px;color:${c.primary};margin-top:4px;">${esc(reference)}</div>
    </td></tr>
  </table>`;

const notesBox = (title: string, text: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr><td style="background:${c.cream};border-left:3px solid ${c.accent};border-radius:6px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;color:${c.primary};margin-bottom:4px;">${esc(title)}</div>
      <div style="font-size:14px;line-height:1.6;color:${c.text};">${withLineBreaks(text)}</div>
    </td></tr>
  </table>`;

const step = (number: number, title: string, text: string) =>
  `<tr>
    <td valign="top" style="width:36px;padding:8px 0;">
      <div style="width:26px;height:26px;line-height:26px;border-radius:50%;background:${c.primary};color:#fff;
        text-align:center;font-size:13px;font-weight:700;">${number}</div>
    </td>
    <td style="padding:8px 0;font-size:14px;line-height:1.5;color:${c.text};">
      <strong>${esc(title)}</strong><br><span style="color:${c.muted};">${esc(text)}</span>
    </td>
  </tr>`;

function layout(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(BRAND.shortName)}</title>
</head>
<body style="margin:0;padding:0;background:${c.cream};font-family:Helvetica,Arial,sans-serif;color:${c.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.cream};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${c.border};border-radius:12px;overflow:hidden;">
        <tr><td style="background:${c.primary};padding:28px 32px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#ffffff;">${esc(BRAND.shortName)}</div>
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cfdccf;margin-top:6px;">Retreat &amp; Holiday Home</div>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="background:${c.cream};padding:20px 32px;text-align:center;font-size:12px;line-height:1.6;color:${c.muted};">
          ${esc(BRAND.name)}<br>You are receiving this email because a booking request was made with this address.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const stayRows = (b: Booking) =>
  row('Room / package', b.roomType) +
  row('Check-in', formatDate(b.checkIn)) +
  row('Check-out', formatDate(b.checkOut)) +
  row('Length of stay', plural(b.nights, 'night')) +
  row('Guests', String(b.guests)) +
  row('Estimated arrival', b.arrivalTime || 'Not specified') +
  (b.price ? row('Rate', b.price.label) + row('Estimated total', formatPrice(b.price.total)) : '');

// ─── Guest email: "we received your request" ────────────────────────────────

export function buildGuestEmail(b: Booking): BuiltEmail {
  const firstName = b.name.split(' ')[0];
  const subject = `Booking request received (${b.reference}) · ${BRAND.shortName}`;

  const whatsappButton = BRAND.whatsapp
    ? button(`https://wa.me/${digitsOnly(BRAND.whatsapp)}?text=${encodeURIComponent(`Hi, my booking reference is ${b.reference}.`)}`, 'Message us on WhatsApp', c.accent)
    : '';

  const body = `
    ${pill('Request received')}
    <h1 style="margin:16px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${c.primary};">
      Thank you, ${esc(firstName)}!</h1>
    <p style="margin:0;font-size:15px;line-height:1.7;color:${c.text};">
      We have received your request for <strong>${esc(plural(b.nights, 'night'))}</strong> at ${esc(BRAND.shortName)}.
      Our team will check availability and reply ${esc(BRAND.replyTime)}.</p>

    ${referenceBox(b.reference)}

    ${sectionTitle('Your stay')}
    ${table(stayRows(b))}
    ${b.specialRequests ? notesBox('Your special requests', b.specialRequests) : ''}

    ${sectionTitle('What happens next')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step(1, 'We check availability', 'We confirm your dates and room.')}
      ${step(2, 'You receive our confirmation', 'We will send the final details and any next steps.')}
      ${step(3, 'Your stay is confirmed', 'Your booking is secured once you receive that message.')}
    </table>

    ${notesBox('Please note', `This email acknowledges your request. It is not yet a confirmed reservation.${b.price ? ' The price shown is an estimate; we confirm the final amount in our reply.' : ''}`)}

    <p style="margin:28px 0 12px;font-size:14px;color:${c.muted};">Questions or changes? Just reply to this email.</p>
    ${whatsappButton}
  `;

  const text = [
    `Thank you, ${firstName}!`,
    '',
    `We have received your booking request (reference ${b.reference}).`,
    `We will check availability and reply ${BRAND.replyTime}.`,
    '',
    `Room: ${b.roomType}`,
    `Check-in: ${formatDate(b.checkIn)}`,
    `Check-out: ${formatDate(b.checkOut)} (${plural(b.nights, 'night')})`,
    `Guests: ${b.guests}`,
    `Estimated arrival: ${b.arrivalTime || 'Not specified'}`,
    ...(b.price ? [`Estimated total: ${formatPrice(b.price.total)} (${b.price.label})`] : []),
    b.specialRequests ? `Special requests: ${b.specialRequests}` : '',
    '',
    'This is an acknowledgement of your request, not yet a confirmed reservation.',
    'Questions? Just reply to this email.',
    '',
    BRAND.name,
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n');

  return { subject, html: layout(`Your request ${b.reference} has been received.`, body), text };
}

// ─── Admin email: "new booking, here is everything" ─────────────────────────

export function buildAdminEmail(b: Booking): BuiltEmail {
  const subject = `New booking: ${b.name} · ${formatDate(b.checkIn)} (${plural(b.nights, 'night')}) · ${b.reference}`;
  const phone = b.phone.replace(/[^\d+]/g, '');
  const replySubject = encodeURIComponent(`Re: Your booking request ${b.reference}`);

  const body = `
    ${pill('New booking request')}
    <h1 style="margin:16px 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${c.primary};">
      ${esc(b.name)}</h1>
    <p style="margin:0;font-size:14px;color:${c.muted};">
      ${esc(plural(b.nights, 'night'))} · ${esc(plural(b.guests, 'guest'))} · Ref ${esc(b.reference)}</p>

    <div style="margin-top:20px;">
      ${button(`mailto:${esc(b.email)}?subject=${replySubject}`, 'Reply by email')}
      ${button(`https://wa.me/${digitsOnly(b.phone)}`, 'WhatsApp guest', c.accent)}
      ${button(`tel:${esc(phone)}`, 'Call', c.muted)}
    </div>

    ${sectionTitle('Stay')}
    ${table(stayRows(b))}

    ${sectionTitle('Guest')}
    ${table(
      row('Name', b.name) +
        row('Email', b.email) +
        row('Phone / WhatsApp', b.phone) +
        row('Nationality', b.nationality),
    )}
    ${b.specialRequests ? notesBox('Special requests', b.specialRequests) : ''}
  `;

  const text = [
    `New booking request ${b.reference}`,
    '',
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    `Phone / WhatsApp: ${b.phone}`,
    `Nationality: ${b.nationality}`,
    '',
    `Room: ${b.roomType}`,
    `Check-in: ${formatDate(b.checkIn)}`,
    `Check-out: ${formatDate(b.checkOut)} (${plural(b.nights, 'night')})`,
    `Guests: ${b.guests}`,
    `Estimated arrival: ${b.arrivalTime || 'Not specified'}`,
    ...(b.price ? [`Estimated total: ${formatPrice(b.price.total)} (${b.price.label})`] : []),
    `Special requests: ${b.specialRequests || 'None'}`,
  ].join('\n');

  return { subject, html: layout(`New request from ${b.name}`, body), text };
}

// ─── Guest email when you confirm or decline a request (sent from the admin page) ───

export function buildStatusEmail(b: Booking, kind: 'confirmed' | 'declined'): BuiltEmail {
  const firstName = b.name.split(' ')[0];
  const whatsappButton = BRAND.whatsapp
    ? button(`https://wa.me/${digitsOnly(BRAND.whatsapp)}?text=${encodeURIComponent(`Hi, my booking reference is ${b.reference}.`)}`, 'Message us on WhatsApp', c.accent)
    : '';

  if (kind === 'confirmed') {
    const body = `
      ${pill('Booking confirmed')}
      <h1 style="margin:16px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${c.primary};">
        See you soon, ${esc(firstName)}!</h1>
      <p style="margin:0;font-size:15px;line-height:1.7;color:${c.text};">
        Your stay at ${esc(BRAND.shortName)} is confirmed for <strong>${esc(plural(b.nights, 'night'))}</strong>,
        from ${esc(formatDate(b.checkIn))} to ${esc(formatDate(b.checkOut))}.</p>
      ${referenceBox(b.reference)}
      ${sectionTitle('Your stay')}
      ${table(stayRows(b))}
      ${b.specialRequests ? notesBox('Your special requests', b.specialRequests) : ''}
      ${notesBox('Before you arrive', 'If you have questions or need to change anything, just reply to this email.')}
      <div style="margin-top:24px;">${whatsappButton}</div>
    `;
    const text = [
      `See you soon, ${firstName}!`,
      '',
      `Your booking ${b.reference} is confirmed.`,
      `Room: ${b.roomType}`,
      `Check-in: ${formatDate(b.checkIn)}`,
      `Check-out: ${formatDate(b.checkOut)} (${plural(b.nights, 'night')})`,
      ...(b.price ? [`Estimated total: ${formatPrice(b.price.total)} (${b.price.label})`] : []),
      '',
      'Questions or changes? Just reply to this email.',
      '',
      BRAND.name,
    ].join('\n');
    return {
      subject: `Booking confirmed (${b.reference}) · ${BRAND.shortName}`,
      html: layout(`Your stay ${b.reference} is confirmed.`, body),
      text,
    };
  }

  const body = `
    ${pill('About your request')}
    <h1 style="margin:16px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${c.primary};">
      Thank you, ${esc(firstName)}</h1>
    <p style="margin:0;font-size:15px;line-height:1.7;color:${c.text};">
      Unfortunately we cannot offer ${esc(b.roomType)} from ${esc(formatDate(b.checkIn))} to ${esc(formatDate(b.checkOut))}.
      We are sorry to disappoint you.</p>
    ${referenceBox(b.reference)}
    <p style="margin:24px 0 0;font-size:15px;line-height:1.7;color:${c.text};">
      You are welcome to send a new request for other dates or another room. If you reply to this email, we will happily
      help you find a good time.</p>
    <div style="margin-top:24px;">${whatsappButton}</div>
  `;
  const text = [
    `Thank you, ${firstName}.`,
    '',
    `Unfortunately we cannot offer ${b.roomType} from ${formatDate(b.checkIn)} to ${formatDate(b.checkOut)} (reference ${b.reference}).`,
    'You are welcome to send a new request for other dates or another room, or reply to this email and we will help.',
    '',
    BRAND.name,
  ].join('\n');
  return {
    subject: `About your booking request (${b.reference}) · ${BRAND.shortName}`,
    html: layout(`An update on request ${b.reference}.`, body),
    text,
  };
}

// ─── Admin password reset email ───

export function buildResetEmail(link: string): BuiltEmail {
  const body = `
    ${pill('Password reset')}
    <h1 style="margin:16px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${c.primary};">
      Reset your admin password</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${c.text};">
      Someone asked to reset the password for the ${esc(BRAND.shortName)} admin page. Use the button below to choose a new one.
      The link works once and expires in 30 minutes.</p>
    ${button(esc(link), 'Choose a new password')}
    ${notesBox('Did not ask for this?', 'You can ignore this email. Your password stays the same.')}
  `;
  const text = [
    `Reset the ${BRAND.shortName} admin password`,
    '',
    'Open this link to choose a new password. It works once and expires in 30 minutes:',
    link,
    '',
    'Did not ask for this? Ignore this email. Your password stays the same.',
  ].join('\n');
  return { subject: `Reset your ${BRAND.shortName} admin password`, html: layout('Choose a new admin password.', body), text };
}
