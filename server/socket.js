var login = require('./events/login')
  , concat = require('concat-stream')
  , through = require('through')
  , error = require('../error')

module.exports = wrap_commit

function wrap_commit(db, all_sockets) {
  db.on('del', display_players(all_sockets))
  db.on('put', display_players(all_sockets))

  var connections = {}

  return commit

  function commit(socket) {
    // commit handles individual socket connections.
    socket.on('login', login)
    socket.on('players', display_players(socket))
    socket.on('challenge', challenge)
  }

  function display_players(socket) {
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

  function challenge(source, target) {
    var self = this

    db.get(source, source_are_there)

    function source_are_there(err, data) {
      var found_error = read_error_emitter(self, err)

      if(found_error) {
        return
      }

      db.get(target, target_are_there)
    }

    function target_are_there(err, data) {
      var found_error = read_error_emitter(self, err)

      if(found_error) {
        return
      }

      // we now need to iterate through all the sockets except for source and
      // the challenge target and let target know a challenge has occured.
      console.log(source, 'challenged', target)

      for(var nick in connections) {
        if(nick === source) {
          connections[nick].emit('challenge', null, target)

          continue
        }

        if(nick === target) {
          connections[nick].emit('challenge', source, null)

          continue
        }

        connections[nick].emit('challenge', source, target)
      }
    }
  }


}

function read_error_emitter(socket, err) {
  if(err && err.notFound) {
    error.emit(socket, error.player_missing)

    return true
  }

  if(err) {
    error.emit(socket, error.database)

    return true
  }

  return false
}
