import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import io from "socket.io-client";

let socket;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function CallSimulator() {
  const [caller, setCaller] = useState("");
  const [receiver, setReceiver] = useState("");
  const [events, setEvents] = useState([]);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    socket = io(API_URL);

    socket.on("callAccepted", (data) => {
      setActiveCall({ ...data, status: "accepted", startedAt: Date.now() });
      setEvents((prev) => [
        { type: "success", text: `✅ ${data.caller} → ${data.receiver} was accepted` },
        ...prev,
      ]);
    });

    socket.on("callRejected", (data) => {
      setActiveCall(null);
      setEvents((prev) => [
        { type: "error", text: `❌ ${data.caller} → ${data.receiver} was rejected: ${data.status}` },
        ...prev,
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (caller && socket) {
      socket.emit("register", caller);
    }
  }, [caller]);

  const handleCall = async () => {
    if (!caller || !receiver) return;
    setActiveCall({ caller, receiver, status: "ringing" });

    try {
      await fetch(`${API_URL}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller, receiver }),
      });
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-animated-gradient flex items-center justify-center px-4 py-10">
      <div className="max-w-3xl w-full rounded-3xl p-8 bg-white/10 shadow-xl backdrop-blur-xl border border-white/20">
        <h1 className="text-4xl font-extrabold text-center text-white mb-10">
          📞 <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-green-200 to-yellow-200">Call Collision Simulator</span>
        </h1>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Input placeholder="Caller ID (e.g. userA)" value={caller} onChange={(e) => setCaller(e.target.value)} />
          <Input placeholder="Receiver ID (e.g. userB)" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
        </div>

        <Button onClick={handleCall} className="w-full mb-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-xl transition-transform duration-300">
          🚀 Initiate Call
        </Button>

        {activeCall && (
          <div className="mb-10 p-6 rounded-2xl bg-white/10 border border-white/20 shadow-lg backdrop-blur-md">
            <h2 className="text-2xl font-bold text-Black mb-6 flex items-center">📡 <span className="ml-2">Current Call</span></h2>
            <div className="flex items-center justify-between space-x-4">
              <UserCard id={activeCall.caller} label="Caller" />
              <StatusBadge status={activeCall.status} startedAt={activeCall.startedAt} />
              <UserCard id={activeCall.receiver} label="Receiver" />
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-Black mb-3">📋 Call History</h2>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {events.map((event, idx) => (
              <li key={idx} className={`p-3 rounded-xl text-white shadow-sm ${event.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
                {event.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UserCard({ id, label }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-indigo-400 text-white text-xl font-bold flex items-center justify-center shadow-lg ring-2 ring-white/30 animate-pulse">
        {id?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div className="text-medium text-black/80">{label}</div>
      <div className="font-medium text-black">{id || "-"}</div>
    </div>
  );
}

function StatusBadge({ status, startedAt }) {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    if (status !== "accepted") return;
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      const min = String(Math.floor(secs / 60)).padStart(2, "0");
      const sec = String(secs % 60).padStart(2, "0");
      setDuration(`${min}:${sec}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, startedAt]);

  return (
    <div className="text-center w-24 px-4 py-2 border border-white/40 rounded-lg bg-white/10 shadow-sm">
      {status === "ringing" ? (
        <div className="flex flex-col items-center text-yellow-300 font-medium animate-pulse">
          🔔 Ringing
          <span className="text-xs text-white/60">(waiting...)</span>
        </div>
      ) : (
        <div className="flex flex-col items-center text-green-200 font-medium">
          ✅ In Call
          <span className="text-xs text-white/60">{duration}</span>
        </div>
      )}
    </div>
  );
}
