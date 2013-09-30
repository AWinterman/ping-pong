var http = require('http')
var fs = require('fs')
var url = require('url')
var through = require('through')
var hyperstream = require('hyperstream')
var level = require('level')
var ecstatic = require('ecstatic')({root: __dirname + '/static', showDir: true})
var socketio = require('socket.io')
var browserify = require('browserify')
var brfs = require('brfs')
var concat = require('concat-stream')

// browserfying, should maybe consider writeSync...
fs.watch('./', function() {
  var b = browserify()
  b.add('./browser/index')
  b.transform(brfs)
  b.bundle().pipe(concat(function(data) {
    fs.writeSync(__dirname + '/static/bundle.js', Buffer(data))
  }))
})

var db = level('./players.db')

var server = http.createServer(function (req, res) {
    var uri = url.parse(req.url)
    if(uri.pathname === '/') {
      var index = fs.createReadStream(__dirname + '/static/index.html')

      index.pipe(res)

      return
    }
    ecstatic(req, res)
});


var io = socketio.listen(server)
io.set('log level', 1)
server.listen(8000)

io.sockets.on('connection', commit)

function commit(socket) {
  socket.on('login', login)
  socket.on('logout', logout)


  function login(data) {
    if(!data || !data.nick || !data.email) {
      return socket.emit('login failed', 'no login info')
    }
    db.get(data.nick, got)

    function got(err) {
      if(err) {
        var players = db.createReadStream()
          .pipe(exclude_current(data))

        players.on('data', emit_player)
        players.on('end', function() {
          socket.emit('end players')
        })

        socket.set('nick', data.nick, function() {
          db.put(data.nick, data.email, wrote)
        })

        socket.on('disconnect', disconnect)
        return 
      }

      return socket.emit('login failed', 'player exists')
    }

    function wrote(err) {
      if(err) {
        return process.exit(1)
      }

      socket.emit('login success', 'success')
    }
  }

  db.on('put', emit_player)

  function emit_player(data) {
    console.log(data)
    var player = {}

    player.nick = data.key 
    player.email = data.value
    socket.emit('player', player)
  }

  function disconnect() {
     socket.get('nick', handle_disconnect)

     function handle_disconnect(nick) {
       player = {}
       player.nick = nick
       logout(player)
     }

     socket.del('nick')
  }
}

function exclude_current(player) {
  return through(exclude)

  function exclude(data) {
    if(data.nick === player.nick) {
      return
    }
    return this.queue(data)
  }
}

function logout(data) {
  db.del(data.nick, delete_player)

  function delete_player() {
    console.log('deleting', arguments)
  }
}
