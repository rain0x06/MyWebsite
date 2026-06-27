(function () {
  "use strict";

  let audioEl = null;
  let statusEl = null;
  let playButton = null;
  let currentObjectUrl = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setPlayingUi(isPlaying) {
    if (playButton) playButton.textContent = isPlaying ? "Pause" : "Play";
    document.body.classList.toggle("is-entered", isPlaying);
    document.body.classList.toggle("is-locked", !isPlaying);
  }

  async function play() {
    const sim = window.FluidSimulation;
    if (!sim || !audioEl) return false;

    const runtime = sim.initAudio(audioEl);
    if (!runtime) {
      setPlayingUi(false);
      setStatus("audio unsupported");
      return false;
    }

    try {
      const started = await sim.startAudio();
      if (!started) {
        setPlayingUi(false);
        setStatus("audio unsupported");
        return false;
      }
      setPlayingUi(true);
      setStatus(audioEl.dataset.trackName || "playing demo");
      return true;
    } catch (error) {
      setPlayingUi(false);
      setStatus("tap play again");
      document.documentElement.dataset.audioPlaybackError = error && error.message ? error.message : "play failed";
      return false;
    }
  }

  function pause() {
    const sim = window.FluidSimulation;
    if (!sim) return;
    sim.pauseAudio();
    setPlayingUi(false);
    setStatus(audioEl && audioEl.dataset.trackName ? audioEl.dataset.trackName : "paused");
  }

  async function toggle() {
    if (!audioEl) return false;
    if (audioEl.paused) return play();
    pause();
    return false;
  }

  function setTrackFromFile(file) {
    if (!file || !audioEl || !window.FluidSimulation) return;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    audioEl.dataset.trackName = file.name;
    window.FluidSimulation.setAudioSource(currentObjectUrl, currentObjectUrl);
    setPlayingUi(false);
    setStatus(file.name);
  }

  function init(options) {
    audioEl = options.audioEl;
    statusEl = options.statusEl;
    playButton = options.playButton;

    if (!audioEl || !window.FluidSimulation) {
      setStatus("audio unavailable");
      return;
    }

    audioEl.dataset.trackName = "Where U From demo";
    const runtime = window.FluidSimulation.initAudio(audioEl);
    setStatus(runtime ? "demo loaded" : "audio unsupported");

    if (playButton) playButton.addEventListener("click", toggle);
    if (options.fileInput) {
      options.fileInput.addEventListener("change", (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) setTrackFromFile(file);
      });
    }

    audioEl.addEventListener("pause", () => {
      if (!audioEl.ended) setPlayingUi(false);
    });
    audioEl.addEventListener("play", () => setPlayingUi(true));
  }

  window.FluidAudio = {
    init,
    play,
    pause,
    toggle,
    setTrackFromFile,
  };
})();
