const request = require('request');
const rp = require('request-promise');
const HTMLParser = require('node-html-parser');

const {baseUrl, csrfHeaderName} = require('../constants');
const Player = require('./entity/Player');
const Room = require('./entity/Room');
const utils = require('./utils');

let room;

function getRoomId(root) {
  let src = root.querySelector("#room_boards").querySelector("turbo-frame").attributes.src.split("/");
  return src[2].trim()
}

function getCsrfToken(root) {
  return root.querySelectorAll("meta").filter(e => e.attributes.name === "csrf-token")[0].attributes.content;
}

function getAuthenticityToken(root, isSigningup) {
  let idSelector = isSigningup ? "#room_signup" : "#room_form";
  return root.querySelector(idSelector).querySelector("input").attributes.value;
}

function extractRoom(rootHTML) {
  let roomId = getRoomId(rootHTML);
  let csrf_token = getCsrfToken(rootHTML);
  return new Room(roomId, csrf_token)
}

function extractPlayer(rootHTML, headers) {
  let playerId = rootHTML.querySelector("#room_boards").querySelector("turbo-frame").attributes.src.split("/")[4].trim();
  let cookie = headers['set-cookie'][0];
  let token = rootHTML.querySelector("#room_form").querySelector("input").attributes.value;
  return new Player(playerId, cookie, token, getRoomId(rootHTML), getCsrfToken(rootHTML))
}

function createNewRoomWithPlayer(playerName, callbackFn) {
  return request.get(baseUrl)
    .on('response', async function (r) {
      console.log(r.statusCode);
      if (r.statusCode === 200) {
        const responseHTML = await utils.getResponseBody(r);
        let root = HTMLParser.parse(responseHTML);

        room = extractRoom(root);
        console.log("created Room ", baseUrl+"rooms/"+room.id);

        let player = extractPlayer(root, r.headers);
        console.log("created player with id ", player.id);
        player.updateName(playerName);

        room.addPlayer(player);

        callbackFn(player, room)
      }
    })
}

function createPlayer(playerName, callbackFn) {
  return request(baseUrl+"rooms/"+room.id)
    .on('response', async function (r) {
      const responseHTML = await utils.getResponseBody(r);
      let root = HTMLParser.parse(responseHTML);

      const authToken = getAuthenticityToken(root, true);
      let cookie = r.headers['set-cookie'][0];
      const csrfToken = getCsrfToken(root);

      let url = baseUrl + "rooms/" + room.id + "/players";
      let headers = {
        "Turbo-Frame": "room_signup",
        [csrfHeaderName]: csrfToken,
        "Cookie": cookie,
        "Accept": "*/*"
      };
      let formData = {
        "authenticity_token": authToken
      };

      request.post({url: url, headers: headers, formData: formData}, function optionalCallback(err, httpResponse, body) {
        if (err) {
          return console.error('Adding new Player failed:', err);
        }
        console.log(httpResponse.statusCode);
        let r = HTMLParser.parse(body);
        cookie = httpResponse.headers['set-cookie'][0];
        headers["Cookie"] = cookie

        let playerId = r.querySelector("#keyboard").attributes['data-keyboard-player-id-value']
        console.log("Creating player with id ", playerId);

        let player = new Player(playerId, cookie, authToken, room.id, csrfToken);
        room.addPlayer(player);

        // request some more APIs required for completing the registration
        rp({url: baseUrl+"/rooms/"+room.id+"/players/"+playerId+"/guesses", headers: headers})
        rp({url: baseUrl+"/rooms/"+room.id+"/players/"+playerId, headers: headers})
        rp({url: baseUrl+"/rooms/"+room.id+"/players/"+playerId+"/guesses/new", headers: headers});

        player.updateName(playerName);

        callbackFn(player.id)

      })
    })
}

module.exports = {
  createNewRoomWithPlayer,
  createPlayer

}