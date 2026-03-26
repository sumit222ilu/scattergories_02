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

Please evaluate Scattergories answers using these rules:

1. Basic Requirements
The answer must start with the given letter (ignore spaces).
The answer must clearly fit the category.
2. Scoring
110 points → Fully correct
Real, commonly accepted answer
Direct and obvious match to category
100 points → Mostly correct (>60%)
Indirect but reasonable association
Clearly recognizable and relevant
90 points → Weak answer (<60%)
Very loose or uncommon connection
Forced but still somewhat related
0 points → Invalid
Does NOT fit the category at all
Completely unrelated answer
Nonsense or meaningless response
3. Spelling Rule
Ignore minor spelling mistakes if the intended answer is clear
If spelling is unclear or changes the meaning → 0 points
4. Strictness Rules
Reject fabricated or unnatural phrases → 0 points
If it ONLY matches the starting letter but not the category → 0 points
Allow indirect but widely understood associations

Subjective answers:

Common/typical → 100
Rare/unlikely → 90
5. Duplicate Answer Rule

Case A: Exact same answer

Rank players by time taken (fastest first)
1st → full points
2nd → -10 points from 1st score
3rd → -10 points from 2nd score

Same time condition:

If players give the same answer at the same time, they receive the same deduction level

Case B: Same answer with minor spelling difference

Correct spelling → full points
Slightly incorrect spelling → -10 points from the correct one
6. Consistency Rule
Apply the same strictness to all teams
Similar types of answers must be judged equally
Same quality answers → same score
No contradictions across similar cases
7. Multi-Answer Rule
If a player gives multiple answers:
Take the best valid answer
Maximum score capped at 100
8. Speed Bonus Rule
Among valid answers only:
Fastest correct answer → +10
Second fastest correct answer → +5
If only one valid answer → +10
No bonus for invalid answers
9. Output Requirements
Show reasoning for each answer
Provide a score table (Team1 vs Team2)
Declare the winner
10. Fun Teasing Task
Assign ONE light, playful teasing task to the losing team 😄`;

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
