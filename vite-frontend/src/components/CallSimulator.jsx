import { useEffect, useState } from "react";
import io from "socket.io-client";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const socket = io("http://localhost:3000");

export default function CallSimulator() {
  const [caller, setCaller] = useState("");
  const [receiver, setReceiver] = useState("");
  const [events, setEvents] = useState([]);
useEffect(() => {
  socket.on("callAccepted", (data) => {
    setEvents((prev) => [
      { type: "success", text: `✅ ${data.caller} → ${data.receiver} was accepted` },
      ...prev
    ]);
  });

  socket.on("callRejected", (data) => {
    setEvents((prev) => [
      { type: "error", text: `❌ ${data.caller} → ${data.receiver} was rejected: ${data.status}` },
      ...prev
    ]);
  });

  return () => {
    socket.off("callAccepted");
    socket.off("callRejected");
  };
}, []);


  const handleCall = async () => {
    if (!caller || !receiver) return;
    try {
      await fetch("http://localhost:3000/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller, receiver })
      });
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">📞 Simulate a Call</h2>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Input
          placeholder="Caller ID (e.g. userA)"
          value={caller}
          onChange={(e) => setCaller(e.target.value)}
        />
        <Input
          placeholder="Receiver ID (e.g. userB)"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
        />
        <Button onClick={handleCall}>Initiate Call</Button>
      </div>

      <ul className="space-y-2">
        {events.map((event, idx) => (
          <li
            key={idx}
            className={`p-2 rounded-xl text-white ${
              event.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {event.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
