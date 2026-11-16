/**
 * Daily Ruqyah and Surah — Application Logic
 * Version 1.5.0
 *
 * Main features:
 * - Sequential audio player (Ruqyah Ain → Ruqyah Jin → Surah Al-Baqarah looping)
 * - Progress tracking and seek
 * - Local counter persistence with daily reset
 * - Mobile accordion for recitation cards
 * - Image lightbox
 * - UI sync with media state (handles lock screen / backgrounding)
 *
 * Data is stored only in the browser's localStorage.
 * Audio is loaded from a public Cloudflare R2 bucket.
 */

    
// ─── Configuration ───────────────────────────────────────────
const APP_VERSION = "1.5.1";

    const AUDIO_TRACKS = [
      { id: 1, title: "Ruqyah Ain", filename: "Ruqyah Ain.mpeg", path: "https://ruqyah-audio.nazreen-misrawi.workers.dev/Ruqyah%20Ain.mpeg", description: "Plays first" },
      { id: 2, title: "Ruqyah Jin", filename: "Ruqyah Jin.mpeg", path: "https://ruqyah-audio.nazreen-misrawi.workers.dev/Ruqyah%20Jin.mpeg", description: "Automatically follows Ruqyah Ain" },
      { id: 3, title: "Surah Al-Baqarah", filename: "Surah Al-Baqarah.mpeg", path: "https://ruqyah-audio.nazreen-misrawi.workers.dev/Surah%20Al-Baqarah.mpeg", description: "Repeats until sequence is restarted" }
    ];

    const RECITATIONS = [
      {
        id: 1,
        image: "public/images/Du'a For Full Protection.jpeg",
        number: "RECITATION 1",
        title: "Dua for Full Protection",
        arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
        romanized: "Bismillahil-ladhi la yadurru ma'as-mihi shai'un fil-ardi wa la fis-sama'i, wa Huwas-Sami'ul-'Alim.",
        malay: "Dengan nama Allah yang bila disebut, segala sesuatu di bumi dan langit tidak akan berbahaya, Dia-lah Yang Maha Mendengar lagi Maha Mengetahui.",
        english: "In the Name of Allah with Whose Name there is protection against every kind of harm in the earth or in the heaven, and He is the All-Hearing and All-Knowing",
        schedule: "3x setiap pagi · 3x setiap petang",
        counters: [
          { key: "r1_subuh", label: "SUBUH", max: 3 },
          { key: "r1_asar", label: "ASAR", max: 3 }
        ]
      },
      {
        id: 2,
        image: "public/images/Protection Against Evil Eye.jpeg",
        number: "RECITATION 2",
        title: "Protection Against the Evil Eye",
        arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ",
        romanized: "A'udhu bi kalimatillahit-tammati, min kulli shaitanin wa hammatin wa min kulli 'aynin lammah.",
        malay: "Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari semua setan dan binatang buas, serta dari pandangan mata yang membawa keburukan",
        english: "I seek refuge in the Perfect Words of Allah, from every devil and every beast, and from every evil eye.",
        schedule: "3x selepas Subuh · 3x selepas Asar",
        counters: [
          { key: "r2_subuh", label: "SUBUH", max: 3 },
          { key: "r2_asar", label: "ASAR", max: 3 }
        ]
      },
      {
        id: 3,
        image: "public/images/Daily_Dhikr.jpeg",
        number: "RECITATION 3",
        title: "La ilaha illallah · Daily Dhikr",
        arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
        romanized: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shai'in qadir.",
        malay: "Tiada Tuhan yang berhak disembah melainkan Allah Yang Maha Esa, tidak ada sekutu bagi-Nya, milik-Nya segala kekuasaan dan bagi-Nya segala pujian, dan Dialah Yang Mahakuasa atas segala sesuatunya",
        english: "There is no deity worthy of worship except Allah alone, without partner. To Him belongs all sovereignty and praise, and He has power over all things.",
        schedule: "100x sepanjang hari",
        counters: [
          { key: "r3_daily", label: "DAILY COUNT", max: 100 }
        ],
        caption: "Counter accumulates throughout the day."
      }
    ];

    let currentTrackIndex = 0;
    let isPlaying = false;
    let audioElement = null;
    let audioAvailable = false;

    const STORAGE_KEY = "dailyRuqyahCounters";
    const DATE_KEY = "dailyRuqyahDate";
