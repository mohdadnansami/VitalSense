import express from "express";
import fs from "fs";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const DATA_FILE = "./data.json";

/* ================= REST API ================= */

// Save incoming data
app.post("/api/data", (req, res) => {
  const data = req.body;
  const existing = JSON.parse(fs.readFileSync(DATA_FILE));

  existing.logs.push({
    ...data,
    time: new Date().toISOString()
  });

  fs.writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2));
  res.json({ success: true });
});

// Read stored data
app.get("/api/data", (req, res) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE));
  res.json(data);
});

/* ================= WEBSOCKET ================= */

const server = app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  console.log("🟢 Frontend connected");

  setInterval(() => {
    const fakeData = {
      hr: Math.floor(Math.random() * 40) + 60,
      spo2: Math.floor(Math.random() * 4) + 95,
      temp: (Math.random() * 1.5 + 36).toFixed(1),
      gsr: Math.floor(Math.random() * 300) + 200,
      move: Math.floor(Math.random() * 2)
    };

    ws.send(JSON.stringify(fakeData));
  }, 2000);
});