/**
 * Generates placeholder countdown.wav in client/public/sounds/
 * Nudges use emojis only — no audio files for those.
 */
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "../client/public/sounds");

function writeToneWav(filePath, freqHz, durationSec = 0.12, gain = 0.18) {
  const sampleRate = 8000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample =
      Math.sin(2 * Math.PI * freqHz * t) * gain * 32767 * Math.exp(-3 * t);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buf);
}

fs.mkdirSync(outDir, { recursive: true });

writeToneWav(path.join(outDir, "countdown.wav"), 380, 0.1, 0.22);

fs.writeFileSync(
  path.join(outDir, "README.txt"),
  `Sounds in this folder:

  countdown.wav — intermission countdown only (replace with your long clip if you want)

  Player nudges use emojis only (no files). Countdown logic is in client/src/utils/gameSounds.js
`,
);

console.log("Wrote", path.join(outDir, "countdown.wav"));
