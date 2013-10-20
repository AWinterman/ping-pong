var concat = require('concat-stream')
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
    socket.on('logout', logout)
    socket.on('players', display_players(socket))
    socket.on('challenge', challenge)
  }

  function login(data) {
    var self = this

    if(!data || !data.nick || !data.email) {
      return self.emit('login')
    }

    db.get(data.nick, got)

    function got(err) {
      if(err && err.notFound) {
        self.set('nick', data.nick, function() {
          db.put(data.nick, data.email, wrote)
        })

        return
      }

      if(err) {
        error.emit(self, error.database)

        return
      }

      self.emit('login')
      error.emit(self, error.player_exists)

      return
    }

    function wrote(err) {
      if(err) {
        return process.exit(1)
      }

      // resolve login based errors
      error.resolve(self, error.player_exists)

      // bind the disconect handler
      self.on('disconnect', disconnect)

      // save the connections in a way that it can be referenced later.
      connections[data.nick] = self

      self.set('nick', data.nick, function() {
        // tell the client we have received and approved its login info
        self.emit('login', data)
        console.log('login of ' + data.nick + ' a success')
      })
    }
  }

  function disconnect() {

    var self = this

    self.get('nick', handle_disconnect)

    function handle_disconnect(err, nick) {
      if(err) {
        return
      }

      delete connections[nick]

      var player = {}

      player.nick = nick
      logout.call(self, player)

      self.del('nick')
    }
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

  function logout(data) {
    var self = this

    if(data) {
      db.del(data.nick, on_delete_player)
    }

    function on_delete_player() {
      // clear the data events
      self.emit('login')
      self.emit('players')
      self.emit('logout')
      self.emit('')
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
