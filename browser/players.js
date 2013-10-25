var mustache = require('mustache').render
  , through = require('through')
  , ever = require('ever')
  , $ = require('sizzle')
  , fs = require('fs')

var player_template = fs.readFileSync(__dirname + '/template/players.html')
  , challenge_template = fs.readFileSync(
      __dirname + '/template/challenge.html'
    )

module.exports = setup

function setup(source) {

  return function render(el, state) {
    if(!state.account) {
      return
    }

    if(state.players && state.players.length > 1) {
      // blow away existing list
      state.players.sort(function(d) {
        return d.i
      })

      state.players = state.players.filter(function(data) {
        return state.account.nick !== data.nick
      })

      while(el.hasChildNodes()) {
        el.removeChild(el.lastChild)
      }

      // container never goes into the dom
      var container = document.createElement('div')

      // compute the html for new list
      container.insertAdjacentHTML(
          'afterbegin'
        , mustache(player_template, state)
      )

      var children = [].slice.call(container.children).filter(function(el) {
        return el.className === 'players'
      })

      var child

      while(child = container.firstElementChild) {
        child.remove()
        bind(child)
      }

      return
    }

    // otherwise get the players.
    return source.emit('players', state.account)

    function bind(challenge_el) {

      var them = challenge_el.attributes['data-nick'].value
        , you = state.account ? state.account.nick : null

      var challenge_events = ever(challenge_el)

      challenge_events.on('click', challenge)

      el.appendChild(challenge_el)

      function challenge(ev) {
        ev.preventDefault()

        source.emit('challenge', you, them)
      }
    }
  }
}
