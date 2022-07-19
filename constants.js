const baseUrl = "https://wordle-friends.herokuapp.com/";
const csrfHeaderName = "X-CSRF-Token";
const NO_ROOM_STATUS = "NO_ROOM" ;
const ROOM_IN_PROGRESS_STATUS = "IN_PROGRESS";
const ROOM_CREATED = "CREATED";
const MAX_GUESSES_COUNT = 6;

module.exports = {baseUrl, csrfHeaderName, NO_ROOM_STATUS, ROOM_CREATED, ROOM_IN_PROGRESS_STATUS, MAX_GUESSES_COUNT}