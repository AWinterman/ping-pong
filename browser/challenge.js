var util = require('util')

module.exports = setup

function setup(error, source) {
  var challenge = new Challenge(error, source)

  return challenge
}

function Challenge(error, source) {
  this.error = error
  this.source = source
}


var cons = Login
var proto = cons.prototype

proto.constructor = cons

proto.render = function(el, state) {
}


