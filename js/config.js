/* ==========================================================================
   MRD Group — Site configuration
   --------------------------------------------------------------------------
   PLACEHOLDER DATA. Every value below is provisional and must be replaced
   with the client's real details before the site is presented as final.
   Editing this file updates the header, contact band and footer on every
   page at once. The HTML also carries the same values as static fallback
   text, so the contact details stay visible (and crawlable) if JS fails.
   ========================================================================== */

export const SITE = {
  /* Public base URL — used for canonical links and Open Graph tags. */
  baseUrl: "https://stillbenn.github.io/mrd-group/",

  legalName: "MRD Group", // TODO: full registered trade name
  city: "", // location left blank until the client confirms it
  country: "Türkiye",

  /* Real line published on the client's own site (cizreparkavm.com.tr).
     WhatsApp stays a placeholder until a real number is supplied. */
  phoneDisplay: "(0342) 357 04 40",
  phoneHref: "tel:+903423570440",

  whatsappDisplay: "+90 538 334 24 10",
  whatsappHref: "https://wa.me/905383342410",

  emailDisplay: "info@mrdgroup.com.tr",
  emailHref: "mailto:info@mrdgroup.com.tr",

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
