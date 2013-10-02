var http = require('http')
var fs = require('fs')
var url = require('url')
var through = require('through')
var hyperstream = require('hyperstream')
var level = require('level')
var ecstatic = require('ecstatic')({root: __dirname + '/static', showDir: true})
var socketio = require('socket.io')
var spawn = require('child_process').spawn

var browserify = spawn('browserify', ['-d', '-t', 'brfs', __dirname +'/browser/index.js'])

browserify.stdout.pipe(fs.createWriteStream(__dirname + '/static/bundle.js'))
browserify.stderr.pipe(process.stderr)

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
io.set('log level', 2)

server.listen(7000)

io.sockets.on('connection', commit)

function commit(socket) {
  socket.on('login', login)
  socket.on('logout', logout)

  function logout(data) {
    db.del(data.nick, on_delete_player)
  }

  function on_delete_player() {
    socket.emit('logout')
  }

  function login(data) {
    if(!data || !data.nick || !data.email) {
      return socket.emit('login')
    }

    db.get(data.nick, got)

    function got(err) {
      if(err) {

        socket.set('nick', data.nick, function() {
          db.put(data.nick, data.email, wrote)
        })

        socket.on('disconnect', disconnect)
        return 
      }

      socket.emit('login')
      socket.emit('error', 'player exists')
      return
    }

    function wrote(err) {
      if(err) {
        return process.exit(1)
      }

      socket.emit('login', data)
      console.log('login of ' + data.nick + ' a success')
    }
  }

  db.on('put', emit_player)

  function emit_player(data) {
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


function display_payers() {
  var players = db.createReadStream()

  players.on('data', emit_player)
}
