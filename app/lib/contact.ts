export const CONTACT = {
  whatsapp: '9779856059004', 
  whatsappShown: '+977 98560 59004',
  email: 'kaskikotholidayhomes@gmail.com',
  addressLines: ['Kaskikot, Pokhara', 'Gandaki Province, Nepal'],
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kaskikot%2C+Pokhara%2C+Nepal',
  replyTime: 'We usually reply within a few minutes',
};

// Use the clean wa.me format which handles mobile app vs web routing automatically
export const whatsappLink = (text?: string) =>
  `https://wa.me/${CONTACT.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;