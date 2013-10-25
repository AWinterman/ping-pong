var io = require('socket.io-client')

var challenge_constructor = require('./challenge')
  , player_constructor = require('./players')
  , setup_error = require('./error_handler')
  , account_constructor = require('./login')

var EE = require('events').EventEmitter
  , through = require('through')
  , Estate = require('Estate')

var source = io.connect('http://localhost:7000')
  , app_state = Estate()

var render_players = player_constructor(source)
  , challenge = challenge_constructor(source)
  , account = account_constructor(source)
  , error = setup_error(source)

var report = function(name) {
  return function() {
    console.log(name, arguments)
  }
}

// if(true) {
//   source.on('login', report('login'))
//   source.on('logout', report('logout'))
//   source.on('players', report('players'))
//   source.on('challenge', report('challenge'))
//   error.on('errors', report('errors'))
// }

app_state.listen(source, 'login', ['account'])
app_state.listen(source, 'logout', ['account'])
app_state.listen(source, 'players', ['players'])
app_state.listen(source, 'challenge', ['source', 'target'])
app_state.listen(source, 'other-challenges', ['challenges'])
app_state.listen(source, 'accepted', ['accepted'])
app_state.listen(error, 'errors', ['errors'])

app_state.on('data', show)

var beforeunload_set = false

function show(state) {
  console.log(state)
  var challenge_el = document.querySelector('#challenge')
    , players_el = document.querySelector('#players')
    , account_el = document.querySelector('#account')
    , errors_el = document.querySelector('#errors')

  account.render(account_el, state)
  render_players(players_el, state)
  error.render(errors_el, state)
  challenge.render(challenge_el, state)

  if(state.account && !beforeunload_set) {
    window.onbeforeunload = account.logout(state)
  }
}
