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
  const changeTrackButton = document.getElementById("changeTrack");
  const trackPickerPanel = document.getElementById("trackPickerPanel");
  const trackListEl = document.getElementById("trackList");
  const spotifyEmbedEl = document.getElementById("spotifyEmbed");
  const spotifyPlayerCover = document.getElementById("spotifyPlayerCover");
  const spotifyPlayerMeta = document.querySelector(".spotify-player__meta");
  const spotifyPlayerTitle = document.getElementById("trackPickerTitle");
  const spotifyPlayerArtist = document.getElementById("spotifyPlayerArtist");
  const spotifyOverlayToggle = document.getElementById("spotifyOverlayToggle");
  const spotifySettings = document.getElementById("spotifySettings");
  const spotifyShuffle = document.getElementById("spotifyShuffle");
  const spotifyPrevious = document.getElementById("spotifyPrevious");
  const spotifyPlayerPlay = document.getElementById("spotifyPlayerPlay");
  const spotifyNext = document.getElementById("spotifyNext");
  const spotifyCurrentTime = document.getElementById("spotifyCurrentTime");
  const spotifyDuration = document.getElementById("spotifyDuration");
  const spotifySeek = document.getElementById("spotifySeek");
  let controlsGui = null;

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

  let hasEntered = false;

  async function enterSite() {
    if (hasEntered) return;
    hasEntered = true;
    if (window.FluidSimulation && typeof window.FluidSimulation.setVisualizerActive === "function") {
      window.FluidSimulation.setVisualizerActive(true);
    }
    unlockGate();
    await window.FluidAudio.autoplay();
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
    changeTrackButton,
    trackPickerPanel,
    trackListEl,
    spotifyEmbedEl,
    spotifyPlayerCover,
    spotifyPlayerTitle,
    spotifyPlayerArtist,
    spotifyShuffle,
    spotifyPrevious,
    spotifyPlayerPlay,
    spotifyNext,
    spotifyCurrentTime,
    spotifyDuration,
    spotifySeek,
  });

  function syncSpotifyToggleState() {
    if (!spotifyOverlayToggle || !window.FluidAudio || typeof window.FluidAudio.isTrackPickerOpen !== "function") return;
    const isOpen = window.FluidAudio.isTrackPickerOpen();
    spotifyOverlayToggle.classList.toggle("is-open", isOpen);
    spotifyOverlayToggle.setAttribute("aria-pressed", isOpen ? "true" : "false");
  }

  if (spotifyOverlayToggle) {
    spotifyOverlayToggle.addEventListener("click", () => {
      window.FluidAudio.toggleTrackPicker();
      syncSpotifyToggleState();
    });
  }

  function setupTrackPanelDrag() {
    if (!trackPickerPanel) return;
    const panel = trackPickerPanel.querySelector(".track-picker__panel");
    const header = trackPickerPanel.querySelector(".track-picker__header");
    if (!panel || !header) return;

    function clampPanel(left, top) {
      const margin = 10;
      const rect = panel.getBoundingClientRect();
      return {
        left: Math.min(window.innerWidth - rect.width - margin, Math.max(margin, left)),
        top: Math.min(window.innerHeight - rect.height - margin, Math.max(margin, top)),
      };
    }

    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button, input, a, .spotify-player__seek")) return;
      const startRect = panel.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      panel.classList.add("is-dragging");
      try {
        header.setPointerCapture(event.pointerId);
      } catch (error) {
        // Synthetic pointer events used in smoke tests do not always create an active pointer.
      }
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.left = `${startRect.left}px`;
      panel.style.top = `${startRect.top}px`;

      function movePanel(moveEvent) {
        const next = clampPanel(startRect.left + moveEvent.clientX - startX, startRect.top + moveEvent.clientY - startY);
        panel.style.left = `${next.left}px`;
        panel.style.top = `${next.top}px`;
      }

      function releasePanel() {
        panel.classList.remove("is-dragging");
        header.removeEventListener("pointermove", movePanel);
        header.removeEventListener("pointerup", releasePanel);
        header.removeEventListener("pointercancel", releasePanel);
      }

      header.addEventListener("pointermove", movePanel);
      header.addEventListener("pointerup", releasePanel);
      header.addEventListener("pointercancel", releasePanel);
    });

    window.addEventListener("resize", () => {
      if (trackPickerPanel.hidden) return;
      const rect = panel.getBoundingClientRect();
      const next = clampPanel(rect.left, rect.top);
      panel.style.left = `${next.left}px`;
      panel.style.top = `${next.top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
  }

  setupTrackPanelDrag();

  if (trackPickerPanel) {
    const observer = new MutationObserver(syncSpotifyToggleState);
    observer.observe(trackPickerPanel, { attributes: true, attributeFilter: ["hidden"] });
    syncSpotifyToggleState();
  }

  if (window.SpotifyLive) {
    window.SpotifyLive.init({
      coverEl: spotifyPlayerCover,
      metaEl: spotifyPlayerMeta,
      titleEl: spotifyPlayerTitle,
      artistEl: spotifyPlayerArtist,
      playButton: spotifyPlayerPlay,
      currentTimeEl: spotifyCurrentTime,
      durationEl: spotifyDuration,
      seekEl: spotifySeek,
      embedEl: spotifyEmbedEl,
      trackListEl,
    });
  }

  function setupGui() {
    if (!window.dat || !window.FluidSimulation) return;

    const sim = window.FluidSimulation;
    const gui = new dat.GUI({ width: 320 });
    controlsGui = gui;
    gui.domElement.id = "fluidGui";

    const refreshFramebuffers = () => sim.initFramebuffers();
    const refreshKeywords = () => {
      sim.updateKeywords();
      sim.initFramebuffers();
    };
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
    simFolder.add(sim.config, "DYE_RESOLUTION", [128, 256, 384, 512, 1024]).name("Dye Resolution").onChange(refreshFramebuffers);
    simFolder.add(sim.config, "SIM_RESOLUTION", [32, 48, 64, 128, 256]).name("Sim Resolution").onChange(refreshFramebuffers);

    const audioFolder = gui.addFolder("Audio");
    audioFolder.add({ PlayPause: () => window.FluidAudio.toggle() }, "PlayPause").name("Play/Pause");
    audioFolder.add({ ChooseMP3: () => fileInput.click() }, "ChooseMP3").name("Choose MP3");
    audioFolder.add(sim.config, "BEAT_SENSITIVITY", 0.5, 4, 0.01).name("Beat Sensitivity");
    audioFolder.add(sim.config, "VOCAL_SENSITIVITY", 0, 4, 0.01).name("Vocal Sensitivity");
    audioFolder.add(sim.config, "VOCAL_DANCE_AMOUNT", 0, 3, 0.01).name("Dance Amount");
    audioFolder.add(sim.config, "VOCAL_PITCH_REACTIVITY", 0, 3, 0.01).name("Pitch Bubbles");
    audioFolder.add(sim.config, "BPM_BUBBLE_REACTIVITY", 0, 3, 0.01).name("BPM Bubbles");
    audioFolder.add(sim.config, "SWAY_SPEED", 0.02, 1.5, 0.01).name("Sway Speed");
    audioFolder.add(sim.config, "SWAY_RADIUS", 0, 0.35, 0.01).name("Sway Radius");
    audioFolder.add(sim.config, "BASS_SWAY_AMOUNT", 0, 2, 0.01).name("Bass Sway");
    audioFolder.add(sim.config, "SWIRL_RESPONSE", 0, 3, 0.01).name("Swirl Response");
    audioFolder.add(sim.config, "BUBBLE_INTENSITY", 0, 2, 0.01).name("Bubble Intensity");
    audioFolder.add(sim.config, "SMOKE_RING_POINTS", 5, 12, 1).name("Ring Points");
    audioFolder.add(sim.config, "SMOKE_RING_RADIUS", 0.015, 0.14, 0.001).name("Ring Radius");
    audioFolder.add(sim.config, "BUBBLE_SPEED", 0.05, 1.4, 0.01).name("Bubble Speed");
    audioFolder.add(sim.config, "BUBBLE_TRAIL", 0.03, 1.4, 0.01).name("Bubble Trail");
    audioFolder.add(sim.config, "MAX_AUDIO_BUBBLES", 2, 24, 1).name("Max Bubbles");
    audioFolder.add(sim.config, "KICK_LOW_HZ", 10, 220, 1).name("Kick Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "KICK_HIGH_HZ", 40, 300, 1).name("Kick High Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "BASS_LOW_HZ", 80, 260, 1).name("Bass Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "BASS_HIGH_HZ", 180, 700, 1).name("Bass High Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "VOCAL_LOW_HZ", 120, 900, 1).name("Vocal Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "VOCAL_HIGH_HZ", 1200, 5000, 1).name("Vocal High Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "PRESENCE_LOW_HZ", 2500, 7000, 1).name("Presence Low Hz").onChange(refreshBands);
    audioFolder.add(sim.config, "PRESENCE_HIGH_HZ", 6000, 14000, 1).name("Presence High Hz").onChange(refreshBands);

    const mouseFolder = gui.addFolder("Mouse");
    mouseFolder.add(sim.config, "MOUSE_FORCE_MULTIPLIER", 0, 5, 0.01).name("Mouse Reactivity");
    mouseFolder.add(sim.config, "MOUSE_SPLAT_INTERVAL_MS", 16, 120, 1).name("Mouse Throttle");
    mouseFolder.add(sim.config, "AUDIO_BIAS_TO_CURSOR").name("Beat Follows Cursor");
    mouseFolder.add(sim.config, "AMBIENT_IDLE_SPLATS").name("Ambient Idle");

    gui.close();
    window.setTimeout(() => {
      if (!gui.closed) gui.close();
    }, 0);
  }

  setupGui();

  if (spotifySettings) {
    spotifySettings.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!controlsGui) return;
      if (controlsGui.closed) controlsGui.open();
      else controlsGui.close();
    });
  }
})();
