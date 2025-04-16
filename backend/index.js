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
      // statokat is fogadunk, az majd kell a queue logikához.
      if (dec.username in inQueue) {
        delete inQueue[dec.username]; // Felhasználó el akarja hagyni a queue-t, ezért kivesszük a listából
        ws.send(JSON.stringify({ type: "queue_left", message: "Kiléptél a queueból." }));
      } else {
        // Felhasználó még nincs bent a queueban
        inQueue[dec.username] = { ws, level: dec.level, power_combined: dec.power_combined };
        ws.send(JSON.stringify({ type: "queue_accept", message: "Sikeres belépés. Várakozás játékosokra...", waiting: Object.keys(inQueue).length }));
      }

      console.log(inQueue);

      // ez a szám szabja meg hogy hány player kell hogy a queue összehasonlítást végezzen, és indítson lobbikat (kettesével)
      if (Object.keys(inQueue).length >= 4) {
        let teamset = []; // Ebbe a listába kerülnek a csapatok: [[user1, user2], [user3, user4],... [usern, usern+1]]
        let scoreset = {}; // Ebbe a listába kerülnek a pontozások: {user1: 140, user2: 200,... usern: x}

        for (const [username, data] of Object.entries(inQueue)) {
          data.ws.send(JSON.stringify({ type: "queue_confirming", message: "A meccs előkészítése..." }));
          console.log(`${username}: Level: ${data.level}, Power: ${data.power_combined}`);
          scoreset[username] = data.level * 3 + data.power_combined * 5; // Ez állapítja meg, milyen erős egy player
        }

        // sorba rendezés pont alapján
        scoreset = Object.entries(users)
          .sort((a, b) => a[1] - b[1])
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        teamset = Object.entries(scoreset).reduce((acc, [key, value], index, array) => {
          // kettesével elválasztja a playereket
          // utolsó páratlan player kimarad a meccsből és keres tovább
          if (index % 2 === 0 && index + 1 < array.length) {
            acc.push([array[index][0], array[index + 1][0]]);
            inQueue[array[index + 1][0]].ws.send(JSON.stringify({ type: "match_found", message: `Ellenfeled: ${array[index][0]}` }));
            inQueue[array[index][0]].ws.send(JSON.stringify({ type: "match_found", message: `Ellenfeled: ${array[index + 1][0]}` }));
            delete inQueue[array[index][0]];
            delete inQueue[array[index + 1][0]];
          }
          return acc;
        }, []);

        // miután megvan mind a 2 játékos, csinálhatunk egy temp. lobby-t ahova mindkettőjüket bedobja, vagy valami ilyesmi.

        console.log(inQueue);
        console.log(teamset);
        console.log(scoreset);
      }
    } else if (dec.type == "queue_check") {
      if (dec.username in inQueue) {
        ws.send(JSON.stringify({ type: "queue_alive", waiting: Object.keys(inQueue).length }));
      } else {
        ws.send(JSON.stringify({ type: "queue_dead" }));
      }
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
