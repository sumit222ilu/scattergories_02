import { useEffect } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";

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
  } = useGame();

  useEffect(() => {
    socket.on("gameStart", (data) => {
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

    socket.on("gameStart", (data) => {
      setGameData({
        question: data.question,
        letter: data.letter,
        currentQuestion: data.currentQuestion || 1,
      });

      setMaxQuestions(data.maxQuestions || 0); // ✅ IMPORTANT
      setScreen("game");
    });

    socket.on("timer", setTimer);

    socket.on("roundEnd", (data) => {
      setResults(data.answers);
      setResultTimes(data.answerTimes || {});
      setHistory(data.history);
      setScreen("lastSubmitAnswers");
    });

    socket.on("gameOver", (history) => {
      setHistory(history);
      setResults({});
      setResultTimes({});
      setGameData({});
      setTimer(0);
      setScreen("results");
    });

    return () => {
      socket.off("players");
      socket.off("gameStart");
      socket.off("timer");
      socket.off("roundEnd");
      socket.off("gameOver");
      socket.off("gameState");
    };
  }, []);
}
