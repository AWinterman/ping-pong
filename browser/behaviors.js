window.onbeforeunload = function(state) {
  source.emit('logout', you)
  delete you.nick
  delete you.email
}
