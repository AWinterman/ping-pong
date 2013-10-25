var challenge = require('./events/challenge')
  , login = require('./events/login')
  , concat = require('concat-stream')
  , through = require('through')

module.exports = wrap_commit

function wrap_commit(db, all_sockets) {
  db.on('del', display_players(all_sockets, db))
  db.on('put', display_players(all_sockets, db))

  var connections = {}

  return commit

  function commit(socket) {
    socket.on('players', display_players(socket, db))
    socket.on('challenge', challenge(db, connections))
    socket.on('login', login(db, socket, connections))
  }
}

function display_players(socket, db) {
  return function() {
    var i = 0

    var format = through(function(data) {

      var you = {}

      you.nick = data.key
      you.email = data.value
      you.index = ++i
      this.queue(you)
    })

    db.createReadStream()
      .pipe(format)
      .pipe(concat(all))

    function all(data) {
      socket.emit('players', data)
    }
  }
}


