(function () {
  "use strict";

  const playlistTracks = [
    {
      title: "crystallized (feat. Inez)",
      artists: "John Summit, Inez",
      album: "crystallized (feat. Inez)",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0269b2ee70a8319389df3b595e",
      embed: "https://open.spotify.com/embed/track/6YiIWuVXS4AqF1KvUGMwyx?utm_source=generator&si=79d3428071a84c4d",
      audioFile: "crystallized-feat-inez.mp3",
    },
    {
      title: "4am",
      artists: "soft siren, CASHFORGOLD, Sidewalks and Skeletons",
      album: "4am",
      cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023b69697f29a5440abafd21bf",
      embed: "https://open.spotify.com/embed/track/0nrnsitY0PL2tSh9iIqEVb?utm_source=generator&si=a82484f8c073439d",
      audioFile: "4am.mp3",
    },
    {
      title: "Zombie",
      artists: "The Cranberries",
      album: "Gold",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02d6e06307a0b89eb7586716e7",
      embed: "https://open.spotify.com/embed/track/49wOjOkS4pBK3PQnPnNYjb?utm_source=generator&si=33c09183f40b4049",
      audioFile: "zombie.mp3",
      meta: "Music video",
    },
    {
      title: "Panic",
      artists: "EsDeeKid",
      album: "Rebel",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02cff4bd68d5d0dd9a0a748045",
      embed: "https://open.spotify.com/embed/track/7eCiTvwXk0GEEhWyNmZ7Rv?utm_source=generator&si=afec4edad2ac4c66",
      audioFile: "panic.mp3",
      explicit: true,
      meta: "Music video",
    },
    {
      title: "Magic",
      artists: "Lil Skies",
      album: "Magic",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e020b02e5cf054eccb7e8cbbbaf",
      embed: "https://open.spotify.com/embed/track/5NqOsPI4rA9Bl6LcCftzI2?utm_source=generator&si=0613570434bc4c1c",
      audioFile: "magic.mp3",
      explicit: true,
    },
    {
      title: "Into Dust",
      artists: "Bladee",
      album: "Into Dust",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02b8defb0e020aa43694f07c46",
      embed: "https://open.spotify.com/embed/track/1AStM33V0ADnj9BavZZQv9?utm_source=generator&si=7449b07e5e0c4ce1",
      audioFile: "into-dust.mp3",
    },
    {
      title: "Love You Anyway",
      artists: "The Marias",
      album: "Submarine",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e028aa339341a0b0c813909c831",
      embed: "https://open.spotify.com/embed/track/3vxvz0JoRDvnx2jG9oPljA?utm_source=generator&si=2f5a978598014b9c",
      audioFile: "love-you-anyway.mp3",
    },
    {
      title: "Nothin' on You (feat. Bruno Mars)",
      artists: "B.o.B, Bruno Mars",
      album: "B.o.B Presents: The Adventures of Bobby Ray",
      cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a22b5c9ac66f8fa0f9a85540",
      embed: "https://open.spotify.com/embed/track/59dLtGBS26x7kc0rHbaPrq?utm_source=generator&si=c18c13d9b89b4c40",
      audioFile: "nothin-on-you-feat-bruno-mars.mp3",
    },
    {
      title: "Chasing Cars",
      artists: "Snow Patrol",
      album: "Eyes Open",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e025da2756220da9b6f17924f8f",
      embed: "https://open.spotify.com/embed/track/5hnyJvgoWiQUYZttV4wXy6?utm_source=generator&si=da4ff655b91c4b9b",
      audioFile: "chasing-cars.mp3",
    },
  ];

  const LOCAL_TRACK_BASE = "tracks/";

  let audioEl = null;
  let statusEl = null;
  let playButton = null;
  let changeTrackButton = null;
  let trackPickerPanel = null;
  let trackListEl = null;
  let spotifyEmbedEl = null;
  let spotifyPlayerCover = null;
  let spotifyPlayerTitle = null;
  let spotifyPlayerArtist = null;
  let spotifyPlayerPlay = null;
  let spotifyCurrentTime = null;
  let spotifyDuration = null;
  let spotifySeek = null;
  let isSeeking = false;
  let currentObjectUrl = null;
  let selectedPlaylistTrack = null;
  let randomizedTracks = [];
  let spotifyEmbedTrack = "";
  let localTrackManifest = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
    const whole = Math.floor(seconds);
    const minutes = Math.floor(whole / 60);
    const remainder = whole % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function updateTimeline() {
    if (!audioEl) return;
    const duration = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
    const current = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
    if (spotifyCurrentTime) spotifyCurrentTime.textContent = formatTime(current);
    if (spotifyDuration) spotifyDuration.textContent = formatTime(duration);
    if (spotifySeek) {
      spotifySeek.disabled = duration <= 0;
      if (!isSeeking) spotifySeek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
      spotifySeek.style.setProperty("--progress", `${duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0}%`);
    }
  }

  function shuffleTracks(tracks) {
    const shuffled = tracks.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function setPlayingUi(isPlaying) {
    if (playButton) playButton.textContent = isPlaying ? "Pause" : "Play";
    if (spotifyPlayerPlay) {
      spotifyPlayerPlay.classList.toggle("is-playing", isPlaying);
      spotifyPlayerPlay.setAttribute("aria-label", isPlaying ? "Pause track" : "Play track");
    }
    document.body.classList.toggle("is-entered", isPlaying);
    document.body.classList.toggle("is-locked", !isPlaying);
  }

  function setTrackPickerOpen(isOpen) {
    if (!trackPickerPanel) return;
    trackPickerPanel.hidden = !isOpen;
    document.body.classList.toggle("is-track-picker-open", isOpen);
  }

  function setEnteredIdle() {
    document.body.classList.add("is-entered");
    document.body.classList.remove("is-locked");
    if (playButton) playButton.textContent = "Play";
    if (spotifyPlayerPlay) {
      spotifyPlayerPlay.classList.remove("is-playing");
      spotifyPlayerPlay.setAttribute("aria-label", "Play track");
    }
  }

  function trackSubtitle(track) {
    const parts = [];
    if (track.explicit) parts.push('<span class="track-badge">E</span>');
    if (track.meta) parts.push(`<span class="track-video" aria-label="${track.meta}"></span>`);
    parts.push(track.artists);
    return parts.join(track.meta ? '<span class="track-dot">&bull;</span>' : "");
  }

  function renderPlaylist() {
    if (!trackListEl) return;
    trackListEl.innerHTML = randomizedTracks
      .map((track, index) => {
        const selected = selectedPlaylistTrack && selectedPlaylistTrack.embed === track.embed;
        return `
          <button class="track-row${selected ? " is-selected" : ""}" type="button" role="option" aria-selected="${selected ? "true" : "false"}" data-track-index="${index}">
            <span class="track-number">${index + 1}</span>
            <img class="track-cover" src="${track.cover}" alt="">
            <span class="track-main">
              <span class="track-title">${track.title}</span>
              <span class="track-artist">${trackSubtitle(track)}</span>
            </span>
            <span class="track-album">${track.album}</span>
          </button>
        `;
      })
      .join("");
  }

  function updateSelectedRows() {
    if (!trackListEl) return;
    trackListEl.querySelectorAll(".track-row").forEach((row) => {
      const track = randomizedTracks[Number(row.dataset.trackIndex)];
      const selected = selectedPlaylistTrack && track && selectedPlaylistTrack.embed === track.embed;
      row.classList.toggle("is-selected", Boolean(selected));
      row.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function updateSpotifyPlayer(track) {
    if (!track) return;
    if (spotifyPlayerCover) spotifyPlayerCover.src = track.cover;
    if (spotifyPlayerTitle) spotifyPlayerTitle.textContent = track.title;
    if (spotifyPlayerArtist) spotifyPlayerArtist.textContent = track.artists;
  }

  function renderSpotifyEmbed(track) {
    if (!spotifyEmbedEl || !track) return;
    updateSpotifyPlayer(track);
    if (spotifyEmbedTrack === track.embed && spotifyEmbedEl.querySelector(".spotify-link")) return;
    spotifyEmbedTrack = track.embed;
    const spotifyUrl = track.embed.replace("/embed/track/", "/track/").split("?")[0];
    spotifyEmbedEl.innerHTML = `
      <a class="spotify-link" href="${spotifyUrl}" target="_blank" rel="noopener noreferrer">
        <span>Open in Spotify</span>
        <strong>${track.title}</strong>
      </a>
    `;
  }

  function setSpotifyEmbedVisible(isVisible) {
    if (!spotifyEmbedEl) return;
    if (isVisible && selectedPlaylistTrack) renderSpotifyEmbed(selectedPlaylistTrack);
    spotifyEmbedEl.classList.toggle("is-visible", Boolean(isVisible));
  }

  async function loadLocalTrackManifest() {
    try {
      const response = await fetch(`${LOCAL_TRACK_BASE}manifest.json`, { cache: "no-store" });
      localTrackManifest = response.ok ? await response.json() : null;
    } catch (error) {
      localTrackManifest = null;
    }
    if (selectedPlaylistTrack && audioEl && !audioEl.dataset.trackSrc) {
      const localUrl = resolveLocalTrackUrl(selectedPlaylistTrack);
      if (localUrl) prepareLocalAudioSource(localUrl, selectedPlaylistTrack.title);
    }
  }

  function resolveLocalTrackUrl(track) {
    if (!track || !track.audioFile || !localTrackManifest || typeof localTrackManifest !== "object") return null;
    const manifestValue = localTrackManifest[track.audioFile] || localTrackManifest[track.title];
    if (!manifestValue) return null;
    const fileName = manifestValue === true ? track.audioFile : String(manifestValue);
    return `${LOCAL_TRACK_BASE}${fileName.split("/").map(encodeURIComponent).join("/")}`;
  }

  function ensureAudioRuntime() {
    const sim = window.FluidSimulation;
    if (!sim || !audioEl) return null;
    return sim.initAudio(audioEl);
  }

  function setLocalAudioSource(src, trackName, objectUrl = null) {
    const sim = window.FluidSimulation;
    const runtime = ensureAudioRuntime();
    if (!sim || !runtime) return false;
    if (currentObjectUrl && currentObjectUrl !== objectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = objectUrl;
    audioEl.dataset.trackName = trackName;
    audioEl.dataset.trackSrc = src;
    sim.setAudioSource(src, objectUrl);
    updateTimeline();
    return true;
  }

  async function prepareLocalAudioSource(src, trackName) {
    if (!audioEl || !src) return false;
    if (audioEl.dataset.trackSrc === src && audioEl.src) return true;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
    audioEl.preload = "auto";
    audioEl.dataset.trackName = trackName;
    audioEl.dataset.trackSrc = src;
    try {
      const response = await fetch(src, { cache: "force-cache" });
      if (!response.ok) throw new Error(`audio fetch failed ${response.status}`);
      const blob = await response.blob();
      currentObjectUrl = URL.createObjectURL(blob);
      audioEl.src = currentObjectUrl;
    } catch (error) {
      audioEl.src = src;
    }
    audioEl.load();
    updateTimeline();
    return true;
  }

  async function play() {
    const sim = window.FluidSimulation;
    if (!sim || !audioEl) return false;
    if (!audioEl.currentSrc && !audioEl.src) {
      setStatus(selectedPlaylistTrack ? "use track play" : "select a track");
      setEnteredIdle();
      return false;
    }

    const runtime = ensureAudioRuntime();
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

  function pauseLocalAudioForSpotify() {
    const sim = window.FluidSimulation;
    if (sim) sim.pauseAudio();
    if (playButton) playButton.textContent = "Play";
    document.body.classList.add("is-entered");
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      document.body.classList.add("is-entered");
      document.body.classList.remove("is-locked");
    }, 250);
  }

  function clearLocalAudioSource() {
    pauseLocalAudioForSpotify();
    if (!audioEl) return;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
    audioEl.removeAttribute("src");
    audioEl.dataset.trackSrc = "";
    audioEl.preload = "none";
    audioEl.load();
    updateTimeline();
  }

  async function toggle() {
    if (!audioEl) return false;
    if (audioEl.paused && !audioEl.currentSrc && !audioEl.src && selectedPlaylistTrack) return playSelectedPlaylistTrack();
    if (audioEl.paused) return play();
    pause();
    return false;
  }

  async function playSelectedPlaylistTrack() {
    if (!selectedPlaylistTrack) return toggle();
    const localUrl = resolveLocalTrackUrl(selectedPlaylistTrack);
    if (localUrl) {
      setSpotifyEmbedVisible(false);
      if (audioEl.dataset.trackSrc !== localUrl) {
        const sourceSet = await prepareLocalAudioSource(localUrl, selectedPlaylistTrack.title);
        if (!sourceSet) {
          setStatus("audio unsupported");
          return false;
        }
      }
      return play();
    }

    pauseLocalAudioForSpotify();
    setStatus("add local MP3");
    setSpotifyEmbedVisible(true);
    return false;
  }

  async function selectSpotifyTrack(track) {
    if (!track) return;
    selectedPlaylistTrack = track;
    clearLocalAudioSource();
    setStatus(track.title);
    updateSpotifyPlayer(track);
    setSpotifyEmbedVisible(false);
    const localUrl = resolveLocalTrackUrl(track);
    if (localUrl) await prepareLocalAudioSource(localUrl, track.title);
    updateSelectedRows();
  }

  function setTrackFromFile(file) {
    if (!file || !audioEl || !window.FluidSimulation) return;
    const objectUrl = URL.createObjectURL(file);
    selectedPlaylistTrack = null;
    setLocalAudioSource(objectUrl, file.name, objectUrl);
    setPlayingUi(false);
    setStatus(file.name);
    setSpotifyEmbedVisible(false);
    updateSelectedRows();
  }

  function init(options) {
    audioEl = options.audioEl;
    statusEl = options.statusEl;
    playButton = options.playButton;
    changeTrackButton = options.changeTrackButton;
    trackPickerPanel = options.trackPickerPanel;
    trackListEl = options.trackListEl;
    spotifyEmbedEl = options.spotifyEmbedEl;
    spotifyPlayerCover = options.spotifyPlayerCover;
    spotifyPlayerTitle = options.spotifyPlayerTitle;
    spotifyPlayerArtist = options.spotifyPlayerArtist;
    spotifyPlayerPlay = options.spotifyPlayerPlay;
    spotifyCurrentTime = options.spotifyCurrentTime;
    spotifyDuration = options.spotifyDuration;
    spotifySeek = options.spotifySeek;
    randomizedTracks = shuffleTracks(playlistTracks);
    selectedPlaylistTrack = randomizedTracks[0] || null;
    loadLocalTrackManifest();

    if (!audioEl || !window.FluidSimulation) {
      setStatus("audio unavailable");
      return;
    }

    audioEl.dataset.trackName = selectedPlaylistTrack ? selectedPlaylistTrack.title : "";
    setStatus(selectedPlaylistTrack ? selectedPlaylistTrack.title : "select a track");
    updateSpotifyPlayer(selectedPlaylistTrack);
    updateTimeline();
    setTrackPickerOpen(Boolean(selectedPlaylistTrack));

    if (playButton) playButton.addEventListener("click", toggle);
    if (changeTrackButton) changeTrackButton.addEventListener("click", () => setTrackPickerOpen(true));
    if (spotifyPlayerPlay) {
      spotifyPlayerPlay.addEventListener("click", (event) => {
        event.stopPropagation();
        toggle();
      });
    }
    if (spotifySeek) {
      spotifySeek.addEventListener("pointerdown", () => {
        isSeeking = true;
      });
      spotifySeek.addEventListener("input", () => {
        if (!audioEl || !Number.isFinite(audioEl.duration) || audioEl.duration <= 0) return;
        const nextTime = (Number(spotifySeek.value) / 1000) * audioEl.duration;
        if (spotifyCurrentTime) spotifyCurrentTime.textContent = formatTime(nextTime);
        spotifySeek.style.setProperty("--progress", `${Math.min(100, Math.max(0, (Number(spotifySeek.value) / 1000) * 100))}%`);
      });
      spotifySeek.addEventListener("change", () => {
        if (audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
          audioEl.currentTime = (Number(spotifySeek.value) / 1000) * audioEl.duration;
        }
        isSeeking = false;
        updateTimeline();
      });
      spotifySeek.addEventListener("pointerup", () => {
        isSeeking = false;
        updateTimeline();
      });
    }
    if (trackPickerPanel) {
      trackPickerPanel.addEventListener("click", (event) => {
        const closeTarget = event.target.closest("[data-close-track-picker]");
        if (closeTarget) setTrackPickerOpen(false);
      });
    }
    if (trackListEl) {
      renderPlaylist();
      trackListEl.addEventListener("click", (event) => {
        const row = event.target.closest(".track-row");
        if (!row) return;
        selectSpotifyTrack(randomizedTracks[Number(row.dataset.trackIndex)]);
      });
    }

    audioEl.addEventListener("pause", () => {
      if (!audioEl.ended) setPlayingUi(false);
    });
    audioEl.addEventListener("play", () => setPlayingUi(true));
    audioEl.addEventListener("loadedmetadata", updateTimeline);
    audioEl.addEventListener("durationchange", updateTimeline);
    audioEl.addEventListener("timeupdate", updateTimeline);
    audioEl.addEventListener("seeking", updateTimeline);
    audioEl.addEventListener("seeked", updateTimeline);
    audioEl.addEventListener("ended", () => {
      setPlayingUi(false);
      updateTimeline();
    });
  }

  window.FluidAudio = {
    enterIdle: setEnteredIdle,
    init,
    play,
    pause,
    toggle,
    setTrackFromFile,
    selectSpotifyTrack,
  };
})();
