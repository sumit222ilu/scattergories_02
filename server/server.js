const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const letters = "ABCDEFGHLMPRST".split("");

// 🔥 PLAYER STORAGE
let players = {}; // playerId -> player
let socketToPlayer = {}; // socketId -> playerId
let disconnectTimers = {};

// 🔥 HOST
let hostId = null;

// 🔥 GAME STATE
let questions = [];
let usedQuestions = [];
let currentInterval = null;
let timeLeftGlobal = 0;

let game = {
  question: "",
  letter: "",
  answers: {},
  answerTimes: {},
  history: [],
  timer: 60,
  maxQuestions: 5,
  isPlaying: false,
};
let lastGameConfig = null;
let nextRoundTimer = null;
let intermissionTickTimers = [];

const INTERMISSION_LEAD_MS = 200;
const INTERMISSION_COUNTDOWN_SEC = 5;

const ALLOWED_NUDGE_EMOJI = new Set(["😂", "⏰", "🐢", "👀", "🔥", "🦥", "📝", "⏳", "🐌"]);
const NUDGE_COOLDOWN_MS = 1600;
const nudgeLastByPlayer = {};

// ⏱ TIMEOUTS
const PLAYER_TIMEOUT = 1000;
const HOST_TIMEOUT = 2000;

function clearNextRoundSchedule() {
  intermissionTickTimers.forEach(clearTimeout);
  intermissionTickTimers = [];
  if (nextRoundTimer) {
    clearTimeout(nextRoundTimer);
    nextRoundTimer = null;
  }
}

function resetGame(config = {}) {
  clearNextRoundSchedule();
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  questions = config.categories || [];
  usedQuestions = [];

  game = {
    question: "",
    letter: "",
    answers: {},
    answerTimes: {},
    history: [],
    timer: config.timer || 60,
    maxQuestions: config.maxQuestions || 5,
    isPlaying: false,
  };

  timeLeftGlobal = 0;
}

io.on("connection", (socket) => {
  const playerId = socket.handshake.auth.playerId;

  console.log("Connected:", socket.id, playerId);

  socketToPlayer[socket.id] = playerId;
  const existingPlayer = players[playerId];
  if (existingPlayer) {
    clearTimeout(disconnectTimers[playerId]);
    delete disconnectTimers[playerId];
    existingPlayer.connected = true;
    existingPlayer.socketId = socket.id;
    emitPlayers();
  }

  // 🔥 JOIN / RECONNECT
  socket.on("join", (name) => {
    let player = players[playerId];
    console.log("====join", name, player, JSON.stringify(players), playerId);

    if (player) {
      clearTimeout(disconnectTimers[playerId]);
      player.connected = true;
      player.socketId = socket.id;
    } else {
      players[playerId] = {
        name,
        playerId,
        socketId: socket.id,
        connected: true,
      };

      if (!hostId) hostId = playerId;
    }

    emitPlayers();

    // 🔥 SEND FULL STATE (never leak other players' answers during an active round)
    const baseState = {
      isPlaying: game.isPlaying,
      question: game.question,
      letter: game.letter,
      history: game.history,
      timer: timeLeftGlobal,
      maxQuestions: game.maxQuestions,
    };
    if (game.isPlaying) {
      socket.emit("gameState", {
        ...baseState,
        submissionTimes: { ...game.answerTimes },
      });
    } else {
      socket.emit("gameState", {
        ...baseState,
        answers: game.answers,
        answerTimes: game.answerTimes,
      });
    }
  });

  // 🔥 START GAME
  socket.on("startGame", (config) => {
    if (playerId !== hostId) return;

    lastGameConfig = {
      categories: Array.isArray(config?.categories) ? config.categories : [],
      timer: Number(config?.timer) || 60,
      maxQuestions: Number(config?.maxQuestions) || 5,
    };

    resetGame(config); // ✅ FULL CLEAN RESET

    startRound();
  });

  socket.on("rematch", () => {
    if (playerId !== hostId || !lastGameConfig) return;
    resetGame(lastGameConfig);
    startRound();
  });

  // 🔥 SUBMIT ANSWER
  socket.on("submitAnswer", (answer) => {
    const player = players[playerId];
    if (!player || !game.isPlaying) return;

    if (!game.answers[playerId]) {
      game.answers[playerId] = answer || "NA";
      game.answerTimes[playerId] = Math.max(game.timer - timeLeftGlobal, 0);
      io.emit("playerAnswered", {
        playerId,
        secondsUsed: game.answerTimes[playerId],
      });
    }

    const totalPlayers = Object.values(players).filter(
      (p) => p.connected,
    ).length;
    const totalAnswers = Object.keys(game.answers).length;

    if (totalAnswers === totalPlayers) {
      clearInterval(currentInterval);
      endRound();
    }
  });

  socket.on("nudgeEmoji", (payload) => {
    if (!game.isPlaying || !payload || typeof payload !== "object") return;

    const from = players[playerId];
    if (!from || !game.answers[playerId]) return;

    const targetPlayerId = payload.targetPlayerId;
    const emoji = String(payload.emoji || "");
    if (!targetPlayerId || targetPlayerId === playerId) return;
    if (!ALLOWED_NUDGE_EMOJI.has(emoji)) return;

    const target = players[targetPlayerId];
    if (!target || !target.connected) return;
    if (game.answers[targetPlayerId]) return;

    const now = Date.now();
    if (now - (nudgeLastByPlayer[playerId] || 0) < NUDGE_COOLDOWN_MS) return;
    nudgeLastByPlayer[playerId] = now;

    io.to(target.socketId).emit("incomingNudgeEmoji", {
      emoji,
      fromName: from.name,
    });
  });

  // 🔥 ON LEAVEGAME BUTTON CLICK
  socket.on("leaveGame", () => {
    const pid = socketToPlayer[socket.id];
    if (!pid) return;

    // ❌ cancel any pending disconnect cleanup
    clearTimeout(disconnectTimers[pid]);

    // ❌ remove player immediately
    delete players[pid];
    delete socketToPlayer[socket.id];

    // 👑 if host leaves → assign new host
    if (pid === hostId) {
      const remaining = Object.values(players);
      hostId = remaining[0]?.playerId || null;
    }

    emitPlayers();
  });

  // 🔥 DISCONNECT HANDLING
  socket.on("disconnect", () => {
    const pid = socketToPlayer[socket.id];
    const player = players[pid];
    delete socketToPlayer[socket.id];

    if (!player) return;
    if (player.socketId !== socket.id) return;

    player.connected = false;

    const timeout = pid === hostId ? HOST_TIMEOUT : PLAYER_TIMEOUT;

    disconnectTimers[pid] = setTimeout(() => {
      delete players[pid];

      // 🔥 HOST REASSIGN (only after long timeout)
      if (pid === hostId) {
        const remaining = Object.values(players);
        hostId = remaining[0]?.playerId || null;
      }

      emitPlayers();
    }, timeout);

    emitPlayers();
  });
});

