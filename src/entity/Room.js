const {baseUrl} = require('../../constants');
const HTMLParser = require('node-html-parser');
const rp = require('request-promise');

class Room {

  constructor(id, token, players={}) {
    this.id = id;
    this.csrfToken = token;
    this.players = players;
  }

  addPlayer(player) {
    this.players[player.id]=player;
  }

  getPlayer(playerId) {
    return this.players[playerId]
  }

  async isGameOver() {
    let options = {
      url: baseUrl+"rooms/"+this.id,
      method: "GET"
    };
    const r = await rp(options);
    const rootHTML = HTMLParser.parse(r);
    return rootHTML.querySelector("#end-banner")
  }
}

module.exports = Room