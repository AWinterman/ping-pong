var through = require('through');
var hyperglue = require('hyperglue');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/static/row.html');

module.exports = function () {
  return through(function (line) {
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
  });
};
