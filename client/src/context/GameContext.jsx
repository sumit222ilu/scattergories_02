import { createContext, useContext, useState } from "react";

const GameContext = createContext();

export function GameProvider({ children }) {
  const [screen, setScreen] = useState("join");
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [gameData, setGameData] = useState({});
  const [timer, setTimer] = useState(0);
  const [results, setResults] = useState({});
  const [resultTimes, setResultTimes] = useState({});
  const [history, setHistory] = useState([]);
  const [maxQuestions, setMaxQuestions] = useState(0);
  /** Between rounds: show answers + countdown; cleared on gameStart */
  const [intermission, setIntermission] = useState(null);
  const [nextRoundCountdown, setNextRoundCountdown] = useState(null);

  return (
    <GameContext.Provider
      value={{
        screen,
        setScreen,
        players,
        setPlayers,
        isHost,
        setIsHost,
        gameData,
        setGameData,
        timer,
        setTimer,
        results,
        setResults,
        resultTimes,
        setResultTimes,
        history,
        setHistory,
        maxQuestions,
        setMaxQuestions,
        intermission,
        setIntermission,
        nextRoundCountdown,
        setNextRoundCountdown,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
