const video = document.getElementById("backdropVideo");
const audio = document.getElementById("siteAudio");
const fluidCanvas = document.getElementById("fluidCanvas");
const enterGate = document.getElementById("enterGate");
const discordLink = document.getElementById("discordLink");
const discordWarning = document.getElementById("discordWarning");
const continueDiscord = document.getElementById("continueDiscord");

let hasEntered = false;
let fluidVisualizer = null;

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
  video.volume = 0;
  video.muted = true;

  try {
    await video.play();
  } catch {
    video.pause();
  }
}

async function startAudio() {
  if (!audio) {
    return;
  }

  audio.volume = 0.82;

  try {
    await audio.play();
  } catch (error) {
    document.documentElement.dataset.audioPlayback = "blocked";
    document.documentElement.dataset.audioPlaybackError = error && error.message ? error.message : "play-rejected";
    audio.controls = true;
  }
}

async function startFluidVisualizer() {
  try {
    if (!fluidVisualizer && window.AudioFluidVisualizer && fluidCanvas && audio) {
      fluidVisualizer = new window.AudioFluidVisualizer({
        canvas: fluidCanvas,
        audio,
      });
      window.rainFluid = fluidVisualizer;
    }

    if (fluidVisualizer) {
      await fluidVisualizer.start();
    }
  } catch (error) {
    document.documentElement.dataset.fluidStatus = "error";
    document.documentElement.dataset.fluidError = error && error.message ? error.message : "unknown";
    throw error;
  }
}

async function enterSite() {
  if (hasEntered) {
    return;
  }

  setEntered();
  await Promise.allSettled([
    startVideo(),
    startFluidVisualizer(),
    startAudio(),
  ]);
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

discordLink.addEventListener("click", (event) => {
  event.preventDefault();

  if (typeof discordWarning.showModal === "function") {
    discordWarning.showModal();
    return;
  }

  window.alert("I do not accept random friend requests. If you'd like to contact me, email rain@rain0x.me. Replies may come from my Gmail address.");
});

continueDiscord.addEventListener("click", () => {
  discordWarning.close();
  window.open(discordLink.href, "_blank", "noopener,noreferrer");
});
