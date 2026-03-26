import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, Input, Button, Timer } from "../styles/styled";

export default function Game() {
  const { gameData, timer, history, maxQuestions } = useGame();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef();
  const currentQuestion = gameData.currentQuestion || history.length + 1;

  useEffect(() => {
    inputRef.current?.focus();
    setAnswer("");
    setSubmitted(false);
  }, [gameData]);

  const submit = () => {
    if (submitted) return;
    socket.emit("submitAnswer", answer);
    setSubmitted(true);
  };

  useEffect(() => {
    const handler = () => {
      if (!submitted) {
        socket.emit("submitAnswer", answer || "NA");
        setSubmitted(true);
      }
    };

    socket.on("forceSubmit", handler);

    return () => socket.off("forceSubmit", handler);
  }, [answer, submitted]);

  return (
    <Card style={{ position: "relative" }}>
      <div className="quesAnsWrapper">
        <div className="quesAns">
          <div>
            <strong>Question<em>({maxQuestions ? `${currentQuestion}/${maxQuestions}` : currentQuestion})</em> :</strong> <span>{gameData.question}</span>
          </div>
          <div>
            <strong>Letter:</strong> <span>{gameData.letter}</span>
          </div>
        </div>
        <Timer>Timer: {timer}</Timer>
      </div>

      <Input
        ref={inputRef}
        value={answer}
        disabled={submitted}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />

      <Button disabled={submitted} onClick={submit}>
        Submit
      </Button>
    </Card>
  );
}
