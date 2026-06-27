(function () {
  "use strict";

  const playlistTracks = [
    {
      title: "crystallized (feat. Inez)",
      artists: "John Summit, Inez",
      album: "crystallized (feat. Inez)",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0269b2ee70a8319389df3b595e",
      embed: "https://open.spotify.com/embed/track/6YiIWuVXS4AqF1KvUGMwyx?utm_source=generator&si=79d3428071a84c4d",
    },
    {
      title: "4am",
      artists: "soft siren, CASHFORGOLD, Sidewalks and Skeletons",
      album: "4am",
      cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e023b69697f29a5440abafd21bf",
      embed: "https://open.spotify.com/embed/track/0nrnsitY0PL2tSh9iIqEVb?utm_source=generator&si=a82484f8c073439d",
    },
    {
      title: "Zombie",
      artists: "The Cranberries",
      album: "Gold",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02d6e06307a0b89eb7586716e7",
      embed: "https://open.spotify.com/embed/track/49wOjOkS4pBK3PQnPnNYjb?utm_source=generator&si=33c09183f40b4049",
      meta: "Music video",
    },
    {
      title: "Panic",
      artists: "EsDeeKid",
      album: "Rebel",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02cff4bd68d5d0dd9a0a748045",
      embed: "https://open.spotify.com/embed/track/7eCiTvwXk0GEEhWyNmZ7Rv?utm_source=generator&si=afec4edad2ac4c66",
      explicit: true,
      meta: "Music video",
    },
    {
      title: "Magic",
      artists: "Lil Skies",
      album: "Magic",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e020b02e5cf054eccb7e8cbbbaf",
      embed: "https://open.spotify.com/embed/track/5NqOsPI4rA9Bl6LcCftzI2?utm_source=generator&si=0613570434bc4c1c",
      explicit: true,
    },
    {
      title: "Into Dust",
      artists: "Bladee",
      album: "Into Dust",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02b8defb0e020aa43694f07c46",
      embed: "https://open.spotify.com/embed/track/1AStM33V0ADnj9BavZZQv9?utm_source=generator&si=7449b07e5e0c4ce1",
    },
    {
      title: "Love You Anyway",
      artists: "The Marias",
      album: "Submarine",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e028aa339341a0b0c813909c831",
      embed: "https://open.spotify.com/embed/track/3vxvz0JoRDvnx2jG9oPljA?utm_source=generator&si=2f5a978598014b9c",
    },
    {
      title: "Nothin' on You (feat. Bruno Mars)",
      artists: "B.o.B, Bruno Mars",
      album: "B.o.B Presents: The Adventures of Bobby Ray",
      cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a22b5c9ac66f8fa0f9a85540",
      embed: "https://open.spotify.com/embed/track/59dLtGBS26x7kc0rHbaPrq?utm_source=generator&si=c18c13d9b89b4c40",
    },
    {
      title: "Chasing Cars",
      artists: "Snow Patrol",
      album: "Eyes Open",
      cover: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e025da2756220da9b6f17924f8f",
      embed: "https://open.spotify.com/embed/track/5hnyJvgoWiQUYZttV4wXy6?utm_source=generator&si=da4ff655b91c4b9b",
    },
  ];

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
  let currentObjectUrl = null;
  let selectedPlaylistTrack = null;
  let randomizedTracks = [];

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
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
    document.body.classList.toggle("is-entered", isPlaying);
    document.body.classList.toggle("is-locked", !isPlaying);
  }

  function setTrackPickerOpen(isOpen) {
    if (!trackPickerPanel) return;
    trackPickerPanel.hidden = !isOpen;
    document.body.classList.toggle("is-track-picker-open", isOpen);
  }

  function trackSubtitle(track) {
    const parts = [];
    if (track.explicit) parts.push('<span class="track-badge">E</span>');
    if (track.meta) parts.push(`<span class="track-video">${track.meta}</span>`);
    parts.push(track.artists);
    return parts.join(track.meta ? ' <span class="track-dot">&bull;</span> ' : " ");
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

  function renderSpotifyEmbed(track) {
    if (!spotifyEmbedEl || !track) return;
    if (spotifyPlayerCover) spotifyPlayerCover.src = track.cover;
    if (spotifyPlayerTitle) spotifyPlayerTitle.textContent = track.title;
    if (spotifyPlayerArtist) spotifyPlayerArtist.textContent = track.artists;
    spotifyEmbedEl.innerHTML = `
      <iframe
        data-testid="embed-iframe"
        title="Spotify Embed: ${track.title}"
        src="${track.embed}"
        width="100%"
        height="152"
        frameborder="0"
        allowfullscreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"></iframe>
    `;
  }

  function setSpotifyEmbedVisible(isVisible) {
    if (!spotifyEmbedEl) return;
    spotifyEmbedEl.classList.toggle("is-visible", Boolean(isVisible));
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

  async function toggle() {
    if (!audioEl) return false;
    if (audioEl.paused) return play();
    pause();
    return false;
  }

  function selectSpotifyTrack(track) {
    if (!track) return;
    selectedPlaylistTrack = track;
    pauseLocalAudioForSpotify();
    setStatus(track.title);
    renderSpotifyEmbed(track);
    renderPlaylist();
  }

  function setTrackFromFile(file) {
    if (!file || !audioEl || !window.FluidSimulation) return;
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(file);
    selectedPlaylistTrack = null;
    audioEl.dataset.trackName = file.name;
    window.FluidSimulation.setAudioSource(currentObjectUrl, currentObjectUrl);
    setPlayingUi(false);
    setStatus(file.name);
    renderPlaylist();
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
    randomizedTracks = shuffleTracks(playlistTracks);
    selectedPlaylistTrack = randomizedTracks[0] || null;

    if (!audioEl || !window.FluidSimulation) {
      setStatus("audio unavailable");
      return;
    }

    audioEl.dataset.trackName = selectedPlaylistTrack ? selectedPlaylistTrack.title : "Where U From demo";
    const runtime = window.FluidSimulation.initAudio(audioEl);
    setStatus(runtime ? audioEl.dataset.trackName : "audio unsupported");
    renderSpotifyEmbed(selectedPlaylistTrack);
    setTrackPickerOpen(Boolean(selectedPlaylistTrack));

    if (playButton) playButton.addEventListener("click", toggle);
    if (changeTrackButton) changeTrackButton.addEventListener("click", () => setTrackPickerOpen(true));
    if (spotifyPlayerPlay) {
      spotifyPlayerPlay.addEventListener("click", (event) => {
        event.stopPropagation();
        setSpotifyEmbedVisible(!(spotifyEmbedEl && spotifyEmbedEl.classList.contains("is-visible")));
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
  }

  window.FluidAudio = {
    init,
    play,
    pause,
    toggle,
    setTrackFromFile,
    selectSpotifyTrack,
  };
})();
