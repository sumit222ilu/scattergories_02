import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, Button } from "../styles/styled";
import { useEffect, useRef, useState } from "react";

export default function LastSubmitAnswers() {
  const { results, resultTimes, isHost, players, history, maxQuestions, gameData } =
    useGame();

  const [timer, setTimer] = useState(5);
  const [hasEmitted, setHasEmitted] = useState(false);
  const buttonRef = useRef(null);

  const getName = (id) => {
    const player = players.find((p) => p.id === id);
    return player ? player.name : "Unknown";
  };
  const lastRound = history[history.length - 1];
  const currentQuestion = history.length || gameData.currentQuestion || 1;

  // Focus button on load
  useEffect(() => {
    if (isHost && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isHost]);

  // Countdown logic
  useEffect(() => {
    if (!isHost || hasEmitted) return;

    if (timer === 0) {
      socket.emit("nextRound");
      setHasEmitted(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, isHost, hasEmitted]);

  const handleNextRound = () => {
    if (hasEmitted) return;
    socket.emit("nextRound");
    setHasEmitted(true);
  };

  return (
    <Card>
      <div className="quesAnsWrapper">
        <div className="quesAns">
          <div>
          <strong>Question<em>({maxQuestions ? `${currentQuestion}/${maxQuestions}` : currentQuestion})</em> :</strong>{" "}
            <span>{lastRound?.question || gameData.question}</span>
          </div>
          <div>
            <strong>Letter:</strong> <span>{lastRound?.letter || gameData.letter}</span>
          </div>
        </div>
      </div>

      <div className="grayColorBox">
        {Object.entries(results).map(([id, ans]) => (
          <div key={id}>
            {getName(id)}: {ans} (Time Took: {resultTimes[id] ?? "-"}sec)
          </div>
        ))}
      </div>

      {isHost && (
        <Button ref={buttonRef} onClick={handleNextRound}>
          Next Round in {timer}...
        </Button>
      )}
    </Card>
  );
}
