const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let inQueue = {}

wss.on('connection', (ws, req) => {
  console.log('Websocket connection from ' + req.socket.remoteAddress);

  ws.on('message', (msg) => {
    console.log(`Received: ${msg}`);
    let dec = JSON.parse(msg);
    if (dec.type == "queue_update") {
      // objectben tároljuk hogy ki van bent a queueban
      // de először megnézzük hogy már bent van-e player a queueban
      if (dec.username in inQueue) {
        delete inQueue[dec.username]; // Felhasználó el akarja hagyni a queue-t, ezért kivesszük a listából
        ws.send(JSON.stringify({ type: "queue_left", message: "Kiléptél a queueból." }));
      } else {
        // Felhasználó még nincs bent a queueban
        inQueue[dec.username] = { ws, level: dec.level, power_combined: dec.power_combined};
        ws.send(JSON.stringify({ type: "queue_accept", message: "Sikeres belépés. Várakozás játékosokra...", waiting: Object.keys(inQueue).length }));
      }

      console.log(inQueue);
    } else if (dec.type == "queue_check") {
      if (dec.username in inQueue) {
        ws.send(JSON.stringify({ type: "queue_alive", waiting: Object.keys(inQueue).length }));
      } else {
        console.log("Nincs queueban!");
        console.log(dec.username);
        console.log(inQueue);
        ws.send(JSON.stringify({ type: "queue_dead" }));
      }
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
