import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { PhoneCall, User, Clock } from "lucide-react";
import io from "socket.io-client";
import { motion } from "framer-motion";
import axios from "axios";

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
        { type: "error", text: `❌ ${data.caller} → ${data.receiver} was rejected` },
        ...prev,
      ]);
    });

    socket.on("collisionDetected", (data) => {
      setEvents((prev) => [
        { type: "error", text: `⚠️ Collision detected: ${data.message}` },
        ...prev,
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCall = async () => {
    if (!caller || !receiver) return;

    if (caller === receiver) {
      setEvents((prev) => [
        { type: "error", text: "❌ Caller and Receiver cannot be the same." },
        ...prev,
      ]);
      return;
    }

    setEvents((prev) => [
      { type: "info", text: `📞 ${caller} is calling ${receiver}...` },
      ...prev,
    ]);

    try {
      const res = await axios.post(`${API_URL}/call`, { caller, receiver });

      setEvents((prev) => [
        { type: "info", text: res.data.message },
        ...prev,
      ]);
    } catch (err) {
      console.error("Error calling API", err);
      setEvents((prev) => [
        { type: "error", text: "❌ Failed to initiate call." },
        ...prev,
      ]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#ff0080] text-white px-4 py-8 flex flex-col items-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/images/stars.svg')] opacity-20 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0f0c29] to-transparent opacity-70"></div>
        <svg className="absolute bottom-0 left-0 w-full h-32 text-white/10 animate-pulse" viewBox="0 0 1440 320">
          <path fill="currentColor" fillOpacity="1" d="M0,256L60,245.3C120,235,240,213,360,208C480,203,600,213,720,202.7C840,192,960,160,1080,160C1200,160,1320,192,1380,208L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
        </svg>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-5xl font-extrabold text-center mb-10 bg-gradient-to-r from-[#6e38f7] to-[#34e8eb] bg-clip-text text-transparent animate-text drop-shadow-xl"
      >
        Call Collision Simulator
      </motion.h1>

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white/5 p-6 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-lg border border-white/10">
        <UserCard id={caller} label="Caller" />
        <UserCard id={receiver} label="Receiver" />

        <div className="col-span-2 flex flex-col sm:flex-row gap-4 items-center mt-4">
          <Input
            placeholder="Caller ID"
            value={caller}
            onChange={(e) => setCaller(e.target.value)}
            className="w-full bg-[#2e2c48] border border-white/20 text-white placeholder-white/60"
          />
          <Input
            placeholder="Receiver ID"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="w-full bg-[#2e2c48] border border-white/20 text-white placeholder-white/60"
          />
          <Button
            onClick={handleCall}
            className="bg-gradient-to-r from-[#6e38f7] to-[#34e8eb] text-white px-6 shadow-lg hover:scale-105 transition-transform"
          >
            <PhoneCall className="mr-2" /> Call
          </Button>
        </div>
      </div>

      {activeCall && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-8 p-5 rounded-lg bg-white/10 border border-white/10 backdrop-blur text-center"
        >
          <div className="text-sm text-white/70 mb-1 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-pulse" /> Call in progress...
          </div>
          <div className="text-xl font-semibold text-white">
            {activeCall.caller} → {activeCall.receiver}
          </div>
        </motion.div>
      )}

      <div className="relative z-10 mt-10 w-full max-w-3xl">
        <h2 className="text-xl font-semibold mb-3 text-white/80">Event Timeline</h2>
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {events.map((event, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
              className={`p-2 rounded-md text-sm border-l-4 ${
                event.type === "success"
                  ? "bg-green-500/10 border-green-500"
                  : event.type === "error"
                  ? "bg-red-500/10 border-red-500"
                  : "bg-blue-500/10 border-blue-500"
              }`}
            >
              {event.text}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function UserCard({ id, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl transition hover:shadow-2xl hover:border-white/20"
    >
      <div className="relative w-20 h-20 mx-auto mb-3">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6e38f7] to-[#34e8eb] blur-xl opacity-40 animate-ping z-0"></div>
        <div className="relative z-10 w-full h-full rounded-full bg-[#2e2c48] text-white flex items-center justify-center text-2xl font-bold shadow-lg ring-2 ring-white/10 transition-transform group-hover:scale-105">
          {id?.charAt(0)?.toUpperCase() || "?"}
        </div>
      </div>

      <div className="text-center">
        <div className="text-white/50 text-sm tracking-wide">{label}</div>
        <div className="text-white font-semibold text-lg">{id || "-"}</div>
      </div>
    </motion.div>
  );
}
