import { mountGlobeTracker, setGlobeRouteAirports, setTrackedFlight } from "./redeye-globe.js";

const SHOWCASE_ORIGIN = {
  icao: "KLAX",
  iata: "LAX",
  name: "Los Angeles International Airport",
  city: "Los Angeles",
  country: "US",
  lat: 33.9425,
  lon: -118.408,
};

const SHOWCASE_DESTINATION = {
  icao: "RJTT",
  iata: "HND",
  name: "Tokyo Haneda Airport",
  city: "Tokyo",
  country: "JP",
  lat: 35.5494,
  lon: 139.7798,
};

const SHOWCASE_CRUISE_KNOTS = 450;
const SHOWCASE_INITIAL_PROGRESS = 0.28;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function showcasePosition(progress) {
  const originLat = toRadians(SHOWCASE_ORIGIN.lat);
  const originLon = toRadians(SHOWCASE_ORIGIN.lon);
  const destinationLat = toRadians(SHOWCASE_DESTINATION.lat);
  const destinationLon = toRadians(SHOWCASE_DESTINATION.lon);
  const angle = 2 * Math.asin(Math.sqrt(
    Math.sin((destinationLat - originLat) / 2) ** 2 +
      Math.cos(originLat) * Math.cos(destinationLat) *
        Math.sin((destinationLon - originLon) / 2) ** 2
  ));
  const denominator = Math.sin(angle);
  const a = Math.sin((1 - progress) * angle) / denominator;
  const b = Math.sin(progress * angle) / denominator;
  const x = a * Math.cos(originLat) * Math.cos(originLon) + b * Math.cos(destinationLat) * Math.cos(destinationLon);
  const y = a * Math.cos(originLat) * Math.sin(originLon) + b * Math.cos(destinationLat) * Math.sin(destinationLon);
  const z = a * Math.sin(originLat) + b * Math.sin(destinationLat);
  return {
    latitude: toDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
    longitude: ((toDegrees(Math.atan2(y, x)) + 540) % 360) - 180,
  };
}

function bearingBetween(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  return (toDegrees(Math.atan2(
    Math.sin(deltaLongitude) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude)
  )) + 360) % 360;
}

function showcaseRouteDurationSeconds() {
  const originLat = toRadians(SHOWCASE_ORIGIN.lat);
  const destinationLat = toRadians(SHOWCASE_DESTINATION.lat);
  const latitudeDelta = destinationLat - originLat;
  const longitudeDelta = toRadians(SHOWCASE_DESTINATION.lon - SHOWCASE_ORIGIN.lon);
  const centralAngle = 2 * Math.asin(Math.sqrt(
    Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(longitudeDelta / 2) ** 2
  ));
  return ((centralAngle * 3440.065) / SHOWCASE_CRUISE_KNOTS) * 60 * 60;
}

function showcaseFlight(progress) {
  const position = showcasePosition(progress);
  const ahead = showcasePosition(Math.min(1, progress + 0.002));
  return {
    icao24: "redeye1",
    callsign: "RE101",
    longitude: position.longitude,
    latitude: position.latitude,
    baroAltitude: 10972.8,
    geoAltitude: 11030,
    velocity: SHOWCASE_CRUISE_KNOTS / 1.94384,
    trueTrack: bearingBetween(position, ahead),
    verticalRate: 0,
    onGround: false,
    observedAt: Date.now(),
    originIata: SHOWCASE_ORIGIN.iata,
    destinationIata: SHOWCASE_DESTINATION.iata,
    routeProgress: progress,
    snapToRoute: true,
  };
}

function updateRedEyeReadout(state) {
  const latitudeLabel = `${Math.abs(state.latitude).toFixed(2)}° ${state.latitude >= 0 ? "N" : "S"}`;
  const longitudeLabel = `${Math.abs(state.longitude).toFixed(2)}° ${state.longitude >= 0 ? "E" : "W"}`;
  document.querySelector("#portfolioRedeyeCoordinates")?.replaceChildren(`${latitudeLabel} · ${longitudeLabel}`);
}

async function mountRedEyePreview() {
  const root = document.querySelector("#portfolioRedeyeGlobe");
  if (!root) return;
  await mountGlobeTracker(root, { compact: true });
  setGlobeRouteAirports(SHOWCASE_ORIGIN, SHOWCASE_DESTINATION);
  const startedAt = Date.now();
  const duration = showcaseRouteDurationSeconds();
  const tick = () => {
    const elapsedProgress = ((Date.now() - startedAt) / 1000) / duration;
    const state = showcaseFlight(Math.min(1, SHOWCASE_INITIAL_PROGRESS + elapsedProgress));
    setTrackedFlight(state);
    updateRedEyeReadout(state);
  };
  tick();
  window.setInterval(tick, 1000);
}

const SEARCH_SUGGESTIONS = [
  "a vintage Sony Walkman",
  "a refurbished PS5",
  "a first-edition Harry Potter book",
  "a Lego Millennium Falcon",
  "a vintage Rolex Submariner",
  "a Nintendo 64 with games",
  "a Canon AE-1 film camera",
  "a sealed Pokémon booster box",
  "a vintage Levi's denim jacket",
  "a signed Michael Jordan card",
  "a Bang & Olufsen turntable",
  "a rare Air Jordan 1 OG",
  "an original Game Boy Color",
  "a vintage Polaroid camera",
  "a MacBook Pro M1 refurbished",
  "a Technics SL-1200 turntable",
  "a sealed N64 cartridge",
  "a vintage Apple iMac G4",
];

function tickerSet(hidden) {
  const items = SEARCH_SUGGESTIONS.map((item) =>
    `<span class="search-ticker-item">${item}</span><span class="search-ticker-dot" aria-hidden="true">•</span>`
  ).join("");
  return `<div class="search-ticker-set" aria-hidden="${hidden}">${items}</div>`;
}

function mountEbayTicker() {
  const root = document.querySelector("#portfolioScoutTicker");
  if (!root) return;
  root.innerHTML = `
    <section class="search-ticker" aria-label="eBay search suggestion ticker">
      <p class="search-ticker-label">Help me look for...</p>
      <div class="search-ticker-bar">
        <span class="search-ticker-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"></path></svg>
        </span>
        <div class="search-ticker-window">
          <div class="search-ticker-track">${tickerSet(false)}${tickerSet(true)}</div>
        </div>
        <a class="search-ticker-button" href="https://rain0x06.github.io/EbayScout/" target="_blank" rel="noreferrer">Search</a>
      </div>
    </section>`;
}

mountEbayTicker();
void mountRedEyePreview();
