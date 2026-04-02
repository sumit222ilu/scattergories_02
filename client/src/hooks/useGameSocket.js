import { useEffect } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { playCountdownSound, stopCountdownSound } from "../utils/gameSounds";

export default function useGameSocket() {
  const {
    setPlayers,
    setIsHost,
    setGameData,
    setTimer,
    setResults,
    setResultTimes,
    setHistory,
    setScreen,
    setMaxQuestions,
    setIntermission,
    setNextRoundCountdown,
  } = useGame();

  useEffect(() => {
    const rejoin = () => {
      const name = localStorage.getItem("playerName");
      if (name) socket.emit("join", name);
    };

    socket.on("connect", rejoin);

    socket.on("gameStart", (data) => {
      stopCountdownSound();
      setIntermission(null);
      setNextRoundCountdown(null);
      // Reset only when a brand-new game starts
      if ((data.currentQuestion || 1) === 1) {
        setHistory([]);
        setResults({});
        setResultTimes({});
      }
      setTimer(data.timer || 0);

      setGameData({
        question: data.question,
        letter: data.letter,
        currentQuestion: data.currentQuestion || 1,
        submissionTimes: {},
      });

      setMaxQuestions(data.maxQuestions || 0);

      setScreen("game");
    });

    socket.on("players", (list) => {
      setPlayers(list);
      const playerId = sessionStorage.getItem("playerId");
      const me = list.find((p) => p.id === playerId);
      setIsHost(me?.isHost || false);
    });

    socket.on("gameState", (state) => {
      if (!state?.isPlaying || !state.question) return;
      setGameData({
        question: state.question,
        letter: state.letter,
        currentQuestion: (state.history?.length || 0) + 1,
        submissionTimes: state.submissionTimes || {},
      });
      setTimer(state.timer ?? 0);
      setMaxQuestions(state.maxQuestions || 0);
      setScreen("game");
    });

    socket.on("timer", setTimer);

    socket.on("nextRoundCountdown", ({ n }) => {
      setNextRoundCountdown(n);
      playCountdownSound(n);
    });

    socket.on("roundEnd", (data) => {
      setResults(data.answers);
      setResultTimes(data.answerTimes || {});
      setHistory(data.history);
      const isFinalRound =
        Array.isArray(data.history) &&
        data.history.length >= (data.maxQuestions || 0);
      if (isFinalRound) {
        setIntermission(null);
        setNextRoundCountdown(null);
        setScreen("results");
        return;
      }
      setNextRoundCountdown(null);
      const last = data.history[data.history.length - 1];
      setIntermission({
        question: last?.question,
        letter: last?.letter,
        answers: data.answers || {},
        answerTimes: data.answerTimes || {},
      });
      setScreen("game");
    });

    socket.on("gameOver", (history) => {
      setIntermission(null);
      setNextRoundCountdown(null);
      setHistory(history);
      setResults({});
      setResultTimes({});
      setGameData({});
      setTimer(0);
      setScreen("results");
    });

    return () => {
      socket.off("connect", rejoin);
      socket.off("players");
      socket.off("gameStart");
      socket.off("timer");
      socket.off("nextRoundCountdown");
      socket.off("roundEnd");
      socket.off("gameOver");
      socket.off("gameState");
    };
  }, []);
}
