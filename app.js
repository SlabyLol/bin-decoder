const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const results = document.getElementById('results');

let fileBuffer = null;
let fileName = '';

// File signatures (magic numbers)
const SIGNATURES = [
  { name: 'PNG Image', ext: 'png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { name: 'JPEG Image', ext: 'jpg', bytes: [0xFF, 0xD8, 0xFF] },
  { name: 'GIF Image', ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { name: 'BMP Image', ext: 'bmp', bytes: [0x42, 0x4D] },
  { name: 'WebP Image', ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46], extra: (buf, off) => buf[off+8]===0x57 && buf[off+9]===0x45 && buf[off+10]===0x42 && buf[off+11]===0x50 },
  { name: 'ZIP Archive', ext: 'zip', bytes: [0x50, 0x4B, 0x03, 0x04] },
  { name: 'ZIP (empty)', ext: 'zip', bytes: [0x50, 0x4B, 0x05, 0x06] },
  { name: 'RAR Archive', ext: 'rar', bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] },
  { name: '7z Archive', ext: '7z', bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] },
  { name: 'PDF Document', ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { name: 'ELF Binary', ext: 'elf', bytes: [0x7F, 0x45, 0x4C, 0x46] },
  { name: 'PE Executable', ext: 'exe', bytes: [0x4D, 0x5A] },
  { name: 'Mach-O (32-bit)', ext: 'macho', bytes: [0xFE, 0xED, 0xFA, 0xCE] },
  { name: 'Mach-O (64-bit)', ext: 'macho', bytes: [0xFE, 0xED, 0xFA, 0xCF] },
  { name: 'GZIP', ext: 'gz', bytes: [0x1F, 0x8B] },
  { name: 'BZIP2', ext: 'bz2', bytes: [0x42, 0x5A, 0x68] },
  { name: 'XZ / LZMA', ext: 'xz', bytes: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00] },
  { name: 'SQLite DB', ext: 'sqlite', bytes: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65] },
  { name: 'RIFF (AVI/WAV)', ext: 'riff', bytes: [0x52, 0x49, 0x46, 0x46] },
  { name: 'OGG Media', ext: 'ogg', bytes: [0x4F, 0x67, 0x67, 0x53] },
  { name: 'MP3 (ID3)', ext: 'mp3', bytes: [0x49, 0x44, 0x33] },
  { name: 'MP3 (Frame)', ext: 'mp3', bytes: [0xFF, 0xFB] },
  { name: 'FLAC Audio', ext: 'flac', bytes: [0x66, 0x4C, 0x61, 0x43] },
  { name: 'ISO 9660', ext: 'iso', bytes: [0x43, 0x44, 0x30, 0x30, 0x31] },
  { name: 'TAR Archive', ext: 'tar', bytes: [0x75, 0x73, 0x74, 0x61, 0x72], offsetCheck: 257 },
  { name: 'Microsoft Office (OLE)', ext: 'doc', bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },
  { name: 'Java Class', ext: 'class', bytes: [0xCA, 0xFE, 0xBA, 0xBE] },
  { name: 'WASM Module', ext: 'wasm', bytes: [0x00, 0x61, 0x73, 0x6D] },
  { name: 'Android DEX', ext: 'dex', bytes: [0x64, 0x65, 0x78, 0x0A] },
  { name: 'UnityFS Asset', ext: 'unity3d', bytes: [0x55, 0x6E, 0x69, 0x74, 0x79, 0x46, 0x53] },
  { name: 'Valve VPK', ext: 'vpk', bytes: [0x34, 0x12, 0xAA, 0x55] },
];

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

