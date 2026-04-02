import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, Input, Button, Timer } from "../styles/styled";

const NUDGE_EMOJIS = ["😂", "⏰", "🐢", "👀", "🔥", "🦥", "📝", "⏳", "🐌"];

function formatSeconds(sec) {
  if (sec == null || Number.isNaN(sec)) return "—";
  const n = Number(sec);
  if (n === Math.floor(n)) return `${n}s`;
  return `${n.toFixed(1)}s`;
}

export default function Game() {
  const {
    gameData,
    timer,
    history,
    maxQuestions,
    players,
    intermission,
    nextRoundCountdown,
  } = useGame();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState({});
  /** Player to nudge: opened from row tap */
  const [nudgeModalFor, setNudgeModalFor] = useState(null);
  const [incomingEmoji, setIncomingEmoji] = useState(null);
  const inputRef = useRef();
  const myId = sessionStorage.getItem("playerId");
  const currentQuestion = gameData.currentQuestion || history.length + 1;
  const canSubmit = !submitted && answer.trim().length > 0;

  const roundKey = useMemo(
    () =>
      `${gameData.question || ""}|${gameData.letter || ""}|${gameData.currentQuestion ?? ""}`,
    [gameData.question, gameData.letter, gameData.currentQuestion],
  );

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    setAnswer("");
    setSubmitted(false);
    setNudgeModalFor(null);
  }, [roundKey]);

  useEffect(() => {
    const times = gameData.submissionTimes || {};
    const next = {};
    for (const p of players) {
      const t = times[p.id];
      next[p.id] = {
        submitted: t != null,
        secondsUsed: t != null ? t : null,
      };
    }
    setSubmissions(next);
  }, [roundKey, players, gameData.submissionTimes]);

  useEffect(() => {
    const onAnswered = ({ playerId, secondsUsed }) => {
      setSubmissions((prev) => ({
        ...prev,
        [playerId]: { submitted: true, secondsUsed },
      }));
    };
    socket.on("playerAnswered", onAnswered);
    return () => socket.off("playerAnswered", onAnswered);
  }, []);

  useEffect(() => {
    if (!nudgeModalFor) return;
    const onKey = (e) => e.key === "Escape" && setNudgeModalFor(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nudgeModalFor]);

  useEffect(() => {
    if (!nudgeModalFor) return;
    if (submissions[nudgeModalFor.id]?.submitted) setNudgeModalFor(null);
  }, [nudgeModalFor, submissions]);

  useEffect(() => {
    let hideTimer;
    const onEmoji = ({ emoji, fromName }) => {
      if (hideTimer) clearTimeout(hideTimer);
      setIncomingEmoji({ emoji, fromName });
      hideTimer = setTimeout(() => setIncomingEmoji(null), 2800);
    };
    socket.on("incomingNudgeEmoji", onEmoji);
    return () => {
      socket.off("incomingNudgeEmoji", onEmoji);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  const getName = (id) => {
    const player = players.find((p) => p.id === id);
    return player ? player.name : "Unknown";
  };

  const answerRows = useMemo(() => {
    if (!intermission?.answers) return [];
    return Object.entries(intermission.answers)
      .map(([id, ans]) => ({
        id,
        name: getName(id),
        ans,
        time: intermission.answerTimes?.[id],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [intermission, players]);

  const submit = () => {
    if (submitted || !answer.trim()) return;
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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const ea = a.connected ? 0 : 1;
      const eb = b.connected ? 0 : 1;
      if (ea !== eb) return ea - eb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [players]);

  const sendNudgeEmoji = (emoji) => {
    if (!nudgeModalFor) return;
    socket.emit("nudgeEmoji", {
      targetPlayerId: nudgeModalFor.id,
      emoji,
    });
    setNudgeModalFor(null);
  };

  if (intermission) {
    const qn = Math.max(1, history.length);
    const cd =
      nextRoundCountdown != null ? nextRoundCountdown : "…";

    return (
      <Card style={{ position: "relative" }}>
        <h3 style={{ marginBottom: 12 }}>Round {qn} complete</h3>
        <div className="quesAns" style={{ marginBottom: 16 }}>
          <div>
            <strong>Question:</strong>{" "}
            <span style={{ color: "green" }}>{intermission.question}</span>
          </div>
          <div>
            <strong>Letter:</strong>{" "}
            <span style={{ color: "green" }}>{intermission.letter}</span>
          </div>
        </div>

        <div className="grayColorBox" style={{ marginBottom: 20 }}>
          <strong>Answers</strong>
          {answerRows.map(({ id, name, ans, time }) => (
            <div key={id} style={{ marginTop: 10 }}>
              <strong>{name}:</strong>{" "}
              <span style={{ color: "green" }}>{ans}</span>
              <span style={{ color: "#555", marginLeft: 8 }}>
                (Time: {formatSeconds(time)})
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: "center",
            padding: "24px 16px",
            background: "#eef4ff",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
            Next round in
          </div>
          <div style={{ fontSize: 56, fontWeight: "bold", color: "#2f80ed" }}>
            {cd}
          </div>
          {nextRoundCountdown === 1 && (
            <div style={{ marginTop: 8, color: "#666" }}>Starting next round…</div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ position: "relative" }}>
      {incomingEmoji && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(47, 128, 237, 0.12)",
            pointerEvents: "none",
            padding: 16,
            textAlign: "center",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 72, lineHeight: 1 }}>{incomingEmoji.emoji}</div>
          <div style={{ marginTop: 12, fontWeight: "bold", fontSize: 18 }}>
            {incomingEmoji.fromName}
          </div>
        </div>
      )}

      <div className="quesAnsWrapper">
        <div className="quesAns">
          <div>
            <strong>
              Question
              <em>
                ({maxQuestions ? `${currentQuestion}/${maxQuestions}` : currentQuestion})
              </em>{" "}
              :
            </strong>{" "}
            <span>{gameData.question}</span>
          </div>
          <div>
            <strong>Letter:</strong> <span>{gameData.letter}</span>
          </div>
        </div>
        <Timer>Timer: {timer}</Timer>
      </div>

      <Input
        ref={inputRef}
        autoFocus
        value={answer}
        disabled={submitted}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
      />

      <Button disabled={!canSubmit} onClick={submit}>
        Submit
      </Button>

      <div
        className="grayColorBox"
        style={{ marginTop: 16, marginBottom: 8, fontSize: 14 }}
      >
        <strong>Players this round</strong>
        <div style={{ marginTop: 8 }}>
          {sortedPlayers.length === 0 && <div>No players yet.</div>}
          {sortedPlayers.map((p) => {
            const row = submissions[p.id];
            const done = row?.submitted;
            const isMe = p.id === myId;
            const canNudge =
              submitted && !isMe && !done && p.connected;
            return (
              <div
                key={p.id}
                role={canNudge ? "button" : undefined}
                tabIndex={canNudge ? 0 : undefined}
                onClick={() =>
                  canNudge && setNudgeModalFor({ id: p.id, name: p.name })
                }
                onKeyDown={(e) => {
                  if (
                    canNudge &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    setNudgeModalFor({ id: p.id, name: p.name });
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 6px",
                  margin: "0 -6px",
                  borderRadius: 8,
                  borderBottom: "1px solid #e0e0e0",
                  opacity: p.connected ? 1 : 0.55,
                  cursor: canNudge ? "pointer" : "default",
                  background: canNudge ? "transparent" : undefined,
                }}
                title={
                  canNudge
                    ? "Tap to send an emoji to this player"
                    : undefined
                }
              >
                <span>
                  {p.name}
                  {p.isHost ? " 👑" : ""}
                  {isMe ? " (you)" : ""}
                  {!p.connected ? " · reconnecting…" : ""}
                </span>
                <span
                  style={{
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    textDecoration: canNudge ? "underline" : "none",
                    color: done ? "inherit" : canNudge ? "#2f80ed" : "#888",
                    fontWeight: canNudge ? 600 : 400,
                  }}
                >
                  {done ? (
                    <>
                      <span style={{ color: "green" }}>Submitted</span>
                      <span style={{ color: "#555", marginLeft: 8 }}>
                        {formatSeconds(row.secondsUsed)}
                      </span>
                    </>
                  ) : (
                    "Still thinking…"
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
          Answers stay hidden until the round ends.
          {submitted && (
            <span>
              {" "}
              Tap <strong>Still thinking…</strong> to send an emoji to
              someone.
            </span>
          )}
        </div>
      </div>

      {nudgeModalFor && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setNudgeModalFor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nudge-title"
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              maxWidth: 360,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="nudge-title" style={{ marginBottom: 8 }}>
              Emoji for {nudgeModalFor.name}
            </h4>
            <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
              They will see it on their screen.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {NUDGE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendNudgeEmoji(emoji)}
                  style={{
                    fontSize: 32,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fafafa",
                    cursor: "pointer",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Button
              type="button"
              className="autoWidth"
              style={{
                width: "100%",
                background: "#888",
              }}
              onClick={() => setNudgeModalFor(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
