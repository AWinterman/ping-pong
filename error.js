var errors = {}

module.exports = errors

// screw you and your vintage browser!
Object.defineProperty(
    errors
  , 'emit'
  , {
        enumerable: false
      , configurable: false
      , writable: false
      , value: emit_error
  }
)

Object.defineProperty(
    errors
  , 'lookup'
  , {
        enumerable: false
      , configurable: false
      , writable: false
      , value: lookup
  }
)

Object.defineProperty(
    errors
  , 'resolve'
  , {
        enumerable: false
      , configurable: false
      , writable: false
      , value: resolve_error
  }
)

errors.database = {}
errors.database.message = 'Data base error.'
errors.database.code = 500
errors.database.idx = 1

errors.player_exists = {}
errors.player_exists.message = 'Player Exists!'
errors.player_exists.code = 400
errors.player_exists.idx = 2

errors.player_missing = {}
errors.player_missing.message = 'No such player'
errors.player_missing.code = 400
errors.player_missing.idx = 3

function lookup(idx) {
  for(var key in errors) {
    if(idx === errors[key].idx) {
      return errors[key]
    }
  }
}

function emit_error(socket, error) {
  socket.emit('error', [error.idx, error.code, error.message])
}

function resolve_error(socket, error) {
  socket.emit('resolved', [error.idx, error.code, error.message])
}
