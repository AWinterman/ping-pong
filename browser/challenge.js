var mustache = require('mustache').render
  , $ = require('sizzle')
  , fs = require('fs')
  , ever = require('ever')

module.exports = setup

function setup(error, source) {
  var challenge = new Challenge(error, source)

  return challenge
}

function Challenge(source) {
  this.source = source
  this.template = fs.readFileSync(__dirname + '/template/challenge.html')
}

var proto
  , cons

cons = Challenge
proto = cons.prototype

proto.constructor = cons

proto.render = function(el, state) {
  var nulls = state.source === null && state.target === null

  if(state.source || state.target || nulls) {
    var self = this

    var html  = nulls ? '' : mustache(this.template, state)

    el.innerHTML = html

    var cancels = $('[rel=cancel]', el)
      , accepts = $('[rel=accept]', el)

    for(var i = 0, len = cancels.length; i < len; ++i) {
      ever(cancels[i]).on('click', send_cancel)
    }

    for(var i = 0, len = accepts.length; i < len; ++i) {
      ever(accepts[i]).on('click', send_accept)
    }

    function send_cancel(ev) {
      console.log('sends')
      ev.preventDefault()
      self.source.emit('cancel', state.source, state.target)
    }

    function send_accept(ev) {
      ev.preventDefault()
      self.source.emit('accept', state.source, state.target)
    }

    return
  }
}

proto.cancel = function(el, state) {

}

proto.accept = function(el, state) {
  if(state['accept-source'] || state['accept-target']) {
    var parent_el = $('.challenge-accepted')[0]

    parent_el.classList.remove('hidden')

    $('.player-1', parent_el)[0].innerHTML(mustache('{{accept-source}}', state))
    $('.player-2', parent_el)[0].innerHTML(mustache('{{accept-target}}', state))
  }
}
