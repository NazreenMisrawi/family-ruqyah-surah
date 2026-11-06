# Daily Ruqyah and Surah

Family listening & daily recitation web application.

## Local Setup

Place this entire folder at:

```
E:\Programming\Grok Build\Family Ruqyah Player
```

Then open `index.html` in any modern browser, or serve the folder with a local server.

### Adding Audio Files

Put these three files inside `public/audio/`:

- `Ruqyah Ain.mpeg`
- `Ruqyah Jin.mpeg`
- `Surah Al-Baqarah.mpeg`

Once added, the player will detect them automatically and enable playback.

## GitHub Integration

1. Create a new repository on GitHub (e.g. `family-ruqyah-surah`).
2. In the local folder (`E:\Programming\Grok Build\Family Ruqyah Player`), run:

```bash
git init
git add .
git commit -m "Initial commit: Daily Ruqyah and Surah"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/family-ruqyah-surah.git
git push -u origin main
```

3. Enable GitHub Pages (Settings → Pages → Deploy from branch → main / root) if you want it hosted.

## Project Structure

```
Family Ruqyah Player/
├── index.html              # Complete application
├── README.md
├── package.json
├── .gitignore
├── public/
│   ├── images/             # Recitation images
│   └── audio/              # Place the three .mpeg files here
└── src/                    # Reserved for future modularisation
```

## Features

- Sequential audio player (Audio 1 → Audio 2 → Audio 3 looping)
- Three full recitation cards with Arabic, romanized, Malay, and English
- Independent daily counters with localStorage and automatic daily reset
- Responsive design matching Concept V9
- Graceful handling when audio files are missing
