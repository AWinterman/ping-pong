var account_constructor = require('./login')
/* var main = require('./main') */
var through = require('through')
  , EE = require('events').EventEmitter

var Estate = require('Estate')

var io = require('socket.io-client')

var source = io.connect('http://localhost:8000')
  , state = new Estate

var user = new EE
  , error = through()


var account = account_constructor(error, user, source)

source.on('login', function() {
 alert("Holy Shit!")
})


user.on('login', function() {
 alert("womp!")
})

// State could be maintained on the back end.
state.listen(user, 'login', ['account'])
state.listen(source, 'login', ['account'])
state.listen(user, 'logout', ['account'])
state.listen(error, 'data', ['error'])

state.on('data', show)

function show(state) {
  console.log("STATE CHANGED:", state)

  var errors_el = document.querySelector("#errors")
    , account_el = document.querySelector("#content")
    , players_el = document.querySelector("#players")

  account_el.innerHTML = account.render(account_el, state)
  // errors.innerHTML = render_errors(errors, state)
  // players.innerHTML = render_players(players, state)
}

function render_errors(el, state) {
  el.innerHTML = "Wooops!"
}


function render_account(el, state) {
  el.innerHTML = JSON.stringify(state.account)
}


function render_players(el, state) {
  el.innerHTML = JSON.stringify(state.account)
}


  
