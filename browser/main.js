var through = require('through')
  , hyperglue = require('hyperglue')
  , fs = require('fs')

var html = fs.readFileSync(__dirname + '/../static/row.html');
var rows = document.querySelector('#rows')

module.exports = function(source) {
  var stream = through()

  source.on('player', stream.write.bind(stream))

  stream.on('error', function(err) {
    alert(err)
  })

  stream
    .pipe(report())
    .pipe(render())
    .pipe(through(append_html));

  function report() {
    return through(function(data) {
      console.log('reporting', data); this.queue(data)
    })
  }

  function append_html(html) {
    // TODO bind event handlers to the link before it makes it all the way through.
    rows.innerHTML += html;
  }
}


function render () {
  return through(function(line) {
    var result = hyperglue(html, {
        '.nick': line.nick,
        '.email': line.email,
        '.challenge': {
            href: '#'
          , ref: line.nick
          , _text: 'challenge ' + line.nick
        }
      }).outerHTML
    this.queue(result)
  })
}
