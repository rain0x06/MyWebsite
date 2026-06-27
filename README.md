# rain0x.me

Static personal site for `rain0x.me`.

## Files

- `index.html` - page markup, fluid canvas, audio element, controls, icons, and metadata.
- `styles.css` - full-screen fluid backdrop, entry gate, audio controls, and top-right icon styling.
- `js/fluid.js` - Lively WebGL fluid solver port, shaders, pointer splats, audio-to-fluid choreography, and exported simulation API.
- `js/audio.js` - Web Audio setup, bundled demo track handling, MP3 file swapping, and play/pause state.
- `js/main.js` - entry gate, tab title effect, Discord warning, and dat.gui controls.
- `js/dat.gui.min.js` - tuning panel dependency from the original Lively/WebGL Fluid setup.
- `js/LDR_LLL1_0.png` - dithering texture used by the display shader.
- `assets/rain-pfp.png` - favicon, preview image, and avatar.
- `HUNCHO JACK, Travis Scott, Quavo - Where U From (Audio).mp3` - post-entry audio source for the visualizer.
- `CNAME` - GitHub Pages custom-domain file.

## Visualizer Attribution

The fluid renderer is ported from the MIT-licensed `rocksdanister/WebGL-Fluid-Simulation` `lively` branch, a fork of Pavel Dobryakov's WebGL Fluid Simulation. The original solver/shader pipeline is preserved and the Lively audio/property glue is replaced with browser MP3 analysis, file input, dat.gui controls, and mouse/touch backdrop input.

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
