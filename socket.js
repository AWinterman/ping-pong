var concat = require('concat-stream')
  , through = require('through')


module.exports = wrap_commit

function wrap_commit(db) { 
  return function commit(socket) {
    var account
    socket.on('login', login)
    socket.on('logout', logout)
    socket.on('players', display_players)
    socket.on('challenge', challenge)

    db.on('del', display_players)
    db.on('put', display_players)

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
          account = data.nick
          db.put(data.nick, data.email, wrote)
        })
      } else if(err) {
        self.emit('error', JSON.stringify({message: "Data base error"}))
        return
      }

      self.emit('login')
      // there should be a module which is nothing but a hash from errors to
      // their string values, which can be shared between server and browser.
      // This way I can check for errors and remove them easily, etc.
      //
      // I think I should return status codes too.
      self.emit('error', JSON.stringify({message: 'player exists'}))
      return
    }

    function wrote(err) {
      if(err) {
        return process.exit(1)
      }

      self.on('disconnect', disconnect)
      self.emit('login', data)
      self.emit('remove', 'player exists')
      console.log('login of ' + data.nick + ' a success')
    }
  }


  function disconnect() {
    var self = this
    
    self.get('nick', handle_disconnect)

    function handle_disconnect(err, nick) {
      if(err) {
        return
      }
      player = {}
      player.nick = nick
      logout.call(self, player)

      self.del('nick')
    }

  }

  function display_players(nick) {
    var self = this

    var format = through(function(data) {
      var you = {}
      you.nick = data.key
      you.email = data.value
      this.queue(you)
    })
    
    self.get('nick', emit)

    function emit(err, data) {
      db.createReadStream()
        .pipe(exclude_you(data))
        .pipe(format)
        .pipe(concat(all))
    }

     function all(data) {
       self.emit('players', data)
     }
  }

  function challenge(you, them) {
    var self = this

    db.get(you, you_are_there)

    function you_are_there(err, yourdata) {
      var client_error = read_error_handler(self, 'No such player', 'missing')
      if(client_error) {
        return self.emit('error', client_error)
      }

      db.get(them, they_are_there)

    }

    function they_are_there(err, data) {
      var client_error = read_error_handler(self, 'No such player', 'missing')
      if(client_error) {
        self.emit('error', client_error)
      }

      // both reads have succeeded, emit the challenge to the clients.
      self.emit('challenge', [you, them])
    }
  }

  function logout(data) {
    var self = this
    if(data) {
      db.del(data.nick, on_delete_player)
    }

    function on_delete_player() {
      self.emit('logout')
    }
  }
}

function read_error_handler(source, msg, extra) {
  return function(err) {
    var client_error 

    if(err && err.notFound) {
      client_error = {}
      client_error.message = msg
      client_error['extra'] = extra 
    } else if(err) {
      client_error = {}
      client_error.message = 'database error'
      client_error.error = err
    }

    return JSON.stringify(client_error)
  }
}

function exclude_you(nick) {
  return through(exclude)

  function exclude(data) {
    if(data.key === nick) {
      return
    }
    this.queue(data)
  }
}


