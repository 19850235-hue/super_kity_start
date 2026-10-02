// ==========================================
// --- SINTETIZADOR DE AUDIO RETRO (WEB AUDIO) ---
// ==========================================
window.AudioFX = {
    ctx: null,
    masterGain: null,
    volume: 0.8, // 0 a 1
    muted: false,
    init: () => {
        if (!AudioFX.ctx) {
            AudioFX.ctx = new (window.AudioContext || window.webkitAudioContext)();
            AudioFX.masterGain = AudioFX.ctx.createGain();
            AudioFX.masterGain.connect(AudioFX.ctx.destination);
            // Recupera preferencia de volumen/silencio guardada (si existe)
            try {
                const raw = localStorage.getItem('superKittyVsDemonios_audio');
                if (raw) {
                    const saved = JSON.parse(raw);
                    if (typeof saved.volume === 'number') AudioFX.volume = saved.volume;
                    if (typeof saved.muted === 'boolean') AudioFX.muted = saved.muted;
                }
            } catch (err) { /* si falla, se usan los valores por defecto */ }
            AudioFX.masterGain.gain.value = AudioFX.muted ? 0 : AudioFX.volume;
        }
        // Los navegadores dejan el audio suspendido hasta un gesto del usuario
        if (AudioFX.ctx.state === 'suspended') AudioFX.ctx.resume();
    },
    setVolume: (v) => {
        AudioFX.volume = Math.max(0, Math.min(1, v));
        if (AudioFX.masterGain && !AudioFX.muted) AudioFX.masterGain.gain.value = AudioFX.volume;
        AudioFX._savePrefs();
    },
    setMuted: (m) => {
        AudioFX.muted = m;
        if (AudioFX.masterGain) AudioFX.masterGain.gain.value = m ? 0 : AudioFX.volume;
        AudioFX._savePrefs();
    },
    toggleMuted: () => {
        AudioFX.setMuted(!AudioFX.muted);
        return AudioFX.muted;
    },
    _savePrefs: () => {
        try {
            localStorage.setItem('superKittyVsDemonios_audio', JSON.stringify({ volume: AudioFX.volume, muted: AudioFX.muted }));
        } catch (err) { /* localStorage no disponible, no pasa nada grave */ }
    },
    playJump: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, AudioFX.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.15);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.15);
    },
    playShoot: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, AudioFX.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.1);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.1);
    },
    playFreeze: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, AudioFX.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.25);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.25);
    },
    playUlti: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, AudioFX.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.4);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.4);
    },
    playEnemyHit: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(500, AudioFX.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, AudioFX.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.22, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.12);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.12);
    },
    playPlayerHit: () => {
        if (!AudioFX.ctx) return;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, AudioFX.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, AudioFX.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.28, AudioFX.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, AudioFX.ctx.currentTime + 0.3);
        osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.3);
    },
    playKeyGet: () => {
        if (!AudioFX.ctx) return;
        const now = AudioFX.ctx.currentTime;
        [660, 880, 1320].forEach((freq, i) => {
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.001, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.09 + 0.18);
            osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.18);
        });
    },
    playWorldUnlock: () => {
        if (!AudioFX.ctx) return;
        const now = AudioFX.ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.12);
            gain.gain.setValueAtTime(0.001, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.3);
            osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
        });
    },
    playStomp: () => {
        if (!AudioFX.ctx) return;
        const t = AudioFX.ctx.currentTime;
        let osc = AudioFX.ctx.createOscillator();
        let gain = AudioFX.ctx.createGain();
        osc.connect(gain); gain.connect(AudioFX.masterGain);
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.08);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
    },
    _arpeggio: (freqs, step, type, vol, len) => {
        if (!AudioFX.ctx) return;
        const now = AudioFX.ctx.currentTime;
        freqs.forEach((freq, i) => {
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + i * step);
            gain.gain.setValueAtTime(0.001, now + i * step);
            gain.gain.exponentialRampToValueAtTime(vol, now + i * step + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * step + len);
            osc.start(now + i * step); osc.stop(now + i * step + len);
        });
    },
    playHeal: () => AudioFX._arpeggio([784, 988, 1175], 0.07, 'sine', 0.25, 0.16),
    playVictory: () => AudioFX._arpeggio([523, 659, 784, 659, 784, 1047], 0.11, 'triangle', 0.28, 0.25),
    playGameOver: () => AudioFX._arpeggio([392, 330, 262, 196], 0.2, 'sawtooth', 0.16, 0.3),
    playBossDown: () => AudioFX._arpeggio([196, 262, 330, 392, 523, 659, 784, 1047], 0.08, 'square', 0.18, 0.22),
    playCoin: () => AudioFX._arpeggio([988, 1319], 0.05, 'square', 0.12, 0.1),
    playPowerUp: () => AudioFX._arpeggio([523, 659, 784, 1047, 1319], 0.06, 'triangle', 0.25, 0.16),
    playCheckpoint: () => AudioFX._arpeggio([392, 523, 659, 784], 0.09, 'sine', 0.28, 0.25),
    playEnemyShot: () => AudioFX._arpeggio([900, 500], 0.05, 'sawtooth', 0.1, 0.1),
    playShieldBlock: () => AudioFX._arpeggio([300, 220], 0.04, 'square', 0.18, 0.09),
    // MÚSICA DE FONDO: una canción en bucle por mundo (melodía + arpegio + bajo + percusión suave).
    // Las notas son números MIDI (0 = silencio); cada compás tiene 8 corcheas.
    _musicInterval: null,
    _musicBus: null,
    _noiseBuf: null,
    _songs: [
        { // Jardín Rosa: alegre y saltarina (Do mayor)
            bpm: 126, lead: 'triangle', arp: 'sine',
            bass:   [48, 43, 45, 41],
            chords: [[60, 64, 67], [59, 62, 67], [57, 60, 64], [57, 60, 65]],
            melody: [
                [72, 76, 79, 76, 72, 0, 76, 0],
                [71, 74, 79, 74, 71, 0, 74, 0],
                [72, 76, 81, 79, 76, 0, 72, 0],
                [77, 81, 84, 81, 77, 0, 79, 0]
            ]
        },
        { // Valle Dorado: cálida y tranquila (Fa mayor / Re menor)
            bpm: 104, lead: 'sine', arp: 'triangle',
            bass:   [50, 46, 53, 48],
            chords: [[62, 65, 69], [58, 62, 65], [60, 65, 69], [60, 64, 67]],
            melody: [
                [74, 77, 81, 77, 74, 0, 77, 0],
                [70, 74, 77, 74, 70, 0, 74, 0],
                [72, 77, 81, 77, 72, 0, 77, 0],
                [72, 76, 79, 76, 72, 74, 76, 0]
            ]
        },
        { // Castillo Dulce: misteriosa (La menor)
            bpm: 92, lead: 'triangle', arp: 'sine',
            bass:   [45, 41, 50, 40],
            chords: [[57, 60, 64], [57, 60, 65], [57, 62, 65], [56, 59, 64]],
            melody: [
                [76, 0, 72, 0, 69, 0, 72, 76],
                [77, 0, 72, 0, 69, 0, 72, 77],
                [74, 0, 77, 0, 81, 0, 77, 74],
                [76, 0, 71, 0, 68, 0, 71, 76]
            ]
        }
    ],
    _midiToFreq: (n) => 440 * Math.pow(2, (n - 69) / 12),
    _note: (midi, t, dur, type, vol) => {
        const ctx = AudioFX.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(AudioFX._midiToFreq(midi), t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain); gain.connect(AudioFX._musicBus);
        osc.start(t); osc.stop(t + dur + 0.02);
    },
    _kick: (t) => {
        const ctx = AudioFX.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        gain.gain.setValueAtTime(0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        osc.connect(gain); gain.connect(AudioFX._musicBus);
        osc.start(t); osc.stop(t + 0.18);
    },
    _hat: (t) => {
        const ctx = AudioFX.ctx;
        if (!AudioFX._noiseBuf) {
            const len = Math.floor(ctx.sampleRate * 0.05);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            AudioFX._noiseBuf = buf;
        }
        const src = ctx.createBufferSource();
        src.buffer = AudioFX._noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 7000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.09, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        src.connect(hp); hp.connect(gain); gain.connect(AudioFX._musicBus);
        src.start(t);
    },
    _scheduleStep: (song, step, t, stepDur) => {
        const bar = Math.floor(step / 8) % song.melody.length;
        const s = step % 8;
        // Melodía
        const m = song.melody[bar][s];
        if (m) AudioFX._note(m, t, stepDur * 1.7, song.lead, 0.11);
        // Arpegio suave del acorde (una nota por corchea)
        const ch = song.chords[bar];
        AudioFX._note(ch[s % ch.length] + 12, t, stepDur * 0.9, song.arp, 0.05);
        // Bajo en el 1.er y 5.º tiempo (y un golpecito en el 7.º)
        if (s === 0 || s === 4) AudioFX._note(song.bass[bar], t, stepDur * 3.2, 'triangle', 0.2);
        if (s === 6) AudioFX._note(song.bass[bar] + 12, t, stepDur * 1.2, 'triangle', 0.1);
        // Percusión suave
        if (s === 0 || s === 4) AudioFX._kick(t);
        if (s % 2 === 1) AudioFX._hat(t);
    },
    playBackgroundMusic: (worldIdx = 0) => {
        if (!AudioFX.ctx) return;
        AudioFX.stopBackgroundMusic();
        const ctx = AudioFX.ctx;
        const song = AudioFX._songs[Math.max(0, Math.min(AudioFX._songs.length - 1, worldIdx | 0))];
        const stepDur = 60 / song.bpm / 2; // corchea
        // Canal propio de la música para poder cortarla suavemente sin tocar los efectos
        const bus = ctx.createGain();
        bus.gain.value = 0.55;
        bus.connect(AudioFX.masterGain);
        AudioFX._musicBus = bus;
        let step = 0;
        let nextTime = ctx.currentTime + 0.08;
        AudioFX._musicInterval = setInterval(() => {
            // En pausa el contexto está suspendido: no se programan notas (y no se acumulan)
            if (ctx.state !== 'running') return;
            if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
            while (nextTime < ctx.currentTime + 0.3) {
                AudioFX._scheduleStep(song, step, nextTime, stepDur);
                nextTime += stepDur;
                step++;
            }
        }, 60);
    },
    stopBackgroundMusic: () => {
        if (AudioFX._musicInterval) {
            clearInterval(AudioFX._musicInterval);
            AudioFX._musicInterval = null;
        }
        const bus = AudioFX._musicBus;
        AudioFX._musicBus = null;
        if (bus && AudioFX.ctx) {
            // Fundido corto para que no corte feo las últimas notas ya programadas
            const t = AudioFX.ctx.currentTime;
            try {
                bus.gain.cancelScheduledValues(t);
                bus.gain.setValueAtTime(bus.gain.value, t);
                bus.gain.linearRampToValueAtTime(0, t + 0.2);
            } catch (err) { /* nada */ }
            setTimeout(() => { try { bus.disconnect(); } catch (err) {} }, 500);
        }
    }
};