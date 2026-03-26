import { useState } from "react";
import { socket } from "../socket";
import { useGame } from "../context/GameContext";
import { Card, Input, Button } from "../styles/styled";

export default function Join() {
  const [name, setName] = useState("");
  const { setScreen } = useGame();

  const join = () => {
    if (!name.trim()) return alert("Enter name");

    // ✅ persist name (optional but useful)
    localStorage.setItem("playerName", name);

    socket.emit("join", name);
    setScreen("lobby");
  };

  return (
    <Card>
      <Input
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && join()}
      />
      <Button onClick={join}>Join</Button>
    </Card>
  );
}
