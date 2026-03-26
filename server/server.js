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

// ⏱ TIMEOUTS
const PLAYER_TIMEOUT = 20000;
const HOST_TIMEOUT = 60000;

function resetGame(config = {}) {
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

    // 🔥 SEND FULL STATE
    socket.emit("gameState", {
      isPlaying: game.isPlaying,
      question: game.question,
      letter: game.letter,
      answers: game.answers,
      answerTimes: game.answerTimes,
      history: game.history,
      timer: timeLeftGlobal,
      maxQuestions: game.maxQuestions,
    });
  });

  // 🔥 START GAME
  socket.on("startGame", (config) => {
    if (playerId !== hostId) return;

    resetGame(config); // ✅ FULL CLEAN RESET

    startRound();
  });

  // 🔥 NEXT ROUND
  socket.on("nextRound", () => {
    if (playerId !== hostId) return;
    startRound();
  });

  // 🔥 SUBMIT ANSWER
  socket.on("submitAnswer", (answer) => {
    const player = players[playerId];
    if (!player || !game.isPlaying) return;

    if (!game.answers[playerId]) {
      game.answers[playerId] = answer || "NA";
      game.answerTimes[playerId] = Math.max(game.timer - timeLeftGlobal, 0);
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

    if (!player) return;

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
    });
  }, 200);
}

// 🚀 START SERVER
server.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running on network");
});
