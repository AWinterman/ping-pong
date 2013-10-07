var http = require('http')
var fs = require('fs')
var url = require('url')
var level = require('level')
var ecstatic = require('ecstatic')({root: __dirname + '/static', showDir: true})
var socketio = require('socket.io')
var spawn = require('child_process').spawn

var browserify = spawn('browserify', ['-d', '-t', 'brfs', __dirname +'/browser/index.js'])

var commit = require('./socket.js')

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

io.sockets.on('connection', commit(db))

