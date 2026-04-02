import { GameProvider, useGame } from "./context/GameContext";
import useGameSocket from "./hooks/useGameSocket";
import { socket } from "./socket";

import Join from "./components/Join";
import Lobby from "./components/Lobby";
import Game from "./components/Game";
import Results from "./components/Results";
import { Page, Button } from "./styles/styled";

function Main() {
  const { screen, history, maxQuestions } = useGame();

  
  useGameSocket();

  function leaveGame() {
    socket.emit("leaveGame");

    socket.disconnect(); // 🔥 clean disconnect

    sessionStorage.removeItem("playerId");
    localStorage.removeItem("playerName");

    window.location.reload();
  }

  return (
    <Page>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Scattergories Multiplayer</h1>
        <Button className="autoWidth red" onClick={leaveGame}>
          Leave Game
        </Button>
      </div>

      {screen === "join" && <Join />}
      {screen === "lobby" && <Lobby />}
      {screen === "game" && <Game />}
      {screen === "results" && <Results />}
    </Page>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Main />
    </GameProvider>
  );
}
