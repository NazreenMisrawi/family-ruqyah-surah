# Daily Ruqyah and Surah

Family listening and daily recitation web application.

Live site: https://nazreenmisrawi.github.io/family-ruqyah-surah/

## Features

- Sequential audio player (Ruqyah Ain → Ruqyah Jin → Surah Al-Baqarah looping)
- Progress bar, buffer indicator, and seek
- Resume playback position after lock screen or browser close
- Media Session API (lock screen and Control Center controls)
- Three recitation cards with Arabic, romanized, Bahasa Melayu, and English
- Daily counters with localStorage and automatic daily reset
- Mobile accordion for recitation cards
- Image lightbox
- Dark mode toggle
- Keyboard shortcuts (Space = play/pause, arrows = seek)
- PWA manifest and vector icon for Home Screen
- Privacy and Terms pages

## Local Setup

Place this folder at:

```
E:\Programming\Grok Build\Family Ruqyah Player
```

Open `index.html` in a browser, or serve the folder with any static server.

Audio is loaded from a Cloudflare R2 bucket via a Worker (no local audio files required for playback).

## Project Structure

```
Family Ruqyah Player/
├── index.html              # Main page
├── app.js                  # Application logic
├── styles.css              # Styles
├── privacy.html            # Privacy notice
├── terms.html              # Terms of use
├── manifest.json           # PWA manifest
├── icon.svg                # Vector app icon
├── icon-192.png            # PWA icon
├── icon-512.png            # PWA icon
├── favicon.png             # Favicon fallback
├── README.md
├── public/
│   ├── images/             # Recitation card images
│   └── audio/              # Optional local audio backups
└── src/                    # Reserved
```

## GitHub Pages

The site is deployed from the `uat` branch.

Repository: https://github.com/NazreenMisrawi/family-ruqyah-surah

## Version

Current version: 1.5.1
