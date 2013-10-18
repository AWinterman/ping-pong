var options = {root: __dirname + '/../static', showDir: true}

var spawn = require('child_process').spawn
  , socketio = require('socket.io')
  , ecstatic = require('ecstatic')
  , level = require('level')
  , http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io

var servestatic = ecstatic(options)

var browserify = spawn(
    'browserify'
  , ['--debug', '-t', 'brfs', __dirname + '/../browser/index.js']
)

var commit = require('./socket.js')

browserify.stdout.pipe(
    fs.createWriteStream(__dirname + '/../static/bundle.js')
)

browserify.stderr.pipe(process.stderr)

var db = level('./players.db')

var server = http.createServer(run);

function run(req, res) {
  var uri = url.parse(req.url)

  if(uri.pathname === '/') {
    var index = fs.createReadStream(__dirname + '/../static/index.html')

    index.pipe(res)

    return
  }

  if(uri.pathname === '/pi/') {
    var body = 'HEY BILL, WHAT HAPPENS HERE? \n' +
    'ALSO I THINK YOU MIGHT NEED TO TOUCH THE SOCKET LOGIC IN SOCKET.js'

    var options = {}

    options['Content-Length'] = body.length
    options['Content-Type'] = 'text/plain'

    res.writeHead(400, options)

    return
  }

  servestatic(req, res)
}

io = socketio.listen(server)

io.set('log level', 2)

server.listen(7000)

io.sockets.on('connection', commit(db))
