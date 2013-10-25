var mustache = require('mustache').render
  , fs = require('fs')

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
  if(state.source || state.target) {
    var html  = mustache(this.template, state)

    el.innerHTML = html

    return
  }
}

