const video = document.getElementById("backdropVideo");
const enterGate = document.getElementById("enterGate");

let hasEntered = false;

window.startTabTitleEffect = function startTabTitleEffect() {
  if (window.startTabTitleEffect.started) {
    return;
  }

  window.startTabTitleEffect.started = true;

  const target = "rain0x";
  const symbols = "@#$%&!~^";
  const frameMs = 72;
  const pauseMs = 1200;
  const staggerFrames = 3;
  const resolveFrames = 9;
  let frame = 0;

  function randomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function renderFrame() {
    let title = "";
    let settled = true;

    for (let index = 0; index < target.length; index += 1) {
      const localFrame = frame - index * staggerFrames;

      if (localFrame < 0) {
        title += randomSymbol();
        settled = false;
        continue;
      }

      if (localFrame >= resolveFrames) {
        title += target[index];
        continue;
      }

      const shouldReveal = localFrame > resolveFrames * 0.62 && Math.random() > 0.48;
      title += shouldReveal ? target[index] : randomSymbol();
      settled = false;
    }

    document.title = title;

    if (settled) {
      window.setTimeout(() => {
        frame = 0;
        renderFrame();
      }, pauseMs);
      return;
    }

    frame += 1;
    window.setTimeout(renderFrame, frameMs);
  }

  renderFrame();
};

globalThis.startTabTitleEffect = window.startTabTitleEffect;
window.startTabTitleEffect();

function setEntered() {
  hasEntered = true;
  document.body.classList.remove("is-locked");
  document.body.classList.add("is-entered");
  enterGate.setAttribute("aria-hidden", "true");
  enterGate.setAttribute("tabindex", "-1");
  window.setTimeout(() => {
    enterGate.hidden = true;
  }, 380);
}

async function startVideo() {
  video.volume = 0.78;
  video.muted = false;

  try {
    await video.play();
  } catch {
    video.muted = true;
    await video.play();
  }
}

async function enterSite() {
  if (hasEntered) {
    return;
  }

  setEntered();
  await startVideo();
}

enterGate.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  enterSite();
});

enterGate.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  enterSite();
});