const POSITION_KEY = "dailyRuqyahPosition";
const THEME_KEY = "dailyRuqyahTheme";

    
// ─── Audio Player ────────────────────────────────────────────
/**
 * Initialises the audio system.
 * Attempts to load the first track with retries and a timeout.
 * Sets audioAvailable once metadata is received.
 */
function initAudio() {
      const statusEl = document.getElementById('audioStatus');
      statusEl.textContent = 'Loading audio…';
      statusEl.style.display = 'block';

      let attempts = 0;
      const maxAttempts = 4;

      function tryLoad() {
        attempts++;
        const testAudio = document.createElement('audio');
        testAudio.preload = 'metadata';
        testAudio.playsInline = true;
        // Only wait for metadata so playback can start while the rest streams
        testAudio.src = AUDIO_TRACKS[0].path;

        const timeout = setTimeout(() => {
          if (!audioAvailable && attempts < maxAttempts) {
            statusEl.textContent = 'Still loading audio… (attempt ' + attempts + ')';
            tryLoad();
          } else if (!audioAvailable) {
            statusEl.textContent = 'Audio is loading slowly. You can still try pressing Play.';
            // Allow the user to attempt playback anyway
            audioAvailable = true;
            updateAudioUI();
          }
        }, 40000);

        testAudio.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          audioAvailable = true;
          updateAudioUI();
        });

        testAudio.addEventListener('error', () => {
          clearTimeout(timeout);
          if (attempts < maxAttempts) {
            statusEl.textContent = 'Retrying audio load…';
            setTimeout(tryLoad, 2000);
          } else if (!audioAvailable) {
            statusEl.textContent = 'Having trouble loading audio. Press Play to try anyway.';
            audioAvailable = true;
            updateAudioUI();
          }
        });
      }

      tryLoad();
      renderOrderList();
    }

    
/**
 * Enables or disables player controls based on whether audio is available.
 */
function updateAudioUI() {
      const statusEl = document.getElementById('audioStatus');
      const playBtn = document.getElementById('playBtn');
      const restartBtn = document.getElementById('restartBtn');
      const totalTime = document.getElementById('totalTime');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      if (!audioAvailable) {
        statusEl.style.display = 'block';
        playBtn.disabled = true;
        restartBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        totalTime.textContent = '--:-- total';
        document.getElementById('currentTitle').textContent = AUDIO_TRACKS[0].title;
        document.getElementById('currentDesc').textContent = AUDIO_TRACKS[0].description;
      } else {
        statusEl.style.display = 'none';
        playBtn.disabled = false;
        restartBtn.disabled = false;
        prevBtn.disabled = false;
        nextBtn.disabled = false;
      }
    }

    
/** Formats seconds as m:ss */

/**
 * Updates the buffer indicator and loading percentage.
 * Shows how much of the current track has been downloaded.
 */
function updateBuffer() {
  if (!audioElement || !audioElement.buffered || !audioElement.duration) return;
  const buffered = audioElement.buffered;
  if (buffered.length > 0) {
    const end = buffered.end(buffered.length - 1);
    const percent = Math.min(100, (end / audioElement.duration) * 100);
    const bufferBar = document.getElementById('bufferBar');
    const loadingEl = document.getElementById('loadingPercent');
    if (bufferBar) bufferBar.style.width = percent + '%';
    if (loadingEl) {
      loadingEl.textContent = percent < 100 ? `Buffered ${Math.round(percent)}%` : '';
    }
  }
}

