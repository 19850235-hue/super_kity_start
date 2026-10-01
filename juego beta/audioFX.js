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
    // Una melodía distinta por mundo. Se puede parar con stopBackgroundMusic().
    _musicNodes: [],
    _musicInterval: null,
    _songs: [
        { notes: [392, 440, 494, 587, 494, 440], ms: 450, type: 'sine' },                       // Jardín Rosa: alegre
        { notes: [294, 349, 440, 523, 440, 349, 330, 349], ms: 520, type: 'triangle' },         // Valle Dorado: cálida
        { notes: [330, 392, 494, 659, 494, 392, 330, 262], ms: 400, type: 'sine' }              // Castillo Dulce: misteriosa
    ],
    playBackgroundMusic: (worldIdx = 0) => {
        if (!AudioFX.ctx) return;
        AudioFX.stopBackgroundMusic();
        const song = AudioFX._songs[Math.max(0, Math.min(AudioFX._songs.length - 1, worldIdx | 0))];
        let step = 0;
        AudioFX._musicInterval = setInterval(() => {
            // En pausa el contexto está suspendido: no se acumulan notas para soltarlas todas juntas al reanudar
            if (!AudioFX.ctx || AudioFX.ctx.state !== 'running') return;
            let osc = AudioFX.ctx.createOscillator();
            let gain = AudioFX.ctx.createGain();
            osc.connect(gain); gain.connect(AudioFX.masterGain);
            osc.type = song.type;
            const freq = song.notes[step % song.notes.length];
            osc.frequency.setValueAtTime(freq, AudioFX.ctx.currentTime);
            gain.gain.setValueAtTime(0.001, AudioFX.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, AudioFX.ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, AudioFX.ctx.currentTime + 0.4);
            osc.start(); osc.stop(AudioFX.ctx.currentTime + 0.4);
            step++;
        }, song.ms);
    },
    stopBackgroundMusic: () => {
        if (AudioFX._musicInterval) {
            clearInterval(AudioFX._musicInterval);
            AudioFX._musicInterval = null;
        }
    }
};