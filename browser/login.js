var qs = require('querystring')
  , ever = require('ever')
  , util = require('util')
  , $ = require('sizzle')
  , fs = require('fs')

module.exports = setup

function setup(error, user, source) {
  var account = new Login(error, user, source) 

  hash_login(try_hash)

  account.source.on('login failed', login_failed)
  account.source.once('login success', account.login_success)

  return account


  function try_hash(err, you) {
    if(err) {
      account.user.emit('login')
      return
    }

    source.emit('login', you)
  }

  function login_failed(message) {
     account.error.queue(message)
     window.location.hash = ''
  }
}


function Login(error, user, source) {
  this.error = error
  this.source = source
  this.user = user
}

var cons = Login
var proto = cons.prototype

proto.constructor = cons


proto.render = function(el, state) {

  if(!state.account) {
    console.log("HERE")
    form_login(el, try_form)
  }

  function form_login(el, ready) {
    var login_html = fs.readFileSync(
      __dirname + '/../static/register.html'
    )

    el.innerHTML = login_html

    var form = $('form', el)[0]
      , form_events = ever(form)

    form_events
      .on('submit', preventDefault)
      .on('submit', send)

    function preventDefault(ev) {
      ev.preventDefault()
    }

    function send(ev) {
      var email = $('#email', form)[0]
        , nick = $('#nick', form)[0]

      var you = {}
      you.email = email.value
      you.nick = nick.value
      ready(you)
    }
  }

  function try_form(err, you) {
    if(err) {
      error.queue(err) 
    }

    source.emit('login', you)
  }
}

proto.login_success = function(you) {
   window.location.hash = qs.stringify(you)

   this.source.removeAllListeners('login failed')
   this.user.emit('login', you)
}

function hash_login(ready) {
  if(window.location.hash.length > 1) {
    var hash = qs.parse(window.location.hash.slice(1))

    if(hash.nick && hash.email) {
      you.nick = hash.nick
      you.email = hash.email

      return ready(null, you)
    }
  }

  return ready(new Error('No Hash Login'))
}


