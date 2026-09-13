/* ==========================================================================
   Tarven Group — Site configuration
   --------------------------------------------------------------------------
   DEMONSTRATION SITE. Tarven Group is a fictional holding invented for this
   portfolio piece. Every company name, project name, place name and contact
   detail below is made up, and the phone numbers sit in ranges that are not
   assigned to subscribers — nothing here can ring a real person.

   Editing this file updates the header, contact band and footer on every
   page at once. The HTML also carries the same values as static fallback
   text, so the contact details stay visible (and crawlable) if JS fails.
   ========================================================================== */

export const SITE = {
  /* Public base URL — used for canonical links and Open Graph tags. */
  baseUrl: "https://stillbenn.github.io/tarven-group/",

  legalName: "Tarven Group", // fictional holding, invented for this demo
  city: "", // left blank on purpose — the demo names no real location
  country: "Türkiye",

  /* Invented numbers. 0212 000 and 500 000 are not assigned to subscribers,
     so a visitor who taps them reaches nobody. */
  phoneDisplay: "(0212) 000 00 00",
  phoneHref: "tel:+902120000000",

  whatsappDisplay: "+90 500 000 00 00",
  whatsappHref: "https://wa.me/905000000000",

  emailDisplay: "info@tarvengroup.com",
  emailHref: "mailto:info@tarvengroup.com",

  hours: "Her gün · 09.00 – 17.00",
};

/* Fill every [data-cfg="key"] element and [data-cfg-href="key"] link. */
export function applyConfig(root = document) {
  root.querySelectorAll("[data-cfg]").forEach((el) => {
    const value = SITE[el.dataset.cfg];
    if (value) el.textContent = value;
  });
  root.querySelectorAll("[data-cfg-href]").forEach((el) => {
    const value = SITE[el.dataset.cfgHref];
    if (value) el.setAttribute("href", value);
  });
}
