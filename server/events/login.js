module.exports = login

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
    self.on('logout', logout)

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
