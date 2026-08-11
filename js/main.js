(() => {
  "use strict";

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = [...document.querySelectorAll("main section[id]")];
  const revealItems = [...document.querySelectorAll(".reveal")];
  const copyButtons = [...document.querySelectorAll("[data-copy-discord]")];
  const copyToast = document.getElementById("copyToast");
  const year = document.getElementById("year");
  let toastTimer = 0;

  if (year) year.textContent = String(new Date().getFullYear());

  function closeNavigation() {
    if (!navToggle || !navLinks) return;
    navToggle.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("open");
  }

  navToggle?.addEventListener("click", () => {
    const willOpen = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", String(willOpen));
    navLinks?.classList.toggle("open", willOpen);
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
    { threshold: 0.12 }
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
    { rootMargin: "-25% 0px -58%", threshold: [0.05, 0.25, 0.55] }
  );

  sections.forEach((section) => navObserver.observe(section));

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
      showToast(`Discord copied: ${handle}`);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      const fallback = document.createElement("span");
      fallback.textContent = handle;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      range.selectNodeContents(fallback);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand("copy");
      selection?.removeAllRanges();
      fallback.remove();
      showToast(`Discord copied: ${handle}`);
    }
  }

  copyButtons.forEach((button) => button.addEventListener("click", copyDiscord));
})();
