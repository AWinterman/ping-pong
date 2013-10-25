var error = require('../../error')

module.exports = function(db, socket, connections) {
  var account = new Account(db, socket, connections)

  return account.login.bind(account)
}

function Account(db, socket, connections) {
  this.db = db
  this.socket = socket
  this.connections = connections
}

var cons = Account
  , proto = cons.prototype

proto.constructor = cons

proto.login = function(data) {
  var self = this

  if(!data || !data.nick || !data.email) {
    return self.socket.emit('login')
  }

  self.db.get(data.nick, got)

  function got(err) {
    if(err && err.notFound) {
      self.socket.set('nick', data.nick, function() {
        self.db.put(data.nick, data.email, wrote)
      })

      return
    }

    if(err) {
      error.emit(self.socket, error.database)

      return
    }

    self.socket.emit('login')
    error.emit(self.socket, error.player_exists)

    return
  }

  function wrote(err) {
    if(err) {
      return process.exit(1)
    }

    // resolve login based errors
    error.resolve(self.socket, error.player_exists)

    // bind the disconect handler
    self.socket.on('disconnect', self.disconnect.bind(self))
    self.socket.on('logout', self.logout.bind(self))

    // save the connections in a way that it can be referenced later.
    self.connections[data.nick] = self.socket

    self.socket.set('nick', data.nick, function() {
      // tell the client we have received and approved its login info
      self.socket.emit('login', data)
      console.log('login of ' + data.nick + ' a success')
    })
  }
}

proto.disconnect = function disconnect() {
  var self = this

  self.socket.get('nick', handle_disconnect)

  function handle_disconnect(err, nick) {
    if(err) {
      return
    }

    delete self.connections[nick]

    var player = {}

    player.nick = nick
    self.logout(player)

    self.socket.del('nick')
  }
}

proto.logout = function logout(data) {
  var self = this

  if(data) {
    self.db.del(data.nick, on_delete_player)
  }

  function on_delete_player() {
    // clear the data events
    self.socket.emit('login')
    self.socket.emit('players')
    self.socket.emit('logout')
  }
}