// 🔥 EMIT PLAYERS
function emitPlayers() {
  io.emit(
    "players",
    Object.values(players).map((p) => ({
      id: p.playerId,
      name: p.name,
      isHost: p.playerId === hostId,
      connected: p.connected,
    })),
  );
}

// 🔥 GET QUESTION
function getNextQuestion() {
  if (usedQuestions.length === questions.length) {
    usedQuestions = [];
  }

  const remaining = questions.filter((q) => !usedQuestions.includes(q));
  const q = remaining[Math.floor(Math.random() * remaining.length)];
  usedQuestions.push(q);

  return q;
}

// 🔥 START ROUND
function startRound() {
  clearNextRoundSchedule();
  if (currentInterval) clearInterval(currentInterval);

  if (game.history.length >= game.maxQuestions) {
    io.emit("gameOver", game.history);

    // ❗ DO NOT reset everything here
    // Only stop game progression
    game.isPlaying = false;

    return;
  }

  const q = getNextQuestion();
  const l = letters[Math.floor(Math.random() * letters.length)];

  game.question = q;
  game.letter = l;
  game.answers = {};
  game.answerTimes = {};
  game.isPlaying = true;

  timeLeftGlobal = game.timer;

  io.emit("gameStart", {
    question: q,
    letter: l,
    timer: game.timer,
    currentQuestion: game.history.length + 1,
    maxQuestions: game.maxQuestions, // ✅ ADD
  });

  currentInterval = setInterval(() => {
    timeLeftGlobal--;
    io.emit("timer", timeLeftGlobal);

    if (timeLeftGlobal <= 0) {
      clearInterval(currentInterval);
      endRound();
    }
  }, 1000);
}

// 🔥 END ROUND
function endRound() {
  game.isPlaying = false;

  Object.values(players).forEach((p) => {
    if (p.connected && !game.answers[p.playerId]) {
      game.answers[p.playerId] = "NA";
      game.answerTimes[p.playerId] = game.timer;
    }
  });

  game.history.push({
    question: game.question,
    letter: game.letter,
    answers: { ...game.answers },
    answerTimes: { ...game.answerTimes },
  });

  io.emit("forceSubmit");

  setTimeout(() => {
    io.emit("roundEnd", {
      answers: game.answers,
      answerTimes: game.answerTimes,
      history: game.history,
      maxQuestions: game.maxQuestions,
    });

    const isFinal = game.history.length >= game.maxQuestions;
    if (!isFinal) {
      clearNextRoundSchedule();
      for (let i = 0; i < INTERMISSION_COUNTDOWN_SEC; i++) {
        const n = INTERMISSION_COUNTDOWN_SEC - i;
        intermissionTickTimers.push(
          setTimeout(() => {
            io.emit("nextRoundCountdown", { n });
          }, INTERMISSION_LEAD_MS + i * 1000),
        );
      }
      nextRoundTimer = setTimeout(() => {
        nextRoundTimer = null;
        startRound();
      }, INTERMISSION_LEAD_MS + INTERMISSION_COUNTDOWN_SEC * 1000);
    }
  }, 200);
}

// 🚀 START SERVER
server.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running on network");
});
