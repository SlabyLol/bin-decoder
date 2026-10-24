# BIN Decoder

GitHub Pages Tool, das .bin-Dateien analysiert und hilft herauszufinden, wie sie encoded sind – damit echte, lesbare Dateien rauskommen.

## Features

- Drag & Drop Upload
- Entropy-Analyse (erkennen von Kompression / Verschlüsselung)
- Hex-Dump mit Offset-Steuerung
- Text-Preview mit verschiedenen Encodings (UTF-8, Latin-1, UTF-16, …)
- Erkennung bekannter Magic Numbers (PNG, JPEG, ZIP, PDF, ELF, PE, UnityFS, …)
- Extraktion eingebetteter Dateien zum Download
- XOR-Tools inkl. Brute-Force häufiger Keys

## Live

Nach Aktivierung von GitHub Pages:

**https://slabylol.github.io/bin-decoder/**

## GitHub Pages aktivieren

1. Repo öffnen → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/ (root)`
4. Save

Danach ist die Seite in 1–2 Minuten online.

## Nutzung

Einfach eine .bin / .dat / .rom / .img Datei reinziehen. Das Tool zeigt dir sofort Hinweise, Signaturen und gibt dir die Möglichkeit, gefundene Stücke als echte Dateien herunterzuladen.