var io = require('socket.io-client')

var account_constructor = require('./login')
var player_constructor = require('./main')

var through = require('through')
  , EE = require('events').EventEmitter

var Estate = require('Estate')

var source = io.connect('http://localhost:7000')
  , state = new Estate
  , error = new EE

var account = account_constructor(error, source)
  , render_players = player_constructor(error, source)

// State could be maintained on the back end.
state.listen(source, 'login', ['account'])
state.listen(source, 'logout', ['account'])
state.listen(source, 'error', ['error'])
state.listen(source, 'remove', ['remove']) // errors
state.listen(source, 'players', ['players'])
state.listen(source, 'challenge', ['challenge'])
state.listen(source, 'accepted', ['accepted'])

state.on('data', show)

var beforeunload_set = false
  , error_obj = {}
  , player_list

function show(state) {
  var errors_el = document.querySelector("#errors")
    , account_el = document.querySelector("#account")
    , players_el = document.querySelector("#players")

  account.render(account_el, state)
  render_errors(errors_el, state)

  if(state.account) {
    render_players(players_el, state)
  }

  if(!state.players && state.account) {
    // let the server now that this account is ready to reeive info on players
    console.log('getting players')
    source.emit('players', state.account)
  }

  if(state.account && !beforeunload_set) {
    window.onbeforeunload = account.logout(state)
  }
}



function render_errors(el, state) {
  if(state.error) {
    error_obj[state.error] = true
  }
  if(state.remove) {
    // remove it from the error object, and then stop remembering it.
    delete error_obj[state.remove]
    delete state.remove
  }

  el.innerHTML = Object.keys(error_obj).reduce(insert_spans, '')
}

function insert_spans(A, B) {
  console.log(B)
  return A + '<span>' + B + '</span>' 
}
