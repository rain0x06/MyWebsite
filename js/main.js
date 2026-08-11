(() => {
  "use strict";

  const navToggle = document.querySelector(".nav-toggle");
  const railNav = document.querySelector(".rail-nav");
  const navAnchors = [...document.querySelectorAll('.rail-nav a[href^="#"]')];
  const sections = [...document.querySelectorAll("main section[id]")];
  const revealItems = [...document.querySelectorAll(".reveal")];
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const projectEntries = [...document.querySelectorAll("[data-category]")];
  const copyButtons = [...document.querySelectorAll("[data-copy-discord]")];
  const copyToast = document.getElementById("copyToast");
  const year = document.getElementById("year");
  let toastTimer = 0;

  if (year) year.textContent = String(new Date().getFullYear());

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

  function showToast(message) {
    if (!copyToast) return;
    copyToast.textContent = message;
    copyToast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => copyToast.classList.remove("visible"), 2200);
  }

  async function copyDiscord() {
    const handle = "rain0x06";
    try {
      await navigator.clipboard.writeText(handle);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = handle;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast(`Discord copied: ${handle}`);
  }

  copyButtons.forEach((button) => button.addEventListener("click", copyDiscord));
})();
