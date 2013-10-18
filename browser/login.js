var mustache = require('mustache').render
  , qs = require('querystring')
  , ever = require('ever')
  , util = require('util')
  , $ = require('sizzle')
  , fs = require('fs')

module.exports = setup

function setup(source) {
  var account = new Login(source)

  account.login_html = fs.readFileSync(
      __dirname + '/../static/register.html'
  )

  account.logged_in_template = fs.readFileSync(
      __dirname + '/template/logged_in.html'
  )

  hash_login(try_hash)

  return account

  function try_hash(err, you) {
    if(err) {
      return source.emit('login')
    }

    source.emit('login', you)
  }
}

function hash_login(ready) {
  if(window.location.hash.length > 1) {
    var hash = qs.parse(window.location.hash.slice(1))

    if(hash.nick && hash.email) {
      var you = {}

      you.nick = hash.nick
      you.email = hash.email

      return ready(null, you)
    }
  }

  return ready(new Error('No Hash Login'))
}

function Login(source) {
  this.source = source
  this.logged_in_rendered = false
}

var cons = Login

var proto = cons.prototype

proto.constructor = cons

proto.render = function(el, state) {
  var self = this

  window.location.hash = qs.stringify(state.account)

  if(!state.account) {
    form_login.call(self, el)
  } else if(!self.logged_in_rendered) {
    self.logged_in_rendered = true
    el.innerHTML = mustache(self.logged_in_template, state.account)
    bind_log_out(el)
  }

  function bind_log_out(el) {

    var logout_el = $('[rel=logout]', el)[0]

    var logout_events = ever(logout_el)

    logout_events
      .on('click', preventDefault)
      .on('click', self.logout(state))
  }
}

proto.logout = function(state) {
  var self = this

  return function(ev) {
    self.source.emit('logout', state.account)
    self.logged_in_rendered = false
  }
}

function preventDefault(ev) {
  ev.preventDefault()
}

function form_login(el) {
  el.innerHTML = this.login_html

  var form = $('form', el)[0]

  var form_events = ever(form)

  form_events
    .on('submit', preventDefault)
    .on('submit', send)

  function send(ev) {
    var email = $('#email', form)[0]
      , nick = $('#nick', form)[0]

    var you = {}

    you.email = email.value
    you.nick = nick.value
    self.source.emit('login', you)
  }
}
