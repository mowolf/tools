const $ = id => document.getElementById(id);
const file = $('file'), speed = $('speed'), preview = $('preview'), convert = $('convert');
let engine, selected, sourceURL, outputURL, busy = false;
function factor() {
  const n = Number(speed.value);
  if (!Number.isFinite(n) || n < 0.1 || n > 100) throw new Error('Enter a speed factor between 0.1 and 100.');
  return n;
}
function clearOutput() {
  if (outputURL) URL.revokeObjectURL(outputURL);
  outputURL = undefined;
  $('download').hidden = true;
}
function update() {
  clearOutput();
  try {
    const n = factor();
    convert.disabled = !selected || busy;
    if (Number.isFinite(preview.duration)) $('duration').textContent = `${preview.duration.toFixed(1)} seconds → ${(preview.duration / n).toFixed(1)} seconds at ${n}×`;
    try { preview.playbackRate = n; } catch { preview.playbackRate = 1; }
  } catch (e) { convert.disabled = true; $('status').textContent = e.message; }
}
file.addEventListener('change', () => {
  selected = file.files[0];
  if (sourceURL) URL.revokeObjectURL(sourceURL);
  preview.removeAttribute('src');
  preview.hidden = !selected;
  $('filename').textContent = selected?.name || 'No video selected';
  if (selected) { sourceURL = URL.createObjectURL(selected); preview.src = sourceURL; }
  $('status').textContent = selected ? 'Ready to export. Processing stays on this device.' : 'Choose a video to get started.';
  update();
});
preview.addEventListener('loadedmetadata', update);
preview.addEventListener('error', () => { $('status').textContent = 'Browser preview unavailable. You can still try exporting this file.'; });
speed.addEventListener('input', update);
$('audio').addEventListener('change', clearOutput);
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { speed.value = b.dataset.speed; update(); }));
function tempo(n) {
  const filters = [];
  while (n > 2) { filters.push('atempo=2'); n /= 2; }
  while (n < 0.5) { filters.push('atempo=0.5'); n /= 0.5; }
  filters.push(`atempo=${n}`);
  return filters.join(',');
}
function setBusy(value) {
  busy = value;
  file.disabled = speed.disabled = $('audio').disabled = value;
  document.querySelectorAll('[data-speed]').forEach(b => { b.disabled = value; });
  convert.disabled = value || !selected;
  $('cancel').hidden = !value;
  $('progress').hidden = !value;
}
$('cancel').addEventListener('click', () => {
  engine?.terminate();
  engine = undefined;
  $('status').textContent = 'Export cancelled.';
});
convert.addEventListener('click', async () => {
  let current;
  try {
    const n = factor();
    clearOutput();
    setBusy(true);
    preview.pause();
    $('progress').value = 0;
    $('status').textContent = 'Loading video engine… First load downloads about 32 MB.';
    if (!engine) {
      const { FFmpeg } = await import('./ffmpeg.js');
      if (!busy) return;
      engine = new FFmpeg();
      current = engine;
      current.on('progress', ({ progress }) => { $('progress').value = Math.min(0.99, Math.max(0, progress)); });
      await current.load({ coreURL: new URL('./ffmpeg-core.js', location.href).href, wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm' });
    }
    current = engine;
    $('status').textContent = 'Exporting MP4… Keep this tab open.';
    await current.writeFile('input', new Uint8Array(await selected.arrayBuffer()));
    const args = ['-i', 'input', '-map', '0:v:0', '-vf', `setpts=(PTS-STARTPTS)/${n}`, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p'];
    // Even dimensions are required for H.264 yuv420p.
    args[args.indexOf('-vf') + 1] += ',scale=trunc(iw/2)*2:trunc(ih/2)*2';
    if ($('audio').checked) args.push('-map', '0:a:0?', '-af', `asetpts=PTS-STARTPTS,${tempo(n)}`, '-c:a', 'aac');
    else args.push('-an');
    args.push('-movflags', '+faststart', '-y', 'output.mp4');
    const code = await current.exec(args);
    if (code !== 0) throw new Error('This video could not be converted. Try another file or a shorter clip.');
    const bytes = await current.readFile('output.mp4');
    outputURL = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
    $('download').href = outputURL;
    $('download').download = `${selected.name.replace(/\.[^.]+$/, '')}-${n}x.mp4`;
    $('download').hidden = false;
    $('status').textContent = 'Your video is ready. Download the MP4 below.';
  } catch (e) {
    $('status').textContent = engine ? `${e.message || 'Export failed.'} If memory is low, try a smaller video.` : 'Export stopped or the video engine could not load. Check your connection, allow downloads from cdn.jsdelivr.net, and confirm all files from the flat ZIP were uploaded alongside index.html.';
  } finally {
    if (current && engine === current) {
      for (const path of ['input', 'output.mp4']) { try { await current.deleteFile(path); } catch {} }
    }
    setBusy(false);
  }
});
