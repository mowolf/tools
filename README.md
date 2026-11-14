# Tools

A static, private-on-device video speed changer. Select a video, enter a factor (default 10×), and export an MP4. Audio is tempo-adjusted while preserving pitch; it can also be removed. FFmpeg WebAssembly runs entirely in the browser with a single-thread core, so GitHub Pages needs no special cross-origin isolation headers. Modern desktop browsers recommended; large videos may exceed browser memory.

Node.js is used for preparing static assets. GitHub Pages cannot run a Node.js backend. Video conversion runs in browser JavaScript, not on a server. All engine assets are served from the same site; videos are never uploaded.

## Local development

```sh
npm install
npm run check
npm run build
npx --yes http-server dist
```

Open the HTTP URL. Opening index.html directly from disk does not support workers. Preview playback rates are browser-limited; export supports factors from 0.1 through 100. First engine load downloads approximately 32 MB. Dependencies are pinned in package.json; commit the generated package-lock.json after installation for fully repeatable transitive dependencies.

## Publish to mowolf/tools

After authenticating GitHub CLI with an account allowed to create repositories:

```sh
git init -b main
git add .
git commit -m "Add browser video speed changer"
gh repo create mowolf/tools --public --source=. --remote=origin
gh api repos/mowolf/tools/pages --method POST --input - <<'JSON'
{"build_type":"workflow"}
JSON
git push -u origin main
```

The Pages workflow builds and deploys the site. Expected address after successful deployment: https://mowolf.github.io/tools/

Alternatively create an empty public repository named tools in GitHub, push this directory, and set Settings → Pages → Source to GitHub Actions. Rerun the workflow if it ran before Pages was enabled.

## Verification status

JavaScript syntax checks were run. Dependency installation, browser conversion, and GitHub deployment could not be verified in the authoring environment because network access and GitHub authentication were unavailable.
