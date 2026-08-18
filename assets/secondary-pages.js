(() => {
  "use strict";

  const header = document.getElementById("siteHeader");
  const button = document.getElementById("hamburger");
  const nav = document.getElementById("mobileNav");

  if (header) {
    window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 10), { passive: true });
  }

  // Preserve the service the visitor has already chosen. The booking page can
  // then show only the relevant course group instead of making the visitor
  // search the full menu again.
  const bookingContextByPath = {
    "/bodycare-kamata.html": "body",
    "/aroma-oil-kamata.html": "aroma",
    "/ashitsubo-fukurahagi.html": "foot",
    "/headspa-kamata.html": "head",
    "/kamata-late-night.html": "late",
    "/en/foot-massage-kamata.html": "foot",
    "/en/late-night-massage-kamata.html": "late"
  };
  const serviceContext = bookingContextByPath[location.pathname];
  if (serviceContext) {
    const origin = location.pathname.replace(/^\//, "").replace(/\.html$/, "") || "service-page";
    document.querySelectorAll('a[href*="/booking.html"]').forEach(link => {
      try {
        const url = new URL(link.href, location.origin);
        if (url.origin !== location.origin || url.pathname !== "/booking.html") return;
        if (!url.searchParams.has("service")) url.searchParams.set("service", serviceContext);
        if (!url.searchParams.has("origin")) url.searchParams.set("origin", origin);
        if (!url.searchParams.has("cta")) {
          const isHero = Boolean(link.closest(".intent-actions"));
          const isNavigation = link.classList.contains("nav-cta") || link.classList.contains("mobile-cta");
          url.searchParams.set("cta", isHero ? "service_hero" : (isNavigation ? "service_nav" : "service_page"));
        }
        link.href = `${url.pathname}${url.search}${url.hash}`;
      } catch (_) {}
    });
  }

  if (!button || !nav) return;
  const closeNav = () => {
    button.classList.remove("active");
    nav.classList.remove("open");
    button.setAttribute("aria-label", button.dataset.closedLabel || "メニューを開く");
    button.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };
  window.closeSecondaryNav = closeNav;
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    const willOpen = !nav.classList.contains("open");
    button.classList.toggle("active", willOpen);
    nav.classList.toggle("open", willOpen);
    button.setAttribute("aria-label", willOpen ? (button.dataset.openLabel || "メニューを閉じる") : (button.dataset.closedLabel || "メニューを開く"));
    button.setAttribute("aria-expanded", String(willOpen));
    document.body.style.overflow = willOpen ? "hidden" : "";
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeNav));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeNav(); });
})();
