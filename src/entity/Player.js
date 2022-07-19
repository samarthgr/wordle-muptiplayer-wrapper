const rp = require('request-promise');
const {baseUrl, csrfHeaderName} = require('../../constants');
const HTMLParser = require('node-html-parser');

class Player {

  lastUpdatedTimestamp;
  totalTimeTakenInMs=0;
  name='';

  constructor(id, sessionString, authenticationToken, roomId, csrfToken) {
    this.id = id;
    this.sessionString = sessionString;
    this.authenticationToken = authenticationToken;
    this.roomId = roomId;
    this.csrfToken = csrfToken;
    this.guessCount = 0;
  }

  updateName(name) {
    console.log("updating name of player ", this.id);
    let options = {
      url: baseUrl+"rooms/"+this.roomId+"/players/"+this.id,
      method: "POST",
      headers: {
        'Cookie': this.sessionString,
        [csrfHeaderName]: this.csrfToken,
        'Turbo-Frame': 'name_player_'+this.id,
        'Accept': '*/*'
      },
      formData: {
        "_method": "patch",
        "authenticity_token": this.authenticationToken,
        "name": name
      }
    };
    return rp(options)
      .catch(err => {
        if (err.statusCode !== 302)
          console.log("name update failed: ", err)
        else {
          console.log("name update successful!");
          this.name = name
        }
      })
  }

  guessWord(word, timestamp) {
    if (this.lastUpdatedTimestamp) {
      this.totalTimeTakenInMs += timestamp - this.lastUpdatedTimestamp;
    }
    let url = baseUrl+"rooms/"+this.roomId+"/guesses";
    let formData = {
      "authenticity_token": this.authenticationToken,
      "word": word
    };
    let headers = {
      "Turbo-Frame": "player_"+this.id,
      [csrfHeaderName]: this.csrfToken,
      "Cookie": this.sessionString,
      "Accept": "*/*"
    };

    return rp({method: "POST", url: url, formData:formData, headers: headers}).then(r => {
      if (this.isWordNotInList(HTMLParser.parse(r))) {
        throw new Error("Word not in List")
      }
      return this.getGuesses()
    })
  }

  getGuesses() {
    let options = {
      url: baseUrl+"rooms/"+this.roomId+"/players/"+this.id+"/guesses",
      method: "GET",
      headers: {
        "Turbo-Frame": "player_"+this.id,
        [csrfHeaderName]: this.csrfToken,
        "Cookie": this.sessionString,
        "Accept": "*/*"
      }
    };
    return rp(options).then(r => {
      let root = HTMLParser.parse(r);

      const gussesBlock = root.querySelectorAll(".row");
      return gussesBlock.map(gb => {
        let result = [];
        gb.querySelectorAll(".tile").forEach(t => result.push({ [t.text.trim()]: t.attributes['data-state']}));
        this.guessCount = result.length;
        this.lastUpdatedTimestamp = new Date().getTime();
        return result
      })
    })
  }

  isWordNotInList(rootHTML) {
    return rootHTML.querySelector("#error_explanation");
  }
}

module.exports = Player