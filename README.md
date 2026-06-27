# rain0x.me

Static personal site for `rain0x.me`.

## Files

- `index.html` - page markup, icons, and metadata.
- `styles.css` - full-screen video layout, blurred enter gate, and top-right icon styling.
- `script.js` - click-to-enter video/audio/fluid start behavior.
- `fluid-visualizer.js` - WebGL fluid simulation, audio analysis, beat/vocal splats, and pointer motion response.
- `assets/daylight.mp4` - background video/audio.
- `assets/daylight-poster.jpg` - paused-video poster frame shown before entry.
- `assets/rain-pfp.png` - favicon, preview image, and avatar.
- `HUNCHO JACK, Travis Scott, Quavo - Where U From (Audio).mp3` - post-entry audio source for the visualizer.
- `CNAME` - GitHub Pages custom-domain file.

## Visualizer Attribution

The fluid renderer follows the WebGL fluid pipeline used by Pavel Dobryakov's MIT-licensed WebGL Fluid Simulation and the Lively Wallpaper fork: splats, curl/vorticity confinement, pressure projection, gradient subtraction, advection, and final display. This site adds local MP3 analysis for bass onsets, vocal-band movement, and mouse speed/acceleration splats.

## Free Hosting

GitHub Pages is the simplest no-build option:

1. Create a public GitHub repo named something like `rain0x.me`.
2. Upload these files at the repo root.
3. In GitHub, go to Settings -> Pages.
4. Set the source to the main branch root.
5. Add the custom domain `rain0x.me`.

Cloudflare Pages is also free for a static site and pairs well with Cloudflare Email Routing.

## Email

Use `rain@rain0x.me` as a forwarding address. Free forwarding can receive mail at that address and forward it to your real inbox.

Replying as `rain@rain0x.me` requires an outbound sending provider or SMTP setup. Forwarding alone receives mail; it does not create a full mailbox.