async function handleFile(file) {
  fileName = file.name;
  const ab = await file.arrayBuffer();
  fileBuffer = new Uint8Array(ab);

  results.classList.remove('hidden');
  document.getElementById('fileName').textContent = fileName;
  document.getElementById('fileSize').textContent = formatSize(fileBuffer.length);

  const ent = calcEntropy(fileBuffer);
  document.getElementById('entropy').textContent = ent.toFixed(3) + (ent > 7.5 ? ' (hoch / packed?)' : ent < 4 ? ' (niedrig / text?)' : '');

  const typeHint = guessType(fileBuffer);
  document.getElementById('typeHint').textContent = typeHint;

  renderOverview();
  renderHex();
  renderText();
  renderSignatures();
  renderExtract();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function calcEntropy(buf) {
  if (!buf.length) return 0;
  const freq = new Array(256).fill(0);
  for (let i = 0; i < buf.length; i++) freq[buf[i]]++;
  let ent = 0;
  const len = buf.length;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function guessType(buf) {
  if (buf.length < 4) return 'Zu klein';
  for (const sig of SIGNATURES) {
    const off = sig.offsetCheck || 0;
    if (buf.length < off + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buf[off + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match && (!sig.extra || sig.extra(buf, off))) return sig.name;
  }
  // printable ratio
  let printable = 0;
  const sample = Math.min(buf.length, 4096);
  for (let i = 0; i < sample; i++) {
    const b = buf[i];
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) printable++;
  }
  const ratio = printable / sample;
  if (ratio > 0.85) return 'Wahrscheinlich Text / Script';
  if (ratio > 0.6) return 'Teilweise Text';
  return 'Unbekannt / Binary / Packed';
}

function renderOverview() {
  const buf = fileBuffer;
  const el = document.getElementById('overviewContent');
  const sigs = findSignatures(buf);
  const printable = countPrintable(buf, 0, Math.min(buf.length, 8192));

  let html = '<ul>';
  html += `<li><strong>Größe:</strong> ${formatSize(buf.length)} (${buf.length.toLocaleString()} Bytes)</li>`;
  html += `<li><strong>Entropy:</strong> ${calcEntropy(buf).toFixed(3)} – ${calcEntropy(buf) > 7.5 ? 'sehr hoch (verschlüsselt/komprimiert?)' : calcEntropy(buf) < 4.5 ? 'niedrig (viel Struktur/Text)' : 'mittel'}</li>`;
  html += `<li><strong>Printable-Anteil (erste 8 KB):</strong> ${(printable * 100).toFixed(1)}%</li>`;
  html += `<li><strong>Gefundene Signaturen:</strong> ${sigs.length}</li>`;
  if (sigs.length) {
    html += '<li><strong>Typen:</strong> ' + [...new Set(sigs.map(s => s.name))].join(', ') + '</li>';
  }
  // null bytes density
  let nulls = 0;
  for (let i = 0; i < Math.min(buf.length, 4096); i++) if (buf[i] === 0) nulls++;
  html += `<li><strong>Null-Bytes (erste 4 KB):</strong> ${nulls} (${(nulls/Math.min(buf.length,4096)*100).toFixed(1)}%)</li>`;
  html += '</ul>';
  el.innerHTML = html;
}

function countPrintable(buf, start, end) {
  let c = 0;
  for (let i = start; i < end; i++) {
    const b = buf[i];
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) c++;
  }
  return c / (end - start);
}

function renderHex() {
  const offset = parseInt(document.getElementById('hexOffset').value) || 0;
  const length = parseInt(document.getElementById('hexLength').value) || 512;
  const buf = fileBuffer;
  const end = Math.min(offset + length, buf.length);
  let out = '';

  for (let i = offset; i < end; i += 16) {
    const hexParts = [];
    const asciiParts = [];
    for (let j = 0; j < 16; j++) {
      if (i + j < end) {
        const b = buf[i + j];
        hexParts.push(b.toString(16).padStart(2, '0').toUpperCase());
        asciiParts.push(b >= 32 && b <= 126 ? String.fromCharCode(b) : '.');
      } else {
        hexParts.push('  ');
        asciiParts.push(' ');
      }
    }
    const addr = i.toString(16).padStart(8, '0').toUpperCase();
    out += addr + '  ' + hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ') + '  |' + asciiParts.join('') + '|\n';
  }
  document.getElementById('hexDump').textContent = out || '(leer)';
}

document.getElementById('hexRefresh').addEventListener('click', renderHex);

function renderText() {
  const enc = document.getElementById('encodingSelect').value;
  const buf = fileBuffer;
  const max = Math.min(buf.length, 32768);
  let text = '';
  try {
    const decoder = new TextDecoder(enc, { fatal: false });
    text = decoder.decode(buf.slice(0, max));
  } catch (e) {
    text = '(Dekodierung fehlgeschlagen)';
  }
  // clean control chars except newline/tab
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '.');
  document.getElementById('textPreview').textContent = text;

  const printable = countPrintable(buf, 0, max);
  document.getElementById('encodingStats').textContent =
    `Zeige erste ${formatSize(max)}. Printable-Anteil: ${(printable * 100).toFixed(1)}%`;
}

document.getElementById('textRefresh').addEventListener('click', renderText);
document.getElementById('encodingSelect').addEventListener('change', renderText);

function findSignatures(buf) {
  const found = [];
  const maxScan = Math.min(buf.length, 2 * 1024 * 1024); // scan first 2 MB

  for (let off = 0; off < maxScan; off++) {
    for (const sig of SIGNATURES) {
      const checkOff = sig.offsetCheck ? off : off;
      if (sig.offsetCheck && off !== 0) continue; // only check special offset at start for TAR etc for simplicity
      const start = sig.offsetCheck || off;
      if (start + sig.bytes.length > buf.length) continue;

      let match = true;
      for (let i = 0; i < sig.bytes.length; i++) {
        if (buf[start + i] !== sig.bytes[i]) { match = false; break; }
      }
      if (match && (!sig.extra || sig.extra(buf, start))) {
        // avoid duplicates close together
        if (!found.some(f => f.offset === start && f.name === sig.name)) {
          found.push({ name: sig.name, ext: sig.ext, offset: start, bytes: sig.bytes });
        }
      }
    }
  }
  // also scan for signatures not only at start for TAR etc is limited, but good enough
  return found.sort((a, b) => a.offset - b.offset);
}

