import { useEffect } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, Button } from "../styles/styled";

export default function Results() {
  const { results, resultTimes, history, isHost, players } = useGame();

  function buildResultsText() {
    let text = "";

    history.forEach((round, index) => {
      text += `\nQuestion ${index + 1}: ${round.question}\n`;
      text += `Letter: ${round.letter}\n`;

      Object.entries(round.answers).forEach(([id, ans]) => {
        const player = players.find((p) => p.id === id);
        const name = player ? player.name : "Unknown";
        const timeTook = round.answerTimes?.[id];

        text += `${name}: ${ans} (Time Took: ${timeTook ?? "-"}sec)\n`;
      });

      text += "\n";
    });

    return text;
  }

  function copyToClipboard(showAlert = true) {
    const resultsText = buildResultsText();

    const finalText = `I am playing Scattergories. Here are the collected answers:
${resultsText}
Scattergories Evaluation Rules (Final Version)
1. Basic Requirements
Answer must start with the given letter (ignore spaces).
Answer must clearly fit the category.
2. Scoring
110 points → Fully correct
Real, commonly accepted answer
Direct and obvious match
100 points → Mostly correct (>60%)
Indirect but reasonable
Clearly recognizable
90 points → Weak answer (<60%)
Loose or uncommon connection
0 points → Invalid
Does not fit category
Unrelated / nonsense
3. Spelling Rule
Minor spelling mistakes → ignore (if intent clear)
Unclear / meaning changes → 0 points
4. Strictness Rules
No fabricated / unnatural phrases → 0 points
Only matching letter but not category → 0 points
Indirect but commonly understood → allowed

Subjective answers:

Common → 100
Rare → 90
5. Duplicate Answer Rule

Case A: Exact same answer

Rank by time (fastest first)
1st → full points
2nd → -10
3rd → -20

Same time:

Same deduction level

Case B: Same answer (spelling variation)

Correct spelling → full points
Slight mistake → -10
6. Consistency Rule
Same type of answers → same score
No contradictions
Equal strictness across all players
7. Multi-Answer Rule
Pick best valid answer
Max score = 100
8. Speed Bonus Rule

(Only valid answers)

Fastest → +10
Second fastest → +5
Only one valid → +10
Invalid → no bonus
9. Output Format (Compact View Only)

For each question:

Evaluate each player:
Answer
Reason (short)
Base score
Speed bonus
Final score

Then:

Final Ranking (sorted by total score):

Player – Score
Player – Score
Player – Score
10. Winner
Declare winner (highest total score)
11. Fun Teasing Task 😄
Give ONE playful, light task to the losing team`;

    // ✅ Modern API
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(finalText);
    } else {
      // 🔥 Fallback (works everywhere)
      const textarea = document.createElement("textarea");
      textarea.value = finalText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Copy failed", err);
      }

      document.body.removeChild(textarea);
    }

    if (showAlert) {
      alert("Copied for AI evaluation 🚀");
    }
  }

  // useEffect(() => {
  //   if (history.length) {
  //     setTimeout(() => {
  //       copyToClipboard(true); // small delay helps
  //     }, 300);
  //   }
  // }, []);

  const getName = (id) => {
    const player = players.find((p) => p.id === id);
    return player ? player.name : "Unknown";
  };

  return (
    <>
      <Card>
        <h3 style={{ marginBottom: "20px" }}>Results</h3>
        <div className="grayColorBox">
          {Object.entries(results).map(([id, ans]) => (
            <div key={id}>
              {getName(id)}: {ans} (Time Took: {resultTimes[id] ?? "-"}sec)
            </div>
          ))}
        </div>
        <Button onClick={() => copyToClipboard(true)}>
          Copy for AI Evaluation
        </Button>
        {isHost && <Button onClick={() => socket.emit("rematch")}>Rematch</Button>}
      </Card>
      <Card className="historyWrapper">
        <h3>History</h3>
        {history.map((round, i) => (
          <div key={i} className="grayColorBox">
            <div>
              <strong>
                Q{i + 1}:{" "}
                <span style={{ color: "green" }}> {round.question}</span>
              </strong>
            </div>
            <div>
              <strong>
                Letter:
                <span style={{ color: "green" }}> {round.letter}</span>
              </strong>
            </div>
            <div style={{ marginTop: "20px" }}>
              {Object.entries(round.answers).map(([id, a]) => (
                <div key={id}>
                  {getName(id)}: {a} (Time Took: {round.answerTimes?.[id] ?? "-"}sec)
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
      {/* <Button
        onClick={() => {
          socket.emit("startGame", {
            categories: [], // optional reuse
            timer: 60,
            maxQuestions: 5,
          });
        }}
      >
        Restart Game
      </Button> */}
    </>
  );
}
