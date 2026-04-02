const base = `${import.meta.env.BASE_URL}sounds/`;

const COUNTDOWN_FILE = "countdown.wav";

/** One shared element; long clip (e.g. 6s) plays once per intermission, not per tick. */
let countdownAudio = null;

function synthCountdownBeep() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const run = () => {
    const t0 = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  };
  if (ctx.state === "suspended") ctx.resume().then(run);
  else run();
}

/**
 * Long `countdown.wav` (e.g. full 6s track): start once on beat **5** only.
 * Beats 4,3,2,1 only update the UI — no restart, no stacking.
 */
export function playCountdownSound(n) {
  if (n !== 5) return;

  if (!countdownAudio) {
    countdownAudio = new Audio(`${base}${COUNTDOWN_FILE}`);
  }

  if (!countdownAudio.paused) return;

  countdownAudio.currentTime = 0;
  countdownAudio.volume = 0.9;
  countdownAudio.play().catch(() => synthCountdownBeep());
}

export function stopCountdownSound() {
  if (countdownAudio) {
    countdownAudio.pause();
    countdownAudio.currentTime = 0;
  }
}
