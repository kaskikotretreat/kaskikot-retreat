// app/lib/contact.ts
// The one place for contact details. The Contact section, the navbar's WhatsApp button and the
// booking emails all read from here, so you only ever change them in this file.
export const CONTACT = {
  whatsapp: '9779856059004', // digits only, with country code
  whatsappShown: '+977 98560 59004', // how it is written on the page
  email: 'kaskikotholidayhomes@gmail.com',
  // Shown as the address. Replace with the exact address when you have it (street, landmark, ward).
  addressLines: ['Kaskikot, Pokhara', 'Gandaki Province, Nepal'],
  // Your place on Google Maps (the share link) and its exact position.
  mapUrl: 'https://maps.app.goo.gl/sHNwrYVuWpaaaF7r5',
  lat: 28.2704549,
  lng: 83.9017967,
  replyTime: 'We usually reply within a few hours',
};

export const whatsappLink = (text?: string) =>
  `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/** Opens Google Maps with turn-by-turn directions to the property, starting from the guest's own location. */
export const directionsLink = () => `https://www.google.com/maps/dir/?api=1&destination=${CONTACT.lat},${CONTACT.lng}`;
/** Keyless embeddable map centred on the property. */
export const mapEmbedUrl = () => `https://www.google.com/maps?q=${CONTACT.lat},${CONTACT.lng}&z=15&output=embed`;
