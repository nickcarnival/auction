/**
 * Autocomplete detail tokens for booking-request forms (public subdomain + manual dialog).
 * Grouping with `section-booking` helps password managers and browsers scope saved data.
 *
 * @see https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill-detail-tokens
 */
export const BOOKING_FORM_AUTOCOMPLETE = {
  name: 'section-booking name',
  email: 'section-booking email',
  tel: 'section-booking tel',
  /**
   * Free-form year + model. Keep `autocomplete="off"` and avoid placeholders containing
   * words like "Street" — browsers heuristically treat those as address lines.
   */
  vehicle: 'off',
  comments: 'off',
} as const;
