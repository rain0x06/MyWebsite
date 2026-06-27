(function () {
  "use strict";

  const enterGate = document.getElementById("enterGate");
  const discordLink = document.getElementById("discordLink");
  const discordWarning = document.getElementById("discordWarning");
  const continueDiscord = document.getElementById("continueDiscord");
  const audioEl = document.getElementById("track");
  const playButton = document.getElementById("playToggle");
  const fileInput = document.getElementById("trackPicker");
  const statusEl = document.getElementById("audioStatus");

  window.startTabTitleEffect = function startTabTitleEffect() {
    if (window.startTabTitleEffect.started) return;
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

  function unlockGate() {
    enterGate.setAttribute("aria-hidden", "true");
    enterGate.setAttribute("tabindex", "-1");
    window.setTimeout(() => {
      enterGate.hidden = true;
    }, 380);
  }

  async function enterSite() {
    unlockGate();
    await window.FluidAudio.play();
  }

  enterGate.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    enterSite();
  });

  enterGate.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
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

  window.FluidAudio.init({
    audioEl,
    playButton,
    fileInput,
    statusEl,
  });

  function setupGui() {
    if (!window.dat || !window.FluidSimulation) return;

    const sim = window.FluidSimulation;
    const gui = new dat.GUI({ width: 320 });
    gui.domElement.id = "fluidGui";

    const refreshFramebuffers = () => sim.initFramebuffers();
    const refreshKeywords = () => sim.updateKeywords();
    const refreshBase = () => sim.refreshAudioBaseValues();
    const refreshBands = () => sim.updateAudioBands();

    const simFolder = gui.addFolder("Sim");
    simFolder.add(sim.config, "DENSITY_DISSIPATION", 0, 4, 0.01).name("Density Diffusion");
    simFolder.add(sim.config, "VELOCITY_DISSIPATION", 0, 1, 0.01).name("Velocity Diffusion");
    simFolder.add(sim.config, "PRESSURE", 0, 1, 0.01).name("Pressure");
    simFolder.add(sim.config, "CURL", 0, 50, 1).name("Base Vorticity").onChange(refreshBase);
    simFolder.add(sim.config, "SPLAT_RADIUS", 0.01, 1, 0.01).name("Splat Radius").onChange(refreshBase);
    simFolder.add(sim.config, "BLOOM").name("Bloom").onChange(refreshKeywords);
    simFolder.add(sim.config, "BLOOM_INTENSITY", 0, 2, 0.01).name("Bloom Intensity").onChange(refreshBase);
    simFolder.add(sim.config, "SUNRAYS").name("Sunrays").onChange(refreshKeywords);
    simFolder.add(sim.config, "SUNRAYS_WEIGHT", 0, 2, 0.01).name("Sunrays Weight");
    simFolder.add(sim.config, "DYE_RESOLUTION", [128, 256, 512, 1024]).name("Dye Resolution").onChange(refreshFramebuffers);
    simFolder.add(sim.config, "SIM_RESOLUTION", [32, 64, 128, 256]).name("Sim Resolution").onChange(refreshFramebuffers);

    const audioFolder = gui.addFolder("Audio");
    audioFolder.add({ PlayPause: () => window.FluidAudio.toggle() }, "PlayPause").name("Play/Pause");
    audioFolder.add({ ChooseMP3: () => fileInput.click() }, "ChooseMP3").name("Choose MP3");
    audioFolder.add(sim.config, "BEAT_SENSITIVITY", 0.5, 4, 0.01).name("Beat Sensitivity");
    audioFolder.add(sim.config, "VOCAL_SENSITIVITY", 0, 4, 0.01).name("Vocal Sensitivity");
    audioFolder.add(sim.config, "VOCAL_DANCE_AMOUNT", 0, 3, 0.01).name("Dance Amount");
    audioFolder.add(sim.config, "KICK_LOW_HZ", 10, 220, 1).name("Kick Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "KICK_HIGH_HZ", 40, 300, 1).name("Kick High Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "VOCAL_LOW_HZ", 120, 900, 1).name("Vocal Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "VOCAL_HIGH_HZ", 1200, 5000, 1).name("Vocal High Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "PRESENCE_LOW_HZ", 2500, 7000, 1).name("Presence Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "PRESENCE_HIGH_HZ", 6000, 14000, 1).name("Presence High Hz").onChange(refreshBands);

    const mouseFolder = gui.addFolder("Mouse");
    mouseFolder.add(sim.config, "MOUSE_FORCE_MULTIPLIER", 0, 5, 0.01).name("Mouse Reactivity");
    mouseFolder.add(sim.config, "AUDIO_BIAS_TO_CURSOR").name("Beat Follows Cursor");
    mouseFolder.add(sim.config, "AMBIENT_IDLE_SPLATS").name("Ambient Idle");

    simFolder.open();
    audioFolder.open();
  }

  setupGui();
})();
