var io = require('socket.io-client')

var account_constructor = require('./login')
  , player_constructor = require('./main')
  , error = require('../error.js')

var EE = require('events').EventEmitter
  , through = require('through')
  , Estate = require('Estate')

var source = io.connect('http://localhost:7000')
  , app_state = new Estate

var render_players = player_constructor(source)
  , account = account_constructor(source)

// State could be maintained on the back end.
app_state.listen(source, 'login', ['account'])
app_state.listen(source, 'logout', ['account'])
app_state.listen(source, 'error', ['error'])
app_state.listen(source, 'remove', ['remove']) // errors
app_state.listen(source, 'players', ['players'])
app_state.listen(source, 'challenge', ['challenge'])
app_state.listen(source, 'accepted', ['accepted'])

app_state.on('data', show)

var beforeunload_set = false
  , error_obj = []
  , player_list

function show(state) {

  var players_el = document.querySelector('#players')
    , account_el = document.querySelector('#account')
    , errors_el = document.querySelector('#errors')

  account.render(account_el, state)
  render_errors(errors_el, state)

  if(state.account) {
    render_players(players_el, state)
  }

  if(!state.players && state.account) {
    // let the server now that this account is ready to reeive info on players
    source.emit('players', state.account)
  }

  if(state.account && !beforeunload_set) {
    window.onbeforeunload = account.logout(state)
  }
}

function render_errors(el, state) {
  if(state.error) {
    error_obj[state.error] = error.lookup(state.error)
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
