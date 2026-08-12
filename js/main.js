(() => {
  "use strict";

  const navToggle = document.querySelector(".nav-toggle");
  const railNav = document.querySelector(".rail-nav");
  const navAnchors = [...document.querySelectorAll('.rail-nav a[href^="#"]')];
  const sections = [...document.querySelectorAll("main section[id]")];
  const revealItems = [...document.querySelectorAll(".reveal")];
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const projectEntries = [...document.querySelectorAll("[data-category]")];
  const spotifySelector = '[id*="spotify" i], [class*="spotify" i], [data-spotify], iframe[src*="spotify.com" i], a[href*="spotify.com" i]';

  function removeSpotifyRemnants(root = document) {
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(spotifySelector)) root.remove();
    root.querySelectorAll?.(spotifySelector).forEach((element) => element.remove());
  }

  removeSpotifyRemnants();
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => removeSpotifyRemnants(node)));
  }).observe(document.documentElement, { childList: true, subtree: true });

  try {
    localStorage.removeItem("rain0x.spotifyToken");
    sessionStorage.removeItem("rain0x.spotifyVerifier");
    sessionStorage.removeItem("rain0x.spotifyState");
  } catch {
    // Storage can be unavailable in strict privacy modes; no Spotify UI is mounted regardless.
  }

  function closeNavigation() {
    if (!navToggle || !railNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    railNav.classList.remove("open");
  }

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(willOpen));
    railNav?.classList.toggle("open", willOpen);
  });

  navAnchors.forEach((anchor) => anchor.addEventListener("click", closeNavigation));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1 }
  );
  revealItems.forEach((item) => revealObserver.observe(item));

  const navObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navAnchors.forEach((anchor) => {
        anchor.classList.toggle("active", anchor.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-18% 0px -62%", threshold: [0.05, 0.25, 0.5] }
  );
  sections.forEach((section) => navObserver.observe(section));

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((candidate) => {
        const isActive = candidate === button;
        candidate.classList.toggle("active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
      });
      projectEntries.forEach((entry) => {
        entry.classList.toggle("is-hidden", filter !== "all" && entry.dataset.category !== filter);
      });
    });
  });

})();
