import { useState } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, TextArea, Input, Button } from "../styles/styled";

export default function Lobby() {
  const { setHistory, setResults, setResultTimes, setGameData, players, isHost } =
    useGame();

  const [categories, setCategories] = useState(`["Fruits","Vegetables","Animals","Birds","Sea Creatures","Insects","Colors","Things That Are Red","Things That Are Blue","Things That Are Green","Things That Are Yellow","Movies","Cartoon Characters","Superheroes","Famous People","Sports","Sports Players","Cricket Players","Cities","Countries","Landmarks","Tourist Places","Foods","Street Food","Desserts","Drinks","Ice Cream Flavors","Breakfast Foods","Things in a Kitchen","Things in a Bedroom","Things in a Bathroom","Things in a Classroom","Things in a School Bag","Things in a Park","Things in a Mall","Things at a Party","Things at a Wedding","Things You Wear","Clothing Brands","Shoes","Accessories","Things You Take on a Trip","Things You Pack in a Suitcase","Things You Bring to a Picnic","Things You Bring to a Birthday Party","Things You Find in a Fridge","Things You Find in a Freezer","Things in a Car","Things That Fly","Things That Swim","Things That Move","Things With Wheels","Things That Are Hot","Things That Are Cold","Things That Are Soft","Things That Are Hard","Things That Smell Good","Things That Smell Bad","Things That Are Loud","Things That Are Quiet","Things That Make You Laugh","Things That Make You Happy","Things That Are Scary","Things That Are Funny","Things That Are Annoying","Things That Are Relaxing","Things You Do in the Morning","Things You Do at Night","Things You Do on a Weekend","Things You Do on Vacation","Things You Do When Bored","Hobbies","Outdoor Activities","Indoor Activities","Board Games","Video Games","Mobile Apps","Social Media","Things You Say Often","Nicknames","Pet Names","Things You Should Not Do","Things You Should Not Eat","Things You Should Not Touch","Things You Lose Often","Things You Forget","Things You Always Carry","Things You Use Every Day","Things You See in the Sky","Things From Space","Planets","Mythical Creatures","Fairy Tale Characters"]`);
  const [timer, setTimer] = useState(60);
  const [maxQ, setMaxQ] = useState(5);

  const startGame = () => {
    let parsedCategories = [];

    try {
      parsedCategories = JSON.parse(categories);
    } catch {
      alert("Invalid categories format");
      return;
    }

    // 🔥 RESET FRONTEND STATE FIRST
    setHistory([]);
    setResults({});
    setResultTimes({});
    setGameData({});
    setTimer(0);

    // 🔥 THEN START GAME
    socket.emit("startGame", {
      categories: parsedCategories,
      timer: Number(timer),
      maxQuestions: Number(maxQ),
    });
  };

  return (
    <Card>
      <h3>Players</h3>
      <ul style={{ listStyleType: "none", margin: "10px 0 50px" }}>
        {players.map((p) => (
          <li key={p.id}>
            {p.name} {p.isHost && "👑"} {!p.connected && " (reconnecting...)"}
          </li>
        ))}
      </ul>

      {isHost && (
        <>
          <div style={{ marginBottom: "10px" }}>
            <strong>Settings</strong>
          </div>
          <TextArea
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startGame()}
          />
          <Input
            type="number"
            value={timer}
            onChange={(e) => setTimer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startGame()}
          />
          <Input
            type="number"
            value={maxQ}
            onChange={(e) => setMaxQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startGame()}
          />
          <Button onClick={startGame}>Start Game</Button>
        </>
      )}
    </Card>
  );
}