/**
 * Saves the current track index and playback position to localStorage.
 * Used to resume after the phone is locked or the browser is closed.
 */
function savePosition() {
  if (!audioElement || !audioAvailable) return;
  const data = {
    index: currentTrackIndex,
    time: audioElement.currentTime || 0
  };
  try { localStorage.setItem(POSITION_KEY, JSON.stringify(data)); } catch (e) {}
}

/**
 * Restores the last playback position if one was saved.
 */
function restorePosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.index === 'number' && data.index >= 0 && data.index < AUDIO_TRACKS.length) {
      loadTrack(data.index, false);
      if (audioElement && typeof data.time === 'number') {
        audioElement.addEventListener('loadedmetadata', () => {
          audioElement.currentTime = data.time;
          updateProgress();
        }, { once: true });
      }
    }
  } catch (e) {}
}

/**
 * Updates the Media Session API so the track title and controls
 * appear on the lock screen and in Control Center.
 */
function updateMediaSession() {
  if (!('mediaSession' in navigator) || !audioElement) return;
  const track = AUDIO_TRACKS[currentTrackIndex];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: 'Daily Ruqyah and Surah',
    album: 'Family Listening'
  });
  navigator.mediaSession.setActionHandler('play', () => { if (!isPlaying) togglePlay(); });
  navigator.mediaSession.setActionHandler('pause', () => { if (isPlaying) togglePlay(); });
  navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
  navigator.mediaSession.setActionHandler('nexttrack', playNext);
}

/**
 * Applies the saved theme (light or dark) and updates the toggle icon.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '☾' : '☀';
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

/**
 * Toggles between light and dark mode.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
window.toggleTheme = toggleTheme;

function formatTime(seconds) {
      if (!isFinite(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    
/**
 * Loads a track by index.
 * Creates a new audio element, attaches event listeners,
 * and optionally starts playback.
 */
function loadTrack(index, autoplay = false) {
      if (!audioAvailable) return;
      currentTrackIndex = index;
      const track = AUDIO_TRACKS[index];
      if (audioElement) {
        audioElement.pause();
        audioElement.removeAttribute('src');
        audioElement.load();
      }
      audioElement = document.createElement('audio');
      audioElement.preload = 'metadata';
      audioElement.playsInline = true;
      const source = document.createElement('source');
      source.src = track.path;
      source.type = 'audio/mpeg';
      audioElement.appendChild(source);
      document.getElementById('currentTitle').textContent = track.title;
      document.getElementById('currentDesc').textContent = track.description;
      updateMediaSession();
      audioElement.addEventListener('loadedmetadata', () => {
        document.getElementById('totalTime').textContent = formatTime(audioElement.duration) + ' total';
        updateProgress();
        document.getElementById('audioStatus').style.display = 'none';
      });
      audioElement.addEventListener('timeupdate', () => { updateProgress(); savePosition(); });
      audioElement.addEventListener('progress', updateBuffer);
      audioElement.addEventListener('ended', onTrackEnded);
      audioElement.addEventListener('pause', () => {
        // Sync UI if the OS or browser pauses the audio (lock screen, background, etc.)
        if (isPlaying && audioElement.paused) {
          isPlaying = false;
          document.getElementById('playBtn').textContent = 'Play';
        }
      });
      audioElement.addEventListener('playing', () => {
        isPlaying = true;
        document.getElementById('playBtn').textContent = 'Pause';
        const statusEl = document.getElementById('audioStatus');
        if (statusEl) statusEl.style.display = 'none';
      });
      audioElement.addEventListener('error', (e) => {
        const mediaErr = audioElement.error;
        const code = mediaErr ? mediaErr.code : 'unknown';
        const msg = mediaErr ? mediaErr.message : '';
        showAudioError('Audio failed to load: ' + track.filename, 'Error code: ' + code + (msg ? ' | ' + msg : ''));
      });
      if (autoplay) {
        audioElement.play().then(() => {
          isPlaying = true;
          document.getElementById('playBtn').textContent = 'Pause';
        }).catch(() => { isPlaying = false; });
      }
      renderOrderList();
    }

    
