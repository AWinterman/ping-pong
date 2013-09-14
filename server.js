var http = require('http')
var fs = require('fs')
var url = require('url')
var through = require('through')
var hyperstream = require('hyperstream')
var level = require('level')
var ecstatic = require('ecstatic')({root: __dirname + '/static', showDir: true})
var socketio = require('socket.io')

var render = require('./render');


var db = level('./players.db')

var server = http.createServer(function (req, res) {
    var uri = url.parse(req.url)
    if (uri.pathname === '/') {
      var index = fs.createReadStream(__dirname + '/static/index.html')
        , login = fs.createReadStream(__dirname + '/static/register.html')

      var hs = hyperstream({
        '#login': login
      })
      hs.pipe(res)
      index.pipe(hs)

      return
    }
    ecstatic(req, res)
});


var io = socketio.listen(server )
io.set('log level', 1)
server.listen(8000)

model = {}

io.sockets.on('connection', commit)

function commit(socket) {
  socket.on('login', login)
  function login(data) {
    db.get(data[0], got)

    function got(err) {
      if(err) {
        console.log('writing data', data)
        return db.put(data[0], data[1], wrote)
      }
      return socket.emit('login failed', 'player exists')
    }

    function wrote(err) {
      if(err) return process.exit(1)

      socket.emit('login success', 'success')

      var players = db.createReadStream()
      players.on('data', emit_player)
      players.on('end', function() {
        socket.emit('no more players')
      })
    }
  }

  db.on('put', emit_player)

  function emit_player(key, data) {
    socket.emit('player', key, data)
  }
}


// need to add listeners for the put and delete events (which should pass them on forward)

