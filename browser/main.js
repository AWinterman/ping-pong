var mustache = require('mustache').render
  , through = require('through')
  , ever = require('ever')
  , $ = require('sizzle')
  , fs = require('fs')

var player_template = fs.readFileSync(__dirname + '/template/players.html')
  , challenge_template = fs.readFileSync(__dirname + '/template/challenge.html')

module.exports = setup

function setup(source) {

  return function render(el, state) {
    if(state.players && state.players.length) {
      // blow away existing list
      ;[].forEach.call(el.childNodes, el.removeChild.bind(el))

      // compute the html for new list
      var html = mustache(player_template, state)

      // container never goes into the dom
      var container = document.createElement('div')
      container.insertAdjacentHTML('afterbegin', html)

      // but it's children do.
      ;[].forEach.call(container.children, bind)
    }

    function bind(challenge_el) {

      var them = challenge_el.attributes['data-nick'].value
        , you = state.account ? state.account.nick : null

      // If the current_el is currently being challenged, do not bind events
      // and do not bind to dom..
      if(is_challenged(them, state)) {
        return
      }

      var challenge_events = ever(challenge_el)
      challenge_events.on('click', challenge)

      el.appendChild(challenge_el)

      function challenge(ev) {
        ev.preventDefault()
        console.log(ev.target)

        var challenge_context = {
            player1: 'You'
          , player2: them
          , agency: false
          , challenger: true
        }

        var html = mustache(challenge_template, challenge_context)

        source.emit('challenge', you, them)
      }
    }

  }
}

function is_challenged(nick, state) {
  if(!state.challenge) {
    return false
  }

  for(var i = 0, len = state.challenge.length; i < len; ++i) {
    if(state.challenge[i].indexOf(nick) > -1) {
      return true
    }
  }
}