function renderSignatures() {
  const sigs = findSignatures(fileBuffer);
  const el = document.getElementById('signaturesList');
  if (!sigs.length) {
    el.innerHTML = '<p class="hint">Keine bekannten Magic Numbers gefunden.</p>';
    return;
  }
  el.innerHTML = sigs.map(s => `
    <div class="sig-item">
      <div>
        <strong>${s.name}</strong>
        <div class="meta">Offset: 0x${s.offset.toString(16).toUpperCase()} (${s.offset}) · Ext: .${s.ext}</div>
      </div>
      <span class="badge badge-ok">gefunden</span>
    </div>
  `).join('');
}

function renderExtract() {
  const sigs = findSignatures(fileBuffer);
  const el = document.getElementById('extractList');
  if (!sigs.length) {
    el.innerHTML = '<p class="hint">Nichts zum Extrahieren gefunden. Versuche XOR oder andere Encodings.</p>';
    return;
  }

  // for each signature, try to estimate a reasonable slice
  el.innerHTML = sigs.map((s, idx) => {
    // naive size: until next signature or end, max 16MB
    const next = sigs[idx + 1];
    let size = next ? (next.offset - s.offset) : Math.min(fileBuffer.length - s.offset, 16 * 1024 * 1024);
    if (size < 16) size = Math.min(fileBuffer.length - s.offset, 64 * 1024);

    return `
      <div class="extract-item">
        <div>
          <strong>${s.name}</strong>
          <div class="meta">Offset 0x${s.offset.toString(16).toUpperCase()} · ~${formatSize(size)}</div>
        </div>
        <button data-offset="${s.offset}" data-size="${size}" data-ext="${s.ext}" data-name="${s.name}">Download</button>
      </div>
    `;
  }).join('');

  el.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const off = parseInt(btn.dataset.offset);
      const size = parseInt(btn.dataset.size);
      const ext = btn.dataset.ext;
      const name = btn.dataset.name.replace(/\s+/g, '_');
      const slice = fileBuffer.slice(off, off + size);
      downloadBlob(slice, `${name}_0x${off.toString(16)}.${ext}`);
    });
  });
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// XOR tools
document.getElementById('xorApply').addEventListener('click', () => {
  const keyHex = document.getElementById('xorKey').value.trim().replace(/\s+/g, '');
  if (!keyHex) return;
  const key = [];
  for (let i = 0; i < keyHex.length; i += 2) {
    key.push(parseInt(keyHex.substr(i, 2), 16));
  }
  if (key.some(isNaN)) {
    document.getElementById('xorPreview').textContent = 'Ungültiger Hex-Key';
    return;
  }
  const result = xorBuffer(fileBuffer, key);
  showXorPreview(result);
});

document.getElementById('xorBrute').addEventListener('click', () => {
  const commonKeys = [
    [0x00], [0xFF], [0x55], [0xAA], [0x12], [0x34], [0x42], [0x69],
    [0xDE, 0xAD], [0xBE, 0xEF], [0xCA, 0xFE], [0x13, 0x37],
    [0x01], [0x80], [0x7F]
  ];
  const resultsEl = document.getElementById('xorResults');
  resultsEl.innerHTML = '<p>Teste häufige Keys…</p>';

  let best = [];
  for (const key of commonKeys) {
    const xored = xorBuffer(fileBuffer.slice(0, 4096), key);
    const score = countPrintable(xored, 0, xored.length);
    best.push({ key, score, sample: xored });
  }
  best.sort((a, b) => b.score - a.score);

  resultsEl.innerHTML = best.slice(0, 6).map(b => {
    const keyStr = b.key.map(k => k.toString(16).padStart(2, '0')).join('').toUpperCase();
    const preview = new TextDecoder('utf-8', { fatal: false }).decode(b.sample.slice(0, 120))
      .replace(/[\x00-\x1F\x7F]/g, '.');
    return `<div class="xor-hit">
      <strong>Key: ${keyStr}</strong> · Printable: ${(b.score * 100).toFixed(1)}%
      <div style="margin-top:0.4rem;opacity:0.85">${preview}</div>
      <button style="margin-top:0.5rem" data-key="${keyStr}">Diesen Key anwenden</button>
    </div>`;
  }).join('');

  resultsEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('xorKey').value = btn.dataset.key;
      document.getElementById('xorApply').click();
    });
  });
});

function xorBuffer(buf, key) {
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ key[i % key.length];
  }
  return out;
}

function showXorPreview(buf) {
  const max = Math.min(buf.length, 8192);
  let text = '';
  try {
    text = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, max));
  } catch {
    text = '(Fehler)';
  }
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '.');
  document.getElementById('xorPreview').textContent = text;

  // also offer download of full xored file
  const existing = document.getElementById('xorDownloadBtn');
  if (existing) existing.remove();
  const btn = document.createElement('button');
  btn.id = 'xorDownloadBtn';
  btn.textContent = 'XOR-Ergebnis als Datei speichern';
  btn.style.marginTop = '1rem';
  btn.onclick = () => downloadBlob(buf, fileName.replace(/\.\w+$/, '') + '_xored.bin');
  document.getElementById('xorPreview').after(btn);
}
