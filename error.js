
var errors = {}

errors.database = {}
errors.database.message = 'Data base error.'
errors.database.code =  500
errors.database.idx = 1
}

errors.player_exists = {}
errors.player_exists.message: "Player Exists!"
errors.player_exists.code: 400
errors.player_exists.idx: 2

errors.player_missing = {}
errors.player_missing.message: "No such player"
errors.player_missing.code: 400
errors.player_missing.idx: 3

errors.emit = function(socket, error) {
  socket.emit('error', error.idx)
}

module.export = errors
