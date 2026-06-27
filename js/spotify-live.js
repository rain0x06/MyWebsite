(function () {
  "use strict";

  const AUTH_URL = "https://accounts.spotify.com/authorize";
  const TOKEN_URL = "https://accounts.spotify.com/api/token";
  const API_BASE = "https://api.spotify.com/v1";
  const CLIENT_ID_KEY = "rain0x.spotifyClientId";
  const TOKEN_KEY = "rain0x.spotifyToken";
  const VERIFIER_KEY = "rain0x.spotifyVerifier";
  const STATE_KEY = "rain0x.spotifyState";
  const SCOPES = ["user-read-currently-playing", "user-read-playback-state"];

  let elements = {};
  let accessToken = "";
  let tokenExpiresAt = 0;
  let pollTimer = 0;
  let liveTrackUrl = "";

  function redirectUri() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function clientId() {
    return (window.RAIN0X_SPOTIFY_CLIENT_ID || localStorage.getItem(CLIENT_ID_KEY) || "").trim();
  }

  function base64Url(bytes) {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  }

  function randomString() {
    const bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  function saveToken(token) {
    accessToken = token.access_token || "";
    tokenExpiresAt = Date.now() + Math.max(30, Number(token.expires_in || 0) - 30) * 1000;
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ ...token, expiresAt: tokenExpiresAt }));
  }

  function loadToken() {
    try {
      const token = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
      if (!token || !token.access_token || Date.now() >= Number(token.expiresAt || 0)) return false;
      accessToken = token.access_token;
      tokenExpiresAt = Number(token.expiresAt);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function beginAuth() {
    let id = clientId();
    if (!id) {
      id = window.prompt("Spotify Client ID for rain0x.me");
      if (!id) return;
      localStorage.setItem(CLIENT_ID_KEY, id.trim());
    }

    const verifier = randomString();
    const state = randomString();
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const challenge = base64Url(await sha256(verifier));
    const params = new URLSearchParams({
      response_type: "code",
      client_id: id,
      scope: SCOPES.join(" "),
      redirect_uri: redirectUri(),
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
    });
    window.location.href = `${AUTH_URL}?${params}`;
  }

  async function exchangeCode(code) {
    const id = clientId();
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!id || !verifier) return false;
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: id,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
      }),
    });
    if (!response.ok) throw new Error(`spotify token failed ${response.status}`);
    saveToken(await response.json());
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    history.replaceState({}, document.title, redirectUri());
    return true;
  }

  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return false;
    const state = params.get("state");
    if (state !== sessionStorage.getItem(STATE_KEY)) return false;
    await exchangeCode(code);
    return true;
  }

  async function spotifyFetch(path) {
    if (!accessToken || Date.now() >= tokenExpiresAt) return null;
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 204) return null;
    if (response.status === 401) {
      disconnect(false);
      return null;
    }
    if (!response.ok) throw new Error(`spotify api failed ${response.status}`);
    return response.json();
  }

  function formatArtists(track) {
    return (track.artists || []).map((artist) => artist.name).join(", ");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function coverFor(track) {
    return (track.album && track.album.images && track.album.images[0] && track.album.images[0].url) || "assets/rain-pfp.png";
  }

  function openLiveTrack() {
    if (liveTrackUrl) window.open(liveTrackUrl, "_blank", "noopener,noreferrer");
  }

  function renderConnect(message = "") {
    if (!elements.embedEl) return;
    elements.embedEl.classList.add("is-visible");
    const hasClient = Boolean(clientId());
    elements.embedEl.innerHTML = `
      <div class="spotify-live-card">
        <div class="spotify-live-card__title">Spotify live playback</div>
        <div class="spotify-live-card__text">${message || (hasClient ? "Connect Spotify to show your current song and queue." : "Add a Spotify Client ID once, then connect to show your current song and queue.")}</div>
        <div class="spotify-live-actions">
          <button class="spotify-live-button primary" type="button" data-spotify-connect>${hasClient ? "Connect Spotify" : "Set Client ID"}</button>
          ${accessToken ? '<button class="spotify-live-button" type="button" data-spotify-disconnect>Disconnect</button>' : ""}
        </div>
      </div>
    `;
  }

  function renderQueue(queue) {
    if (!elements.trackListEl) return;
    const tracks = (queue || []).filter((item) => item && item.type === "track").slice(0, 20);
    if (!tracks.length) {
      elements.trackListEl.innerHTML = `
        <div class="spotify-live-card">
          <div class="spotify-live-card__title">Queue unavailable</div>
          <div class="spotify-live-card__text">Spotify did not return upcoming tracks for this playback session.</div>
        </div>
      `;
      return;
    }
    elements.trackListEl.innerHTML = tracks.map((track, index) => `
      <button class="track-row spotify-live-row" type="button" data-spotify-url="${escapeHtml(track.external_urls.spotify)}">
        <span class="track-number">${index + 1}</span>
        <img class="track-cover" src="${escapeHtml(coverFor(track))}" alt="">
        <span class="track-main">
          <span class="track-title">${escapeHtml(track.name)}</span>
          <span class="track-artist">${escapeHtml(formatArtists(track))}</span>
        </span>
        <span class="track-album">${escapeHtml(track.album ? track.album.name : "Spotify")}</span>
      </button>
    `).join("");
  }

  function updateHeader(track, playback) {
    liveTrackUrl = track.external_urls.spotify || "";
    if (elements.coverEl) elements.coverEl.src = coverFor(track);
    if (elements.titleEl) elements.titleEl.textContent = track.name;
    if (elements.artistEl) elements.artistEl.textContent = formatArtists(track);
    if (elements.metaEl) elements.metaEl.classList.add("is-link");
    if (elements.currentTimeEl) elements.currentTimeEl.textContent = window.FluidAudio && window.FluidAudio.formatTime ? window.FluidAudio.formatTime(playback.progress_ms / 1000) : "0:00";
    if (elements.durationEl) elements.durationEl.textContent = window.FluidAudio && window.FluidAudio.formatTime ? window.FluidAudio.formatTime(track.duration_ms / 1000) : "";
    if (elements.seekEl) {
      const ratio = track.duration_ms > 0 ? Math.min(1, Math.max(0, playback.progress_ms / track.duration_ms)) : 0;
      elements.seekEl.value = String(Math.round(ratio * 1000));
      elements.seekEl.style.setProperty("--progress", `${ratio * 100}%`);
    }
    if (elements.playButton) elements.playButton.classList.toggle("is-playing", Boolean(playback.is_playing));
  }

  async function refresh() {
    if (!accessToken) {
      renderConnect();
      return;
    }
    try {
      const playback = await spotifyFetch("/me/player");
      if (!playback || !playback.item || playback.item.type !== "track") {
        renderConnect("Spotify is connected, but no track is currently playing.");
        return;
      }
      updateHeader(playback.item, playback);
      elements.embedEl.classList.remove("is-visible");
      elements.embedEl.innerHTML = "";
      const queue = await spotifyFetch("/me/player/queue");
      renderQueue(queue ? queue.queue : []);
    } catch (error) {
      renderConnect("Spotify could not be reached. Reconnect if this keeps happening.");
      document.documentElement.dataset.spotifyLiveError = error.message || "spotify error";
    }
  }

  function startPolling() {
    window.clearInterval(pollTimer);
    refresh();
    pollTimer = window.setInterval(refresh, 5000);
  }

  function disconnect(clearClient = true) {
    accessToken = "";
    tokenExpiresAt = 0;
    localStorage.removeItem(TOKEN_KEY);
    if (clearClient) localStorage.removeItem(CLIENT_ID_KEY);
    window.clearInterval(pollTimer);
    liveTrackUrl = "";
    renderConnect();
  }

  async function init(options) {
    elements = options;
    if (elements.metaEl) elements.metaEl.addEventListener("click", openLiveTrack);
    if (elements.trackListEl) {
      elements.trackListEl.addEventListener("click", (event) => {
        const row = event.target.closest("[data-spotify-url]");
        if (row) window.open(row.dataset.spotifyUrl, "_blank", "noopener,noreferrer");
      });
    }
    if (elements.embedEl) {
      elements.embedEl.addEventListener("click", (event) => {
        if (event.target.closest("[data-spotify-connect]")) beginAuth();
        if (event.target.closest("[data-spotify-disconnect]")) disconnect();
      });
    }
    await handleCallback();
    if (loadToken() || accessToken) startPolling();
    else renderConnect();
  }

  window.SpotifyLive = { init, refresh, disconnect };
})();
