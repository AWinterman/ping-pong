module.exports = setup

var EventEmitter = require('events').EventEmitter
  , mustache = require('mustache').render
  , error = require('../error.js')
  , Estate = require('estate')
  , util = require('util')
  , fs = require('fs')

util.inherits(Errors, EventEmitter)

function setup(source) {
  var errs = new Errors

  source.on('error', errs.have_problems.bind(errs))
  source.on('error', errs.update.bind(errs))

  source.on('resolved', errs.solve_problems.bind(errs))
  source.on('resolved', errs.update.bind(errs))

  return errs
}

function Errors() {
  this.template = fs.readFileSync(__dirname + '/template/error.html')
  this.errors = []
  this.rendered = false
}

Errors.prototype.render = function render(el, state) {
  if(!this.rendered) {
    this.errors = state.errors || []
    el.innerHTML = mustache(this.template, state)
    this.rendered = true

    return
  }
}

// This is a slightly different approach than to the players array, because
// the server is not keeping track of the issues associated with a given
// client. Each client is managing its own state...

Errors.prototype.have_problems = function(problems) {
  var error_ids = Object.keys(this.errors)

  if(this.errors.indexOf(problems[2]) !== -1) {
    return
  }

  this.errors.push(problems[2])
  this.rendered = false
}

Errors.prototype.solve_problems = function(problems) {
  var idx = this.errors.indexOf(problems[2])

  if(idx === -1) {
    return
  }

  this.errors.splice(idx, 1)
  this.rendered = false
}

Errors.prototype.update = function() {
  this.emit('errors', this.errors)
}
