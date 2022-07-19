const http = require('http');

const {NO_ROOM_STATUS, ROOM_IN_PROGRESS_STATUS, ROOM_CREATED, MAX_GUESSES_COUNT} = require('./constants');
const controller = require('./src/controller');
const utils = require('./src/utils')

const hostname = '0.0.0.0';
const port = 3000;

let roomStatus = NO_ROOM_STATUS;
let ROOM;

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url.match("/reset")) {
    roomStatus = NO_ROOM_STATUS;
    ROOM = undefined;
    res.statusCode = 200;
    res.end()
  } else if (req.method === 'POST' && req.url.match("/register")) {
    try {
      let reqBody = await utils.getResponseBody(req);
      const playerName = JSON.parse(reqBody).name;
      if (!playerName) {
        res.statusCode = 400;
        res.end("Request body should contain name field")
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      if (roomStatus === NO_ROOM_STATUS) {
        console.log("Creating new room");
        roomStatus = ROOM_IN_PROGRESS_STATUS;
        controller.createNewRoomWithPlayer(playerName, function (player, room) {
          ROOM = room;
          let payload = {
            "roomId": room.id,
            "playerId": player.id
          };
          roomStatus = ROOM_CREATED;
          res.end(JSON.stringify(payload))
        })
      } else if (roomStatus === ROOM_IN_PROGRESS_STATUS) {
        console.log("Room creation is in progress, waiting for it to finish")
        await waitForRoomToCreate();
        if (roomStatus === ROOM_IN_PROGRESS_STATUS) {
          // this means after 3 seconds status still remains the same.
          // may be something has gone wrong.
          // returning 500
          console.error("Room creation status is still IN_PROGRESS!");
          res.statusCode = 500;
          res.end("Error occurred during room creation. Please try again")
        } else {
          controller.createPlayer(playerName, function (playerId) {
            let payload = {
              "roomId": ROOM.id,
              "playerId": playerId
            };
            res.end(JSON.stringify(payload))
          })
        }
      } else {
        console.log("Room already present, adding new player to the room");
        controller.createPlayer(playerName, function (playerId) {
          res.end(JSON.stringify({'playerId': playerId}))
        })
      }
    } catch (e) {
      res.statusCode = 500;
      console.log(e);
      res.end()
    }
  } else if (req.method === "POST" && req.url.match("/guess")) {
    try {
      const timestamp = new Date().getTime();
      const reqBody =  JSON.parse(await utils.getResponseBody(req));
      const playerId = reqBody.playerId;
      const word = reqBody.word;
      if (!playerId || !word) {
        res.statusCode = 400;
        res.end("playerId and word are missing in body")
      }

      if (await ROOM.isGameOver()) {
        res.statusCode = 400;
        res.end("Game Over!");
        return
      }

      const player = ROOM.getPlayer(playerId);
      if (player.guessCount > MAX_GUESSES_COUNT) {
        res.statusCode = 400;
        res.end("Maximum guess count reached");
        return
      }

      // await sleep(2000);
      player.guessWord(word, timestamp)
        .then(r => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(r))
        })
        .catch(err => {
          res.statusCode = 400;
          res.end(err.toString())
        })
    } catch (e) {
      console.log("error while parsing request body", e);
      res.statusCode = 400;
      res.end("Error while parsing request body, Body should include playerId, word")
    }
  } else if (req.method === "POST" && req.url.match("/result")) {
    // if (!await isGameOver()) {
    //   res.statusCode = 400;
    //   res.end("Game not over yet");
    // }
    res.statusCode = 200;
    res.end(JSON.stringify(Object.keys(ROOM.players).map((k, i) => {
      let player = ROOM.getPlayer(k);
      return {[player.name]: player.totalTimeTakenInMs}
    })))
  } else {
    res.end(`{"error": "${http.STATUS_CODES[404]}"}`)
  }
});

async function waitForRoomToCreate(count=3) {
  if (roomStatus === ROOM_IN_PROGRESS_STATUS) {
    return sleep(1000).then(async function () {
      if (count > 0 && roomStatus === ROOM_IN_PROGRESS_STATUS)
        await waitForRoomToCreate(count-1)
    })
  }
  return sleep(0)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