/** Updates the progress bar and elapsed time display. */
function updateProgress() {
      if (!audioElement || !audioElement.duration) return;
      const percent = (audioElement.currentTime / audioElement.duration) * 100;
      document.getElementById('progressFill').style.width = percent + '%';
      document.getElementById('elapsedTime').textContent = formatTime(audioElement.currentTime) + ' elapsed';
    }

    
/**
 * Called when a track finishes.
 * Advances to the next track, or loops Audio 3.
 */
function onTrackEnded() {
      if (currentTrackIndex < 2) {
        loadTrack(currentTrackIndex + 1, true);
      } else {
        // Loop Audio 3 more reliably
        audioElement.currentTime = 0;
        const playPromise = audioElement.play();
        if (playPromise) {
          playPromise.then(() => {
            isPlaying = true;
            document.getElementById('playBtn').textContent = 'Pause';
          }).catch(() => {
            isPlaying = false;
            document.getElementById('playBtn').textContent = 'Play';
          });
        }
      }
    }

    
    
/** Shows an error message in a popup and the status area. */
function showAudioError(msg, detail) {
      const full = detail ? msg + '\n\n' + detail : msg;
      alert(full);
      const statusEl = document.getElementById('audioStatus');
      if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
      }
      console.error(msg, detail || '');
    }

    
/** Toggles play/pause. Syncs button text and isPlaying flag. */
function togglePlay() {
      if (!audioAvailable) return;
      const statusEl = document.getElementById('audioStatus');
      if (!audioElement) { 
        statusEl.textContent = 'Preparing audio…';
        statusEl.style.display = 'block';
        loadTrack(0, true); 
        return; 
      }
      if (isPlaying) {
        audioElement.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = 'Play';
        statusEl.style.display = 'none';
      } else {
        statusEl.textContent = 'Buffering…';
        statusEl.style.display = 'block';
        const playPromise = audioElement.play();
        if (playPromise) {
          playPromise.then(() => {
            isPlaying = true;
            document.getElementById('playBtn').textContent = 'Pause';
            statusEl.style.display = 'none';
          }).catch((err) => {
            const detail = (err && err.name ? err.name + ': ' : '') + (err && err.message ? err.message : String(err));
            showAudioError('Unable to start playback.', detail);
          });
        }
      }
    }

    
/** Restarts the sequence from Audio 1. */
function restartSequence() {
      if (!audioAvailable) return;
      if (audioElement) audioElement.pause();
      isPlaying = false;
      document.getElementById('playBtn').textContent = 'Play';
      loadTrack(0, false);
      document.getElementById('progressFill').style.width = '0%';
      document.getElementById('elapsedTime').textContent = '0:00 elapsed';
    }

    
/** Seeks within the current track when the progress bar is clicked. */
function seek(e) {
      if (!audioElement || !audioElement.duration) return;
      const bar = document.getElementById('progressBar');
      const rect = bar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioElement.currentTime = percent * audioElement.duration;
    }

    
/** Renders the playback order list with status pills. */
function renderOrderList() {
      const container = document.getElementById('orderList');
      container.innerHTML = AUDIO_TRACKS.map((track, idx) => {
        const isCurrent = idx === currentTrackIndex && audioAvailable;
        let statusClass = 'status-next';
        let statusText = 'NEXT';

        if (isCurrent) {
          statusClass = 'status-current';
          statusText = 'Currently Playing';
        } else if (idx < currentTrackIndex) {
          statusClass = 'status-done';
          statusText = 'Done';
        } else if (idx === 2) {
          statusClass = 'status-repeat';
          statusText = 'REPEAT';
        }

        return `
          <div class="order-row ${isCurrent ? 'current' : ''}">
            <div class="order-number">${String(idx + 1).padStart(2, '0')}</div>
            <div class="order-info">
              <div class="order-title">${track.title}</div>
              <div class="order-desc">${track.description}</div>
            </div>
            <div class="order-status ${statusClass}">${statusText}</div>
          </div>`;
      }).join('');
      if (window.attachImageClicks) window.attachImageClicks();
    }

    function getToday() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    
