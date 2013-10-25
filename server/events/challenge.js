var error = require('../../error')

module.exports = function(db, connections) {
  return challenge

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
