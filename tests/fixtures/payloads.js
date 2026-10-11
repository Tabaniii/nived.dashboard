export const VALID_FEEDBACK_PAYLOAD = Object.freeze({
  card_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  rating: 2,
  feedback_text: 'Pelayanan agak lama saat jam makan siang',
});

export const VALID_TELEMETRY_PAYLOAD = Object.freeze({
  card_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  selected_stars: 5,
});

export const INVALID_FEEDBACK_RATINGS = Object.freeze([
  -1,
  0,
  4,
  5,
  1.5,
  '2',
  null,
]);

export const XSS_PAYLOADS = Object.freeze([
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '\"><svg/onload=alert(1)>',
  'javascript:alert(1)',
]);
