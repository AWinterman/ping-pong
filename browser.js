var through = require('through')
  , render = require('./render')
  , ever = require('ever')
  , Estate = require('estate')
  , io = require('socket.io-client')
  , fs = require('fs')


var play = io.connect('http://localhost:8000')
  , state = new Estate
  , stream = through()
  , you = {}

var login = document.querySelector('#login')
  , form = document.querySelector('#login form')
  , rows = document.querySelector('#rows')

ever(form).on('submit', send)

function send(ev) {
  ev.preventDefault()
  var nick = document.querySelector('#login form #nick')
    , email = document.querySelector('#login form #email')
    , data = nick.value + ',' +  email.value

  play.emit('login', [nick.value, email.value])
  play.on('login failed', function(message) {
    display_error(message)
  })

  play.on('login success', function(message) {
    you.nick = nick.value
    you.email = email.value
    ev.target.innerHTML = ''
  })
}

state.listen(play, 'player', ['nick', 'email'])

state.on('data', stream.write.bind(stream))

stream.on('error', function(err) {
  alert(err)
})

stream
  .pipe(render())
  .pipe(through(append_html));

function append_html(html) {
  console.log(html)
  // TODO bind event handlers to the link before it makes it all the way through.
  rows.innerHTML += html;
}

function display_error(message) {
  alert(message)
}