// ─── Counters (localStorage) ─────────────────────────────────
/**
 * Loads counter values from localStorage.
 * Resets all counters if the stored date is not today.
 */
function loadCounters() {
      const today = getToday();
      const storedDate = localStorage.getItem(DATE_KEY);
      if (storedDate !== today) {
        const reset = {};
        RECITATIONS.forEach(r => r.counters.forEach(c => { reset[c.key] = 0; }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
        localStorage.setItem(DATE_KEY, today);
        return reset;
      }
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch { return {}; }
    }

    
/** Saves counter values and today's date to localStorage. */
function saveCounters(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(DATE_KEY, getToday());
    }

    
    
/** Resets all counters belonging to one recitation. */
function resetRecitation(recId) {
      const data = loadCounters();
      const rec = RECITATIONS.find(r => r.id === recId);
      if (!rec) return;
      rec.counters.forEach(c => { data[c.key] = 0; });
      saveCounters(data);
      renderRecitations();
    }

    
/** Increments or decrements a counter, respecting its maximum. */
function updateCounter(key, delta, max) {
      const data = loadCounters();
      let val = (data[key] || 0) + delta;
      val = Math.max(0, Math.min(max, val));
      data[key] = val;
      saveCounters(data);
      renderRecitations();
    }

    
// ─── Recitation Cards ────────────────────────────────────────
/** Renders the three recitation cards with their counters. */
function renderRecitations() {
      const grid = document.getElementById('recitationsGrid');
      const counters = loadCounters();
      grid.innerHTML = RECITATIONS.map(rec => {
        const counterBlocks = rec.counters.map(c => {
          const val = counters[c.key] || 0;
          return `
            <div class="counter-block">
              <div class="counter-label">${c.label}</div>
              <div class="counter-value">${val} / ${c.max}</div>
              <div class="counter-controls">
                <button class="counter-btn" onclick="updateCounter('${c.key}', -1, ${c.max})" ${val <= 0 ? 'disabled' : ''}>−</button>
                <button class="counter-btn" onclick="updateCounter('${c.key}', 1, ${c.max})" ${val >= c.max ? 'disabled' : ''}>+</button>
              </div>
            </div>`;
        }).join('');
        return `
          <article class="recitation-card">
            <div class="card-top" onclick="toggleCard(this, event)">
              <img src="${rec.image}" alt="${rec.title}" class="card-image" loading="lazy">
              <div class="card-heading">
                <div class="recitation-number">${rec.number}</div>
                <h3 class="recitation-title">${rec.title}</h3>
              </div>
              <button class="card-toggle" aria-label="Expand">▼</button>
            </div>
            <div class="card-content">
            <div class="section-label">Arabic</div>
            <div class="arabic">${rec.arabic}</div>
            <div class="section-label">Romanized</div>
            <div class="romanized">${rec.romanized}</div>
            <div class="section-label">Bahasa Melayu</div>
            <div class="translation">${rec.malay}</div>
            <div class="section-label">English</div>
            <div class="translation">${rec.english}</div>
            <div class="schedule">${rec.schedule}</div>
            <div class="counters">
              <div class="counter-group">${counterBlocks}</div>
              ${rec.caption ? `<div class="caption">${rec.caption}</div>` : ''}
              <button class="reset-btn" onclick="resetRecitation(${rec.id})">Reset</button>
            </div>
            </div>
          </article>`;
      }).join('');
      if (window.attachImageClicks) window.attachImageClicks();
    }

    document.getElementById('playBtn').addEventListener('click', togglePlay);
    document.getElementById('restartBtn').addEventListener('click', restartSequence);
    document.getElementById('prevBtn').addEventListener('click', playPrevious);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    document.getElementById('progressBar').addEventListener('click', seek);

    
/** Loads the previous track (for testing). */
function playPrevious() {
      if (!audioAvailable) return;
      const newIndex = Math.max(0, currentTrackIndex - 1);
      if (newIndex !== currentTrackIndex || !audioElement) {
        loadTrack(newIndex, isPlaying);
      }
    }

    
/** Loads the next track (for testing). */
function playNext() {
      if (!audioAvailable) return;
      const newIndex = Math.min(AUDIO_TRACKS.length - 1, currentTrackIndex + 1);
      if (newIndex !== currentTrackIndex || !audioElement) {
        loadTrack(newIndex, isPlaying);
      }
    }

    // Lightbox
    
// ─── Lightbox ────────────────────────────────────────────────
/** Opens the image lightbox. */
function openLightbox(src, alt) {
      const lb = document.getElementById('lightbox');
      const img = document.getElementById('lightboxImg');
      img.src = src;
      img.alt = alt || '';
      lb.classList.add('active');
    }
    
/** Closes the image lightbox. */
function closeLightbox() {
      document.getElementById('lightbox').classList.remove('active');
    }
    window.closeLightbox = closeLightbox;
    window.resetRecitation = resetRecitation;

    
/**
 * Toggles a recitation card open/closed on mobile.
 * Only one card can be expanded at a time.
 */
function toggleCard(header, event) {
      if (window.innerWidth > 768) return;
      if (event) event.stopPropagation();
      const card = header.closest('.recitation-card');
      const isExpanded = card.classList.contains('expanded');

      // Close all cards first
      document.querySelectorAll('.recitation-card').forEach(c => {
        c.classList.remove('expanded');
        const b = c.querySelector('.card-toggle');
        if (b) b.textContent = '▼';
      });

      // If it wasn't expanded, open it
      if (!isExpanded) {
        card.classList.add('expanded');
        const btn = card.querySelector('.card-toggle');
        if (btn) btn.textContent = '▲';
      }
    }
    window.toggleCard = toggleCard;


    // Attach image clicks after render
    
/** Attaches click handlers to recitation images for the lightbox. */
function attachImageClicks() {
      document.querySelectorAll('.card-image').forEach(img => {
        img.onclick = (e) => {
          e.stopPropagation();
          openLightbox(img.src, img.alt);
        };
      });
    }
    // Call after initial render and expose for re-attach
    window.attachImageClicks = attachImageClicks;
    
// ─── Page Visibility ─────────────────────────────────────────
/**
 * Re-syncs the play button and isPlaying flag when the user
 * returns to the app (e.g. after unlocking the phone).
 */
document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') renderRecitations();
    });

    document.getElementById("appVersion").textContent = APP_VERSION;

// ─── Keyboard Shortcuts ──────────────────────────────────────
/**
 * Space: play/pause
 * Left/Right arrows: seek ±5 seconds
 * Only active when not typing in an input.
 */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowLeft' && audioElement) {
    audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
  } else if (e.code === 'ArrowRight' && audioElement) {
    audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
  }
});

// ─── Theme ───────────────────────────────────────────────────
const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);

// Restore playback position on load
if (audioAvailable) restorePosition();


    // Re-sync UI when the user returns to the app (lock screen, home screen app, etc.)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && audioElement) {
        if (audioElement.paused && isPlaying) {
          isPlaying = false;
          document.getElementById('playBtn').textContent = 'Play';
        } else if (!audioElement.paused && !isPlaying) {
          isPlaying = true;
          document.getElementById('playBtn').textContent = 'Pause';
        }
      }
    });

    initAudio();
    renderRecitations();
    if (window.attachImageClicks) window.attachImageClicks();
    setInterval(() => {
      if (localStorage.getItem(DATE_KEY) !== getToday()) renderRecitations();
    }, 60000);
