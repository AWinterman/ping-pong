var io = require('socket.io-client')

var account_constructor = require('./login')
/* var main = require('./main') */
var through = require('through')
  , EE = require('events').EventEmitter

var Estate = require('Estate')

var source = io.connect('http://localhost:7000')
  , state = new Estate
  , error = new EE

var account = account_constructor(error, source)

// State could be maintained on the back end.
state.listen(source, 'login', ['account'])
state.listen(source, 'logout', ['account'])
state.listen(source, 'error', ['error'])
state.listen(source, 'player_info', ['players_incoming'])

state.on('data', show)

function show(state) {
  console.log('state:', state)

  var errors_el = document.querySelector("#errors")
    , account_el = document.querySelector("#account")
    , players_el = document.querySelector("#players")

  account.render(account_el, state)
  render_errors(errors_el, state)
}

function render_errors(el, state) {
  if(state.error) {
    el.innerHTML = state.error + "!"
  }
}


function render_players(el, state) {
  if(state.player_incoming) {
    el.innerHTML = JSON.stringify(state.players)
  }
}
