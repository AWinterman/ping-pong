;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":1}],3:[function(require,module,exports){
var account_constructor = require('./login')
/* var main = require('./main') */
var through = require('through')
  , EE = require('events').EventEmitter

var Estate = require('Estate')

var io = require('socket.io-client')

var source = io.connect('http://localhost:8000')
  , state = new Estate

var user = new EE
  , error = through()


var account = account_constructor(error, user, source)

source.on('login', function() {
 alert("Holy Shit!")
})


user.on('login', function() {
 alert("womp!")
})

state.listen(user, 'login', ['account'])
state.listen(source, 'login', ['account'])
state.listen(user, 'logout', ['account'])
state.listen(error, 'data', ['error'])

state.on('data', show)

function show(state) {
  console.log("STATE CHANGED:", state)

  var errors_el = document.querySelector("#errors")
    , account_el = document.querySelector("#content")
    , players_el = document.querySelector("#players")

  account_el.innerHTML = account.render(account_el, state)
  // errors.innerHTML = render_errors(errors, state)
  // players.innerHTML = render_players(players, state)
}

function render_errors(el, state) {
  el.innerHTML = "Wooops!"
}


function render_account(el, state) {
  el.innerHTML = JSON.stringify(state.account)
}


function render_players(el, state) {
  el.innerHTML = JSON.stringify(state.account)
}


  

},{"events":2,"./login":4,"through":5,"Estate":6,"socket.io-client":7}],5:[function(require,module,exports){
(function(process){var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data == null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


})(require("__browserify_process"))
},{"stream":8,"__browserify_process":1}],6:[function(require,module,exports){
module.exports = estate

var EE = require('events').EventEmitter

function estate() {
  return new Estate()
}

function Estate() {
  EE.call(this)
  this._state = {}
}

var cons = Estate
  , proto = cons.prototype = Object.create(EE.prototype)

proto.constructor = proto

proto.listen = function(to_ee, on_event, as_attrs) {
  var self = this

  to_ee.on(on_event, function() {
    for(var i = 0, len = as_attrs.length; i < len; ++i) {
      if(arguments[i] === undefined) {
        delete self._state[as_attrs[i]]
      } else {
        self._state[as_attrs[i]] = arguments[i]
      }
    }
    self.emit('data', self._state)
  })

  return self
}

},{"events":2}],7:[function(require,module,exports){
(function(){/*! Socket.IO.js build:0.9.16, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.16';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  "use strict";

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    // unescape all forward slashes. see GH-1251
    data = data.replace(/\\\//g, '/');
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define([], function () { return io; });
}
})();
})()
},{}],8:[function(require,module,exports){
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":2,"util":9}],9:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":2}],10:[function(require,module,exports){
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    };

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}


/*!
 * querystring
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.3.1';

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Cache non-integer test regexp.
 */

var notint = /[^0-9]/;

/**
 * Parse the given query `str`, returning an object.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};

  function promote(parent, key) {
    if (parent[key].length == 0) return parent[key] = {};
    var t = {};
    for (var i in parent[key]) t[i] = parent[key][i];
    parent[key] = t;
    return t;
  }

  return String(str)
    .split('&')
    .reduce(function(ret, pair){
      try{ 
        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
      } catch(e) {
        // ignore
      }

      var eql = pair.indexOf('=')
        , brace = lastBraceInKey(pair)
        , key = pair.substr(0, brace || eql)
        , val = pair.substr(brace || eql, pair.length)
        , val = val.substr(val.indexOf('=') + 1, val.length)
        , parent = ret;

      // ?foo
      if ('' == key) key = pair, val = '';

      // nested
      if (~key.indexOf(']')) {
        var parts = key.split('[')
          , len = parts.length
          , last = len - 1;

        function parse(parts, parent, key) {
          var part = parts.shift();

          // end
          if (!part) {
            if (isArray(parent[key])) {
              parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
              parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
              parent[key] = val;
            } else {
              parent[key] = [parent[key], val];
            }
          // array
          } else {
            obj = parent[key] = parent[key] || [];
            if (']' == part) {
              if (isArray(obj)) {
                if ('' != val) obj.push(val);
              } else if ('object' == typeof obj) {
                obj[objectKeys(obj).length] = val;
              } else {
                obj = parent[key] = [parent[key], val];
              }
            // prop
            } else if (~part.indexOf(']')) {
              part = part.substr(0, part.length - 1);
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            // key
            } else {
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            }
          }
        }

        parse(parts, parent, 'base');
      // optimize
      } else {
        if (notint.test(key) && isArray(parent.base)) {
          var t = {};
          for(var k in parent.base) t[k] = parent.base[k];
          parent.base = t;
        }
        set(parent.base, key, val);
      }

      return ret;
    }, {base: {}}).base;
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix;
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[]'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;
  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  }
  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

},{}],11:[function(require,module,exports){
// nothing to see here... no file methods for the browser

},{}],4:[function(require,module,exports){
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
      account.user.emit('login', null)
      account.source.emit('login', null)
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
    form_login(el, try_form)
  }

  function form_login(el, ready) {
    var login_html = "<form>\n    <div>\n        <label for=\"nick\">Nick:</label>\n        <input required type=\"text\" id=\"nick\" />\n        <span class=\"error\" aria-live=\"polite\"></span>\n    </div>\n    <div>\n        <label for=\"email\">Email:</label>\n        <input required type=\"email\" id=\"email\"/>\n        <span class=\"error\" aria-live=\"polite\"></span>\n    </div>\n    <div class=\"button\">\n        <button type=\"submit\">Play!</button>\n    </div>\n</form>\n"

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



},{"querystring":10,"util":9,"fs":11,"ever":12,"sizzle":13}],13:[function(require,module,exports){
(function(){/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	expando = "sizcache" + (Math.random() + '').replace('.', ''),
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true,
	rBackslash = /\\/g,
	rReturn = /\r\n/g,
	rNonWord = /\W/;

// Here we check if the JavaScript engine is using some sort of
// optimization where it does not always call our comparision
// function. If that is the case, discard the hasDuplicate value.
//   Thus far that includes Google Chrome.
[0, 0].sort(function() {
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function( selector, context, results, seed ) {
	results = results || [];
	context = context || document;

	var origContext = context;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var m, set, checkSet, extra, ret, cur, pop, i,
		prune = true,
		contextXML = Sizzle.isXML( context ),
		parts = [],
		soFar = selector;

	// Reset the position of the chunker regexp (start from head)
	do {
		chunker.exec( "" );
		m = chunker.exec( soFar );

		if ( m ) {
			soFar = m[3];

			parts.push( m[1] );

			if ( m[2] ) {
				extra = m[3];
				break;
			}
		}
	} while ( m );

	if ( parts.length > 1 && origPOS.exec( selector ) ) {

		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context, seed );

		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] ) {
					selector += parts.shift();
				}

				set = posProcess( selector, set, seed );
			}
		}

	} else {
		// Take a shortcut and set the context if the root selector is an ID
		// (but not if it'll be faster if the inner selector is an ID)
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {

			ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ?
				Sizzle.filter( ret.expr, ret.set )[0] :
				ret.set[0];
		}

		if ( context ) {
			ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );

			set = ret.expr ?
				Sizzle.filter( ret.expr, ret.set ) :
				ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray( set );

			} else {
				prune = false;
			}

			while ( parts.length ) {
				cur = parts.pop();
				pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}

		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		Sizzle.error( cur || selector );
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );

		} else if ( context && context.nodeType === 1 ) {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}

		} else {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}

	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function( results ) {
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[ i - 1 ] ) {
					results.splice( i--, 1 );
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function( expr, set ) {
	return Sizzle( expr, null, null, set );
};

Sizzle.matchesSelector = function( node, expr ) {
	return Sizzle( expr, null, null, [node] ).length > 0;
};

Sizzle.find = function( expr, context, isXML ) {
	var set, i, len, match, type, left;

	if ( !expr ) {
		return [];
	}

	for ( i = 0, len = Expr.order.length; i < len; i++ ) {
		type = Expr.order[i];

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			left = match[1];
			match.splice( 1, 1 );

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace( rBackslash, "" );
				set = Expr.find[ type ]( match, context, isXML );

				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( "*" ) :
			[];
	}

	return { set: set, expr: expr };
};

Sizzle.filter = function( expr, set, inplace, not ) {
	var match, anyFound,
		type, found, item, filter, left,
		i, pass,
		old = expr,
		result = [],
		curLoop = set,
		isXMLFilter = set && set[0] && Sizzle.isXML( set[0] );

	while ( expr && set.length ) {
		for ( type in Expr.filter ) {
			if ( (match = Expr.leftMatch[ type ].exec( expr )) != null && match[2] ) {
				filter = Expr.filter[ type ];
				left = match[1];

				anyFound = false;

				match.splice(1,1);

				if ( left.substr( left.length - 1 ) === "\\" ) {
					continue;
				}

				if ( curLoop === result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;

					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							pass = not ^ found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;

								} else {
									curLoop[i] = false;
								}

							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		// Improper expression
		if ( expr === old ) {
			if ( anyFound == null ) {
				Sizzle.error( expr );

			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Utility function for retreiving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
var getText = Sizzle.getText = function( elem ) {
    var i, node,
		nodeType = elem.nodeType,
		ret = "";

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent || innerText for elements
			if ( typeof elem.textContent === 'string' ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === 'string' ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, '' );
			} else {
				// Traverse it's children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
	} else {

		// If no nodeType, this is expected to be an array
		for ( i = 0; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			if ( node.nodeType !== 8 ) {
				ret += getText( node );
			}
		}
	}
	return ret;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],

	match: {
		ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
	},

	leftMatch: {},

	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},

	attrHandle: {
		href: function( elem ) {
			return elem.getAttribute( "href" );
		},
		type: function( elem ) {
			return elem.getAttribute( "type" );
		}
	},

	relative: {
		"+": function(checkSet, part){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !rNonWord.test( part ),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag ) {
				part = part.toLowerCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},

		">": function( checkSet, part ) {
			var elem,
				isPartStr = typeof part === "string",
				i = 0,
				l = checkSet.length;

			if ( isPartStr && !rNonWord.test( part ) ) {
				part = part.toLowerCase();

				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
					}
				}

			} else {
				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},

		"": function(checkSet, part, isXML){
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "parentNode", part, doneName, checkSet, nodeCheck, isXML );
		},

		"~": function( checkSet, part, isXML ) {
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "previousSibling", part, doneName, checkSet, nodeCheck, isXML );
		}
	},

	find: {
		ID: function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		},

		NAME: function( match, context ) {
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [],
					results = context.getElementsByName( match[1] );

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},

		TAG: function( match, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( match[1] );
			}
		}
	},
	preFilter: {
		CLASS: function( match, curLoop, inplace, result, not, isXML ) {
			match = " " + match[1].replace( rBackslash, "" ) + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0) ) {
						if ( !inplace ) {
							result.push( elem );
						}

					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},

		ID: function( match ) {
			return match[1].replace( rBackslash, "" );
		},

		TAG: function( match, curLoop ) {
			return match[1].replace( rBackslash, "" ).toLowerCase();
		},

		CHILD: function( match ) {
			if ( match[1] === "nth" ) {
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				match[2] = match[2].replace(/^\+|\s*/g, '');

				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
				var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(
					match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				// calculate the numbers (first)n+(last) including if they are negative
				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}
			else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			// TODO: Move to normal caching system
			match[0] = done++;

			return match;
		},

		ATTR: function( match, curLoop, inplace, result, not, isXML ) {
			var name = match[1] = match[1].replace( rBackslash, "" );

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			// Handle if an un-quoted value was used
			match[4] = ( match[4] || match[5] || "" ).replace( rBackslash, "" );

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},

		PSEUDO: function( match, curLoop, inplace, result, not ) {
			if ( match[1] === "not" ) {
				// If we're dealing with a complex expression, or a simple one
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);

				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);

					if ( !inplace ) {
						result.push.apply( result, ret );
					}

					return false;
				}

			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},

		POS: function( match ) {
			match.unshift( true );

			return match;
		}
	},

	filters: {
		enabled: function( elem ) {
			return elem.disabled === false && elem.type !== "hidden";
		},

		disabled: function( elem ) {
			return elem.disabled === true;
		},

		checked: function( elem ) {
			return elem.checked === true;
		},

		selected: function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		parent: function( elem ) {
			return !!elem.firstChild;
		},

		empty: function( elem ) {
			return !elem.firstChild;
		},

		has: function( elem, i, match ) {
			return !!Sizzle( match[3], elem ).length;
		},

		header: function( elem ) {
			return (/h\d/i).test( elem.nodeName );
		},

		text: function( elem ) {
			var attr = elem.getAttribute( "type" ), type = elem.type;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
		},

		radio: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "radio" === elem.type;
		},

		checkbox: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "checkbox" === elem.type;
		},

		file: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "file" === elem.type;
		},

		password: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "password" === elem.type;
		},

		submit: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "submit" === elem.type;
		},

		image: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "image" === elem.type;
		},

		reset: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "reset" === elem.type;
		},

		button: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && "button" === elem.type || name === "button";
		},

		input: function( elem ) {
			return (/input|select|textarea|button/i).test( elem.nodeName );
		},

		focus: function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},
	setFilters: {
		first: function( elem, i ) {
			return i === 0;
		},

		last: function( elem, i, match, array ) {
			return i === array.length - 1;
		},

		even: function( elem, i ) {
			return i % 2 === 0;
		},

		odd: function( elem, i ) {
			return i % 2 === 1;
		},

		lt: function( elem, i, match ) {
			return i < match[3] - 0;
		},

		gt: function( elem, i, match ) {
			return i > match[3] - 0;
		},

		nth: function( elem, i, match ) {
			return match[3] - 0 === i;
		},

		eq: function( elem, i, match ) {
			return match[3] - 0 === i;
		}
	},
	filter: {
		PSEUDO: function( elem, match, i, array ) {
			var name = match[1],
				filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );

			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || getText([ elem ]) || "").indexOf(match[3]) >= 0;

			} else if ( name === "not" ) {
				var not = match[3];

				for ( var j = 0, l = not.length; j < l; j++ ) {
					if ( not[j] === elem ) {
						return false;
					}
				}

				return true;

			} else {
				Sizzle.error( name );
			}
		},

		CHILD: function( elem, match ) {
			var first, last,
				doneName, parent, cache,
				count, diff,
				type = match[1],
				node = elem;

			switch ( type ) {
				case "only":
				case "first":
					while ( (node = node.previousSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					if ( type === "first" ) {
						return true;
					}

					node = elem;

					/* falls through */
				case "last":
					while ( (node = node.nextSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					return true;

				case "nth":
					first = match[2];
					last = match[3];

					if ( first === 1 && last === 0 ) {
						return true;
					}

					doneName = match[0];
					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.nodeIndex) ) {
						count = 0;

						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.nodeIndex - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
			}
		},

		ID: function( elem, match ) {
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},

		TAG: function( elem, match ) {
			return (match === "*" && elem.nodeType === 1) || !!elem.nodeName && elem.nodeName.toLowerCase() === match;
		},

		CLASS: function( elem, match ) {
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},

		ATTR: function( elem, match ) {
			var name = match[1],
				result = Sizzle.attr ?
					Sizzle.attr( elem, name ) :
					Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				!type && Sizzle.attr ?
				result != null :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value !== check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},

		POS: function( elem, match, i, array ) {
			var name = match[2],
				filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS,
	fescape = function(all, num){
		return "\\" + (num - 0 + 1);
	};

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + (/(?![^\[]*\])(?![^\(]*\))/.source) );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source.replace(/\\(\d+)/g, fescape) );
}
// Expose origPOS
// "global" as in regardless of relation to brackets/parens
Expr.match.globalPOS = origPOS;

var makeArray = function( array, results ) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

// Perform a simple check to determine if the browser is capable of
// converting a NodeList to an array using builtin methods.
// Also verifies that the returned array holds DOM nodes
// (which is not the case in the Blackberry browser)
try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 )[0].nodeType;

// Provide a fallback method if it does not work
} catch( e ) {
	makeArray = function( array, results ) {
		var i = 0,
			ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );

		} else {
			if ( typeof array.length === "number" ) {
				for ( var l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}

			} else {
				for ( ; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder, siblingCheck;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			return a.compareDocumentPosition ? -1 : 1;
		}

		return a.compareDocumentPosition(b) & 4 ? -1 : 1;
	};

} else {
	sortOrder = function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

	siblingCheck = function( a, b, ret ) {
		if ( a === b ) {
			return ret;
		}

		var cur = a.nextSibling;

		while ( cur ) {
			if ( cur === b ) {
				return -1;
			}

			cur = cur.nextSibling;
		}

		return 1;
	};
}

// Check to see if the browser returns elements by name when
// querying by getElementById (and provide a workaround)
(function(){
	// We're going to inject a fake input element with a specified name
	var form = document.createElement("div"),
		id = "script" + (new Date()).getTime(),
		root = document.documentElement;

	form.innerHTML = "<a name='" + id + "'/>";

	// Inject it into the root element, check its status, and remove it quickly
	root.insertBefore( form, root.firstChild );

	// The workaround has to do additional checks after a getElementById
	// Which slows things down for other browsers (hence the branching)
	if ( document.getElementById( id ) ) {
		Expr.find.ID = function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);

				return m ?
					m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ?
						[m] :
						undefined :
					[];
			}
		};

		Expr.filter.ID = function( elem, match ) {
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");

			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );

	// release memory in IE
	root = form = null;
})();

(function(){
	// Check to see if the browser returns only elements
	// when doing getElementsByTagName("*")

	// Create a fake element
	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	// Make sure no comments are found
	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function( match, context ) {
			var results = context.getElementsByTagName( match[1] );

			// Filter out possible comments
			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	// Check to see if an attribute returns normalized href attributes
	div.innerHTML = "<a href='#'></a>";

	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {

		Expr.attrHandle.href = function( elem ) {
			return elem.getAttribute( "href", 2 );
		};
	}

	// release memory in IE
	div = null;
})();

if ( document.querySelectorAll ) {
	(function(){
		var oldSizzle = Sizzle,
			div = document.createElement("div"),
			id = "__sizzle__";

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		Sizzle = function( query, context, extra, seed ) {
			context = context || document;

			// Only use querySelectorAll on non-XML documents
			// (ID selectors don't work in non-HTML documents)
			if ( !seed && !Sizzle.isXML(context) ) {
				// See if we find a selector to speed up
				var match = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec( query );

				if ( match && (context.nodeType === 1 || context.nodeType === 9) ) {
					// Speed-up: Sizzle("TAG")
					if ( match[1] ) {
						return makeArray( context.getElementsByTagName( query ), extra );

					// Speed-up: Sizzle(".CLASS")
					} else if ( match[2] && Expr.find.CLASS && context.getElementsByClassName ) {
						return makeArray( context.getElementsByClassName( match[2] ), extra );
					}
				}

				if ( context.nodeType === 9 ) {
					// Speed-up: Sizzle("body")
					// The body element only exists once, optimize finding it
					if ( query === "body" && context.body ) {
						return makeArray( [ context.body ], extra );

					// Speed-up: Sizzle("#ID")
					} else if ( match && match[3] ) {
						var elem = context.getElementById( match[3] );

						// Check parentNode to catch when Blackberry 4.6 returns
						// nodes that are no longer in the document #6963
						if ( elem && elem.parentNode ) {
							// Handle the case where IE and Opera return items
							// by name instead of ID
							if ( elem.id === match[3] ) {
								return makeArray( [ elem ], extra );
							}

						} else {
							return makeArray( [], extra );
						}
					}

					try {
						return makeArray( context.querySelectorAll(query), extra );
					} catch(qsaError) {}

				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var oldContext = context,
						old = context.getAttribute( "id" ),
						nid = old || id,
						hasParent = context.parentNode,
						relativeHierarchySelector = /^\s*[+~]/.test( query );

					if ( !old ) {
						context.setAttribute( "id", nid );
					} else {
						nid = nid.replace( /'/g, "\\$&" );
					}
					if ( relativeHierarchySelector && hasParent ) {
						context = context.parentNode;
					}

					try {
						if ( !relativeHierarchySelector || hasParent ) {
							return makeArray( context.querySelectorAll( "[id='" + nid + "'] " + query ), extra );
						}

					} catch(pseudoError) {
					} finally {
						if ( !old ) {
							oldContext.removeAttribute( "id" );
						}
					}
				}
			}

			return oldSizzle(query, context, extra, seed);
		};

		for ( var prop in oldSizzle ) {
			Sizzle[ prop ] = oldSizzle[ prop ];
		}

		// release memory in IE
		div = null;
	})();
}

(function(){
	var html = document.documentElement,
		matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector;

	if ( matches ) {
		// Check to see if it's possible to do matchesSelector
		// on a disconnected node (IE 9 fails this)
		var disconnectedMatch = !matches.call( document.createElement( "div" ), "div" ),
			pseudoWorks = false;

		try {
			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( document.documentElement, "[test!='']:sizzle" );

		} catch( pseudoError ) {
			pseudoWorks = true;
		}

		Sizzle.matchesSelector = function( node, expr ) {
			// Make sure that attribute selectors are quoted
			expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");

			if ( !Sizzle.isXML( node ) ) {
				try {
					if ( pseudoWorks || !Expr.match.PSEUDO.test( expr ) && !/!=/.test( expr ) ) {
						var ret = matches.call( node, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || !disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9, so check for that
								node.document && node.document.nodeType !== 11 ) {
							return ret;
						}
					}
				} catch(e) {}
			}

			return Sizzle(expr, null, null, [node]).length > 0;
		};
	}
})();

(function(){
	var div = document.createElement("div");

	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	// Opera can't find a second classname (in 9.6)
	// Also, make sure that getElementsByClassName actually exists
	if ( !div.getElementsByClassName || div.getElementsByClassName("e").length === 0 ) {
		return;
	}

	// Safari caches class attributes, doesn't catch changes (in 3.2)
	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 ) {
		return;
	}

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function( match, context, isXML ) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	// release memory in IE
	div = null;
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem[ expando ] = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName.toLowerCase() === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem[ expando ] = doneName;
						elem.sizset = i;
					}

					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

if ( document.documentElement.contains ) {
	Sizzle.contains = function( a, b ) {
		return a !== b && (a.contains ? a.contains(b) : true);
	};

} else if ( document.documentElement.compareDocumentPosition ) {
	Sizzle.contains = function( a, b ) {
		return !!(a.compareDocumentPosition(b) & 16);
	};

} else {
	Sizzle.contains = function() {
		return false;
	};
}

Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

var posProcess = function( selector, context, seed ) {
	var match,
		tmpSet = [],
		later = "",
		root = context.nodeType ? [context] : context;

	// Position selectors must be done after the filter
	// And so must :not(positional) so we move all PSEUDOs to the end
	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet, seed );
	}

	return Sizzle.filter( later, tmpSet );
};

// EXPOSE

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sizzle;
} else {
  window.Sizzle = Sizzle;
}

})();

})()
},{}],12:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;

module.exports = function (elem) {
    return new Ever(elem);
};

function Ever (elem) {
    this.element = elem;
}

Ever.prototype = new EventEmitter;

Ever.prototype.on = function (name, cb, useCapture) {
    if (!this._events) this._events = {};
    if (!this._events[name]) this._events[name] = [];
    this._events[name].push(cb);
    this.element.addEventListener(name, cb, useCapture || false);

    return this;
};
Ever.prototype.addListener = Ever.prototype.on;

Ever.prototype.removeListener = function (type, listener, useCapture) {
    if (!this._events) this._events = {};
    this.element.removeEventListener(type, listener, useCapture || false);
    
    var xs = this.listeners(type);
    var ix = xs.indexOf(listener);
    if (ix >= 0) xs.splice(ix, 1);

    return this;
};

Ever.prototype.removeAllListeners = function (type) {
    var self = this;
    function removeAll (t) {
        var xs = self.listeners(t);
        for (var i = 0; i < xs.length; i++) {
            self.removeListener(t, xs[i]);
        }
    }
    
    if (type) {
        removeAll(type)
    }
    else if (self._events) {
        for (var key in self._events) {
            if (key) removeAll(key);
        }
    }
    return EventEmitter.prototype.removeAllListeners.apply(self, arguments);
}

var initSignatures = require('./init.json');

Ever.prototype.emit = function (name, ev) {
    if (typeof name === 'object') {
        ev = name;
        name = ev.type;
    }
    
    if (!isEvent(ev)) {
        var type = Ever.typeOf(name);
        
        var opts = ev || {};
        if (opts.type === undefined) opts.type = name;
        
        ev = document.createEvent(type + 's');
        var init = typeof ev['init' + type] === 'function'
            ? 'init' + type : 'initEvent'
        ;
        
        var sig = initSignatures[init];
        var used = {};
        var args = [];
        
        for (var i = 0; i < sig.length; i++) {
            var key = sig[i];
            args.push(opts[key]);
            used[key] = true;
        }
        ev[init].apply(ev, args);
        
        // attach remaining unused options to the object
        for (var key in opts) {
            if (!used[key]) ev[key] = opts[key];
        }
    }
    return this.element.dispatchEvent(ev);
};

function isEvent (ev) {
    var s = Object.prototype.toString.call(ev);
    return /\[object \S+Event\]/.test(s);
}

Ever.types = require('./types.json');
Ever.typeOf = (function () {
    var types = {};
    for (var key in Ever.types) {
        var ts = Ever.types[key];
        for (var i = 0; i < ts.length; i++) {
            types[ts[i]] = key;
        }
    }
    
    return function (name) {
        return types[name] || 'Event';
    };
})();;

},{"events":2,"./init.json":14,"./types.json":15}],14:[function(require,module,exports){
module.exports={
  "initEvent" : [
    "type",
    "canBubble", 
    "cancelable"
  ],
  "initUIEvent" : [
    "type",
    "canBubble", 
    "cancelable", 
    "view", 
    "detail"
  ],
  "initMouseEvent" : [
    "type",
    "canBubble", 
    "cancelable", 
    "view", 
    "detail", 
    "screenX", 
    "screenY", 
    "clientX", 
    "clientY", 
    "ctrlKey", 
    "altKey", 
    "shiftKey", 
    "metaKey", 
    "button",
    "relatedTarget"
  ],
  "initMutationEvent" : [
    "type",
    "canBubble", 
    "cancelable", 
    "relatedNode", 
    "prevValue", 
    "newValue", 
    "attrName", 
    "attrChange"
  ]
}

},{}],15:[function(require,module,exports){
module.exports={
  "MouseEvent" : [
    "click",
    "mousedown",
    "mouseup",
    "mouseover",
    "mousemove",
    "mouseout"
  ],
  "KeyBoardEvent" : [
    "keydown",
    "keyup",
    "keypress"
  ],
  "MutationEvent" : [
    "DOMSubtreeModified",
    "DOMNodeInserted",
    "DOMNodeRemoved",
    "DOMNodeRemovedFromDocument",
    "DOMNodeInsertedIntoDocument",
    "DOMAttrModified",
    "DOMCharacterDataModified"
  ],
  "HTMLEvent" : [
    "load",
    "unload",
    "abort",
    "error",
    "select",
    "change",
    "submit",
    "reset",
    "focus",
    "blur",
    "resize",
    "scroll"
  ],
  "UIEvent" : [
    "DOMFocusIn",
    "DOMFocusOut",
    "DOMActivate"
  ]
}

},{}]},{},[3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2J1aWx0aW4vZXZlbnRzLmpzIiwiL1VzZXJzL2FuZHJld3dpbnRlcm1hbi9wZXJzb25hbC9waW5nLXBvbmcvYnJvd3Nlci9pbmRleC5qcyIsIi9Vc2Vycy9hbmRyZXd3aW50ZXJtYW4vcGVyc29uYWwvcGluZy1wb25nL25vZGVfbW9kdWxlcy90aHJvdWdoL2luZGV4LmpzIiwiL1VzZXJzL2FuZHJld3dpbnRlcm1hbi9wZXJzb25hbC9waW5nLXBvbmcvbm9kZV9tb2R1bGVzL0VzdGF0ZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmRyZXd3aW50ZXJtYW4vcGVyc29uYWwvcGluZy1wb25nL25vZGVfbW9kdWxlcy9zb2NrZXQuaW8tY2xpZW50L2Rpc3Qvc29ja2V0LmlvLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9idWlsdGluL3N0cmVhbS5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvYnVpbHRpbi91dGlsLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9idWlsdGluL3F1ZXJ5c3RyaW5nLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9idWlsdGluL2ZzLmpzIiwiL1VzZXJzL2FuZHJld3dpbnRlcm1hbi9wZXJzb25hbC9waW5nLXBvbmcvYnJvd3Nlci9sb2dpbi5qcyIsIi9Vc2Vycy9hbmRyZXd3aW50ZXJtYW4vcGVyc29uYWwvcGluZy1wb25nL25vZGVfbW9kdWxlcy9zaXp6bGUvc2l6emxlLmpzIiwiL1VzZXJzL2FuZHJld3dpbnRlcm1hbi9wZXJzb25hbC9waW5nLXBvbmcvbm9kZV9tb2R1bGVzL2V2ZXIvaW5kZXguanMiLCIvVXNlcnMvYW5kcmV3d2ludGVybWFuL3BlcnNvbmFsL3BpbmctcG9uZy9ub2RlX21vZHVsZXMvZXZlci9pbml0Lmpzb24iLCIvVXNlcnMvYW5kcmV3d2ludGVybWFuL3BlcnNvbmFsL3BpbmctcG9uZy9ub2RlX21vZHVsZXMvZXZlci90eXBlcy5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2p5SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxUEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uKHByb2Nlc3Mpe2lmICghcHJvY2Vzcy5FdmVudEVtaXR0ZXIpIHByb2Nlc3MuRXZlbnRFbWl0dGVyID0gZnVuY3Rpb24gKCkge307XG5cbnZhciBFdmVudEVtaXR0ZXIgPSBleHBvcnRzLkV2ZW50RW1pdHRlciA9IHByb2Nlc3MuRXZlbnRFbWl0dGVyO1xudmFyIGlzQXJyYXkgPSB0eXBlb2YgQXJyYXkuaXNBcnJheSA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gQXJyYXkuaXNBcnJheVxuICAgIDogZnVuY3Rpb24gKHhzKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgfVxuO1xuZnVuY3Rpb24gaW5kZXhPZiAoeHMsIHgpIHtcbiAgICBpZiAoeHMuaW5kZXhPZikgcmV0dXJuIHhzLmluZGV4T2YoeCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoeCA9PT0geHNbaV0pIHJldHVybiBpO1xuICAgIH1cbiAgICByZXR1cm4gLTE7XG59XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW5cbi8vIDEwIGxpc3RlbmVycyBhcmUgYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaFxuLy8gaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG4vL1xuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbnZhciBkZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICB0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzID0gbjtcbn07XG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNBcnJheSh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSlcbiAgICB7XG4gICAgICBpZiAoYXJndW1lbnRzWzFdIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgYXJndW1lbnRzWzFdOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5jYXVnaHQsIHVuc3BlY2lmaWVkICdlcnJvcicgZXZlbnQuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gZmFsc2U7XG4gIHZhciBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBpZiAoIWhhbmRsZXIpIHJldHVybiBmYWxzZTtcblxuICBpZiAodHlwZW9mIGhhbmRsZXIgPT0gJ2Z1bmN0aW9uJykge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoaXNBcnJheShoYW5kbGVyKSkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyBFdmVudEVtaXR0ZXIgaXMgZGVmaW5lZCBpbiBzcmMvbm9kZV9ldmVudHMuY2Ncbi8vIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCgpIGlzIGFsc28gZGVmaW5lZCB0aGVyZS5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGxpc3RlbmVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdhZGRMaXN0ZW5lciBvbmx5IHRha2VzIGluc3RhbmNlcyBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT0gXCJuZXdMaXN0ZW5lcnNcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJzXCIuXG4gIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHtcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgICB2YXIgbTtcbiAgICAgIGlmICh0aGlzLl9ldmVudHMubWF4TGlzdGVuZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbSA9IHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICAgIH1cblxuICAgICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYub24odHlwZSwgZnVuY3Rpb24gZygpIHtcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlbW92ZUxpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICAvLyBkb2VzIG5vdCB1c2UgbGlzdGVuZXJzKCksIHNvIG5vIHNpZGUgZWZmZWN0IG9mIGNyZWF0aW5nIF9ldmVudHNbdHlwZV1cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSkgcmV0dXJuIHRoaXM7XG5cbiAgdmFyIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzQXJyYXkobGlzdCkpIHtcbiAgICB2YXIgaSA9IGluZGV4T2YobGlzdCwgbGlzdGVuZXIpO1xuICAgIGlmIChpIDwgMCkgcmV0dXJuIHRoaXM7XG4gICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9IGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSA9PT0gbGlzdGVuZXIpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICBpZiAodHlwZSAmJiB0aGlzLl9ldmVudHMgJiYgdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBudWxsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKSB0aGlzLl9ldmVudHNbdHlwZV0gPSBbXTtcbiAgaWYgKCFpc0FycmF5KHRoaXMuX2V2ZW50c1t0eXBlXSkpIHtcbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZXZlbnRzW3R5cGVdO1xufTtcblxufSkocmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpKSIsInZhciBhY2NvdW50X2NvbnN0cnVjdG9yID0gcmVxdWlyZSgnLi9sb2dpbicpXG4vKiB2YXIgbWFpbiA9IHJlcXVpcmUoJy4vbWFpbicpICovXG52YXIgdGhyb3VnaCA9IHJlcXVpcmUoJ3Rocm91Z2gnKVxuICAsIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5cbnZhciBFc3RhdGUgPSByZXF1aXJlKCdFc3RhdGUnKVxuXG52YXIgaW8gPSByZXF1aXJlKCdzb2NrZXQuaW8tY2xpZW50JylcblxudmFyIHNvdXJjZSA9IGlvLmNvbm5lY3QoJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcpXG4gICwgc3RhdGUgPSBuZXcgRXN0YXRlXG5cbnZhciB1c2VyID0gbmV3IEVFXG4gICwgZXJyb3IgPSB0aHJvdWdoKClcblxuXG52YXIgYWNjb3VudCA9IGFjY291bnRfY29uc3RydWN0b3IoZXJyb3IsIHVzZXIsIHNvdXJjZSlcblxuc291cmNlLm9uKCdsb2dpbicsIGZ1bmN0aW9uKCkge1xuIGFsZXJ0KFwiSG9seSBTaGl0IVwiKVxufSlcblxuXG51c2VyLm9uKCdsb2dpbicsIGZ1bmN0aW9uKCkge1xuIGFsZXJ0KFwid29tcCFcIilcbn0pXG5cbnN0YXRlLmxpc3Rlbih1c2VyLCAnbG9naW4nLCBbJ2FjY291bnQnXSlcbnN0YXRlLmxpc3Rlbihzb3VyY2UsICdsb2dpbicsIFsnYWNjb3VudCddKVxuc3RhdGUubGlzdGVuKHVzZXIsICdsb2dvdXQnLCBbJ2FjY291bnQnXSlcbnN0YXRlLmxpc3RlbihlcnJvciwgJ2RhdGEnLCBbJ2Vycm9yJ10pXG5cbnN0YXRlLm9uKCdkYXRhJywgc2hvdylcblxuZnVuY3Rpb24gc2hvdyhzdGF0ZSkge1xuICBjb25zb2xlLmxvZyhcIlNUQVRFIENIQU5HRUQ6XCIsIHN0YXRlKVxuXG4gIHZhciBlcnJvcnNfZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Vycm9yc1wiKVxuICAgICwgYWNjb3VudF9lbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29udGVudFwiKVxuICAgICwgcGxheWVyc19lbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjcGxheWVyc1wiKVxuXG4gIGFjY291bnRfZWwuaW5uZXJIVE1MID0gYWNjb3VudC5yZW5kZXIoYWNjb3VudF9lbCwgc3RhdGUpXG4gIC8vIGVycm9ycy5pbm5lckhUTUwgPSByZW5kZXJfZXJyb3JzKGVycm9ycywgc3RhdGUpXG4gIC8vIHBsYXllcnMuaW5uZXJIVE1MID0gcmVuZGVyX3BsYXllcnMocGxheWVycywgc3RhdGUpXG59XG5cbmZ1bmN0aW9uIHJlbmRlcl9lcnJvcnMoZWwsIHN0YXRlKSB7XG4gIGVsLmlubmVySFRNTCA9IFwiV29vb3BzIVwiXG59XG5cblxuZnVuY3Rpb24gcmVuZGVyX2FjY291bnQoZWwsIHN0YXRlKSB7XG4gIGVsLmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KHN0YXRlLmFjY291bnQpXG59XG5cblxuZnVuY3Rpb24gcmVuZGVyX3BsYXllcnMoZWwsIHN0YXRlKSB7XG4gIGVsLmlubmVySFRNTCA9IEpTT04uc3RyaW5naWZ5KHN0YXRlLmFjY291bnQpXG59XG5cblxuICBcbiIsIihmdW5jdGlvbihwcm9jZXNzKXt2YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJylcblxuLy8gdGhyb3VnaFxuLy9cbi8vIGEgc3RyZWFtIHRoYXQgZG9lcyBub3RoaW5nIGJ1dCByZS1lbWl0IHRoZSBpbnB1dC5cbi8vIHVzZWZ1bCBmb3IgYWdncmVnYXRpbmcgYSBzZXJpZXMgb2YgY2hhbmdpbmcgYnV0IG5vdCBlbmRpbmcgc3RyZWFtcyBpbnRvIG9uZSBzdHJlYW0pXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHRocm91Z2hcbnRocm91Z2gudGhyb3VnaCA9IHRocm91Z2hcblxuLy9jcmVhdGUgYSByZWFkYWJsZSB3cml0YWJsZSBzdHJlYW0uXG5cbmZ1bmN0aW9uIHRocm91Z2ggKHdyaXRlLCBlbmQsIG9wdHMpIHtcbiAgd3JpdGUgPSB3cml0ZSB8fCBmdW5jdGlvbiAoZGF0YSkgeyB0aGlzLnF1ZXVlKGRhdGEpIH1cbiAgZW5kID0gZW5kIHx8IGZ1bmN0aW9uICgpIHsgdGhpcy5xdWV1ZShudWxsKSB9XG5cbiAgdmFyIGVuZGVkID0gZmFsc2UsIGRlc3Ryb3llZCA9IGZhbHNlLCBidWZmZXIgPSBbXSwgX2VuZGVkID0gZmFsc2VcbiAgdmFyIHN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICBzdHJlYW0ucmVhZGFibGUgPSBzdHJlYW0ud3JpdGFibGUgPSB0cnVlXG4gIHN0cmVhbS5wYXVzZWQgPSBmYWxzZVxuXG4vLyAgc3RyZWFtLmF1dG9QYXVzZSAgID0gIShvcHRzICYmIG9wdHMuYXV0b1BhdXNlICAgPT09IGZhbHNlKVxuICBzdHJlYW0uYXV0b0Rlc3Ryb3kgPSAhKG9wdHMgJiYgb3B0cy5hdXRvRGVzdHJveSA9PT0gZmFsc2UpXG5cbiAgc3RyZWFtLndyaXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB3cml0ZS5jYWxsKHRoaXMsIGRhdGEpXG4gICAgcmV0dXJuICFzdHJlYW0ucGF1c2VkXG4gIH1cblxuICBmdW5jdGlvbiBkcmFpbigpIHtcbiAgICB3aGlsZShidWZmZXIubGVuZ3RoICYmICFzdHJlYW0ucGF1c2VkKSB7XG4gICAgICB2YXIgZGF0YSA9IGJ1ZmZlci5zaGlmdCgpXG4gICAgICBpZihudWxsID09PSBkYXRhKVxuICAgICAgICByZXR1cm4gc3RyZWFtLmVtaXQoJ2VuZCcpXG4gICAgICBlbHNlXG4gICAgICAgIHN0cmVhbS5lbWl0KCdkYXRhJywgZGF0YSlcbiAgICB9XG4gIH1cblxuICBzdHJlYW0ucXVldWUgPSBzdHJlYW0ucHVzaCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4vLyAgICBjb25zb2xlLmVycm9yKGVuZGVkKVxuICAgIGlmKF9lbmRlZCkgcmV0dXJuIHN0cmVhbVxuICAgIGlmKGRhdGEgPT0gbnVsbCkgX2VuZGVkID0gdHJ1ZVxuICAgIGJ1ZmZlci5wdXNoKGRhdGEpXG4gICAgZHJhaW4oKVxuICAgIHJldHVybiBzdHJlYW1cbiAgfVxuXG4gIC8vdGhpcyB3aWxsIGJlIHJlZ2lzdGVyZWQgYXMgdGhlIGZpcnN0ICdlbmQnIGxpc3RlbmVyXG4gIC8vbXVzdCBjYWxsIGRlc3Ryb3kgbmV4dCB0aWNrLCB0byBtYWtlIHN1cmUgd2UncmUgYWZ0ZXIgYW55XG4gIC8vc3RyZWFtIHBpcGVkIGZyb20gaGVyZS5cbiAgLy90aGlzIGlzIG9ubHkgYSBwcm9ibGVtIGlmIGVuZCBpcyBub3QgZW1pdHRlZCBzeW5jaHJvbm91c2x5LlxuICAvL2EgbmljZXIgd2F5IHRvIGRvIHRoaXMgaXMgdG8gbWFrZSBzdXJlIHRoaXMgaXMgdGhlIGxhc3QgbGlzdGVuZXIgZm9yICdlbmQnXG5cbiAgc3RyZWFtLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgc3RyZWFtLnJlYWRhYmxlID0gZmFsc2VcbiAgICBpZighc3RyZWFtLndyaXRhYmxlICYmIHN0cmVhbS5hdXRvRGVzdHJveSlcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgICAgICBzdHJlYW0uZGVzdHJveSgpXG4gICAgICB9KVxuICB9KVxuXG4gIGZ1bmN0aW9uIF9lbmQgKCkge1xuICAgIHN0cmVhbS53cml0YWJsZSA9IGZhbHNlXG4gICAgZW5kLmNhbGwoc3RyZWFtKVxuICAgIGlmKCFzdHJlYW0ucmVhZGFibGUgJiYgc3RyZWFtLmF1dG9EZXN0cm95KVxuICAgICAgc3RyZWFtLmRlc3Ryb3koKVxuICB9XG5cbiAgc3RyZWFtLmVuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgaWYoZW5kZWQpIHJldHVyblxuICAgIGVuZGVkID0gdHJ1ZVxuICAgIGlmKGFyZ3VtZW50cy5sZW5ndGgpIHN0cmVhbS53cml0ZShkYXRhKVxuICAgIF9lbmQoKSAvLyB3aWxsIGVtaXQgb3IgcXVldWVcbiAgICByZXR1cm4gc3RyZWFtXG4gIH1cblxuICBzdHJlYW0uZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZihkZXN0cm95ZWQpIHJldHVyblxuICAgIGRlc3Ryb3llZCA9IHRydWVcbiAgICBlbmRlZCA9IHRydWVcbiAgICBidWZmZXIubGVuZ3RoID0gMFxuICAgIHN0cmVhbS53cml0YWJsZSA9IHN0cmVhbS5yZWFkYWJsZSA9IGZhbHNlXG4gICAgc3RyZWFtLmVtaXQoJ2Nsb3NlJylcbiAgICByZXR1cm4gc3RyZWFtXG4gIH1cblxuICBzdHJlYW0ucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYoc3RyZWFtLnBhdXNlZCkgcmV0dXJuXG4gICAgc3RyZWFtLnBhdXNlZCA9IHRydWVcbiAgICByZXR1cm4gc3RyZWFtXG4gIH1cblxuICBzdHJlYW0ucmVzdW1lID0gZnVuY3Rpb24gKCkge1xuICAgIGlmKHN0cmVhbS5wYXVzZWQpIHtcbiAgICAgIHN0cmVhbS5wYXVzZWQgPSBmYWxzZVxuICAgICAgc3RyZWFtLmVtaXQoJ3Jlc3VtZScpXG4gICAgfVxuICAgIGRyYWluKClcbiAgICAvL21heSBoYXZlIGJlY29tZSBwYXVzZWQgYWdhaW4sXG4gICAgLy9hcyBkcmFpbiBlbWl0cyAnZGF0YScuXG4gICAgaWYoIXN0cmVhbS5wYXVzZWQpXG4gICAgICBzdHJlYW0uZW1pdCgnZHJhaW4nKVxuICAgIHJldHVybiBzdHJlYW1cbiAgfVxuICByZXR1cm4gc3RyZWFtXG59XG5cblxufSkocmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpKSIsIm1vZHVsZS5leHBvcnRzID0gZXN0YXRlXG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlclxuXG5mdW5jdGlvbiBlc3RhdGUoKSB7XG4gIHJldHVybiBuZXcgRXN0YXRlKClcbn1cblxuZnVuY3Rpb24gRXN0YXRlKCkge1xuICBFRS5jYWxsKHRoaXMpXG4gIHRoaXMuX3N0YXRlID0ge31cbn1cblxudmFyIGNvbnMgPSBFc3RhdGVcbiAgLCBwcm90byA9IGNvbnMucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFRS5wcm90b3R5cGUpXG5cbnByb3RvLmNvbnN0cnVjdG9yID0gcHJvdG9cblxucHJvdG8ubGlzdGVuID0gZnVuY3Rpb24odG9fZWUsIG9uX2V2ZW50LCBhc19hdHRycykge1xuICB2YXIgc2VsZiA9IHRoaXNcblxuICB0b19lZS5vbihvbl9ldmVudCwgZnVuY3Rpb24oKSB7XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gYXNfYXR0cnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGlmKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSBzZWxmLl9zdGF0ZVthc19hdHRyc1tpXV1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYuX3N0YXRlW2FzX2F0dHJzW2ldXSA9IGFyZ3VtZW50c1tpXVxuICAgICAgfVxuICAgIH1cbiAgICBzZWxmLmVtaXQoJ2RhdGEnLCBzZWxmLl9zdGF0ZSlcbiAgfSlcblxuICByZXR1cm4gc2VsZlxufVxuIiwiKGZ1bmN0aW9uKCl7LyohIFNvY2tldC5JTy5qcyBidWlsZDowLjkuMTYsIGRldmVsb3BtZW50LiBDb3B5cmlnaHQoYykgMjAxMSBMZWFybkJvb3N0IDxkZXZAbGVhcm5ib29zdC5jb20+IE1JVCBMaWNlbnNlZCAqL1xuXG52YXIgaW8gPSAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiBtb2R1bGUgPyB7fSA6IG1vZHVsZS5leHBvcnRzKTtcbihmdW5jdGlvbigpIHtcblxuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgZ2xvYmFsKSB7XG5cbiAgLyoqXG4gICAqIElPIG5hbWVzcGFjZS5cbiAgICpcbiAgICogQG5hbWVzcGFjZVxuICAgKi9cblxuICB2YXIgaW8gPSBleHBvcnRzO1xuXG4gIC8qKlxuICAgKiBTb2NrZXQuSU8gdmVyc2lvblxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBpby52ZXJzaW9uID0gJzAuOS4xNic7XG5cbiAgLyoqXG4gICAqIFByb3RvY29sIGltcGxlbWVudGVkLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBpby5wcm90b2NvbCA9IDE7XG5cbiAgLyoqXG4gICAqIEF2YWlsYWJsZSB0cmFuc3BvcnRzLCB0aGVzZSB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIHRoZSBhdmFpbGFibGUgdHJhbnNwb3J0c1xuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBpby50cmFuc3BvcnRzID0gW107XG5cbiAgLyoqXG4gICAqIEtlZXAgdHJhY2sgb2YganNvbnAgY2FsbGJhY2tzLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgaW8uaiA9IFtdO1xuXG4gIC8qKlxuICAgKiBLZWVwIHRyYWNrIG9mIG91ciBpby5Tb2NrZXRzXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cbiAgaW8uc29ja2V0cyA9IHt9O1xuXG5cbiAgLyoqXG4gICAqIE1hbmFnZXMgY29ubmVjdGlvbnMgdG8gaG9zdHMuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmlcbiAgICogQFBhcmFtIHtCb29sZWFufSBmb3JjZSBjcmVhdGlvbiBvZiBuZXcgc29ja2V0IChkZWZhdWx0cyB0byBmYWxzZSlcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgaW8uY29ubmVjdCA9IGZ1bmN0aW9uIChob3N0LCBkZXRhaWxzKSB7XG4gICAgdmFyIHVyaSA9IGlvLnV0aWwucGFyc2VVcmkoaG9zdClcbiAgICAgICwgdXVyaVxuICAgICAgLCBzb2NrZXQ7XG5cbiAgICBpZiAoZ2xvYmFsICYmIGdsb2JhbC5sb2NhdGlvbikge1xuICAgICAgdXJpLnByb3RvY29sID0gdXJpLnByb3RvY29sIHx8IGdsb2JhbC5sb2NhdGlvbi5wcm90b2NvbC5zbGljZSgwLCAtMSk7XG4gICAgICB1cmkuaG9zdCA9IHVyaS5ob3N0IHx8IChnbG9iYWwuZG9jdW1lbnRcbiAgICAgICAgPyBnbG9iYWwuZG9jdW1lbnQuZG9tYWluIDogZ2xvYmFsLmxvY2F0aW9uLmhvc3RuYW1lKTtcbiAgICAgIHVyaS5wb3J0ID0gdXJpLnBvcnQgfHwgZ2xvYmFsLmxvY2F0aW9uLnBvcnQ7XG4gICAgfVxuXG4gICAgdXVyaSA9IGlvLnV0aWwudW5pcXVlVXJpKHVyaSk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgaG9zdDogdXJpLmhvc3RcbiAgICAgICwgc2VjdXJlOiAnaHR0cHMnID09IHVyaS5wcm90b2NvbFxuICAgICAgLCBwb3J0OiB1cmkucG9ydCB8fCAoJ2h0dHBzJyA9PSB1cmkucHJvdG9jb2wgPyA0NDMgOiA4MClcbiAgICAgICwgcXVlcnk6IHVyaS5xdWVyeSB8fCAnJ1xuICAgIH07XG5cbiAgICBpby51dGlsLm1lcmdlKG9wdGlvbnMsIGRldGFpbHMpO1xuXG4gICAgaWYgKG9wdGlvbnNbJ2ZvcmNlIG5ldyBjb25uZWN0aW9uJ10gfHwgIWlvLnNvY2tldHNbdXVyaV0pIHtcbiAgICAgIHNvY2tldCA9IG5ldyBpby5Tb2NrZXQob3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zWydmb3JjZSBuZXcgY29ubmVjdGlvbiddICYmIHNvY2tldCkge1xuICAgICAgaW8uc29ja2V0c1t1dXJpXSA9IHNvY2tldDtcbiAgICB9XG5cbiAgICBzb2NrZXQgPSBzb2NrZXQgfHwgaW8uc29ja2V0c1t1dXJpXTtcblxuICAgIC8vIGlmIHBhdGggaXMgZGlmZmVyZW50IGZyb20gJycgb3IgL1xuICAgIHJldHVybiBzb2NrZXQub2YodXJpLnBhdGgubGVuZ3RoID4gMSA/IHVyaS5wYXRoIDogJycpO1xuICB9O1xuXG59KSgnb2JqZWN0JyA9PT0gdHlwZW9mIG1vZHVsZSA/IG1vZHVsZS5leHBvcnRzIDogKHRoaXMuaW8gPSB7fSksIHRoaXMpO1xuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgZ2xvYmFsKSB7XG5cbiAgLyoqXG4gICAqIFV0aWxpdGllcyBuYW1lc3BhY2UuXG4gICAqXG4gICAqIEBuYW1lc3BhY2VcbiAgICovXG5cbiAgdmFyIHV0aWwgPSBleHBvcnRzLnV0aWwgPSB7fTtcblxuICAvKipcbiAgICogUGFyc2VzIGFuIFVSSVxuICAgKlxuICAgKiBAYXV0aG9yIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPiAoTUlUIGxpY2Vuc2UpXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHZhciByZSA9IC9eKD86KD8hW146QF0rOlteOkBcXC9dKkApKFteOlxcLz8jLl0rKTopPyg/OlxcL1xcLyk/KCg/OigoW146QF0qKSg/OjooW146QF0qKSk/KT9AKT8oW146XFwvPyNdKikoPzo6KFxcZCopKT8pKCgoXFwvKD86W14/I10oPyFbXj8jXFwvXSpcXC5bXj8jXFwvLl0rKD86Wz8jXXwkKSkpKlxcLz8pPyhbXj8jXFwvXSopKSg/OlxcPyhbXiNdKikpPyg/OiMoLiopKT8pLztcblxuICB2YXIgcGFydHMgPSBbJ3NvdXJjZScsICdwcm90b2NvbCcsICdhdXRob3JpdHknLCAndXNlckluZm8nLCAndXNlcicsICdwYXNzd29yZCcsXG4gICAgICAgICAgICAgICAnaG9zdCcsICdwb3J0JywgJ3JlbGF0aXZlJywgJ3BhdGgnLCAnZGlyZWN0b3J5JywgJ2ZpbGUnLCAncXVlcnknLFxuICAgICAgICAgICAgICAgJ2FuY2hvciddO1xuXG4gIHV0aWwucGFyc2VVcmkgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgdmFyIG0gPSByZS5leGVjKHN0ciB8fCAnJylcbiAgICAgICwgdXJpID0ge31cbiAgICAgICwgaSA9IDE0O1xuXG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdXJpW3BhcnRzW2ldXSA9IG1baV0gfHwgJyc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHVyaTtcbiAgfTtcblxuICAvKipcbiAgICogUHJvZHVjZXMgYSB1bmlxdWUgdXJsIHRoYXQgaWRlbnRpZmllcyBhIFNvY2tldC5JTyBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gdXJpXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwudW5pcXVlVXJpID0gZnVuY3Rpb24gKHVyaSkge1xuICAgIHZhciBwcm90b2NvbCA9IHVyaS5wcm90b2NvbFxuICAgICAgLCBob3N0ID0gdXJpLmhvc3RcbiAgICAgICwgcG9ydCA9IHVyaS5wb3J0O1xuXG4gICAgaWYgKCdkb2N1bWVudCcgaW4gZ2xvYmFsKSB7XG4gICAgICBob3N0ID0gaG9zdCB8fCBkb2N1bWVudC5kb21haW47XG4gICAgICBwb3J0ID0gcG9ydCB8fCAocHJvdG9jb2wgPT0gJ2h0dHBzJ1xuICAgICAgICAmJiBkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbCAhPT0gJ2h0dHBzOicgPyA0NDMgOiBkb2N1bWVudC5sb2NhdGlvbi5wb3J0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaG9zdCA9IGhvc3QgfHwgJ2xvY2FsaG9zdCc7XG5cbiAgICAgIGlmICghcG9ydCAmJiBwcm90b2NvbCA9PSAnaHR0cHMnKSB7XG4gICAgICAgIHBvcnQgPSA0NDM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIChwcm90b2NvbCB8fCAnaHR0cCcpICsgJzovLycgKyBob3N0ICsgJzonICsgKHBvcnQgfHwgODApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBNZXJnZXN0IDIgcXVlcnkgc3RyaW5ncyBpbiB0byBvbmNlIHVuaXF1ZSBxdWVyeSBzdHJpbmdcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGJhc2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGFkZGl0aW9uXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwucXVlcnkgPSBmdW5jdGlvbiAoYmFzZSwgYWRkaXRpb24pIHtcbiAgICB2YXIgcXVlcnkgPSB1dGlsLmNodW5rUXVlcnkoYmFzZSB8fCAnJylcbiAgICAgICwgY29tcG9uZW50cyA9IFtdO1xuXG4gICAgdXRpbC5tZXJnZShxdWVyeSwgdXRpbC5jaHVua1F1ZXJ5KGFkZGl0aW9uIHx8ICcnKSk7XG4gICAgZm9yICh2YXIgcGFydCBpbiBxdWVyeSkge1xuICAgICAgaWYgKHF1ZXJ5Lmhhc093blByb3BlcnR5KHBhcnQpKSB7XG4gICAgICAgIGNvbXBvbmVudHMucHVzaChwYXJ0ICsgJz0nICsgcXVlcnlbcGFydF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb21wb25lbnRzLmxlbmd0aCA/ICc/JyArIGNvbXBvbmVudHMuam9pbignJicpIDogJyc7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybXMgYSBxdWVyeXN0cmluZyBpbiB0byBhbiBvYmplY3RcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHFzXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwuY2h1bmtRdWVyeSA9IGZ1bmN0aW9uIChxcykge1xuICAgIHZhciBxdWVyeSA9IHt9XG4gICAgICAsIHBhcmFtcyA9IHFzLnNwbGl0KCcmJylcbiAgICAgICwgaSA9IDBcbiAgICAgICwgbCA9IHBhcmFtcy5sZW5ndGhcbiAgICAgICwga3Y7XG5cbiAgICBmb3IgKDsgaSA8IGw7ICsraSkge1xuICAgICAga3YgPSBwYXJhbXNbaV0uc3BsaXQoJz0nKTtcbiAgICAgIGlmIChrdlswXSkge1xuICAgICAgICBxdWVyeVtrdlswXV0gPSBrdlsxXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcXVlcnk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGVzIHRoZSBnaXZlbiBmdW5jdGlvbiB3aGVuIHRoZSBwYWdlIGlzIGxvYWRlZC5cbiAgICpcbiAgICogICAgIGlvLnV0aWwubG9hZChmdW5jdGlvbiAoKSB7IGNvbnNvbGUubG9nKCdwYWdlIGxvYWRlZCcpOyB9KTtcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgdmFyIHBhZ2VMb2FkZWQgPSBmYWxzZTtcblxuICB1dGlsLmxvYWQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAoJ2RvY3VtZW50JyBpbiBnbG9iYWwgJiYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJyB8fCBwYWdlTG9hZGVkKSB7XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG5cbiAgICB1dGlsLm9uKGdsb2JhbCwgJ2xvYWQnLCBmbiwgZmFsc2UpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50LlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgdXRpbC5vbiA9IGZ1bmN0aW9uIChlbGVtZW50LCBldmVudCwgZm4sIGNhcHR1cmUpIHtcbiAgICBpZiAoZWxlbWVudC5hdHRhY2hFdmVudCkge1xuICAgICAgZWxlbWVudC5hdHRhY2hFdmVudCgnb24nICsgZXZlbnQsIGZuKTtcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBmbiwgY2FwdHVyZSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgdGhlIGNvcnJlY3QgYFhNTEh0dHBSZXF1ZXN0YCBmb3IgcmVndWxhciBhbmQgY3Jvc3MgZG9tYWluIHJlcXVlc3RzLlxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFt4ZG9tYWluXSBDcmVhdGUgYSByZXF1ZXN0IHRoYXQgY2FuIGJlIHVzZWQgY3Jvc3MgZG9tYWluLlxuICAgKiBAcmV0dXJucyB7WE1MSHR0cFJlcXVlc3R8ZmFsc2V9IElmIHdlIGNhbiBjcmVhdGUgYSBYTUxIdHRwUmVxdWVzdC5cbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIHV0aWwucmVxdWVzdCA9IGZ1bmN0aW9uICh4ZG9tYWluKSB7XG5cbiAgICBpZiAoeGRvbWFpbiAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgWERvbWFpblJlcXVlc3QgJiYgIXV0aWwudWEuaGFzQ09SUykge1xuICAgICAgcmV0dXJuIG5ldyBYRG9tYWluUmVxdWVzdCgpO1xuICAgIH1cblxuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgWE1MSHR0cFJlcXVlc3QgJiYgKCF4ZG9tYWluIHx8IHV0aWwudWEuaGFzQ09SUykpIHtcbiAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB9XG5cbiAgICBpZiAoIXhkb21haW4pIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBuZXcgd2luZG93WyhbJ0FjdGl2ZSddLmNvbmNhdCgnT2JqZWN0Jykuam9pbignWCcpKV0oJ01pY3Jvc29mdC5YTUxIVFRQJyk7XG4gICAgICB9IGNhdGNoKGUpIHsgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBYSFIgYmFzZWQgdHJhbnNwb3J0IGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAY29uc3RydWN0b3JcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgLyoqXG4gICAqIENoYW5nZSB0aGUgaW50ZXJuYWwgcGFnZUxvYWRlZCB2YWx1ZS5cbiAgICovXG5cbiAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiB3aW5kb3cpIHtcbiAgICB1dGlsLmxvYWQoZnVuY3Rpb24gKCkge1xuICAgICAgcGFnZUxvYWRlZCA9IHRydWU7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVmZXJzIGEgZnVuY3Rpb24gdG8gZW5zdXJlIGEgc3Bpbm5lciBpcyBub3QgZGlzcGxheWVkIGJ5IHRoZSBicm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwuZGVmZXIgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICBpZiAoIXV0aWwudWEud2Via2l0IHx8ICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbXBvcnRTY3JpcHRzKSB7XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG5cbiAgICB1dGlsLmxvYWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2V0VGltZW91dChmbiwgMTAwKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogTWVyZ2VzIHR3byBvYmplY3RzLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB1dGlsLm1lcmdlID0gZnVuY3Rpb24gbWVyZ2UgKHRhcmdldCwgYWRkaXRpb25hbCwgZGVlcCwgbGFzdHNlZW4pIHtcbiAgICB2YXIgc2VlbiA9IGxhc3RzZWVuIHx8IFtdXG4gICAgICAsIGRlcHRoID0gdHlwZW9mIGRlZXAgPT0gJ3VuZGVmaW5lZCcgPyAyIDogZGVlcFxuICAgICAgLCBwcm9wO1xuXG4gICAgZm9yIChwcm9wIGluIGFkZGl0aW9uYWwpIHtcbiAgICAgIGlmIChhZGRpdGlvbmFsLmhhc093blByb3BlcnR5KHByb3ApICYmIHV0aWwuaW5kZXhPZihzZWVuLCBwcm9wKSA8IDApIHtcbiAgICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbcHJvcF0gIT09ICdvYmplY3QnIHx8ICFkZXB0aCkge1xuICAgICAgICAgIHRhcmdldFtwcm9wXSA9IGFkZGl0aW9uYWxbcHJvcF07XG4gICAgICAgICAgc2Vlbi5wdXNoKGFkZGl0aW9uYWxbcHJvcF0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHV0aWwubWVyZ2UodGFyZ2V0W3Byb3BdLCBhZGRpdGlvbmFsW3Byb3BdLCBkZXB0aCAtIDEsIHNlZW4pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfTtcblxuICAvKipcbiAgICogTWVyZ2VzIHByb3RvdHlwZXMgZnJvbSBvYmplY3RzXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwubWl4aW4gPSBmdW5jdGlvbiAoY3RvciwgY3RvcjIpIHtcbiAgICB1dGlsLm1lcmdlKGN0b3IucHJvdG90eXBlLCBjdG9yMi5wcm90b3R5cGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTaG9ydGN1dCBmb3IgcHJvdG90eXBpY2FsIGFuZCBzdGF0aWMgaW5oZXJpdGFuY2UuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICB1dGlsLmluaGVyaXQgPSBmdW5jdGlvbiAoY3RvciwgY3RvcjIpIHtcbiAgICBmdW5jdGlvbiBmKCkge307XG4gICAgZi5wcm90b3R5cGUgPSBjdG9yMi5wcm90b3R5cGU7XG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgZjtcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYW4gQXJyYXkuXG4gICAqXG4gICAqICAgICBpby51dGlsLmlzQXJyYXkoW10pOyAvLyB0cnVlXG4gICAqICAgICBpby51dGlsLmlzQXJyYXkoe30pOyAvLyBmYWxzZVxuICAgKlxuICAgKiBAcGFyYW0gT2JqZWN0IG9ialxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB1dGlsLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLyoqXG4gICAqIEludGVyc2VjdHMgdmFsdWVzIG9mIHR3byBhcnJheXMgaW50byBhIHRoaXJkXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwuaW50ZXJzZWN0ID0gZnVuY3Rpb24gKGFyciwgYXJyMikge1xuICAgIHZhciByZXQgPSBbXVxuICAgICAgLCBsb25nZXN0ID0gYXJyLmxlbmd0aCA+IGFycjIubGVuZ3RoID8gYXJyIDogYXJyMlxuICAgICAgLCBzaG9ydGVzdCA9IGFyci5sZW5ndGggPiBhcnIyLmxlbmd0aCA/IGFycjIgOiBhcnI7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHNob3J0ZXN0Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKH51dGlsLmluZGV4T2YobG9uZ2VzdCwgc2hvcnRlc3RbaV0pKVxuICAgICAgICByZXQucHVzaChzaG9ydGVzdFtpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICAvKipcbiAgICogQXJyYXkgaW5kZXhPZiBjb21wYXRpYmlsaXR5LlxuICAgKlxuICAgKiBAc2VlIGJpdC5seS9hNUR4YTJcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgdXRpbC5pbmRleE9mID0gZnVuY3Rpb24gKGFyciwgbywgaSkge1xuXG4gICAgZm9yICh2YXIgaiA9IGFyci5sZW5ndGgsIGkgPSBpIDwgMCA/IGkgKyBqIDwgMCA/IDAgOiBpICsgaiA6IGkgfHwgMDtcbiAgICAgICAgIGkgPCBqICYmIGFycltpXSAhPT0gbzsgaSsrKSB7fVxuXG4gICAgcmV0dXJuIGogPD0gaSA/IC0xIDogaTtcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgZW51bWVyYWJsZXMgdG8gYXJyYXkuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwudG9BcnJheSA9IGZ1bmN0aW9uIChlbnUpIHtcbiAgICB2YXIgYXJyID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGVudS5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICBhcnIucHVzaChlbnVbaV0pO1xuXG4gICAgcmV0dXJuIGFycjtcbiAgfTtcblxuICAvKipcbiAgICogVUEgLyBlbmdpbmVzIGRldGVjdGlvbiBuYW1lc3BhY2UuXG4gICAqXG4gICAqIEBuYW1lc3BhY2VcbiAgICovXG5cbiAgdXRpbC51YSA9IHt9O1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBVQSBzdXBwb3J0cyBDT1JTIGZvciBYSFIuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIHV0aWwudWEuaGFzQ09SUyA9ICd1bmRlZmluZWQnICE9IHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAmJiAoZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgYSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYS53aXRoQ3JlZGVudGlhbHMgIT0gdW5kZWZpbmVkO1xuICB9KSgpO1xuXG4gIC8qKlxuICAgKiBEZXRlY3Qgd2Via2l0LlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB1dGlsLnVhLndlYmtpdCA9ICd1bmRlZmluZWQnICE9IHR5cGVvZiBuYXZpZ2F0b3JcbiAgICAmJiAvd2Via2l0L2kudGVzdChuYXZpZ2F0b3IudXNlckFnZW50KTtcblxuICAgLyoqXG4gICAqIERldGVjdCBpUGFkL2lQaG9uZS9pUG9kLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICB1dGlsLnVhLmlEZXZpY2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgbmF2aWdhdG9yXG4gICAgICAmJiAvaVBhZHxpUGhvbmV8aVBvZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG5cbn0pKCd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLmV4cG9ydHMsIHRoaXMpO1xuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgaW8pIHtcblxuICAvKipcbiAgICogRXhwb3NlIGNvbnN0cnVjdG9yLlxuICAgKi9cblxuICBleHBvcnRzLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuICAvKipcbiAgICogRXZlbnQgZW1pdHRlciBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQGFwaSBwdWJsaWMuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIEV2ZW50RW1pdHRlciAoKSB7fTtcblxuICAvKipcbiAgICogQWRkcyBhIGxpc3RlbmVyXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICBpZiAoIXRoaXMuJGV2ZW50cykge1xuICAgICAgdGhpcy4kZXZlbnRzID0ge307XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLiRldmVudHNbbmFtZV0pIHtcbiAgICAgIHRoaXMuJGV2ZW50c1tuYW1lXSA9IGZuO1xuICAgIH0gZWxzZSBpZiAoaW8udXRpbC5pc0FycmF5KHRoaXMuJGV2ZW50c1tuYW1lXSkpIHtcbiAgICAgIHRoaXMuJGV2ZW50c1tuYW1lXS5wdXNoKGZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZXZlbnRzW25hbWVdID0gW3RoaXMuJGV2ZW50c1tuYW1lXSwgZm5dO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uO1xuXG4gIC8qKlxuICAgKiBBZGRzIGEgdm9sYXRpbGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIG9uICgpIHtcbiAgICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIobmFtZSwgb24pO1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgb24ubGlzdGVuZXIgPSBmbjtcbiAgICB0aGlzLm9uKG5hbWUsIG9uKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgICBpZiAodGhpcy4kZXZlbnRzICYmIHRoaXMuJGV2ZW50c1tuYW1lXSkge1xuICAgICAgdmFyIGxpc3QgPSB0aGlzLiRldmVudHNbbmFtZV07XG5cbiAgICAgIGlmIChpby51dGlsLmlzQXJyYXkobGlzdCkpIHtcbiAgICAgICAgdmFyIHBvcyA9IC0xO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICBpZiAobGlzdFtpXSA9PT0gZm4gfHwgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gZm4pKSB7XG4gICAgICAgICAgICBwb3MgPSBpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBvcyA8IDApIHtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGxpc3Quc3BsaWNlKHBvcywgMSk7XG5cbiAgICAgICAgaWYgKCFsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLiRldmVudHNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobGlzdCA9PT0gZm4gfHwgKGxpc3QubGlzdGVuZXIgJiYgbGlzdC5saXN0ZW5lciA9PT0gZm4pKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLiRldmVudHNbbmFtZV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYWxsIGxpc3RlbmVycyBmb3IgYW4gZXZlbnQuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLiRldmVudHMgPSB7fTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLiRldmVudHMgJiYgdGhpcy4kZXZlbnRzW25hbWVdKSB7XG4gICAgICB0aGlzLiRldmVudHNbbmFtZV0gPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXRzIGFsbCBsaXN0ZW5lcnMgZm9yIGEgY2VydGFpbiBldmVudC5cbiAgICpcbiAgICogQGFwaSBwdWJsY2lcbiAgICovXG5cbiAgRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICghdGhpcy4kZXZlbnRzKSB7XG4gICAgICB0aGlzLiRldmVudHMgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuJGV2ZW50c1tuYW1lXSkge1xuICAgICAgdGhpcy4kZXZlbnRzW25hbWVdID0gW107XG4gICAgfVxuXG4gICAgaWYgKCFpby51dGlsLmlzQXJyYXkodGhpcy4kZXZlbnRzW25hbWVdKSkge1xuICAgICAgdGhpcy4kZXZlbnRzW25hbWVdID0gW3RoaXMuJGV2ZW50c1tuYW1lXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuJGV2ZW50c1tuYW1lXTtcbiAgfTtcblxuICAvKipcbiAgICogRW1pdHMgYW4gZXZlbnQuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKCF0aGlzLiRldmVudHMpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlciA9IHRoaXMuJGV2ZW50c1tuYW1lXTtcblxuICAgIGlmICghaGFuZGxlcikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0gZWxzZSBpZiAoaW8udXRpbC5pc0FycmF5KGhhbmRsZXIpKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuXG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbn0pKFxuICAgICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLmV4cG9ydHNcbiAgLCAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5wYXJlbnQuZXhwb3J0c1xuKTtcblxuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogQmFzZWQgb24gSlNPTjIgKGh0dHA6Ly93d3cuSlNPTi5vcmcvanMuaHRtbCkuXG4gKi9cblxuKGZ1bmN0aW9uIChleHBvcnRzLCBuYXRpdmVKU09OKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIC8vIHVzZSBuYXRpdmUgSlNPTiBpZiBpdCdzIGF2YWlsYWJsZVxuICBpZiAobmF0aXZlSlNPTiAmJiBuYXRpdmVKU09OLnBhcnNlKXtcbiAgICByZXR1cm4gZXhwb3J0cy5KU09OID0ge1xuICAgICAgcGFyc2U6IG5hdGl2ZUpTT04ucGFyc2VcbiAgICAsIHN0cmluZ2lmeTogbmF0aXZlSlNPTi5zdHJpbmdpZnlcbiAgICB9O1xuICB9XG5cbiAgdmFyIEpTT04gPSBleHBvcnRzLkpTT04gPSB7fTtcblxuICBmdW5jdGlvbiBmKG4pIHtcbiAgICAgIC8vIEZvcm1hdCBpbnRlZ2VycyB0byBoYXZlIGF0IGxlYXN0IHR3byBkaWdpdHMuXG4gICAgICByZXR1cm4gbiA8IDEwID8gJzAnICsgbiA6IG47XG4gIH1cblxuICBmdW5jdGlvbiBkYXRlKGQsIGtleSkge1xuICAgIHJldHVybiBpc0Zpbml0ZShkLnZhbHVlT2YoKSkgP1xuICAgICAgICBkLmdldFVUQ0Z1bGxZZWFyKCkgICAgICsgJy0nICtcbiAgICAgICAgZihkLmdldFVUQ01vbnRoKCkgKyAxKSArICctJyArXG4gICAgICAgIGYoZC5nZXRVVENEYXRlKCkpICAgICAgKyAnVCcgK1xuICAgICAgICBmKGQuZ2V0VVRDSG91cnMoKSkgICAgICsgJzonICtcbiAgICAgICAgZihkLmdldFVUQ01pbnV0ZXMoKSkgICArICc6JyArXG4gICAgICAgIGYoZC5nZXRVVENTZWNvbmRzKCkpICAgKyAnWicgOiBudWxsO1xuICB9O1xuXG4gIHZhciBjeCA9IC9bXFx1MDAwMFxcdTAwYWRcXHUwNjAwLVxcdTA2MDRcXHUwNzBmXFx1MTdiNFxcdTE3YjVcXHUyMDBjLVxcdTIwMGZcXHUyMDI4LVxcdTIwMmZcXHUyMDYwLVxcdTIwNmZcXHVmZWZmXFx1ZmZmMC1cXHVmZmZmXS9nLFxuICAgICAgZXNjYXBhYmxlID0gL1tcXFxcXFxcIlxceDAwLVxceDFmXFx4N2YtXFx4OWZcXHUwMGFkXFx1MDYwMC1cXHUwNjA0XFx1MDcwZlxcdTE3YjRcXHUxN2I1XFx1MjAwYy1cXHUyMDBmXFx1MjAyOC1cXHUyMDJmXFx1MjA2MC1cXHUyMDZmXFx1ZmVmZlxcdWZmZjAtXFx1ZmZmZl0vZyxcbiAgICAgIGdhcCxcbiAgICAgIGluZGVudCxcbiAgICAgIG1ldGEgPSB7ICAgIC8vIHRhYmxlIG9mIGNoYXJhY3RlciBzdWJzdGl0dXRpb25zXG4gICAgICAgICAgJ1xcYic6ICdcXFxcYicsXG4gICAgICAgICAgJ1xcdCc6ICdcXFxcdCcsXG4gICAgICAgICAgJ1xcbic6ICdcXFxcbicsXG4gICAgICAgICAgJ1xcZic6ICdcXFxcZicsXG4gICAgICAgICAgJ1xccic6ICdcXFxccicsXG4gICAgICAgICAgJ1wiJyA6ICdcXFxcXCInLFxuICAgICAgICAgICdcXFxcJzogJ1xcXFxcXFxcJ1xuICAgICAgfSxcbiAgICAgIHJlcDtcblxuXG4gIGZ1bmN0aW9uIHF1b3RlKHN0cmluZykge1xuXG4vLyBJZiB0aGUgc3RyaW5nIGNvbnRhaW5zIG5vIGNvbnRyb2wgY2hhcmFjdGVycywgbm8gcXVvdGUgY2hhcmFjdGVycywgYW5kIG5vXG4vLyBiYWNrc2xhc2ggY2hhcmFjdGVycywgdGhlbiB3ZSBjYW4gc2FmZWx5IHNsYXAgc29tZSBxdW90ZXMgYXJvdW5kIGl0LlxuLy8gT3RoZXJ3aXNlIHdlIG11c3QgYWxzbyByZXBsYWNlIHRoZSBvZmZlbmRpbmcgY2hhcmFjdGVycyB3aXRoIHNhZmUgZXNjYXBlXG4vLyBzZXF1ZW5jZXMuXG5cbiAgICAgIGVzY2FwYWJsZS5sYXN0SW5kZXggPSAwO1xuICAgICAgcmV0dXJuIGVzY2FwYWJsZS50ZXN0KHN0cmluZykgPyAnXCInICsgc3RyaW5nLnJlcGxhY2UoZXNjYXBhYmxlLCBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgIHZhciBjID0gbWV0YVthXTtcbiAgICAgICAgICByZXR1cm4gdHlwZW9mIGMgPT09ICdzdHJpbmcnID8gYyA6XG4gICAgICAgICAgICAgICdcXFxcdScgKyAoJzAwMDAnICsgYS5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTQpO1xuICAgICAgfSkgKyAnXCInIDogJ1wiJyArIHN0cmluZyArICdcIic7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHN0cihrZXksIGhvbGRlcikge1xuXG4vLyBQcm9kdWNlIGEgc3RyaW5nIGZyb20gaG9sZGVyW2tleV0uXG5cbiAgICAgIHZhciBpLCAgICAgICAgICAvLyBUaGUgbG9vcCBjb3VudGVyLlxuICAgICAgICAgIGssICAgICAgICAgIC8vIFRoZSBtZW1iZXIga2V5LlxuICAgICAgICAgIHYsICAgICAgICAgIC8vIFRoZSBtZW1iZXIgdmFsdWUuXG4gICAgICAgICAgbGVuZ3RoLFxuICAgICAgICAgIG1pbmQgPSBnYXAsXG4gICAgICAgICAgcGFydGlhbCxcbiAgICAgICAgICB2YWx1ZSA9IGhvbGRlcltrZXldO1xuXG4vLyBJZiB0aGUgdmFsdWUgaGFzIGEgdG9KU09OIG1ldGhvZCwgY2FsbCBpdCB0byBvYnRhaW4gYSByZXBsYWNlbWVudCB2YWx1ZS5cblxuICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICAgIHZhbHVlID0gZGF0ZShrZXkpO1xuICAgICAgfVxuXG4vLyBJZiB3ZSB3ZXJlIGNhbGxlZCB3aXRoIGEgcmVwbGFjZXIgZnVuY3Rpb24sIHRoZW4gY2FsbCB0aGUgcmVwbGFjZXIgdG9cbi8vIG9idGFpbiBhIHJlcGxhY2VtZW50IHZhbHVlLlxuXG4gICAgICBpZiAodHlwZW9mIHJlcCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHZhbHVlID0gcmVwLmNhbGwoaG9sZGVyLCBrZXksIHZhbHVlKTtcbiAgICAgIH1cblxuLy8gV2hhdCBoYXBwZW5zIG5leHQgZGVwZW5kcyBvbiB0aGUgdmFsdWUncyB0eXBlLlxuXG4gICAgICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICByZXR1cm4gcXVvdGUodmFsdWUpO1xuXG4gICAgICBjYXNlICdudW1iZXInOlxuXG4vLyBKU09OIG51bWJlcnMgbXVzdCBiZSBmaW5pdGUuIEVuY29kZSBub24tZmluaXRlIG51bWJlcnMgYXMgbnVsbC5cblxuICAgICAgICAgIHJldHVybiBpc0Zpbml0ZSh2YWx1ZSkgPyBTdHJpbmcodmFsdWUpIDogJ251bGwnO1xuXG4gICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIGNhc2UgJ251bGwnOlxuXG4vLyBJZiB0aGUgdmFsdWUgaXMgYSBib29sZWFuIG9yIG51bGwsIGNvbnZlcnQgaXQgdG8gYSBzdHJpbmcuIE5vdGU6XG4vLyB0eXBlb2YgbnVsbCBkb2VzIG5vdCBwcm9kdWNlICdudWxsJy4gVGhlIGNhc2UgaXMgaW5jbHVkZWQgaGVyZSBpblxuLy8gdGhlIHJlbW90ZSBjaGFuY2UgdGhhdCB0aGlzIGdldHMgZml4ZWQgc29tZWRheS5cblxuICAgICAgICAgIHJldHVybiBTdHJpbmcodmFsdWUpO1xuXG4vLyBJZiB0aGUgdHlwZSBpcyAnb2JqZWN0Jywgd2UgbWlnaHQgYmUgZGVhbGluZyB3aXRoIGFuIG9iamVjdCBvciBhbiBhcnJheSBvclxuLy8gbnVsbC5cblxuICAgICAgY2FzZSAnb2JqZWN0JzpcblxuLy8gRHVlIHRvIGEgc3BlY2lmaWNhdGlvbiBibHVuZGVyIGluIEVDTUFTY3JpcHQsIHR5cGVvZiBudWxsIGlzICdvYmplY3QnLFxuLy8gc28gd2F0Y2ggb3V0IGZvciB0aGF0IGNhc2UuXG5cbiAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnbnVsbCc7XG4gICAgICAgICAgfVxuXG4vLyBNYWtlIGFuIGFycmF5IHRvIGhvbGQgdGhlIHBhcnRpYWwgcmVzdWx0cyBvZiBzdHJpbmdpZnlpbmcgdGhpcyBvYmplY3QgdmFsdWUuXG5cbiAgICAgICAgICBnYXAgKz0gaW5kZW50O1xuICAgICAgICAgIHBhcnRpYWwgPSBbXTtcblxuLy8gSXMgdGhlIHZhbHVlIGFuIGFycmF5P1xuXG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nKSB7XG5cbi8vIFRoZSB2YWx1ZSBpcyBhbiBhcnJheS4gU3RyaW5naWZ5IGV2ZXJ5IGVsZW1lbnQuIFVzZSBudWxsIGFzIGEgcGxhY2Vob2xkZXJcbi8vIGZvciBub24tSlNPTiB2YWx1ZXMuXG5cbiAgICAgICAgICAgICAgbGVuZ3RoID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICAgIHBhcnRpYWxbaV0gPSBzdHIoaSwgdmFsdWUpIHx8ICdudWxsJztcbiAgICAgICAgICAgICAgfVxuXG4vLyBKb2luIGFsbCBvZiB0aGUgZWxlbWVudHMgdG9nZXRoZXIsIHNlcGFyYXRlZCB3aXRoIGNvbW1hcywgYW5kIHdyYXAgdGhlbSBpblxuLy8gYnJhY2tldHMuXG5cbiAgICAgICAgICAgICAgdiA9IHBhcnRpYWwubGVuZ3RoID09PSAwID8gJ1tdJyA6IGdhcCA/XG4gICAgICAgICAgICAgICAgICAnW1xcbicgKyBnYXAgKyBwYXJ0aWFsLmpvaW4oJyxcXG4nICsgZ2FwKSArICdcXG4nICsgbWluZCArICddJyA6XG4gICAgICAgICAgICAgICAgICAnWycgKyBwYXJ0aWFsLmpvaW4oJywnKSArICddJztcbiAgICAgICAgICAgICAgZ2FwID0gbWluZDtcbiAgICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgICAgfVxuXG4vLyBJZiB0aGUgcmVwbGFjZXIgaXMgYW4gYXJyYXksIHVzZSBpdCB0byBzZWxlY3QgdGhlIG1lbWJlcnMgdG8gYmUgc3RyaW5naWZpZWQuXG5cbiAgICAgICAgICBpZiAocmVwICYmIHR5cGVvZiByZXAgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIGxlbmd0aCA9IHJlcC5sZW5ndGg7XG4gICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZXBbaV0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgayA9IHJlcFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICB2ID0gc3RyKGssIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0aWFsLnB1c2gocXVvdGUoaykgKyAoZ2FwID8gJzogJyA6ICc6JykgKyB2KTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuXG4vLyBPdGhlcndpc2UsIGl0ZXJhdGUgdGhyb3VnaCBhbGwgb2YgdGhlIGtleXMgaW4gdGhlIG9iamVjdC5cblxuICAgICAgICAgICAgICBmb3IgKGsgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGspKSB7XG4gICAgICAgICAgICAgICAgICAgICAgdiA9IHN0cihrLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydGlhbC5wdXNoKHF1b3RlKGspICsgKGdhcCA/ICc6ICcgOiAnOicpICsgdik7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4vLyBKb2luIGFsbCBvZiB0aGUgbWVtYmVyIHRleHRzIHRvZ2V0aGVyLCBzZXBhcmF0ZWQgd2l0aCBjb21tYXMsXG4vLyBhbmQgd3JhcCB0aGVtIGluIGJyYWNlcy5cblxuICAgICAgICAgIHYgPSBwYXJ0aWFsLmxlbmd0aCA9PT0gMCA/ICd7fScgOiBnYXAgP1xuICAgICAgICAgICAgICAne1xcbicgKyBnYXAgKyBwYXJ0aWFsLmpvaW4oJyxcXG4nICsgZ2FwKSArICdcXG4nICsgbWluZCArICd9JyA6XG4gICAgICAgICAgICAgICd7JyArIHBhcnRpYWwuam9pbignLCcpICsgJ30nO1xuICAgICAgICAgIGdhcCA9IG1pbmQ7XG4gICAgICAgICAgcmV0dXJuIHY7XG4gICAgICB9XG4gIH1cblxuLy8gSWYgdGhlIEpTT04gb2JqZWN0IGRvZXMgbm90IHlldCBoYXZlIGEgc3RyaW5naWZ5IG1ldGhvZCwgZ2l2ZSBpdCBvbmUuXG5cbiAgSlNPTi5zdHJpbmdpZnkgPSBmdW5jdGlvbiAodmFsdWUsIHJlcGxhY2VyLCBzcGFjZSkge1xuXG4vLyBUaGUgc3RyaW5naWZ5IG1ldGhvZCB0YWtlcyBhIHZhbHVlIGFuZCBhbiBvcHRpb25hbCByZXBsYWNlciwgYW5kIGFuIG9wdGlvbmFsXG4vLyBzcGFjZSBwYXJhbWV0ZXIsIGFuZCByZXR1cm5zIGEgSlNPTiB0ZXh0LiBUaGUgcmVwbGFjZXIgY2FuIGJlIGEgZnVuY3Rpb25cbi8vIHRoYXQgY2FuIHJlcGxhY2UgdmFsdWVzLCBvciBhbiBhcnJheSBvZiBzdHJpbmdzIHRoYXQgd2lsbCBzZWxlY3QgdGhlIGtleXMuXG4vLyBBIGRlZmF1bHQgcmVwbGFjZXIgbWV0aG9kIGNhbiBiZSBwcm92aWRlZC4gVXNlIG9mIHRoZSBzcGFjZSBwYXJhbWV0ZXIgY2FuXG4vLyBwcm9kdWNlIHRleHQgdGhhdCBpcyBtb3JlIGVhc2lseSByZWFkYWJsZS5cblxuICAgICAgdmFyIGk7XG4gICAgICBnYXAgPSAnJztcbiAgICAgIGluZGVudCA9ICcnO1xuXG4vLyBJZiB0aGUgc3BhY2UgcGFyYW1ldGVyIGlzIGEgbnVtYmVyLCBtYWtlIGFuIGluZGVudCBzdHJpbmcgY29udGFpbmluZyB0aGF0XG4vLyBtYW55IHNwYWNlcy5cblxuICAgICAgaWYgKHR5cGVvZiBzcGFjZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgc3BhY2U7IGkgKz0gMSkge1xuICAgICAgICAgICAgICBpbmRlbnQgKz0gJyAnO1xuICAgICAgICAgIH1cblxuLy8gSWYgdGhlIHNwYWNlIHBhcmFtZXRlciBpcyBhIHN0cmluZywgaXQgd2lsbCBiZSB1c2VkIGFzIHRoZSBpbmRlbnQgc3RyaW5nLlxuXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGFjZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBpbmRlbnQgPSBzcGFjZTtcbiAgICAgIH1cblxuLy8gSWYgdGhlcmUgaXMgYSByZXBsYWNlciwgaXQgbXVzdCBiZSBhIGZ1bmN0aW9uIG9yIGFuIGFycmF5LlxuLy8gT3RoZXJ3aXNlLCB0aHJvdyBhbiBlcnJvci5cblxuICAgICAgcmVwID0gcmVwbGFjZXI7XG4gICAgICBpZiAocmVwbGFjZXIgJiYgdHlwZW9mIHJlcGxhY2VyICE9PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgICh0eXBlb2YgcmVwbGFjZXIgIT09ICdvYmplY3QnIHx8XG4gICAgICAgICAgICAgIHR5cGVvZiByZXBsYWNlci5sZW5ndGggIT09ICdudW1iZXInKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSlNPTi5zdHJpbmdpZnknKTtcbiAgICAgIH1cblxuLy8gTWFrZSBhIGZha2Ugcm9vdCBvYmplY3QgY29udGFpbmluZyBvdXIgdmFsdWUgdW5kZXIgdGhlIGtleSBvZiAnJy5cbi8vIFJldHVybiB0aGUgcmVzdWx0IG9mIHN0cmluZ2lmeWluZyB0aGUgdmFsdWUuXG5cbiAgICAgIHJldHVybiBzdHIoJycsIHsnJzogdmFsdWV9KTtcbiAgfTtcblxuLy8gSWYgdGhlIEpTT04gb2JqZWN0IGRvZXMgbm90IHlldCBoYXZlIGEgcGFyc2UgbWV0aG9kLCBnaXZlIGl0IG9uZS5cblxuICBKU09OLnBhcnNlID0gZnVuY3Rpb24gKHRleHQsIHJldml2ZXIpIHtcbiAgLy8gVGhlIHBhcnNlIG1ldGhvZCB0YWtlcyBhIHRleHQgYW5kIGFuIG9wdGlvbmFsIHJldml2ZXIgZnVuY3Rpb24sIGFuZCByZXR1cm5zXG4gIC8vIGEgSmF2YVNjcmlwdCB2YWx1ZSBpZiB0aGUgdGV4dCBpcyBhIHZhbGlkIEpTT04gdGV4dC5cblxuICAgICAgdmFyIGo7XG5cbiAgICAgIGZ1bmN0aW9uIHdhbGsoaG9sZGVyLCBrZXkpIHtcblxuICAvLyBUaGUgd2FsayBtZXRob2QgaXMgdXNlZCB0byByZWN1cnNpdmVseSB3YWxrIHRoZSByZXN1bHRpbmcgc3RydWN0dXJlIHNvXG4gIC8vIHRoYXQgbW9kaWZpY2F0aW9ucyBjYW4gYmUgbWFkZS5cblxuICAgICAgICAgIHZhciBrLCB2LCB2YWx1ZSA9IGhvbGRlcltrZXldO1xuICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgIGZvciAoayBpbiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2ID0gd2Fsayh2YWx1ZSwgayk7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHYgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZVtrXSA9IHY7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHZhbHVlW2tdO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmV2aXZlci5jYWxsKGhvbGRlciwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG5cblxuICAvLyBQYXJzaW5nIGhhcHBlbnMgaW4gZm91ciBzdGFnZXMuIEluIHRoZSBmaXJzdCBzdGFnZSwgd2UgcmVwbGFjZSBjZXJ0YWluXG4gIC8vIFVuaWNvZGUgY2hhcmFjdGVycyB3aXRoIGVzY2FwZSBzZXF1ZW5jZXMuIEphdmFTY3JpcHQgaGFuZGxlcyBtYW55IGNoYXJhY3RlcnNcbiAgLy8gaW5jb3JyZWN0bHksIGVpdGhlciBzaWxlbnRseSBkZWxldGluZyB0aGVtLCBvciB0cmVhdGluZyB0aGVtIGFzIGxpbmUgZW5kaW5ncy5cblxuICAgICAgdGV4dCA9IFN0cmluZyh0ZXh0KTtcbiAgICAgIGN4Lmxhc3RJbmRleCA9IDA7XG4gICAgICBpZiAoY3gudGVzdCh0ZXh0KSkge1xuICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoY3gsIGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnXFxcXHUnICtcbiAgICAgICAgICAgICAgICAgICgnMDAwMCcgKyBhLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpKS5zbGljZSgtNCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgLy8gSW4gdGhlIHNlY29uZCBzdGFnZSwgd2UgcnVuIHRoZSB0ZXh0IGFnYWluc3QgcmVndWxhciBleHByZXNzaW9ucyB0aGF0IGxvb2tcbiAgLy8gZm9yIG5vbi1KU09OIHBhdHRlcm5zLiBXZSBhcmUgZXNwZWNpYWxseSBjb25jZXJuZWQgd2l0aCAnKCknIGFuZCAnbmV3J1xuICAvLyBiZWNhdXNlIHRoZXkgY2FuIGNhdXNlIGludm9jYXRpb24sIGFuZCAnPScgYmVjYXVzZSBpdCBjYW4gY2F1c2UgbXV0YXRpb24uXG4gIC8vIEJ1dCBqdXN0IHRvIGJlIHNhZmUsIHdlIHdhbnQgdG8gcmVqZWN0IGFsbCB1bmV4cGVjdGVkIGZvcm1zLlxuXG4gIC8vIFdlIHNwbGl0IHRoZSBzZWNvbmQgc3RhZ2UgaW50byA0IHJlZ2V4cCBvcGVyYXRpb25zIGluIG9yZGVyIHRvIHdvcmsgYXJvdW5kXG4gIC8vIGNyaXBwbGluZyBpbmVmZmljaWVuY2llcyBpbiBJRSdzIGFuZCBTYWZhcmkncyByZWdleHAgZW5naW5lcy4gRmlyc3Qgd2VcbiAgLy8gcmVwbGFjZSB0aGUgSlNPTiBiYWNrc2xhc2ggcGFpcnMgd2l0aCAnQCcgKGEgbm9uLUpTT04gY2hhcmFjdGVyKS4gU2Vjb25kLCB3ZVxuICAvLyByZXBsYWNlIGFsbCBzaW1wbGUgdmFsdWUgdG9rZW5zIHdpdGggJ10nIGNoYXJhY3RlcnMuIFRoaXJkLCB3ZSBkZWxldGUgYWxsXG4gIC8vIG9wZW4gYnJhY2tldHMgdGhhdCBmb2xsb3cgYSBjb2xvbiBvciBjb21tYSBvciB0aGF0IGJlZ2luIHRoZSB0ZXh0LiBGaW5hbGx5LFxuICAvLyB3ZSBsb29rIHRvIHNlZSB0aGF0IHRoZSByZW1haW5pbmcgY2hhcmFjdGVycyBhcmUgb25seSB3aGl0ZXNwYWNlIG9yICddJyBvclxuICAvLyAnLCcgb3IgJzonIG9yICd7JyBvciAnfScuIElmIHRoYXQgaXMgc28sIHRoZW4gdGhlIHRleHQgaXMgc2FmZSBmb3IgZXZhbC5cblxuICAgICAgaWYgKC9eW1xcXSw6e31cXHNdKiQvXG4gICAgICAgICAgICAgIC50ZXN0KHRleHQucmVwbGFjZSgvXFxcXCg/OltcIlxcXFxcXC9iZm5ydF18dVswLTlhLWZBLUZdezR9KS9nLCAnQCcpXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXCJbXlwiXFxcXFxcblxccl0qXCJ8dHJ1ZXxmYWxzZXxudWxsfC0/XFxkKyg/OlxcLlxcZCopPyg/OltlRV1bK1xcLV0/XFxkKyk/L2csICddJylcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oPzpefDp8LCkoPzpcXHMqXFxbKSsvZywgJycpKSkge1xuXG4gIC8vIEluIHRoZSB0aGlyZCBzdGFnZSB3ZSB1c2UgdGhlIGV2YWwgZnVuY3Rpb24gdG8gY29tcGlsZSB0aGUgdGV4dCBpbnRvIGFcbiAgLy8gSmF2YVNjcmlwdCBzdHJ1Y3R1cmUuIFRoZSAneycgb3BlcmF0b3IgaXMgc3ViamVjdCB0byBhIHN5bnRhY3RpYyBhbWJpZ3VpdHlcbiAgLy8gaW4gSmF2YVNjcmlwdDogaXQgY2FuIGJlZ2luIGEgYmxvY2sgb3IgYW4gb2JqZWN0IGxpdGVyYWwuIFdlIHdyYXAgdGhlIHRleHRcbiAgLy8gaW4gcGFyZW5zIHRvIGVsaW1pbmF0ZSB0aGUgYW1iaWd1aXR5LlxuXG4gICAgICAgICAgaiA9IGV2YWwoJygnICsgdGV4dCArICcpJyk7XG5cbiAgLy8gSW4gdGhlIG9wdGlvbmFsIGZvdXJ0aCBzdGFnZSwgd2UgcmVjdXJzaXZlbHkgd2FsayB0aGUgbmV3IHN0cnVjdHVyZSwgcGFzc2luZ1xuICAvLyBlYWNoIG5hbWUvdmFsdWUgcGFpciB0byBhIHJldml2ZXIgZnVuY3Rpb24gZm9yIHBvc3NpYmxlIHRyYW5zZm9ybWF0aW9uLlxuXG4gICAgICAgICAgcmV0dXJuIHR5cGVvZiByZXZpdmVyID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICAgICAgd2Fsayh7Jyc6IGp9LCAnJykgOiBqO1xuICAgICAgfVxuXG4gIC8vIElmIHRoZSB0ZXh0IGlzIG5vdCBKU09OIHBhcnNlYWJsZSwgdGhlbiBhIFN5bnRheEVycm9yIGlzIHRocm93bi5cblxuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKCdKU09OLnBhcnNlJyk7XG4gIH07XG5cbn0pKFxuICAgICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLmV4cG9ydHNcbiAgLCB0eXBlb2YgSlNPTiAhPT0gJ3VuZGVmaW5lZCcgPyBKU09OIDogdW5kZWZpbmVkXG4pO1xuXG4vKipcbiAqIHNvY2tldC5pb1xuICogQ29weXJpZ2h0KGMpIDIwMTEgTGVhcm5Cb29zdCA8ZGV2QGxlYXJuYm9vc3QuY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuKGZ1bmN0aW9uIChleHBvcnRzLCBpbykge1xuXG4gIC8qKlxuICAgKiBQYXJzZXIgbmFtZXNwYWNlLlxuICAgKlxuICAgKiBAbmFtZXNwYWNlXG4gICAqL1xuXG4gIHZhciBwYXJzZXIgPSBleHBvcnRzLnBhcnNlciA9IHt9O1xuXG4gIC8qKlxuICAgKiBQYWNrZXQgdHlwZXMuXG4gICAqL1xuXG4gIHZhciBwYWNrZXRzID0gcGFyc2VyLnBhY2tldHMgPSBbXG4gICAgICAnZGlzY29ubmVjdCdcbiAgICAsICdjb25uZWN0J1xuICAgICwgJ2hlYXJ0YmVhdCdcbiAgICAsICdtZXNzYWdlJ1xuICAgICwgJ2pzb24nXG4gICAgLCAnZXZlbnQnXG4gICAgLCAnYWNrJ1xuICAgICwgJ2Vycm9yJ1xuICAgICwgJ25vb3AnXG4gIF07XG5cbiAgLyoqXG4gICAqIEVycm9ycyByZWFzb25zLlxuICAgKi9cblxuICB2YXIgcmVhc29ucyA9IHBhcnNlci5yZWFzb25zID0gW1xuICAgICAgJ3RyYW5zcG9ydCBub3Qgc3VwcG9ydGVkJ1xuICAgICwgJ2NsaWVudCBub3QgaGFuZHNoYWtlbidcbiAgICAsICd1bmF1dGhvcml6ZWQnXG4gIF07XG5cbiAgLyoqXG4gICAqIEVycm9ycyBhZHZpY2UuXG4gICAqL1xuXG4gIHZhciBhZHZpY2UgPSBwYXJzZXIuYWR2aWNlID0gW1xuICAgICAgJ3JlY29ubmVjdCdcbiAgXTtcblxuICAvKipcbiAgICogU2hvcnRjdXRzLlxuICAgKi9cblxuICB2YXIgSlNPTiA9IGlvLkpTT05cbiAgICAsIGluZGV4T2YgPSBpby51dGlsLmluZGV4T2Y7XG5cbiAgLyoqXG4gICAqIEVuY29kZXMgYSBwYWNrZXQuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBwYXJzZXIuZW5jb2RlUGFja2V0ID0gZnVuY3Rpb24gKHBhY2tldCkge1xuICAgIHZhciB0eXBlID0gaW5kZXhPZihwYWNrZXRzLCBwYWNrZXQudHlwZSlcbiAgICAgICwgaWQgPSBwYWNrZXQuaWQgfHwgJydcbiAgICAgICwgZW5kcG9pbnQgPSBwYWNrZXQuZW5kcG9pbnQgfHwgJydcbiAgICAgICwgYWNrID0gcGFja2V0LmFja1xuICAgICAgLCBkYXRhID0gbnVsbDtcblxuICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdmFyIHJlYXNvbiA9IHBhY2tldC5yZWFzb24gPyBpbmRleE9mKHJlYXNvbnMsIHBhY2tldC5yZWFzb24pIDogJydcbiAgICAgICAgICAsIGFkdiA9IHBhY2tldC5hZHZpY2UgPyBpbmRleE9mKGFkdmljZSwgcGFja2V0LmFkdmljZSkgOiAnJztcblxuICAgICAgICBpZiAocmVhc29uICE9PSAnJyB8fCBhZHYgIT09ICcnKVxuICAgICAgICAgIGRhdGEgPSByZWFzb24gKyAoYWR2ICE9PSAnJyA/ICgnKycgKyBhZHYpIDogJycpO1xuXG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdtZXNzYWdlJzpcbiAgICAgICAgaWYgKHBhY2tldC5kYXRhICE9PSAnJylcbiAgICAgICAgICBkYXRhID0gcGFja2V0LmRhdGE7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdldmVudCc6XG4gICAgICAgIHZhciBldiA9IHsgbmFtZTogcGFja2V0Lm5hbWUgfTtcblxuICAgICAgICBpZiAocGFja2V0LmFyZ3MgJiYgcGFja2V0LmFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgZXYuYXJncyA9IHBhY2tldC5hcmdzO1xuICAgICAgICB9XG5cbiAgICAgICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGV2KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkocGFja2V0LmRhdGEpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY29ubmVjdCc6XG4gICAgICAgIGlmIChwYWNrZXQucXMpXG4gICAgICAgICAgZGF0YSA9IHBhY2tldC5xcztcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2Fjayc6XG4gICAgICAgIGRhdGEgPSBwYWNrZXQuYWNrSWRcbiAgICAgICAgICArIChwYWNrZXQuYXJncyAmJiBwYWNrZXQuYXJncy5sZW5ndGhcbiAgICAgICAgICAgICAgPyAnKycgKyBKU09OLnN0cmluZ2lmeShwYWNrZXQuYXJncykgOiAnJyk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIGNvbnN0cnVjdCBwYWNrZXQgd2l0aCByZXF1aXJlZCBmcmFnbWVudHNcbiAgICB2YXIgZW5jb2RlZCA9IFtcbiAgICAgICAgdHlwZVxuICAgICAgLCBpZCArIChhY2sgPT0gJ2RhdGEnID8gJysnIDogJycpXG4gICAgICAsIGVuZHBvaW50XG4gICAgXTtcblxuICAgIC8vIGRhdGEgZnJhZ21lbnQgaXMgb3B0aW9uYWxcbiAgICBpZiAoZGF0YSAhPT0gbnVsbCAmJiBkYXRhICE9PSB1bmRlZmluZWQpXG4gICAgICBlbmNvZGVkLnB1c2goZGF0YSk7XG5cbiAgICByZXR1cm4gZW5jb2RlZC5qb2luKCc6Jyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEVuY29kZXMgbXVsdGlwbGUgbWVzc2FnZXMgKHBheWxvYWQpLlxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5fSBtZXNzYWdlc1xuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgcGFyc2VyLmVuY29kZVBheWxvYWQgPSBmdW5jdGlvbiAocGFja2V0cykge1xuICAgIHZhciBkZWNvZGVkID0gJyc7XG5cbiAgICBpZiAocGFja2V0cy5sZW5ndGggPT0gMSlcbiAgICAgIHJldHVybiBwYWNrZXRzWzBdO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYWNrZXRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIHBhY2tldCA9IHBhY2tldHNbaV07XG4gICAgICBkZWNvZGVkICs9ICdcXHVmZmZkJyArIHBhY2tldC5sZW5ndGggKyAnXFx1ZmZmZCcgKyBwYWNrZXRzW2ldO1xuICAgIH1cblxuICAgIHJldHVybiBkZWNvZGVkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWNvZGVzIGEgcGFja2V0XG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICB2YXIgcmVnZXhwID0gLyhbXjpdKyk6KFswLTldKyk/KFxcKyk/OihbXjpdKyk/Oj8oW1xcc1xcU10qKT8vO1xuXG4gIHBhcnNlci5kZWNvZGVQYWNrZXQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBwaWVjZXMgPSBkYXRhLm1hdGNoKHJlZ2V4cCk7XG5cbiAgICBpZiAoIXBpZWNlcykgcmV0dXJuIHt9O1xuXG4gICAgdmFyIGlkID0gcGllY2VzWzJdIHx8ICcnXG4gICAgICAsIGRhdGEgPSBwaWVjZXNbNV0gfHwgJydcbiAgICAgICwgcGFja2V0ID0ge1xuICAgICAgICAgICAgdHlwZTogcGFja2V0c1twaWVjZXNbMV1dXG4gICAgICAgICAgLCBlbmRwb2ludDogcGllY2VzWzRdIHx8ICcnXG4gICAgICAgIH07XG5cbiAgICAvLyB3aGV0aGVyIHdlIG5lZWQgdG8gYWNrbm93bGVkZ2UgdGhlIHBhY2tldFxuICAgIGlmIChpZCkge1xuICAgICAgcGFja2V0LmlkID0gaWQ7XG4gICAgICBpZiAocGllY2VzWzNdKVxuICAgICAgICBwYWNrZXQuYWNrID0gJ2RhdGEnO1xuICAgICAgZWxzZVxuICAgICAgICBwYWNrZXQuYWNrID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgZGlmZmVyZW50IHBhY2tldCB0eXBlc1xuICAgIHN3aXRjaCAocGFja2V0LnR5cGUpIHtcbiAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgdmFyIHBpZWNlcyA9IGRhdGEuc3BsaXQoJysnKTtcbiAgICAgICAgcGFja2V0LnJlYXNvbiA9IHJlYXNvbnNbcGllY2VzWzBdXSB8fCAnJztcbiAgICAgICAgcGFja2V0LmFkdmljZSA9IGFkdmljZVtwaWVjZXNbMV1dIHx8ICcnO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbWVzc2FnZSc6XG4gICAgICAgIHBhY2tldC5kYXRhID0gZGF0YSB8fCAnJztcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgb3B0cyA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgcGFja2V0Lm5hbWUgPSBvcHRzLm5hbWU7XG4gICAgICAgICAgcGFja2V0LmFyZ3MgPSBvcHRzLmFyZ3M7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuXG4gICAgICAgIHBhY2tldC5hcmdzID0gcGFja2V0LmFyZ3MgfHwgW107XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYWNrZXQuZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY29ubmVjdCc6XG4gICAgICAgIHBhY2tldC5xcyA9IGRhdGEgfHwgJyc7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhY2snOlxuICAgICAgICB2YXIgcGllY2VzID0gZGF0YS5tYXRjaCgvXihbMC05XSspKFxcKyk/KC4qKS8pO1xuICAgICAgICBpZiAocGllY2VzKSB7XG4gICAgICAgICAgcGFja2V0LmFja0lkID0gcGllY2VzWzFdO1xuICAgICAgICAgIHBhY2tldC5hcmdzID0gW107XG5cbiAgICAgICAgICBpZiAocGllY2VzWzNdKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBwYWNrZXQuYXJncyA9IHBpZWNlc1szXSA/IEpTT04ucGFyc2UocGllY2VzWzNdKSA6IFtdO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdkaXNjb25uZWN0JzpcbiAgICAgIGNhc2UgJ2hlYXJ0YmVhdCc6XG4gICAgICAgIGJyZWFrO1xuICAgIH07XG5cbiAgICByZXR1cm4gcGFja2V0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBEZWNvZGVzIGRhdGEgcGF5bG9hZC4gRGV0ZWN0cyBtdWx0aXBsZSBtZXNzYWdlc1xuICAgKlxuICAgKiBAcmV0dXJuIHtBcnJheX0gbWVzc2FnZXNcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgcGFyc2VyLmRlY29kZVBheWxvYWQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIC8vIElFIGRvZXNuJ3QgbGlrZSBkYXRhW2ldIGZvciB1bmljb2RlIGNoYXJzLCBjaGFyQXQgd29ya3MgZmluZVxuICAgIGlmIChkYXRhLmNoYXJBdCgwKSA9PSAnXFx1ZmZmZCcpIHtcbiAgICAgIHZhciByZXQgPSBbXTtcblxuICAgICAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9ICcnOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZGF0YS5jaGFyQXQoaSkgPT0gJ1xcdWZmZmQnKSB7XG4gICAgICAgICAgcmV0LnB1c2gocGFyc2VyLmRlY29kZVBhY2tldChkYXRhLnN1YnN0cihpICsgMSkuc3Vic3RyKDAsIGxlbmd0aCkpKTtcbiAgICAgICAgICBpICs9IE51bWJlcihsZW5ndGgpICsgMTtcbiAgICAgICAgICBsZW5ndGggPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZW5ndGggKz0gZGF0YS5jaGFyQXQoaSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtwYXJzZXIuZGVjb2RlUGFja2V0KGRhdGEpXTtcbiAgICB9XG4gIH07XG5cbn0pKFxuICAgICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLmV4cG9ydHNcbiAgLCAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5wYXJlbnQuZXhwb3J0c1xuKTtcbi8qKlxuICogc29ja2V0LmlvXG4gKiBDb3B5cmlnaHQoYykgMjAxMSBMZWFybkJvb3N0IDxkZXZAbGVhcm5ib29zdC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4oZnVuY3Rpb24gKGV4cG9ydHMsIGlvKSB7XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBjb25zdHJ1Y3Rvci5cbiAgICovXG5cbiAgZXhwb3J0cy5UcmFuc3BvcnQgPSBUcmFuc3BvcnQ7XG5cbiAgLyoqXG4gICAqIFRoaXMgaXMgdGhlIHRyYW5zcG9ydCB0ZW1wbGF0ZSBmb3IgYWxsIHN1cHBvcnRlZCB0cmFuc3BvcnQgbWV0aG9kcy5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIFRyYW5zcG9ydCAoc29ja2V0LCBzZXNzaWQpIHtcbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgICB0aGlzLnNlc3NpZCA9IHNlc3NpZDtcbiAgfTtcblxuICAvKipcbiAgICogQXBwbHkgRXZlbnRFbWl0dGVyIG1peGluLlxuICAgKi9cblxuICBpby51dGlsLm1peGluKFRyYW5zcG9ydCwgaW8uRXZlbnRFbWl0dGVyKTtcblxuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciBoZWFydGJlYXRzIGlzIGVuYWJsZWQgZm9yIHRoaXMgdHJhbnNwb3J0XG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBUcmFuc3BvcnQucHJvdG90eXBlLmhlYXJ0YmVhdHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci4gV2hlbiBhIG5ldyByZXNwb25zZSBpcyByZWNlaXZlZFxuICAgKiBpdCB3aWxsIGF1dG9tYXRpY2FsbHkgdXBkYXRlIHRoZSB0aW1lb3V0LCBkZWNvZGUgdGhlIG1lc3NhZ2UgYW5kXG4gICAqIGZvcndhcmRzIHRoZSByZXNwb25zZSB0byB0aGUgb25NZXNzYWdlIGZ1bmN0aW9uIGZvciBmdXJ0aGVyIHByb2Nlc3NpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFRyYW5zcG9ydC5wcm90b3R5cGUub25EYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0aGlzLmNsZWFyQ2xvc2VUaW1lb3V0KCk7XG5cbiAgICAvLyBJZiB0aGUgY29ubmVjdGlvbiBpbiBjdXJyZW50bHkgb3BlbiAob3IgaW4gYSByZW9wZW5pbmcgc3RhdGUpIHJlc2V0IHRoZSBjbG9zZVxuICAgIC8vIHRpbWVvdXQgc2luY2Ugd2UgaGF2ZSBqdXN0IHJlY2VpdmVkIGRhdGEuIFRoaXMgY2hlY2sgaXMgbmVjZXNzYXJ5IHNvXG4gICAgLy8gdGhhdCB3ZSBkb24ndCByZXNldCB0aGUgdGltZW91dCBvbiBhbiBleHBsaWNpdGx5IGRpc2Nvbm5lY3RlZCBjb25uZWN0aW9uLlxuICAgIGlmICh0aGlzLnNvY2tldC5jb25uZWN0ZWQgfHwgdGhpcy5zb2NrZXQuY29ubmVjdGluZyB8fCB0aGlzLnNvY2tldC5yZWNvbm5lY3RpbmcpIHtcbiAgICAgIHRoaXMuc2V0Q2xvc2VUaW1lb3V0KCk7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEgIT09ICcnKSB7XG4gICAgICAvLyB0b2RvOiB3ZSBzaG91bGQgb25seSBkbyBkZWNvZGVQYXlsb2FkIGZvciB4aHIgdHJhbnNwb3J0c1xuICAgICAgdmFyIG1zZ3MgPSBpby5wYXJzZXIuZGVjb2RlUGF5bG9hZChkYXRhKTtcblxuICAgICAgaWYgKG1zZ3MgJiYgbXNncy5sZW5ndGgpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBtc2dzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgIHRoaXMub25QYWNrZXQobXNnc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlcyBwYWNrZXRzLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5vblBhY2tldCA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcbiAgICB0aGlzLnNvY2tldC5zZXRIZWFydGJlYXRUaW1lb3V0KCk7XG5cbiAgICBpZiAocGFja2V0LnR5cGUgPT0gJ2hlYXJ0YmVhdCcpIHtcbiAgICAgIHJldHVybiB0aGlzLm9uSGVhcnRiZWF0KCk7XG4gICAgfVxuXG4gICAgaWYgKHBhY2tldC50eXBlID09ICdjb25uZWN0JyAmJiBwYWNrZXQuZW5kcG9pbnQgPT0gJycpIHtcbiAgICAgIHRoaXMub25Db25uZWN0KCk7XG4gICAgfVxuXG4gICAgaWYgKHBhY2tldC50eXBlID09ICdlcnJvcicgJiYgcGFja2V0LmFkdmljZSA9PSAncmVjb25uZWN0Jykge1xuICAgICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnNvY2tldC5vblBhY2tldChwYWNrZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldHMgY2xvc2UgdGltZW91dFxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5zZXRDbG9zZVRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmNsb3NlVGltZW91dCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB0aGlzLmNsb3NlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLm9uRGlzY29ubmVjdCgpO1xuICAgICAgfSwgdGhpcy5zb2NrZXQuY2xvc2VUaW1lb3V0KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRyYW5zcG9ydCBkaXNjb25uZWN0cy5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFRyYW5zcG9ydC5wcm90b3R5cGUub25EaXNjb25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlzT3BlbikgdGhpcy5jbG9zZSgpO1xuICAgIHRoaXMuY2xlYXJUaW1lb3V0cygpO1xuICAgIHRoaXMuc29ja2V0Lm9uRGlzY29ubmVjdCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0cmFuc3BvcnQgY29ubmVjdHNcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFRyYW5zcG9ydC5wcm90b3R5cGUub25Db25uZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc29ja2V0Lm9uQ29ubmVjdCgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhcnMgY2xvc2UgdGltZW91dFxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5jbGVhckNsb3NlVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5jbG9zZVRpbWVvdXQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNsb3NlVGltZW91dCk7XG4gICAgICB0aGlzLmNsb3NlVGltZW91dCA9IG51bGw7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciB0aW1lb3V0c1xuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5jbGVhclRpbWVvdXRzID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2xlYXJDbG9zZVRpbWVvdXQoKTtcblxuICAgIGlmICh0aGlzLnJlb3BlblRpbWVvdXQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlb3BlblRpbWVvdXQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU2VuZHMgYSBwYWNrZXRcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhY2tldCBvYmplY3QuXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBUcmFuc3BvcnQucHJvdG90eXBlLnBhY2tldCA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcbiAgICB0aGlzLnNlbmQoaW8ucGFyc2VyLmVuY29kZVBhY2tldChwYWNrZXQpKTtcbiAgfTtcblxuICAvKipcbiAgICogU2VuZCB0aGUgcmVjZWl2ZWQgaGVhcnRiZWF0IG1lc3NhZ2UgYmFjayB0byBzZXJ2ZXIuIFNvIHRoZSBzZXJ2ZXJcbiAgICoga25vd3Mgd2UgYXJlIHN0aWxsIGNvbm5lY3RlZC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGhlYXJ0YmVhdCBIZWFydGJlYXQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5vbkhlYXJ0YmVhdCA9IGZ1bmN0aW9uIChoZWFydGJlYXQpIHtcbiAgICB0aGlzLnBhY2tldCh7IHR5cGU6ICdoZWFydGJlYXQnIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgdHJhbnNwb3J0IG9wZW5zLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5vbk9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5pc09wZW4gPSB0cnVlO1xuICAgIHRoaXMuY2xlYXJDbG9zZVRpbWVvdXQoKTtcbiAgICB0aGlzLnNvY2tldC5vbk9wZW4oKTtcbiAgfTtcblxuICAvKipcbiAgICogTm90aWZpZXMgdGhlIGJhc2Ugd2hlbiB0aGUgY29ubmVjdGlvbiB3aXRoIHRoZSBTb2NrZXQuSU8gc2VydmVyXG4gICAqIGhhcyBiZWVuIGRpc2Nvbm5lY3RlZC5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFRyYW5zcG9ydC5wcm90b3R5cGUub25DbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvKiBGSVhNRTogcmVvcGVuIGRlbGF5IGNhdXNpbmcgYSBpbmZpbml0IGxvb3BcbiAgICB0aGlzLnJlb3BlblRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYub3BlbigpO1xuICAgIH0sIHRoaXMuc29ja2V0Lm9wdGlvbnNbJ3Jlb3BlbiBkZWxheSddKTsqL1xuXG4gICAgdGhpcy5pc09wZW4gPSBmYWxzZTtcbiAgICB0aGlzLnNvY2tldC5vbkNsb3NlKCk7XG4gICAgdGhpcy5vbkRpc2Nvbm5lY3QoKTtcbiAgfTtcblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgY29ubmVjdGlvbiB1cmwgYmFzZWQgb24gdGhlIFNvY2tldC5JTyBVUkwgUHJvdG9jb2wuXG4gICAqIFNlZSA8aHR0cHM6Ly9naXRodWIuY29tL2xlYXJuYm9vc3Qvc29ja2V0LmlvLW5vZGUvPiBmb3IgbW9yZSBkZXRhaWxzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBDb25uZWN0aW9uIHVybFxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgVHJhbnNwb3J0LnByb3RvdHlwZS5wcmVwYXJlVXJsID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvcHRpb25zID0gdGhpcy5zb2NrZXQub3B0aW9ucztcblxuICAgIHJldHVybiB0aGlzLnNjaGVtZSgpICsgJzovLydcbiAgICAgICsgb3B0aW9ucy5ob3N0ICsgJzonICsgb3B0aW9ucy5wb3J0ICsgJy8nXG4gICAgICArIG9wdGlvbnMucmVzb3VyY2UgKyAnLycgKyBpby5wcm90b2NvbFxuICAgICAgKyAnLycgKyB0aGlzLm5hbWUgKyAnLycgKyB0aGlzLnNlc3NpZDtcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSB0cmFuc3BvcnQgaXMgcmVhZHkgdG8gc3RhcnQgYSBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge1NvY2tldH0gc29ja2V0IFRoZSBzb2NrZXQgaW5zdGFuY2UgdGhhdCBuZWVkcyBhIHRyYW5zcG9ydFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2tcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFRyYW5zcG9ydC5wcm90b3R5cGUucmVhZHkgPSBmdW5jdGlvbiAoc29ja2V0LCBmbikge1xuICAgIGZuLmNhbGwodGhpcyk7XG4gIH07XG59KShcbiAgICAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5leHBvcnRzXG4gICwgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8gOiBtb2R1bGUucGFyZW50LmV4cG9ydHNcbik7XG4vKipcbiAqIHNvY2tldC5pb1xuICogQ29weXJpZ2h0KGMpIDIwMTEgTGVhcm5Cb29zdCA8ZGV2QGxlYXJuYm9vc3QuY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuKGZ1bmN0aW9uIChleHBvcnRzLCBpbywgZ2xvYmFsKSB7XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBjb25zdHJ1Y3Rvci5cbiAgICovXG5cbiAgZXhwb3J0cy5Tb2NrZXQgPSBTb2NrZXQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBgU29ja2V0LklPIGNsaWVudGAgd2hpY2ggY2FuIGVzdGFibGlzaCBhIHBlcnNpc3RlbnRcbiAgICogY29ubmVjdGlvbiB3aXRoIGEgU29ja2V0LklPIGVuYWJsZWQgc2VydmVyLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBTb2NrZXQgKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAgIHBvcnQ6IDgwXG4gICAgICAsIHNlY3VyZTogZmFsc2VcbiAgICAgICwgZG9jdW1lbnQ6ICdkb2N1bWVudCcgaW4gZ2xvYmFsID8gZG9jdW1lbnQgOiBmYWxzZVxuICAgICAgLCByZXNvdXJjZTogJ3NvY2tldC5pbydcbiAgICAgICwgdHJhbnNwb3J0czogaW8udHJhbnNwb3J0c1xuICAgICAgLCAnY29ubmVjdCB0aW1lb3V0JzogMTAwMDBcbiAgICAgICwgJ3RyeSBtdWx0aXBsZSB0cmFuc3BvcnRzJzogdHJ1ZVxuICAgICAgLCAncmVjb25uZWN0JzogdHJ1ZVxuICAgICAgLCAncmVjb25uZWN0aW9uIGRlbGF5JzogNTAwXG4gICAgICAsICdyZWNvbm5lY3Rpb24gbGltaXQnOiBJbmZpbml0eVxuICAgICAgLCAncmVvcGVuIGRlbGF5JzogMzAwMFxuICAgICAgLCAnbWF4IHJlY29ubmVjdGlvbiBhdHRlbXB0cyc6IDEwXG4gICAgICAsICdzeW5jIGRpc2Nvbm5lY3Qgb24gdW5sb2FkJzogZmFsc2VcbiAgICAgICwgJ2F1dG8gY29ubmVjdCc6IHRydWVcbiAgICAgICwgJ2ZsYXNoIHBvbGljeSBwb3J0JzogMTA4NDNcbiAgICAgICwgJ21hbnVhbEZsdXNoJzogZmFsc2VcbiAgICB9O1xuXG4gICAgaW8udXRpbC5tZXJnZSh0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLm9wZW4gPSBmYWxzZTtcbiAgICB0aGlzLmNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnJlY29ubmVjdGluZyA9IGZhbHNlO1xuICAgIHRoaXMubmFtZXNwYWNlcyA9IHt9O1xuICAgIHRoaXMuYnVmZmVyID0gW107XG4gICAgdGhpcy5kb0J1ZmZlciA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9uc1snc3luYyBkaXNjb25uZWN0IG9uIHVubG9hZCddICYmXG4gICAgICAgICghdGhpcy5pc1hEb21haW4oKSB8fCBpby51dGlsLnVhLmhhc0NPUlMpKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBpby51dGlsLm9uKGdsb2JhbCwgJ2JlZm9yZXVubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5kaXNjb25uZWN0U3luYygpO1xuICAgICAgfSwgZmFsc2UpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnNbJ2F1dG8gY29ubmVjdCddKSB7XG4gICAgICB0aGlzLmNvbm5lY3QoKTtcbiAgICB9XG59O1xuXG4gIC8qKlxuICAgKiBBcHBseSBFdmVudEVtaXR0ZXIgbWl4aW4uXG4gICAqL1xuXG4gIGlvLnV0aWwubWl4aW4oU29ja2V0LCBpby5FdmVudEVtaXR0ZXIpO1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgbmFtZXNwYWNlIGxpc3RlbmVyL2VtaXR0ZXIgZm9yIHRoaXMgc29ja2V0XG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUub2YgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICghdGhpcy5uYW1lc3BhY2VzW25hbWVdKSB7XG4gICAgICB0aGlzLm5hbWVzcGFjZXNbbmFtZV0gPSBuZXcgaW8uU29ja2V0TmFtZXNwYWNlKHRoaXMsIG5hbWUpO1xuXG4gICAgICBpZiAobmFtZSAhPT0gJycpIHtcbiAgICAgICAgdGhpcy5uYW1lc3BhY2VzW25hbWVdLnBhY2tldCh7IHR5cGU6ICdjb25uZWN0JyB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5uYW1lc3BhY2VzW25hbWVdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBFbWl0cyB0aGUgZ2l2ZW4gZXZlbnQgdG8gdGhlIFNvY2tldCBhbmQgYWxsIG5hbWVzcGFjZXNcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUucHVibGlzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVtaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAgIHZhciBuc3A7XG5cbiAgICBmb3IgKHZhciBpIGluIHRoaXMubmFtZXNwYWNlcykge1xuICAgICAgaWYgKHRoaXMubmFtZXNwYWNlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICBuc3AgPSB0aGlzLm9mKGkpO1xuICAgICAgICBuc3AuJGVtaXQuYXBwbHkobnNwLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUGVyZm9ybXMgdGhlIGhhbmRzaGFrZVxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgZnVuY3Rpb24gZW1wdHkgKCkgeyB9O1xuXG4gIFNvY2tldC5wcm90b3R5cGUuaGFuZHNoYWtlID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAsIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICBmdW5jdGlvbiBjb21wbGV0ZSAoZGF0YSkge1xuICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICBzZWxmLmNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgc2VsZi5vbkVycm9yKGRhdGEubWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5hcHBseShudWxsLCBkYXRhLnNwbGl0KCc6JykpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgdXJsID0gW1xuICAgICAgICAgICdodHRwJyArIChvcHRpb25zLnNlY3VyZSA/ICdzJyA6ICcnKSArICc6LydcbiAgICAgICAgLCBvcHRpb25zLmhvc3QgKyAnOicgKyBvcHRpb25zLnBvcnRcbiAgICAgICAgLCBvcHRpb25zLnJlc291cmNlXG4gICAgICAgICwgaW8ucHJvdG9jb2xcbiAgICAgICAgLCBpby51dGlsLnF1ZXJ5KHRoaXMub3B0aW9ucy5xdWVyeSwgJ3Q9JyArICtuZXcgRGF0ZSlcbiAgICAgIF0uam9pbignLycpO1xuXG4gICAgaWYgKHRoaXMuaXNYRG9tYWluKCkgJiYgIWlvLnV0aWwudWEuaGFzQ09SUykge1xuICAgICAgdmFyIGluc2VydEF0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdXG4gICAgICAgICwgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cbiAgICAgIHNjcmlwdC5zcmMgPSB1cmwgKyAnJmpzb25wPScgKyBpby5qLmxlbmd0aDtcbiAgICAgIGluc2VydEF0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHNjcmlwdCwgaW5zZXJ0QXQpO1xuXG4gICAgICBpby5qLnB1c2goZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgY29tcGxldGUoZGF0YSk7XG4gICAgICAgIHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHhociA9IGlvLnV0aWwucmVxdWVzdCgpO1xuXG4gICAgICB4aHIub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgIGlmICh0aGlzLmlzWERvbWFpbigpKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZW1wdHk7XG5cbiAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PSAyMDApIHtcbiAgICAgICAgICAgIGNvbXBsZXRlKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoeGhyLnN0YXR1cyA9PSA0MDMpIHtcbiAgICAgICAgICAgIHNlbGYub25FcnJvcih4aHIucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5jb25uZWN0aW5nID0gZmFsc2U7ICAgICAgICAgICAgXG4gICAgICAgICAgICAhc2VsZi5yZWNvbm5lY3RpbmcgJiYgc2VsZi5vbkVycm9yKHhoci5yZXNwb25zZVRleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHhoci5zZW5kKG51bGwpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRmluZCBhbiBhdmFpbGFibGUgdHJhbnNwb3J0IGJhc2VkIG9uIHRoZSBvcHRpb25zIHN1cHBsaWVkIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUuZ2V0VHJhbnNwb3J0ID0gZnVuY3Rpb24gKG92ZXJyaWRlKSB7XG4gICAgdmFyIHRyYW5zcG9ydHMgPSBvdmVycmlkZSB8fCB0aGlzLnRyYW5zcG9ydHMsIG1hdGNoO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIHRyYW5zcG9ydDsgdHJhbnNwb3J0ID0gdHJhbnNwb3J0c1tpXTsgaSsrKSB7XG4gICAgICBpZiAoaW8uVHJhbnNwb3J0W3RyYW5zcG9ydF1cbiAgICAgICAgJiYgaW8uVHJhbnNwb3J0W3RyYW5zcG9ydF0uY2hlY2sodGhpcylcbiAgICAgICAgJiYgKCF0aGlzLmlzWERvbWFpbigpIHx8IGlvLlRyYW5zcG9ydFt0cmFuc3BvcnRdLnhkb21haW5DaGVjayh0aGlzKSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBpby5UcmFuc3BvcnRbdHJhbnNwb3J0XSh0aGlzLCB0aGlzLnNlc3Npb25pZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbm5lY3RzIHRvIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl0gQ2FsbGJhY2suXG4gICAqIEByZXR1cm5zIHtpby5Tb2NrZXR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChmbikge1xuICAgIGlmICh0aGlzLmNvbm5lY3RpbmcpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLmNvbm5lY3RpbmcgPSB0cnVlO1xuICAgIFxuICAgIHRoaXMuaGFuZHNoYWtlKGZ1bmN0aW9uIChzaWQsIGhlYXJ0YmVhdCwgY2xvc2UsIHRyYW5zcG9ydHMpIHtcbiAgICAgIHNlbGYuc2Vzc2lvbmlkID0gc2lkO1xuICAgICAgc2VsZi5jbG9zZVRpbWVvdXQgPSBjbG9zZSAqIDEwMDA7XG4gICAgICBzZWxmLmhlYXJ0YmVhdFRpbWVvdXQgPSBoZWFydGJlYXQgKiAxMDAwO1xuICAgICAgaWYoIXNlbGYudHJhbnNwb3J0cylcbiAgICAgICAgICBzZWxmLnRyYW5zcG9ydHMgPSBzZWxmLm9yaWdUcmFuc3BvcnRzID0gKHRyYW5zcG9ydHMgPyBpby51dGlsLmludGVyc2VjdChcbiAgICAgICAgICAgICAgdHJhbnNwb3J0cy5zcGxpdCgnLCcpXG4gICAgICAgICAgICAsIHNlbGYub3B0aW9ucy50cmFuc3BvcnRzXG4gICAgICAgICAgKSA6IHNlbGYub3B0aW9ucy50cmFuc3BvcnRzKTtcblxuICAgICAgc2VsZi5zZXRIZWFydGJlYXRUaW1lb3V0KCk7XG5cbiAgICAgIGZ1bmN0aW9uIGNvbm5lY3QgKHRyYW5zcG9ydHMpe1xuICAgICAgICBpZiAoc2VsZi50cmFuc3BvcnQpIHNlbGYudHJhbnNwb3J0LmNsZWFyVGltZW91dHMoKTtcblxuICAgICAgICBzZWxmLnRyYW5zcG9ydCA9IHNlbGYuZ2V0VHJhbnNwb3J0KHRyYW5zcG9ydHMpO1xuICAgICAgICBpZiAoIXNlbGYudHJhbnNwb3J0KSByZXR1cm4gc2VsZi5wdWJsaXNoKCdjb25uZWN0X2ZhaWxlZCcpO1xuXG4gICAgICAgIC8vIG9uY2UgdGhlIHRyYW5zcG9ydCBpcyByZWFkeVxuICAgICAgICBzZWxmLnRyYW5zcG9ydC5yZWFkeShzZWxmLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc2VsZi5jb25uZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLnB1Ymxpc2goJ2Nvbm5lY3RpbmcnLCBzZWxmLnRyYW5zcG9ydC5uYW1lKTtcbiAgICAgICAgICBzZWxmLnRyYW5zcG9ydC5vcGVuKCk7XG5cbiAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zWydjb25uZWN0IHRpbWVvdXQnXSkge1xuICAgICAgICAgICAgc2VsZi5jb25uZWN0VGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIGlmICghc2VsZi5jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmNvbm5lY3RpbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmIChzZWxmLm9wdGlvbnNbJ3RyeSBtdWx0aXBsZSB0cmFuc3BvcnRzJ10pIHtcbiAgICAgICAgICAgICAgICAgIHZhciByZW1haW5pbmcgPSBzZWxmLnRyYW5zcG9ydHM7XG5cbiAgICAgICAgICAgICAgICAgIHdoaWxlIChyZW1haW5pbmcubGVuZ3RoID4gMCAmJiByZW1haW5pbmcuc3BsaWNlKDAsMSlbMF0gIT1cbiAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnRyYW5zcG9ydC5uYW1lKSB7fVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZW1haW5pbmcubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0KHJlbWFpbmluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5wdWJsaXNoKCdjb25uZWN0X2ZhaWxlZCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBzZWxmLm9wdGlvbnNbJ2Nvbm5lY3QgdGltZW91dCddKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25uZWN0KHNlbGYudHJhbnNwb3J0cyk7XG5cbiAgICAgIHNlbGYub25jZSgnY29ubmVjdCcsIGZ1bmN0aW9uICgpe1xuICAgICAgICBjbGVhclRpbWVvdXQoc2VsZi5jb25uZWN0VGltZW91dFRpbWVyKTtcblxuICAgICAgICBmbiAmJiB0eXBlb2YgZm4gPT0gJ2Z1bmN0aW9uJyAmJiBmbigpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQ2xlYXJzIGFuZCBzZXRzIGEgbmV3IGhlYXJ0YmVhdCB0aW1lb3V0IHVzaW5nIHRoZSB2YWx1ZSBnaXZlbiBieSB0aGVcbiAgICogc2VydmVyIGR1cmluZyB0aGUgaGFuZHNoYWtlLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgU29ja2V0LnByb3RvdHlwZS5zZXRIZWFydGJlYXRUaW1lb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLmhlYXJ0YmVhdFRpbWVvdXRUaW1lcik7XG4gICAgaWYodGhpcy50cmFuc3BvcnQgJiYgIXRoaXMudHJhbnNwb3J0LmhlYXJ0YmVhdHMoKSkgcmV0dXJuO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuaGVhcnRiZWF0VGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLnRyYW5zcG9ydC5vbkNsb3NlKCk7XG4gICAgfSwgdGhpcy5oZWFydGJlYXRUaW1lb3V0KTtcbiAgfTtcblxuICAvKipcbiAgICogU2VuZHMgYSBtZXNzYWdlLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBwYWNrZXQuXG4gICAqIEByZXR1cm5zIHtpby5Tb2NrZXR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUucGFja2V0ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBpZiAodGhpcy5jb25uZWN0ZWQgJiYgIXRoaXMuZG9CdWZmZXIpIHtcbiAgICAgIHRoaXMudHJhbnNwb3J0LnBhY2tldChkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5idWZmZXIucHVzaChkYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogU2V0cyBidWZmZXIgc3RhdGVcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gKHYpIHtcbiAgICB0aGlzLmRvQnVmZmVyID0gdjtcblxuICAgIGlmICghdiAmJiB0aGlzLmNvbm5lY3RlZCAmJiB0aGlzLmJ1ZmZlci5sZW5ndGgpIHtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zWydtYW51YWxGbHVzaCddKSB7XG4gICAgICAgIHRoaXMuZmx1c2hCdWZmZXIoKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEZsdXNoZXMgdGhlIGJ1ZmZlciBkYXRhIG92ZXIgdGhlIHdpcmUuXG4gICAqIFRvIGJlIGludm9rZWQgbWFudWFsbHkgd2hlbiAnbWFudWFsRmx1c2gnIGlzIHNldCB0byB0cnVlLlxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBTb2NrZXQucHJvdG90eXBlLmZsdXNoQnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50cmFuc3BvcnQucGF5bG9hZCh0aGlzLmJ1ZmZlcik7XG4gICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgfTtcbiAgXG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3QgdGhlIGVzdGFibGlzaGVkIGNvbm5lY3QuXG4gICAqXG4gICAqIEByZXR1cm5zIHtpby5Tb2NrZXR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5jb25uZWN0ZWQgfHwgdGhpcy5jb25uZWN0aW5nKSB7XG4gICAgICBpZiAodGhpcy5vcGVuKSB7XG4gICAgICAgIHRoaXMub2YoJycpLnBhY2tldCh7IHR5cGU6ICdkaXNjb25uZWN0JyB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIGRpc2Nvbm5lY3Rpb24gaW1tZWRpYXRlbHlcbiAgICAgIHRoaXMub25EaXNjb25uZWN0KCdib290ZWQnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogRGlzY29ubmVjdHMgdGhlIHNvY2tldCB3aXRoIGEgc3luYyBYSFIuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBTb2NrZXQucHJvdG90eXBlLmRpc2Nvbm5lY3RTeW5jID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIGVuc3VyZSBkaXNjb25uZWN0aW9uXG4gICAgdmFyIHhociA9IGlvLnV0aWwucmVxdWVzdCgpO1xuICAgIHZhciB1cmkgPSBbXG4gICAgICAgICdodHRwJyArICh0aGlzLm9wdGlvbnMuc2VjdXJlID8gJ3MnIDogJycpICsgJzovJ1xuICAgICAgLCB0aGlzLm9wdGlvbnMuaG9zdCArICc6JyArIHRoaXMub3B0aW9ucy5wb3J0XG4gICAgICAsIHRoaXMub3B0aW9ucy5yZXNvdXJjZVxuICAgICAgLCBpby5wcm90b2NvbFxuICAgICAgLCAnJ1xuICAgICAgLCB0aGlzLnNlc3Npb25pZFxuICAgIF0uam9pbignLycpICsgJy8/ZGlzY29ubmVjdD0xJztcblxuICAgIHhoci5vcGVuKCdHRVQnLCB1cmksIGZhbHNlKTtcbiAgICB4aHIuc2VuZChudWxsKTtcblxuICAgIC8vIGhhbmRsZSBkaXNjb25uZWN0aW9uIGltbWVkaWF0ZWx5XG4gICAgdGhpcy5vbkRpc2Nvbm5lY3QoJ2Jvb3RlZCcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB3ZSBuZWVkIHRvIHVzZSBjcm9zcyBkb21haW4gZW5hYmxlZCB0cmFuc3BvcnRzLiBDcm9zcyBkb21haW4gd291bGRcbiAgICogYmUgYSBkaWZmZXJlbnQgcG9ydCBvciBkaWZmZXJlbnQgZG9tYWluIG5hbWUuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgU29ja2V0LnByb3RvdHlwZS5pc1hEb21haW4gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgcG9ydCA9IGdsb2JhbC5sb2NhdGlvbi5wb3J0IHx8XG4gICAgICAoJ2h0dHBzOicgPT0gZ2xvYmFsLmxvY2F0aW9uLnByb3RvY29sID8gNDQzIDogODApO1xuXG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5ob3N0ICE9PSBnbG9iYWwubG9jYXRpb24uaG9zdG5hbWUgXG4gICAgICB8fCB0aGlzLm9wdGlvbnMucG9ydCAhPSBwb3J0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgdXBvbiBoYW5kc2hha2UuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG4gICAgICB0aGlzLmNvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgIGlmICghdGhpcy5kb0J1ZmZlcikge1xuICAgICAgICAvLyBtYWtlIHN1cmUgdG8gZmx1c2ggdGhlIGJ1ZmZlclxuICAgICAgICB0aGlzLnNldEJ1ZmZlcihmYWxzZSk7XG4gICAgICB9XG4gICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSB0cmFuc3BvcnQgb3BlbnNcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUub25PcGVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub3BlbiA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSB0cmFuc3BvcnQgY2xvc2VzLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgU29ja2V0LnByb3RvdHlwZS5vbkNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub3BlbiA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aGlzLmhlYXJ0YmVhdFRpbWVvdXRUaW1lcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxlZCB3aGVuIHRoZSB0cmFuc3BvcnQgZmlyc3Qgb3BlbnMgYSBjb25uZWN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB0ZXh0XG4gICAqL1xuXG4gIFNvY2tldC5wcm90b3R5cGUub25QYWNrZXQgPSBmdW5jdGlvbiAocGFja2V0KSB7XG4gICAgdGhpcy5vZihwYWNrZXQuZW5kcG9pbnQpLm9uUGFja2V0KHBhY2tldCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYW4gZXJyb3IuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBTb2NrZXQucHJvdG90eXBlLm9uRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG4gICAgaWYgKGVyciAmJiBlcnIuYWR2aWNlKSB7XG4gICAgICBpZiAoZXJyLmFkdmljZSA9PT0gJ3JlY29ubmVjdCcgJiYgKHRoaXMuY29ubmVjdGVkIHx8IHRoaXMuY29ubmVjdGluZykpIHtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmVjb25uZWN0KSB7XG4gICAgICAgICAgdGhpcy5yZWNvbm5lY3QoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucHVibGlzaCgnZXJyb3InLCBlcnIgJiYgZXJyLnJlYXNvbiA/IGVyci5yZWFzb24gOiBlcnIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgd2hlbiB0aGUgdHJhbnNwb3J0IGRpc2Nvbm5lY3RzLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgU29ja2V0LnByb3RvdHlwZS5vbkRpc2Nvbm5lY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XG4gICAgdmFyIHdhc0Nvbm5lY3RlZCA9IHRoaXMuY29ubmVjdGVkXG4gICAgICAsIHdhc0Nvbm5lY3RpbmcgPSB0aGlzLmNvbm5lY3Rpbmc7XG5cbiAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuY29ubmVjdGluZyA9IGZhbHNlO1xuICAgIHRoaXMub3BlbiA9IGZhbHNlO1xuXG4gICAgaWYgKHdhc0Nvbm5lY3RlZCB8fCB3YXNDb25uZWN0aW5nKSB7XG4gICAgICB0aGlzLnRyYW5zcG9ydC5jbG9zZSgpO1xuICAgICAgdGhpcy50cmFuc3BvcnQuY2xlYXJUaW1lb3V0cygpO1xuICAgICAgaWYgKHdhc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnB1Ymxpc2goJ2Rpc2Nvbm5lY3QnLCByZWFzb24pO1xuXG4gICAgICAgIGlmICgnYm9vdGVkJyAhPSByZWFzb24gJiYgdGhpcy5vcHRpb25zLnJlY29ubmVjdCAmJiAhdGhpcy5yZWNvbm5lY3RpbmcpIHtcbiAgICAgICAgICB0aGlzLnJlY29ubmVjdCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsZWQgdXBvbiByZWNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBTb2NrZXQucHJvdG90eXBlLnJlY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnJlY29ubmVjdGluZyA9IHRydWU7XG4gICAgdGhpcy5yZWNvbm5lY3Rpb25BdHRlbXB0cyA9IDA7XG4gICAgdGhpcy5yZWNvbm5lY3Rpb25EZWxheSA9IHRoaXMub3B0aW9uc1sncmVjb25uZWN0aW9uIGRlbGF5J107XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgbWF4QXR0ZW1wdHMgPSB0aGlzLm9wdGlvbnNbJ21heCByZWNvbm5lY3Rpb24gYXR0ZW1wdHMnXVxuICAgICAgLCB0cnlNdWx0aXBsZSA9IHRoaXMub3B0aW9uc1sndHJ5IG11bHRpcGxlIHRyYW5zcG9ydHMnXVxuICAgICAgLCBsaW1pdCA9IHRoaXMub3B0aW9uc1sncmVjb25uZWN0aW9uIGxpbWl0J107XG5cbiAgICBmdW5jdGlvbiByZXNldCAoKSB7XG4gICAgICBpZiAoc2VsZi5jb25uZWN0ZWQpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBzZWxmLm5hbWVzcGFjZXMpIHtcbiAgICAgICAgICBpZiAoc2VsZi5uYW1lc3BhY2VzLmhhc093blByb3BlcnR5KGkpICYmICcnICE9PSBpKSB7XG4gICAgICAgICAgICAgIHNlbGYubmFtZXNwYWNlc1tpXS5wYWNrZXQoeyB0eXBlOiAnY29ubmVjdCcgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNlbGYucHVibGlzaCgncmVjb25uZWN0Jywgc2VsZi50cmFuc3BvcnQubmFtZSwgc2VsZi5yZWNvbm5lY3Rpb25BdHRlbXB0cyk7XG4gICAgICB9XG5cbiAgICAgIGNsZWFyVGltZW91dChzZWxmLnJlY29ubmVjdGlvblRpbWVyKTtcblxuICAgICAgc2VsZi5yZW1vdmVMaXN0ZW5lcignY29ubmVjdF9mYWlsZWQnLCBtYXliZVJlY29ubmVjdCk7XG4gICAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0JywgbWF5YmVSZWNvbm5lY3QpO1xuXG4gICAgICBzZWxmLnJlY29ubmVjdGluZyA9IGZhbHNlO1xuXG4gICAgICBkZWxldGUgc2VsZi5yZWNvbm5lY3Rpb25BdHRlbXB0cztcbiAgICAgIGRlbGV0ZSBzZWxmLnJlY29ubmVjdGlvbkRlbGF5O1xuICAgICAgZGVsZXRlIHNlbGYucmVjb25uZWN0aW9uVGltZXI7XG4gICAgICBkZWxldGUgc2VsZi5yZWRvVHJhbnNwb3J0cztcblxuICAgICAgc2VsZi5vcHRpb25zWyd0cnkgbXVsdGlwbGUgdHJhbnNwb3J0cyddID0gdHJ5TXVsdGlwbGU7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG1heWJlUmVjb25uZWN0ICgpIHtcbiAgICAgIGlmICghc2VsZi5yZWNvbm5lY3RpbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5jb25uZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlc2V0KCk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoc2VsZi5jb25uZWN0aW5nICYmIHNlbGYucmVjb25uZWN0aW5nKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnJlY29ubmVjdGlvblRpbWVyID0gc2V0VGltZW91dChtYXliZVJlY29ubmVjdCwgMTAwMCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWxmLnJlY29ubmVjdGlvbkF0dGVtcHRzKysgPj0gbWF4QXR0ZW1wdHMpIHtcbiAgICAgICAgaWYgKCFzZWxmLnJlZG9UcmFuc3BvcnRzKSB7XG4gICAgICAgICAgc2VsZi5vbignY29ubmVjdF9mYWlsZWQnLCBtYXliZVJlY29ubmVjdCk7XG4gICAgICAgICAgc2VsZi5vcHRpb25zWyd0cnkgbXVsdGlwbGUgdHJhbnNwb3J0cyddID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLnRyYW5zcG9ydHMgPSBzZWxmLm9yaWdUcmFuc3BvcnRzO1xuICAgICAgICAgIHNlbGYudHJhbnNwb3J0ID0gc2VsZi5nZXRUcmFuc3BvcnQoKTtcbiAgICAgICAgICBzZWxmLnJlZG9UcmFuc3BvcnRzID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLmNvbm5lY3QoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLnB1Ymxpc2goJ3JlY29ubmVjdF9mYWlsZWQnKTtcbiAgICAgICAgICByZXNldCgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2VsZi5yZWNvbm5lY3Rpb25EZWxheSA8IGxpbWl0KSB7XG4gICAgICAgICAgc2VsZi5yZWNvbm5lY3Rpb25EZWxheSAqPSAyOyAvLyBleHBvbmVudGlhbCBiYWNrIG9mZlxuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5jb25uZWN0KCk7XG4gICAgICAgIHNlbGYucHVibGlzaCgncmVjb25uZWN0aW5nJywgc2VsZi5yZWNvbm5lY3Rpb25EZWxheSwgc2VsZi5yZWNvbm5lY3Rpb25BdHRlbXB0cyk7XG4gICAgICAgIHNlbGYucmVjb25uZWN0aW9uVGltZXIgPSBzZXRUaW1lb3V0KG1heWJlUmVjb25uZWN0LCBzZWxmLnJlY29ubmVjdGlvbkRlbGF5KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy5vcHRpb25zWyd0cnkgbXVsdGlwbGUgdHJhbnNwb3J0cyddID0gZmFsc2U7XG4gICAgdGhpcy5yZWNvbm5lY3Rpb25UaW1lciA9IHNldFRpbWVvdXQobWF5YmVSZWNvbm5lY3QsIHRoaXMucmVjb25uZWN0aW9uRGVsYXkpO1xuXG4gICAgdGhpcy5vbignY29ubmVjdCcsIG1heWJlUmVjb25uZWN0KTtcbiAgfTtcblxufSkoXG4gICAgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8gOiBtb2R1bGUuZXhwb3J0c1xuICAsICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLnBhcmVudC5leHBvcnRzXG4gICwgdGhpc1xuKTtcbi8qKlxuICogc29ja2V0LmlvXG4gKiBDb3B5cmlnaHQoYykgMjAxMSBMZWFybkJvb3N0IDxkZXZAbGVhcm5ib29zdC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4oZnVuY3Rpb24gKGV4cG9ydHMsIGlvKSB7XG5cbiAgLyoqXG4gICAqIEV4cG9zZSBjb25zdHJ1Y3Rvci5cbiAgICovXG5cbiAgZXhwb3J0cy5Tb2NrZXROYW1lc3BhY2UgPSBTb2NrZXROYW1lc3BhY2U7XG5cbiAgLyoqXG4gICAqIFNvY2tldCBuYW1lc3BhY2UgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBTb2NrZXROYW1lc3BhY2UgKHNvY2tldCwgbmFtZSkge1xuICAgIHRoaXMuc29ja2V0ID0gc29ja2V0O1xuICAgIHRoaXMubmFtZSA9IG5hbWUgfHwgJyc7XG4gICAgdGhpcy5mbGFncyA9IHt9O1xuICAgIHRoaXMuanNvbiA9IG5ldyBGbGFnKHRoaXMsICdqc29uJyk7XG4gICAgdGhpcy5hY2tQYWNrZXRzID0gMDtcbiAgICB0aGlzLmFja3MgPSB7fTtcbiAgfTtcblxuICAvKipcbiAgICogQXBwbHkgRXZlbnRFbWl0dGVyIG1peGluLlxuICAgKi9cblxuICBpby51dGlsLm1peGluKFNvY2tldE5hbWVzcGFjZSwgaW8uRXZlbnRFbWl0dGVyKTtcblxuICAvKipcbiAgICogQ29waWVzIGVtaXQgc2luY2Ugd2Ugb3ZlcnJpZGUgaXRcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldE5hbWVzcGFjZS5wcm90b3R5cGUuJGVtaXQgPSBpby5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQ7XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgbmFtZXNwYWNlLCBieSBwcm94eWluZyB0aGUgcmVxdWVzdCB0byB0aGUgc29ja2V0LiBUaGlzXG4gICAqIGFsbG93cyB1cyB0byB1c2UgdGhlIHN5bmF4IGFzIHdlIGRvIG9uIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFNvY2tldE5hbWVzcGFjZS5wcm90b3R5cGUub2YgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0Lm9mLmFwcGx5KHRoaXMuc29ja2V0LCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZW5kcyBhIHBhY2tldC5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldE5hbWVzcGFjZS5wcm90b3R5cGUucGFja2V0ID0gZnVuY3Rpb24gKHBhY2tldCkge1xuICAgIHBhY2tldC5lbmRwb2ludCA9IHRoaXMubmFtZTtcbiAgICB0aGlzLnNvY2tldC5wYWNrZXQocGFja2V0KTtcbiAgICB0aGlzLmZsYWdzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNlbmRzIGEgbWVzc2FnZVxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBTb2NrZXROYW1lc3BhY2UucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoZGF0YSwgZm4pIHtcbiAgICB2YXIgcGFja2V0ID0ge1xuICAgICAgICB0eXBlOiB0aGlzLmZsYWdzLmpzb24gPyAnanNvbicgOiAnbWVzc2FnZSdcbiAgICAgICwgZGF0YTogZGF0YVxuICAgIH07XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZm4pIHtcbiAgICAgIHBhY2tldC5pZCA9ICsrdGhpcy5hY2tQYWNrZXRzO1xuICAgICAgcGFja2V0LmFjayA9IHRydWU7XG4gICAgICB0aGlzLmFja3NbcGFja2V0LmlkXSA9IGZuO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnBhY2tldChwYWNrZXQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBFbWl0cyBhbiBldmVudFxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cbiAgXG4gIFNvY2tldE5hbWVzcGFjZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgICAsIGxhc3RBcmcgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV1cbiAgICAgICwgcGFja2V0ID0ge1xuICAgICAgICAgICAgdHlwZTogJ2V2ZW50J1xuICAgICAgICAgICwgbmFtZTogbmFtZVxuICAgICAgICB9O1xuXG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGxhc3RBcmcpIHtcbiAgICAgIHBhY2tldC5pZCA9ICsrdGhpcy5hY2tQYWNrZXRzO1xuICAgICAgcGFja2V0LmFjayA9ICdkYXRhJztcbiAgICAgIHRoaXMuYWNrc1twYWNrZXQuaWRdID0gbGFzdEFyZztcbiAgICAgIGFyZ3MgPSBhcmdzLnNsaWNlKDAsIGFyZ3MubGVuZ3RoIC0gMSk7XG4gICAgfVxuXG4gICAgcGFja2V0LmFyZ3MgPSBhcmdzO1xuXG4gICAgcmV0dXJuIHRoaXMucGFja2V0KHBhY2tldCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3RzIHRoZSBuYW1lc3BhY2VcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFNvY2tldE5hbWVzcGFjZS5wcm90b3R5cGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5uYW1lID09PSAnJykge1xuICAgICAgdGhpcy5zb2NrZXQuZGlzY29ubmVjdCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhY2tldCh7IHR5cGU6ICdkaXNjb25uZWN0JyB9KTtcbiAgICAgIHRoaXMuJGVtaXQoJ2Rpc2Nvbm5lY3QnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlcyBhIHBhY2tldFxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgU29ja2V0TmFtZXNwYWNlLnByb3RvdHlwZS5vblBhY2tldCA9IGZ1bmN0aW9uIChwYWNrZXQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiBhY2sgKCkge1xuICAgICAgc2VsZi5wYWNrZXQoe1xuICAgICAgICAgIHR5cGU6ICdhY2snXG4gICAgICAgICwgYXJnczogaW8udXRpbC50b0FycmF5KGFyZ3VtZW50cylcbiAgICAgICAgLCBhY2tJZDogcGFja2V0LmlkXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgc3dpdGNoIChwYWNrZXQudHlwZSkge1xuICAgICAgY2FzZSAnY29ubmVjdCc6XG4gICAgICAgIHRoaXMuJGVtaXQoJ2Nvbm5lY3QnKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2Rpc2Nvbm5lY3QnOlxuICAgICAgICBpZiAodGhpcy5uYW1lID09PSAnJykge1xuICAgICAgICAgIHRoaXMuc29ja2V0Lm9uRGlzY29ubmVjdChwYWNrZXQucmVhc29uIHx8ICdib290ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLiRlbWl0KCdkaXNjb25uZWN0JywgcGFja2V0LnJlYXNvbik7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ21lc3NhZ2UnOlxuICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgIHZhciBwYXJhbXMgPSBbJ21lc3NhZ2UnLCBwYWNrZXQuZGF0YV07XG5cbiAgICAgICAgaWYgKHBhY2tldC5hY2sgPT0gJ2RhdGEnKSB7XG4gICAgICAgICAgcGFyYW1zLnB1c2goYWNrKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYWNrZXQuYWNrKSB7XG4gICAgICAgICAgdGhpcy5wYWNrZXQoeyB0eXBlOiAnYWNrJywgYWNrSWQ6IHBhY2tldC5pZCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJGVtaXQuYXBwbHkodGhpcywgcGFyYW1zKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2V2ZW50JzpcbiAgICAgICAgdmFyIHBhcmFtcyA9IFtwYWNrZXQubmFtZV0uY29uY2F0KHBhY2tldC5hcmdzKTtcblxuICAgICAgICBpZiAocGFja2V0LmFjayA9PSAnZGF0YScpXG4gICAgICAgICAgcGFyYW1zLnB1c2goYWNrKTtcblxuICAgICAgICB0aGlzLiRlbWl0LmFwcGx5KHRoaXMsIHBhcmFtcyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhY2snOlxuICAgICAgICBpZiAodGhpcy5hY2tzW3BhY2tldC5hY2tJZF0pIHtcbiAgICAgICAgICB0aGlzLmFja3NbcGFja2V0LmFja0lkXS5hcHBseSh0aGlzLCBwYWNrZXQuYXJncyk7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuYWNrc1twYWNrZXQuYWNrSWRdO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgIGlmIChwYWNrZXQuYWR2aWNlKXtcbiAgICAgICAgICB0aGlzLnNvY2tldC5vbkVycm9yKHBhY2tldCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHBhY2tldC5yZWFzb24gPT0gJ3VuYXV0aG9yaXplZCcpIHtcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoJ2Nvbm5lY3RfZmFpbGVkJywgcGFja2V0LnJlYXNvbik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuJGVtaXQoJ2Vycm9yJywgcGFja2V0LnJlYXNvbik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRmxhZyBpbnRlcmZhY2UuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBmdW5jdGlvbiBGbGFnIChuc3AsIG5hbWUpIHtcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG5zcDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZW5kIGEgbWVzc2FnZVxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBGbGFnLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubmFtZXNwYWNlLmZsYWdzW3RoaXMubmFtZV0gPSB0cnVlO1xuICAgIHRoaXMubmFtZXNwYWNlLnNlbmQuYXBwbHkodGhpcy5uYW1lc3BhY2UsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEVtaXQgYW4gZXZlbnRcbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgRmxhZy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm5hbWVzcGFjZS5mbGFnc1t0aGlzLm5hbWVdID0gdHJ1ZTtcbiAgICB0aGlzLm5hbWVzcGFjZS5lbWl0LmFwcGx5KHRoaXMubmFtZXNwYWNlLCBhcmd1bWVudHMpO1xuICB9O1xuXG59KShcbiAgICAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5leHBvcnRzXG4gICwgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8gOiBtb2R1bGUucGFyZW50LmV4cG9ydHNcbik7XG5cbi8qKlxuICogc29ja2V0LmlvXG4gKiBDb3B5cmlnaHQoYykgMjAxMSBMZWFybkJvb3N0IDxkZXZAbGVhcm5ib29zdC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4oZnVuY3Rpb24gKGV4cG9ydHMsIGlvLCBnbG9iYWwpIHtcblxuICAvKipcbiAgICogRXhwb3NlIGNvbnN0cnVjdG9yLlxuICAgKi9cblxuICBleHBvcnRzLndlYnNvY2tldCA9IFdTO1xuXG4gIC8qKlxuICAgKiBUaGUgV2ViU29ja2V0IHRyYW5zcG9ydCB1c2VzIHRoZSBIVE1MNSBXZWJTb2NrZXQgQVBJIHRvIGVzdGFibGlzaCBhblxuICAgKiBwZXJzaXN0ZW50IGNvbm5lY3Rpb24gd2l0aCB0aGUgU29ja2V0LklPIHNlcnZlci4gVGhpcyB0cmFuc3BvcnQgd2lsbCBhbHNvXG4gICAqIGJlIGluaGVyaXRlZCBieSB0aGUgRmxhc2hTb2NrZXQgZmFsbGJhY2sgYXMgaXQgcHJvdmlkZXMgYSBBUEkgY29tcGF0aWJsZVxuICAgKiBwb2x5ZmlsbCBmb3IgdGhlIFdlYlNvY2tldHMuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAZXh0ZW5kcyB7aW8uVHJhbnNwb3J0fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBXUyAoc29ja2V0KSB7XG4gICAgaW8uVHJhbnNwb3J0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaGVyaXRzIGZyb20gVHJhbnNwb3J0LlxuICAgKi9cblxuICBpby51dGlsLmluaGVyaXQoV1MsIGlvLlRyYW5zcG9ydCk7XG5cbiAgLyoqXG4gICAqIFRyYW5zcG9ydCBuYW1lXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFdTLnByb3RvdHlwZS5uYW1lID0gJ3dlYnNvY2tldCc7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGEgbmV3IGBXZWJTb2NrZXRgIGNvbm5lY3Rpb24gd2l0aCB0aGUgU29ja2V0LklPIHNlcnZlci4gV2UgYXR0YWNoXG4gICAqIGFsbCB0aGUgYXBwcm9wcmlhdGUgbGlzdGVuZXJzIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2VzIGZyb20gdGhlIHNlcnZlci5cbiAgICpcbiAgICogQHJldHVybnMge1RyYW5zcG9ydH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgV1MucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHF1ZXJ5ID0gaW8udXRpbC5xdWVyeSh0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5KVxuICAgICAgLCBzZWxmID0gdGhpc1xuICAgICAgLCBTb2NrZXRcblxuXG4gICAgaWYgKCFTb2NrZXQpIHtcbiAgICAgIFNvY2tldCA9IGdsb2JhbC5Nb3pXZWJTb2NrZXQgfHwgZ2xvYmFsLldlYlNvY2tldDtcbiAgICB9XG5cbiAgICB0aGlzLndlYnNvY2tldCA9IG5ldyBTb2NrZXQodGhpcy5wcmVwYXJlVXJsKCkgKyBxdWVyeSk7XG5cbiAgICB0aGlzLndlYnNvY2tldC5vbm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLm9uT3BlbigpO1xuICAgICAgc2VsZi5zb2NrZXQuc2V0QnVmZmVyKGZhbHNlKTtcbiAgICB9O1xuICAgIHRoaXMud2Vic29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgc2VsZi5vbkRhdGEoZXYuZGF0YSk7XG4gICAgfTtcbiAgICB0aGlzLndlYnNvY2tldC5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5vbkNsb3NlKCk7XG4gICAgICBzZWxmLnNvY2tldC5zZXRCdWZmZXIodHJ1ZSk7XG4gICAgfTtcbiAgICB0aGlzLndlYnNvY2tldC5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgIHNlbGYub25FcnJvcihlKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIHRoZSBTb2NrZXQuSU8gc2VydmVyLiBUaGUgbWVzc2FnZSB3aWxsIGF1dG9tYXRpY2FsbHkgYmVcbiAgICogZW5jb2RlZCBpbiB0aGUgY29ycmVjdCBtZXNzYWdlIGZvcm1hdC5cbiAgICpcbiAgICogQHJldHVybnMge1RyYW5zcG9ydH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgLy8gRG8gdG8gYSBidWcgaW4gdGhlIGN1cnJlbnQgSURldmljZXMgYnJvd3Nlciwgd2UgbmVlZCB0byB3cmFwIHRoZSBzZW5kIGluIGEgXG4gIC8vIHNldFRpbWVvdXQsIHdoZW4gdGhleSByZXN1bWUgZnJvbSBzbGVlcGluZyB0aGUgYnJvd3NlciB3aWxsIGNyYXNoIGlmIFxuICAvLyB3ZSBkb24ndCBhbGxvdyB0aGUgYnJvd3NlciB0aW1lIHRvIGRldGVjdCB0aGUgc29ja2V0IGhhcyBiZWVuIGNsb3NlZFxuICBpZiAoaW8udXRpbC51YS5pRGV2aWNlKSB7XG4gICAgV1MucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgIHNlbGYud2Vic29ja2V0LnNlbmQoZGF0YSk7XG4gICAgICB9LDApO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBXUy5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICB0aGlzLndlYnNvY2tldC5zZW5kKGRhdGEpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXlsb2FkXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBXUy5wcm90b3R5cGUucGF5bG9hZCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMucGFja2V0KGFycltpXSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNjb25uZWN0IHRoZSBlc3RhYmxpc2hlZCBgV2ViU29ja2V0YCBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAcmV0dXJucyB7VHJhbnNwb3J0fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBXUy5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy53ZWJzb2NrZXQuY2xvc2UoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogSGFuZGxlIHRoZSBlcnJvcnMgdGhhdCBgV2ViU29ja2V0YCBtaWdodCBiZSBnaXZpbmcgd2hlbiB3ZVxuICAgKiBhcmUgYXR0ZW1wdGluZyB0byBjb25uZWN0IG9yIHNlbmQgbWVzc2FnZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RXJyb3J9IGUgVGhlIGVycm9yLlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgV1MucHJvdG90eXBlLm9uRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuc29ja2V0Lm9uRXJyb3IoZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIGFwcHJvcHJpYXRlIHNjaGVtZSBmb3IgdGhlIFVSSSBnZW5lcmF0aW9uLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIFdTLnByb3RvdHlwZS5zY2hlbWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc29ja2V0Lm9wdGlvbnMuc2VjdXJlID8gJ3dzcycgOiAnd3MnO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGJyb3dzZXIgaGFzIHN1cHBvcnQgZm9yIG5hdGl2ZSBgV2ViU29ja2V0c2AgYW5kIHRoYXRcbiAgICogaXQncyBub3QgdGhlIHBvbHlmaWxsIGNyZWF0ZWQgZm9yIHRoZSBGbGFzaFNvY2tldCB0cmFuc3BvcnQuXG4gICAqXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFdTLmNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAoJ1dlYlNvY2tldCcgaW4gZ2xvYmFsICYmICEoJ19fYWRkVGFzaycgaW4gV2ViU29ja2V0KSlcbiAgICAgICAgICB8fCAnTW96V2ViU29ja2V0JyBpbiBnbG9iYWw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHRoZSBgV2ViU29ja2V0YCB0cmFuc3BvcnQgc3VwcG9ydCBjcm9zcyBkb21haW4gY29tbXVuaWNhdGlvbnMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBXUy54ZG9tYWluQ2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgdHJhbnNwb3J0IHRvIHlvdXIgcHVibGljIGlvLnRyYW5zcG9ydHMgYXJyYXkuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBpby50cmFuc3BvcnRzLnB1c2goJ3dlYnNvY2tldCcpO1xuXG59KShcbiAgICAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpby5UcmFuc3BvcnQgOiBtb2R1bGUuZXhwb3J0c1xuICAsICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLnBhcmVudC5leHBvcnRzXG4gICwgdGhpc1xuKTtcblxuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgaW8pIHtcblxuICAvKipcbiAgICogRXhwb3NlIGNvbnN0cnVjdG9yLlxuICAgKi9cblxuICBleHBvcnRzLmZsYXNoc29ja2V0ID0gRmxhc2hzb2NrZXQ7XG5cbiAgLyoqXG4gICAqIFRoZSBGbGFzaFNvY2tldCB0cmFuc3BvcnQuIFRoaXMgaXMgYSBBUEkgd3JhcHBlciBmb3IgdGhlIEhUTUw1IFdlYlNvY2tldFxuICAgKiBzcGVjaWZpY2F0aW9uLiBJdCB1c2VzIGEgLnN3ZiBmaWxlIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIHNlcnZlci4gSWYgeW91IHdhbnRcbiAgICogdG8gc2VydmUgdGhlIC5zd2YgZmlsZSBmcm9tIGEgb3RoZXIgc2VydmVyIHRoYW4gd2hlcmUgdGhlIFNvY2tldC5JTyBzY3JpcHQgaXNcbiAgICogY29taW5nIGZyb20geW91IG5lZWQgdG8gdXNlIHRoZSBpbnNlY3VyZSB2ZXJzaW9uIG9mIHRoZSAuc3dmLiBNb3JlIGluZm9ybWF0aW9uXG4gICAqIGFib3V0IHRoaXMgY2FuIGJlIGZvdW5kIG9uIHRoZSBnaXRodWIgcGFnZS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBleHRlbmRzIHtpby5UcmFuc3BvcnQud2Vic29ja2V0fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBGbGFzaHNvY2tldCAoKSB7XG4gICAgaW8uVHJhbnNwb3J0LndlYnNvY2tldC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbmhlcml0cyBmcm9tIFRyYW5zcG9ydC5cbiAgICovXG5cbiAgaW8udXRpbC5pbmhlcml0KEZsYXNoc29ja2V0LCBpby5UcmFuc3BvcnQud2Vic29ja2V0KTtcblxuICAvKipcbiAgICogVHJhbnNwb3J0IG5hbWVcbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgRmxhc2hzb2NrZXQucHJvdG90eXBlLm5hbWUgPSAnZmxhc2hzb2NrZXQnO1xuXG4gIC8qKlxuICAgKiBEaXNjb25uZWN0IHRoZSBlc3RhYmxpc2hlZCBgRmxhc2hTb2NrZXRgIGNvbm5lY3Rpb24uIFRoaXMgaXMgZG9uZSBieSBhZGRpbmcgYSBcbiAgICogbmV3IHRhc2sgdG8gdGhlIEZsYXNoU29ja2V0LiBUaGUgcmVzdCB3aWxsIGJlIGhhbmRsZWQgb2ZmIGJ5IHRoZSBgV2ViU29ja2V0YCBcbiAgICogdHJhbnNwb3J0LlxuICAgKlxuICAgKiBAcmV0dXJucyB7VHJhbnNwb3J0fVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBGbGFzaHNvY2tldC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgYXJncyA9IGFyZ3VtZW50cztcblxuICAgIFdlYlNvY2tldC5fX2FkZFRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaW8uVHJhbnNwb3J0LndlYnNvY2tldC5wcm90b3R5cGUub3Blbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcbiAgXG4gIC8qKlxuICAgKiBTZW5kcyBhIG1lc3NhZ2UgdG8gdGhlIFNvY2tldC5JTyBzZXJ2ZXIuIFRoaXMgaXMgZG9uZSBieSBhZGRpbmcgYSBuZXdcbiAgICogdGFzayB0byB0aGUgRmxhc2hTb2NrZXQuIFRoZSByZXN0IHdpbGwgYmUgaGFuZGxlZCBvZmYgYnkgdGhlIGBXZWJTb2NrZXRgIFxuICAgKiB0cmFuc3BvcnQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtUcmFuc3BvcnR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEZsYXNoc29ja2V0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICBXZWJTb2NrZXQuX19hZGRUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlvLlRyYW5zcG9ydC53ZWJzb2NrZXQucHJvdG90eXBlLnNlbmQuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc2Nvbm5lY3RzIHRoZSBlc3RhYmxpc2hlZCBgRmxhc2hTb2NrZXRgIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtUcmFuc3BvcnR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEZsYXNoc29ja2V0LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBXZWJTb2NrZXQuX190YXNrcy5sZW5ndGggPSAwO1xuICAgIGlvLlRyYW5zcG9ydC53ZWJzb2NrZXQucHJvdG90eXBlLmNsb3NlLmNhbGwodGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBXZWJTb2NrZXQgZmFsbCBiYWNrIG5lZWRzIHRvIGFwcGVuZCB0aGUgZmxhc2ggY29udGFpbmVyIHRvIHRoZSBib2R5XG4gICAqIGVsZW1lbnQsIHNvIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHdlIGhhdmUgYWNjZXNzIHRvIGl0LiBPciBkZWZlciB0aGUgY2FsbFxuICAgKiB1bnRpbCB3ZSBhcmUgc3VyZSB0aGVyZSBpcyBhIGJvZHkgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtTb2NrZXR9IHNvY2tldCBUaGUgc29ja2V0IGluc3RhbmNlIHRoYXQgbmVlZHMgYSB0cmFuc3BvcnRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGNhbGxiYWNrXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBGbGFzaHNvY2tldC5wcm90b3R5cGUucmVhZHkgPSBmdW5jdGlvbiAoc29ja2V0LCBmbikge1xuICAgIGZ1bmN0aW9uIGluaXQgKCkge1xuICAgICAgdmFyIG9wdGlvbnMgPSBzb2NrZXQub3B0aW9uc1xuICAgICAgICAsIHBvcnQgPSBvcHRpb25zWydmbGFzaCBwb2xpY3kgcG9ydCddXG4gICAgICAgICwgcGF0aCA9IFtcbiAgICAgICAgICAgICAgJ2h0dHAnICsgKG9wdGlvbnMuc2VjdXJlID8gJ3MnIDogJycpICsgJzovJ1xuICAgICAgICAgICAgLCBvcHRpb25zLmhvc3QgKyAnOicgKyBvcHRpb25zLnBvcnRcbiAgICAgICAgICAgICwgb3B0aW9ucy5yZXNvdXJjZVxuICAgICAgICAgICAgLCAnc3RhdGljL2ZsYXNoc29ja2V0J1xuICAgICAgICAgICAgLCAnV2ViU29ja2V0TWFpbicgKyAoc29ja2V0LmlzWERvbWFpbigpID8gJ0luc2VjdXJlJyA6ICcnKSArICcuc3dmJ1xuICAgICAgICAgIF07XG5cbiAgICAgIC8vIE9ubHkgc3RhcnQgZG93bmxvYWRpbmcgdGhlIHN3ZiBmaWxlIHdoZW4gdGhlIGNoZWNrZWQgdGhhdCB0aGlzIGJyb3dzZXJcbiAgICAgIC8vIGFjdHVhbGx5IHN1cHBvcnRzIGl0XG4gICAgICBpZiAoIUZsYXNoc29ja2V0LmxvYWRlZCkge1xuICAgICAgICBpZiAodHlwZW9mIFdFQl9TT0NLRVRfU1dGX0xPQ0FUSU9OID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIC8vIFNldCB0aGUgY29ycmVjdCBmaWxlIGJhc2VkIG9uIHRoZSBYRG9tYWluIHNldHRpbmdzXG4gICAgICAgICAgV0VCX1NPQ0tFVF9TV0ZfTE9DQVRJT04gPSBwYXRoLmpvaW4oJy8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3J0ICE9PSA4NDMpIHtcbiAgICAgICAgICBXZWJTb2NrZXQubG9hZEZsYXNoUG9saWN5RmlsZSgneG1sc29ja2V0Oi8vJyArIG9wdGlvbnMuaG9zdCArICc6JyArIHBvcnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgV2ViU29ja2V0Ll9faW5pdGlhbGl6ZSgpO1xuICAgICAgICBGbGFzaHNvY2tldC5sb2FkZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBmbi5jYWxsKHNlbGYpO1xuICAgIH1cblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoZG9jdW1lbnQuYm9keSkgcmV0dXJuIGluaXQoKTtcblxuICAgIGlvLnV0aWwubG9hZChpbml0KTtcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2sgaWYgdGhlIEZsYXNoU29ja2V0IHRyYW5zcG9ydCBpcyBzdXBwb3J0ZWQgYXMgaXQgcmVxdWlyZXMgdGhhdCB0aGUgQWRvYmVcbiAgICogRmxhc2ggUGxheWVyIHBsdWctaW4gdmVyc2lvbiBgMTAuMC4wYCBvciBncmVhdGVyIGlzIGluc3RhbGxlZC4gQW5kIGFsc28gY2hlY2sgaWZcbiAgICogdGhlIHBvbHlmaWxsIGlzIGNvcnJlY3RseSBsb2FkZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBGbGFzaHNvY2tldC5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBXZWJTb2NrZXQgPT0gJ3VuZGVmaW5lZCdcbiAgICAgIHx8ICEoJ19faW5pdGlhbGl6ZScgaW4gV2ViU29ja2V0KSB8fCAhc3dmb2JqZWN0XG4gICAgKSByZXR1cm4gZmFsc2U7XG5cbiAgICByZXR1cm4gc3dmb2JqZWN0LmdldEZsYXNoUGxheWVyVmVyc2lvbigpLm1ham9yID49IDEwO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGUgRmxhc2hTb2NrZXQgdHJhbnNwb3J0IGNhbiBiZSB1c2VkIGFzIGNyb3NzIGRvbWFpbiAvIGNyb3NzIG9yaWdpbiBcbiAgICogdHJhbnNwb3J0LiBCZWNhdXNlIHdlIGNhbid0IHNlZSB3aGljaCB0eXBlIChzZWN1cmUgb3IgaW5zZWN1cmUpIG9mIC5zd2YgaXMgdXNlZFxuICAgKiB3ZSB3aWxsIGp1c3QgcmV0dXJuIHRydWUuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBGbGFzaHNvY2tldC54ZG9tYWluQ2hlY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc2FibGUgQVVUT19JTklUSUFMSVpBVElPTlxuICAgKi9cblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJykge1xuICAgIFdFQl9TT0NLRVRfRElTQUJMRV9BVVRPX0lOSVRJQUxJWkFUSU9OID0gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIHRyYW5zcG9ydCB0byB5b3VyIHB1YmxpYyBpby50cmFuc3BvcnRzIGFycmF5LlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgaW8udHJhbnNwb3J0cy5wdXNoKCdmbGFzaHNvY2tldCcpO1xufSkoXG4gICAgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8uVHJhbnNwb3J0IDogbW9kdWxlLmV4cG9ydHNcbiAgLCAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5wYXJlbnQuZXhwb3J0c1xuKTtcbi8qXHRTV0ZPYmplY3QgdjIuMiA8aHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3N3Zm9iamVjdC8+IFxuXHRpcyByZWxlYXNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UgPGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwPiBcbiovXG5pZiAoJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIHdpbmRvdykge1xudmFyIHN3Zm9iamVjdD1mdW5jdGlvbigpe3ZhciBEPVwidW5kZWZpbmVkXCIscj1cIm9iamVjdFwiLFM9XCJTaG9ja3dhdmUgRmxhc2hcIixXPVwiU2hvY2t3YXZlRmxhc2guU2hvY2t3YXZlRmxhc2hcIixxPVwiYXBwbGljYXRpb24veC1zaG9ja3dhdmUtZmxhc2hcIixSPVwiU1dGT2JqZWN0RXhwckluc3RcIix4PVwib25yZWFkeXN0YXRlY2hhbmdlXCIsTz13aW5kb3csaj1kb2N1bWVudCx0PW5hdmlnYXRvcixUPWZhbHNlLFU9W2hdLG89W10sTj1bXSxJPVtdLGwsUSxFLEIsSj1mYWxzZSxhPWZhbHNlLG4sRyxtPXRydWUsTT1mdW5jdGlvbigpe3ZhciBhYT10eXBlb2Ygai5nZXRFbGVtZW50QnlJZCE9RCYmdHlwZW9mIGouZ2V0RWxlbWVudHNCeVRhZ05hbWUhPUQmJnR5cGVvZiBqLmNyZWF0ZUVsZW1lbnQhPUQsYWg9dC51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxZPXQucGxhdGZvcm0udG9Mb3dlckNhc2UoKSxhZT1ZPy93aW4vLnRlc3QoWSk6L3dpbi8udGVzdChhaCksYWM9WT8vbWFjLy50ZXN0KFkpOi9tYWMvLnRlc3QoYWgpLGFmPS93ZWJraXQvLnRlc3QoYWgpP3BhcnNlRmxvYXQoYWgucmVwbGFjZSgvXi4qd2Via2l0XFwvKFxcZCsoXFwuXFxkKyk/KS4qJC8sXCIkMVwiKSk6ZmFsc2UsWD0hK1wiXFx2MVwiLGFnPVswLDAsMF0sYWI9bnVsbDtpZih0eXBlb2YgdC5wbHVnaW5zIT1EJiZ0eXBlb2YgdC5wbHVnaW5zW1NdPT1yKXthYj10LnBsdWdpbnNbU10uZGVzY3JpcHRpb247aWYoYWImJiEodHlwZW9mIHQubWltZVR5cGVzIT1EJiZ0Lm1pbWVUeXBlc1txXSYmIXQubWltZVR5cGVzW3FdLmVuYWJsZWRQbHVnaW4pKXtUPXRydWU7WD1mYWxzZTthYj1hYi5yZXBsYWNlKC9eLipcXHMrKFxcUytcXHMrXFxTKyQpLyxcIiQxXCIpO2FnWzBdPXBhcnNlSW50KGFiLnJlcGxhY2UoL14oLiopXFwuLiokLyxcIiQxXCIpLDEwKTthZ1sxXT1wYXJzZUludChhYi5yZXBsYWNlKC9eLipcXC4oLiopXFxzLiokLyxcIiQxXCIpLDEwKTthZ1syXT0vW2EtekEtWl0vLnRlc3QoYWIpP3BhcnNlSW50KGFiLnJlcGxhY2UoL14uKlthLXpBLVpdKyguKikkLyxcIiQxXCIpLDEwKTowfX1lbHNle2lmKHR5cGVvZiBPWyhbJ0FjdGl2ZSddLmNvbmNhdCgnT2JqZWN0Jykuam9pbignWCcpKV0hPUQpe3RyeXt2YXIgYWQ9bmV3IHdpbmRvd1soWydBY3RpdmUnXS5jb25jYXQoJ09iamVjdCcpLmpvaW4oJ1gnKSldKFcpO2lmKGFkKXthYj1hZC5HZXRWYXJpYWJsZShcIiR2ZXJzaW9uXCIpO2lmKGFiKXtYPXRydWU7YWI9YWIuc3BsaXQoXCIgXCIpWzFdLnNwbGl0KFwiLFwiKTthZz1bcGFyc2VJbnQoYWJbMF0sMTApLHBhcnNlSW50KGFiWzFdLDEwKSxwYXJzZUludChhYlsyXSwxMCldfX19Y2F0Y2goWil7fX19cmV0dXJue3czOmFhLHB2OmFnLHdrOmFmLGllOlgsd2luOmFlLG1hYzphY319KCksaz1mdW5jdGlvbigpe2lmKCFNLnczKXtyZXR1cm59aWYoKHR5cGVvZiBqLnJlYWR5U3RhdGUhPUQmJmoucmVhZHlTdGF0ZT09XCJjb21wbGV0ZVwiKXx8KHR5cGVvZiBqLnJlYWR5U3RhdGU9PUQmJihqLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXXx8ai5ib2R5KSkpe2YoKX1pZighSil7aWYodHlwZW9mIGouYWRkRXZlbnRMaXN0ZW5lciE9RCl7ai5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLGYsZmFsc2UpfWlmKE0uaWUmJk0ud2luKXtqLmF0dGFjaEV2ZW50KHgsZnVuY3Rpb24oKXtpZihqLnJlYWR5U3RhdGU9PVwiY29tcGxldGVcIil7ai5kZXRhY2hFdmVudCh4LGFyZ3VtZW50cy5jYWxsZWUpO2YoKX19KTtpZihPPT10b3ApeyhmdW5jdGlvbigpe2lmKEope3JldHVybn10cnl7ai5kb2N1bWVudEVsZW1lbnQuZG9TY3JvbGwoXCJsZWZ0XCIpfWNhdGNoKFgpe3NldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwwKTtyZXR1cm59ZigpfSkoKX19aWYoTS53ayl7KGZ1bmN0aW9uKCl7aWYoSil7cmV0dXJufWlmKCEvbG9hZGVkfGNvbXBsZXRlLy50ZXN0KGoucmVhZHlTdGF0ZSkpe3NldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwwKTtyZXR1cm59ZigpfSkoKX1zKGYpfX0oKTtmdW5jdGlvbiBmKCl7aWYoSil7cmV0dXJufXRyeXt2YXIgWj1qLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXS5hcHBlbmRDaGlsZChDKFwic3BhblwiKSk7Wi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKFopfWNhdGNoKGFhKXtyZXR1cm59Sj10cnVlO3ZhciBYPVUubGVuZ3RoO2Zvcih2YXIgWT0wO1k8WDtZKyspe1VbWV0oKX19ZnVuY3Rpb24gSyhYKXtpZihKKXtYKCl9ZWxzZXtVW1UubGVuZ3RoXT1YfX1mdW5jdGlvbiBzKFkpe2lmKHR5cGVvZiBPLmFkZEV2ZW50TGlzdGVuZXIhPUQpe08uYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIixZLGZhbHNlKX1lbHNle2lmKHR5cGVvZiBqLmFkZEV2ZW50TGlzdGVuZXIhPUQpe2ouYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIixZLGZhbHNlKX1lbHNle2lmKHR5cGVvZiBPLmF0dGFjaEV2ZW50IT1EKXtpKE8sXCJvbmxvYWRcIixZKX1lbHNle2lmKHR5cGVvZiBPLm9ubG9hZD09XCJmdW5jdGlvblwiKXt2YXIgWD1PLm9ubG9hZDtPLm9ubG9hZD1mdW5jdGlvbigpe1goKTtZKCl9fWVsc2V7Ty5vbmxvYWQ9WX19fX19ZnVuY3Rpb24gaCgpe2lmKFQpe1YoKX1lbHNle0goKX19ZnVuY3Rpb24gVigpe3ZhciBYPWouZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJib2R5XCIpWzBdO3ZhciBhYT1DKHIpO2FhLnNldEF0dHJpYnV0ZShcInR5cGVcIixxKTt2YXIgWj1YLmFwcGVuZENoaWxkKGFhKTtpZihaKXt2YXIgWT0wOyhmdW5jdGlvbigpe2lmKHR5cGVvZiBaLkdldFZhcmlhYmxlIT1EKXt2YXIgYWI9Wi5HZXRWYXJpYWJsZShcIiR2ZXJzaW9uXCIpO2lmKGFiKXthYj1hYi5zcGxpdChcIiBcIilbMV0uc3BsaXQoXCIsXCIpO00ucHY9W3BhcnNlSW50KGFiWzBdLDEwKSxwYXJzZUludChhYlsxXSwxMCkscGFyc2VJbnQoYWJbMl0sMTApXX19ZWxzZXtpZihZPDEwKXtZKys7c2V0VGltZW91dChhcmd1bWVudHMuY2FsbGVlLDEwKTtyZXR1cm59fVgucmVtb3ZlQ2hpbGQoYWEpO1o9bnVsbDtIKCl9KSgpfWVsc2V7SCgpfX1mdW5jdGlvbiBIKCl7dmFyIGFnPW8ubGVuZ3RoO2lmKGFnPjApe2Zvcih2YXIgYWY9MDthZjxhZzthZisrKXt2YXIgWT1vW2FmXS5pZDt2YXIgYWI9b1thZl0uY2FsbGJhY2tGbjt2YXIgYWE9e3N1Y2Nlc3M6ZmFsc2UsaWQ6WX07aWYoTS5wdlswXT4wKXt2YXIgYWU9YyhZKTtpZihhZSl7aWYoRihvW2FmXS5zd2ZWZXJzaW9uKSYmIShNLndrJiZNLndrPDMxMikpe3coWSx0cnVlKTtpZihhYil7YWEuc3VjY2Vzcz10cnVlO2FhLnJlZj16KFkpO2FiKGFhKX19ZWxzZXtpZihvW2FmXS5leHByZXNzSW5zdGFsbCYmQSgpKXt2YXIgYWk9e307YWkuZGF0YT1vW2FmXS5leHByZXNzSW5zdGFsbDthaS53aWR0aD1hZS5nZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiKXx8XCIwXCI7YWkuaGVpZ2h0PWFlLmdldEF0dHJpYnV0ZShcImhlaWdodFwiKXx8XCIwXCI7aWYoYWUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikpe2FpLnN0eWxlY2xhc3M9YWUuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIil9aWYoYWUuZ2V0QXR0cmlidXRlKFwiYWxpZ25cIikpe2FpLmFsaWduPWFlLmdldEF0dHJpYnV0ZShcImFsaWduXCIpfXZhciBhaD17fTt2YXIgWD1hZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInBhcmFtXCIpO3ZhciBhYz1YLmxlbmd0aDtmb3IodmFyIGFkPTA7YWQ8YWM7YWQrKyl7aWYoWFthZF0uZ2V0QXR0cmlidXRlKFwibmFtZVwiKS50b0xvd2VyQ2FzZSgpIT1cIm1vdmllXCIpe2FoW1hbYWRdLmdldEF0dHJpYnV0ZShcIm5hbWVcIildPVhbYWRdLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpfX1QKGFpLGFoLFksYWIpfWVsc2V7cChhZSk7aWYoYWIpe2FiKGFhKX19fX19ZWxzZXt3KFksdHJ1ZSk7aWYoYWIpe3ZhciBaPXooWSk7aWYoWiYmdHlwZW9mIFouU2V0VmFyaWFibGUhPUQpe2FhLnN1Y2Nlc3M9dHJ1ZTthYS5yZWY9Wn1hYihhYSl9fX19fWZ1bmN0aW9uIHooYWEpe3ZhciBYPW51bGw7dmFyIFk9YyhhYSk7aWYoWSYmWS5ub2RlTmFtZT09XCJPQkpFQ1RcIil7aWYodHlwZW9mIFkuU2V0VmFyaWFibGUhPUQpe1g9WX1lbHNle3ZhciBaPVkuZ2V0RWxlbWVudHNCeVRhZ05hbWUocilbMF07aWYoWil7WD1afX19cmV0dXJuIFh9ZnVuY3Rpb24gQSgpe3JldHVybiAhYSYmRihcIjYuMC42NVwiKSYmKE0ud2lufHxNLm1hYykmJiEoTS53ayYmTS53azwzMTIpfWZ1bmN0aW9uIFAoYWEsYWIsWCxaKXthPXRydWU7RT1afHxudWxsO0I9e3N1Y2Nlc3M6ZmFsc2UsaWQ6WH07dmFyIGFlPWMoWCk7aWYoYWUpe2lmKGFlLm5vZGVOYW1lPT1cIk9CSkVDVFwiKXtsPWcoYWUpO1E9bnVsbH1lbHNle2w9YWU7UT1YfWFhLmlkPVI7aWYodHlwZW9mIGFhLndpZHRoPT1EfHwoIS8lJC8udGVzdChhYS53aWR0aCkmJnBhcnNlSW50KGFhLndpZHRoLDEwKTwzMTApKXthYS53aWR0aD1cIjMxMFwifWlmKHR5cGVvZiBhYS5oZWlnaHQ9PUR8fCghLyUkLy50ZXN0KGFhLmhlaWdodCkmJnBhcnNlSW50KGFhLmhlaWdodCwxMCk8MTM3KSl7YWEuaGVpZ2h0PVwiMTM3XCJ9ai50aXRsZT1qLnRpdGxlLnNsaWNlKDAsNDcpK1wiIC0gRmxhc2ggUGxheWVyIEluc3RhbGxhdGlvblwiO3ZhciBhZD1NLmllJiZNLndpbj8oWydBY3RpdmUnXS5jb25jYXQoJycpLmpvaW4oJ1gnKSk6XCJQbHVnSW5cIixhYz1cIk1NcmVkaXJlY3RVUkw9XCIrTy5sb2NhdGlvbi50b1N0cmluZygpLnJlcGxhY2UoLyYvZyxcIiUyNlwiKStcIiZNTXBsYXllclR5cGU9XCIrYWQrXCImTU1kb2N0aXRsZT1cIitqLnRpdGxlO2lmKHR5cGVvZiBhYi5mbGFzaHZhcnMhPUQpe2FiLmZsYXNodmFycys9XCImXCIrYWN9ZWxzZXthYi5mbGFzaHZhcnM9YWN9aWYoTS5pZSYmTS53aW4mJmFlLnJlYWR5U3RhdGUhPTQpe3ZhciBZPUMoXCJkaXZcIik7WCs9XCJTV0ZPYmplY3ROZXdcIjtZLnNldEF0dHJpYnV0ZShcImlkXCIsWCk7YWUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoWSxhZSk7YWUuc3R5bGUuZGlzcGxheT1cIm5vbmVcIjsoZnVuY3Rpb24oKXtpZihhZS5yZWFkeVN0YXRlPT00KXthZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGFlKX1lbHNle3NldFRpbWVvdXQoYXJndW1lbnRzLmNhbGxlZSwxMCl9fSkoKX11KGFhLGFiLFgpfX1mdW5jdGlvbiBwKFkpe2lmKE0uaWUmJk0ud2luJiZZLnJlYWR5U3RhdGUhPTQpe3ZhciBYPUMoXCJkaXZcIik7WS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShYLFkpO1gucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoZyhZKSxYKTtZLnN0eWxlLmRpc3BsYXk9XCJub25lXCI7KGZ1bmN0aW9uKCl7aWYoWS5yZWFkeVN0YXRlPT00KXtZLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoWSl9ZWxzZXtzZXRUaW1lb3V0KGFyZ3VtZW50cy5jYWxsZWUsMTApfX0pKCl9ZWxzZXtZLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGcoWSksWSl9fWZ1bmN0aW9uIGcoYWIpe3ZhciBhYT1DKFwiZGl2XCIpO2lmKE0ud2luJiZNLmllKXthYS5pbm5lckhUTUw9YWIuaW5uZXJIVE1MfWVsc2V7dmFyIFk9YWIuZ2V0RWxlbWVudHNCeVRhZ05hbWUocilbMF07aWYoWSl7dmFyIGFkPVkuY2hpbGROb2RlcztpZihhZCl7dmFyIFg9YWQubGVuZ3RoO2Zvcih2YXIgWj0wO1o8WDtaKyspe2lmKCEoYWRbWl0ubm9kZVR5cGU9PTEmJmFkW1pdLm5vZGVOYW1lPT1cIlBBUkFNXCIpJiYhKGFkW1pdLm5vZGVUeXBlPT04KSl7YWEuYXBwZW5kQ2hpbGQoYWRbWl0uY2xvbmVOb2RlKHRydWUpKX19fX19cmV0dXJuIGFhfWZ1bmN0aW9uIHUoYWksYWcsWSl7dmFyIFgsYWE9YyhZKTtpZihNLndrJiZNLndrPDMxMil7cmV0dXJuIFh9aWYoYWEpe2lmKHR5cGVvZiBhaS5pZD09RCl7YWkuaWQ9WX1pZihNLmllJiZNLndpbil7dmFyIGFoPVwiXCI7Zm9yKHZhciBhZSBpbiBhaSl7aWYoYWlbYWVdIT1PYmplY3QucHJvdG90eXBlW2FlXSl7aWYoYWUudG9Mb3dlckNhc2UoKT09XCJkYXRhXCIpe2FnLm1vdmllPWFpW2FlXX1lbHNle2lmKGFlLnRvTG93ZXJDYXNlKCk9PVwic3R5bGVjbGFzc1wiKXthaCs9JyBjbGFzcz1cIicrYWlbYWVdKydcIid9ZWxzZXtpZihhZS50b0xvd2VyQ2FzZSgpIT1cImNsYXNzaWRcIil7YWgrPVwiIFwiK2FlKyc9XCInK2FpW2FlXSsnXCInfX19fX12YXIgYWY9XCJcIjtmb3IodmFyIGFkIGluIGFnKXtpZihhZ1thZF0hPU9iamVjdC5wcm90b3R5cGVbYWRdKXthZis9JzxwYXJhbSBuYW1lPVwiJythZCsnXCIgdmFsdWU9XCInK2FnW2FkXSsnXCIgLz4nfX1hYS5vdXRlckhUTUw9JzxvYmplY3QgY2xhc3NpZD1cImNsc2lkOkQyN0NEQjZFLUFFNkQtMTFjZi05NkI4LTQ0NDU1MzU0MDAwMFwiJythaCtcIj5cIithZitcIjwvb2JqZWN0PlwiO05bTi5sZW5ndGhdPWFpLmlkO1g9YyhhaS5pZCl9ZWxzZXt2YXIgWj1DKHIpO1ouc2V0QXR0cmlidXRlKFwidHlwZVwiLHEpO2Zvcih2YXIgYWMgaW4gYWkpe2lmKGFpW2FjXSE9T2JqZWN0LnByb3RvdHlwZVthY10pe2lmKGFjLnRvTG93ZXJDYXNlKCk9PVwic3R5bGVjbGFzc1wiKXtaLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsYWlbYWNdKX1lbHNle2lmKGFjLnRvTG93ZXJDYXNlKCkhPVwiY2xhc3NpZFwiKXtaLnNldEF0dHJpYnV0ZShhYyxhaVthY10pfX19fWZvcih2YXIgYWIgaW4gYWcpe2lmKGFnW2FiXSE9T2JqZWN0LnByb3RvdHlwZVthYl0mJmFiLnRvTG93ZXJDYXNlKCkhPVwibW92aWVcIil7ZShaLGFiLGFnW2FiXSl9fWFhLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKFosYWEpO1g9Wn19cmV0dXJuIFh9ZnVuY3Rpb24gZShaLFgsWSl7dmFyIGFhPUMoXCJwYXJhbVwiKTthYS5zZXRBdHRyaWJ1dGUoXCJuYW1lXCIsWCk7YWEuc2V0QXR0cmlidXRlKFwidmFsdWVcIixZKTtaLmFwcGVuZENoaWxkKGFhKX1mdW5jdGlvbiB5KFkpe3ZhciBYPWMoWSk7aWYoWCYmWC5ub2RlTmFtZT09XCJPQkpFQ1RcIil7aWYoTS5pZSYmTS53aW4pe1guc3R5bGUuZGlzcGxheT1cIm5vbmVcIjsoZnVuY3Rpb24oKXtpZihYLnJlYWR5U3RhdGU9PTQpe2IoWSl9ZWxzZXtzZXRUaW1lb3V0KGFyZ3VtZW50cy5jYWxsZWUsMTApfX0pKCl9ZWxzZXtYLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoWCl9fX1mdW5jdGlvbiBiKFope3ZhciBZPWMoWik7aWYoWSl7Zm9yKHZhciBYIGluIFkpe2lmKHR5cGVvZiBZW1hdPT1cImZ1bmN0aW9uXCIpe1lbWF09bnVsbH19WS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKFkpfX1mdW5jdGlvbiBjKFope3ZhciBYPW51bGw7dHJ5e1g9ai5nZXRFbGVtZW50QnlJZChaKX1jYXRjaChZKXt9cmV0dXJuIFh9ZnVuY3Rpb24gQyhYKXtyZXR1cm4gai5jcmVhdGVFbGVtZW50KFgpfWZ1bmN0aW9uIGkoWixYLFkpe1ouYXR0YWNoRXZlbnQoWCxZKTtJW0kubGVuZ3RoXT1bWixYLFldfWZ1bmN0aW9uIEYoWil7dmFyIFk9TS5wdixYPVouc3BsaXQoXCIuXCIpO1hbMF09cGFyc2VJbnQoWFswXSwxMCk7WFsxXT1wYXJzZUludChYWzFdLDEwKXx8MDtYWzJdPXBhcnNlSW50KFhbMl0sMTApfHwwO3JldHVybihZWzBdPlhbMF18fChZWzBdPT1YWzBdJiZZWzFdPlhbMV0pfHwoWVswXT09WFswXSYmWVsxXT09WFsxXSYmWVsyXT49WFsyXSkpP3RydWU6ZmFsc2V9ZnVuY3Rpb24gdihhYyxZLGFkLGFiKXtpZihNLmllJiZNLm1hYyl7cmV0dXJufXZhciBhYT1qLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXTtpZighYWEpe3JldHVybn12YXIgWD0oYWQmJnR5cGVvZiBhZD09XCJzdHJpbmdcIik/YWQ6XCJzY3JlZW5cIjtpZihhYil7bj1udWxsO0c9bnVsbH1pZighbnx8RyE9WCl7dmFyIFo9QyhcInN0eWxlXCIpO1ouc2V0QXR0cmlidXRlKFwidHlwZVwiLFwidGV4dC9jc3NcIik7Wi5zZXRBdHRyaWJ1dGUoXCJtZWRpYVwiLFgpO249YWEuYXBwZW5kQ2hpbGQoWik7aWYoTS5pZSYmTS53aW4mJnR5cGVvZiBqLnN0eWxlU2hlZXRzIT1EJiZqLnN0eWxlU2hlZXRzLmxlbmd0aD4wKXtuPWouc3R5bGVTaGVldHNbai5zdHlsZVNoZWV0cy5sZW5ndGgtMV19Rz1YfWlmKE0uaWUmJk0ud2luKXtpZihuJiZ0eXBlb2Ygbi5hZGRSdWxlPT1yKXtuLmFkZFJ1bGUoYWMsWSl9fWVsc2V7aWYobiYmdHlwZW9mIGouY3JlYXRlVGV4dE5vZGUhPUQpe24uYXBwZW5kQ2hpbGQoai5jcmVhdGVUZXh0Tm9kZShhYytcIiB7XCIrWStcIn1cIikpfX19ZnVuY3Rpb24gdyhaLFgpe2lmKCFtKXtyZXR1cm59dmFyIFk9WD9cInZpc2libGVcIjpcImhpZGRlblwiO2lmKEomJmMoWikpe2MoWikuc3R5bGUudmlzaWJpbGl0eT1ZfWVsc2V7dihcIiNcIitaLFwidmlzaWJpbGl0eTpcIitZKX19ZnVuY3Rpb24gTChZKXt2YXIgWj0vW1xcXFxcXFwiPD5cXC47XS87dmFyIFg9Wi5leGVjKFkpIT1udWxsO3JldHVybiBYJiZ0eXBlb2YgZW5jb2RlVVJJQ29tcG9uZW50IT1EP2VuY29kZVVSSUNvbXBvbmVudChZKTpZfXZhciBkPWZ1bmN0aW9uKCl7aWYoTS5pZSYmTS53aW4pe3dpbmRvdy5hdHRhY2hFdmVudChcIm9udW5sb2FkXCIsZnVuY3Rpb24oKXt2YXIgYWM9SS5sZW5ndGg7Zm9yKHZhciBhYj0wO2FiPGFjO2FiKyspe0lbYWJdWzBdLmRldGFjaEV2ZW50KElbYWJdWzFdLElbYWJdWzJdKX12YXIgWj1OLmxlbmd0aDtmb3IodmFyIGFhPTA7YWE8WjthYSsrKXt5KE5bYWFdKX1mb3IodmFyIFkgaW4gTSl7TVtZXT1udWxsfU09bnVsbDtmb3IodmFyIFggaW4gc3dmb2JqZWN0KXtzd2ZvYmplY3RbWF09bnVsbH1zd2ZvYmplY3Q9bnVsbH0pfX0oKTtyZXR1cm57cmVnaXN0ZXJPYmplY3Q6ZnVuY3Rpb24oYWIsWCxhYSxaKXtpZihNLnczJiZhYiYmWCl7dmFyIFk9e307WS5pZD1hYjtZLnN3ZlZlcnNpb249WDtZLmV4cHJlc3NJbnN0YWxsPWFhO1kuY2FsbGJhY2tGbj1aO29bby5sZW5ndGhdPVk7dyhhYixmYWxzZSl9ZWxzZXtpZihaKXtaKHtzdWNjZXNzOmZhbHNlLGlkOmFifSl9fX0sZ2V0T2JqZWN0QnlJZDpmdW5jdGlvbihYKXtpZihNLnczKXtyZXR1cm4geihYKX19LGVtYmVkU1dGOmZ1bmN0aW9uKGFiLGFoLGFlLGFnLFksYWEsWixhZCxhZixhYyl7dmFyIFg9e3N1Y2Nlc3M6ZmFsc2UsaWQ6YWh9O2lmKE0udzMmJiEoTS53ayYmTS53azwzMTIpJiZhYiYmYWgmJmFlJiZhZyYmWSl7dyhhaCxmYWxzZSk7SyhmdW5jdGlvbigpe2FlKz1cIlwiO2FnKz1cIlwiO3ZhciBhaj17fTtpZihhZiYmdHlwZW9mIGFmPT09cil7Zm9yKHZhciBhbCBpbiBhZil7YWpbYWxdPWFmW2FsXX19YWouZGF0YT1hYjthai53aWR0aD1hZTthai5oZWlnaHQ9YWc7dmFyIGFtPXt9O2lmKGFkJiZ0eXBlb2YgYWQ9PT1yKXtmb3IodmFyIGFrIGluIGFkKXthbVtha109YWRbYWtdfX1pZihaJiZ0eXBlb2YgWj09PXIpe2Zvcih2YXIgYWkgaW4gWil7aWYodHlwZW9mIGFtLmZsYXNodmFycyE9RCl7YW0uZmxhc2h2YXJzKz1cIiZcIithaStcIj1cIitaW2FpXX1lbHNle2FtLmZsYXNodmFycz1haStcIj1cIitaW2FpXX19fWlmKEYoWSkpe3ZhciBhbj11KGFqLGFtLGFoKTtpZihhai5pZD09YWgpe3coYWgsdHJ1ZSl9WC5zdWNjZXNzPXRydWU7WC5yZWY9YW59ZWxzZXtpZihhYSYmQSgpKXthai5kYXRhPWFhO1AoYWosYW0sYWgsYWMpO3JldHVybn1lbHNle3coYWgsdHJ1ZSl9fWlmKGFjKXthYyhYKX19KX1lbHNle2lmKGFjKXthYyhYKX19fSxzd2l0Y2hPZmZBdXRvSGlkZVNob3c6ZnVuY3Rpb24oKXttPWZhbHNlfSx1YTpNLGdldEZsYXNoUGxheWVyVmVyc2lvbjpmdW5jdGlvbigpe3JldHVybnttYWpvcjpNLnB2WzBdLG1pbm9yOk0ucHZbMV0scmVsZWFzZTpNLnB2WzJdfX0saGFzRmxhc2hQbGF5ZXJWZXJzaW9uOkYsY3JlYXRlU1dGOmZ1bmN0aW9uKFosWSxYKXtpZihNLnczKXtyZXR1cm4gdShaLFksWCl9ZWxzZXtyZXR1cm4gdW5kZWZpbmVkfX0sc2hvd0V4cHJlc3NJbnN0YWxsOmZ1bmN0aW9uKFosYWEsWCxZKXtpZihNLnczJiZBKCkpe1AoWixhYSxYLFkpfX0scmVtb3ZlU1dGOmZ1bmN0aW9uKFgpe2lmKE0udzMpe3koWCl9fSxjcmVhdGVDU1M6ZnVuY3Rpb24oYWEsWixZLFgpe2lmKE0udzMpe3YoYWEsWixZLFgpfX0sYWRkRG9tTG9hZEV2ZW50OkssYWRkTG9hZEV2ZW50OnMsZ2V0UXVlcnlQYXJhbVZhbHVlOmZ1bmN0aW9uKGFhKXt2YXIgWj1qLmxvY2F0aW9uLnNlYXJjaHx8ai5sb2NhdGlvbi5oYXNoO2lmKFope2lmKC9cXD8vLnRlc3QoWikpe1o9Wi5zcGxpdChcIj9cIilbMV19aWYoYWE9PW51bGwpe3JldHVybiBMKFopfXZhciBZPVouc3BsaXQoXCImXCIpO2Zvcih2YXIgWD0wO1g8WS5sZW5ndGg7WCsrKXtpZihZW1hdLnN1YnN0cmluZygwLFlbWF0uaW5kZXhPZihcIj1cIikpPT1hYSl7cmV0dXJuIEwoWVtYXS5zdWJzdHJpbmcoKFlbWF0uaW5kZXhPZihcIj1cIikrMSkpKX19fXJldHVyblwiXCJ9LGV4cHJlc3NJbnN0YWxsQ2FsbGJhY2s6ZnVuY3Rpb24oKXtpZihhKXt2YXIgWD1jKFIpO2lmKFgmJmwpe1gucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobCxYKTtpZihRKXt3KFEsdHJ1ZSk7aWYoTS5pZSYmTS53aW4pe2wuc3R5bGUuZGlzcGxheT1cImJsb2NrXCJ9fWlmKEUpe0UoQil9fWE9ZmFsc2V9fX19KCk7XG59XG4vLyBDb3B5cmlnaHQ6IEhpcm9zaGkgSWNoaWthd2EgPGh0dHA6Ly9naW1pdGUubmV0L2VuLz5cbi8vIExpY2Vuc2U6IE5ldyBCU0QgTGljZW5zZVxuLy8gUmVmZXJlbmNlOiBodHRwOi8vZGV2LnczLm9yZy9odG1sNS93ZWJzb2NrZXRzL1xuLy8gUmVmZXJlbmNlOiBodHRwOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9kcmFmdC1oaXhpZS10aGV3ZWJzb2NrZXRwcm90b2NvbFxuXG4oZnVuY3Rpb24oKSB7XG4gIFxuICBpZiAoJ3VuZGVmaW5lZCcgPT0gdHlwZW9mIHdpbmRvdyB8fCB3aW5kb3cuV2ViU29ja2V0KSByZXR1cm47XG5cbiAgdmFyIGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZTtcbiAgaWYgKCFjb25zb2xlIHx8ICFjb25zb2xlLmxvZyB8fCAhY29uc29sZS5lcnJvcikge1xuICAgIGNvbnNvbGUgPSB7bG9nOiBmdW5jdGlvbigpeyB9LCBlcnJvcjogZnVuY3Rpb24oKXsgfX07XG4gIH1cbiAgXG4gIGlmICghc3dmb2JqZWN0Lmhhc0ZsYXNoUGxheWVyVmVyc2lvbihcIjEwLjAuMFwiKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGbGFzaCBQbGF5ZXIgPj0gMTAuMC4wIGlzIHJlcXVpcmVkLlwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGxvY2F0aW9uLnByb3RvY29sID09IFwiZmlsZTpcIikge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICBcIldBUk5JTkc6IHdlYi1zb2NrZXQtanMgZG9lc24ndCB3b3JrIGluIGZpbGU6Ly8vLi4uIFVSTCBcIiArXG4gICAgICBcInVubGVzcyB5b3Ugc2V0IEZsYXNoIFNlY3VyaXR5IFNldHRpbmdzIHByb3Blcmx5LiBcIiArXG4gICAgICBcIk9wZW4gdGhlIHBhZ2UgdmlhIFdlYiBzZXJ2ZXIgaS5lLiBodHRwOi8vLi4uXCIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgY2xhc3MgcmVwcmVzZW50cyBhIGZhdXggd2ViIHNvY2tldC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybFxuICAgKiBAcGFyYW0ge2FycmF5IG9yIHN0cmluZ30gcHJvdG9jb2xzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm94eUhvc3RcbiAgICogQHBhcmFtIHtpbnR9IHByb3h5UG9ydFxuICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyc1xuICAgKi9cbiAgV2ViU29ja2V0ID0gZnVuY3Rpb24odXJsLCBwcm90b2NvbHMsIHByb3h5SG9zdCwgcHJveHlQb3J0LCBoZWFkZXJzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX19pZCA9IFdlYlNvY2tldC5fX25leHRJZCsrO1xuICAgIFdlYlNvY2tldC5fX2luc3RhbmNlc1tzZWxmLl9faWRdID0gc2VsZjtcbiAgICBzZWxmLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICBzZWxmLmJ1ZmZlcmVkQW1vdW50ID0gMDtcbiAgICBzZWxmLl9fZXZlbnRzID0ge307XG4gICAgaWYgKCFwcm90b2NvbHMpIHtcbiAgICAgIHByb3RvY29scyA9IFtdO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3RvY29scyA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBwcm90b2NvbHMgPSBbcHJvdG9jb2xzXTtcbiAgICB9XG4gICAgLy8gVXNlcyBzZXRUaW1lb3V0KCkgdG8gbWFrZSBzdXJlIF9fY3JlYXRlRmxhc2goKSBydW5zIGFmdGVyIHRoZSBjYWxsZXIgc2V0cyB3cy5vbm9wZW4gZXRjLlxuICAgIC8vIE90aGVyd2lzZSwgd2hlbiBvbm9wZW4gZmlyZXMgaW1tZWRpYXRlbHksIG9ub3BlbiBpcyBjYWxsZWQgYmVmb3JlIGl0IGlzIHNldC5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgV2ViU29ja2V0Ll9fYWRkVGFzayhmdW5jdGlvbigpIHtcbiAgICAgICAgV2ViU29ja2V0Ll9fZmxhc2guY3JlYXRlKFxuICAgICAgICAgICAgc2VsZi5fX2lkLCB1cmwsIHByb3RvY29scywgcHJveHlIb3N0IHx8IG51bGwsIHByb3h5UG9ydCB8fCAwLCBoZWFkZXJzIHx8IG51bGwpO1xuICAgICAgfSk7XG4gICAgfSwgMCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNlbmQgZGF0YSB0byB0aGUgd2ViIHNvY2tldC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGRhdGEgIFRoZSBkYXRhIHRvIHNlbmQgdG8gdGhlIHNvY2tldC5cbiAgICogQHJldHVybiB7Ym9vbGVhbn0gIFRydWUgZm9yIHN1Y2Nlc3MsIGZhbHNlIGZvciBmYWlsdXJlLlxuICAgKi9cbiAgV2ViU29ja2V0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT0gV2ViU29ja2V0LkNPTk5FQ1RJTkcpIHtcbiAgICAgIHRocm93IFwiSU5WQUxJRF9TVEFURV9FUlI6IFdlYiBTb2NrZXQgY29ubmVjdGlvbiBoYXMgbm90IGJlZW4gZXN0YWJsaXNoZWRcIjtcbiAgICB9XG4gICAgLy8gV2UgdXNlIGVuY29kZVVSSUNvbXBvbmVudCgpIGhlcmUsIGJlY2F1c2UgRkFCcmlkZ2UgZG9lc24ndCB3b3JrIGlmXG4gICAgLy8gdGhlIGFyZ3VtZW50IGluY2x1ZGVzIHNvbWUgY2hhcmFjdGVycy4gV2UgZG9uJ3QgdXNlIGVzY2FwZSgpIGhlcmVcbiAgICAvLyBiZWNhdXNlIG9mIHRoaXM6XG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vQ29yZV9KYXZhU2NyaXB0XzEuNV9HdWlkZS9GdW5jdGlvbnMjZXNjYXBlX2FuZF91bmVzY2FwZV9GdW5jdGlvbnNcbiAgICAvLyBCdXQgaXQgbG9va3MgZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZVVSSUNvbXBvbmVudChzKSkgZG9lc24ndFxuICAgIC8vIHByZXNlcnZlIGFsbCBVbmljb2RlIGNoYXJhY3RlcnMgZWl0aGVyIGUuZy4gXCJcXHVmZmZmXCIgaW4gRmlyZWZveC5cbiAgICAvLyBOb3RlIGJ5IHd0cml0Y2g6IEhvcGVmdWxseSB0aGlzIHdpbGwgbm90IGJlIG5lY2Vzc2FyeSB1c2luZyBFeHRlcm5hbEludGVyZmFjZS4gIFdpbGwgcmVxdWlyZVxuICAgIC8vIGFkZGl0aW9uYWwgdGVzdGluZy5cbiAgICB2YXIgcmVzdWx0ID0gV2ViU29ja2V0Ll9fZmxhc2guc2VuZCh0aGlzLl9faWQsIGVuY29kZVVSSUNvbXBvbmVudChkYXRhKSk7XG4gICAgaWYgKHJlc3VsdCA8IDApIHsgLy8gc3VjY2Vzc1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYnVmZmVyZWRBbW91bnQgKz0gcmVzdWx0O1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ2xvc2UgdGhpcyB3ZWIgc29ja2V0IGdyYWNlZnVsbHkuXG4gICAqL1xuICBXZWJTb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSBXZWJTb2NrZXQuQ0xPU0VEIHx8IHRoaXMucmVhZHlTdGF0ZSA9PSBXZWJTb2NrZXQuQ0xPU0lORykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0lORztcbiAgICBXZWJTb2NrZXQuX19mbGFzaC5jbG9zZSh0aGlzLl9faWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiB7QGxpbmsgPGEgaHJlZj1cImh0dHA6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0yLUV2ZW50cy9ldmVudHMuaHRtbCNFdmVudHMtcmVnaXN0cmF0aW9uXCI+RE9NIDIgRXZlbnRUYXJnZXQgSW50ZXJmYWNlPC9hPn1cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gbGlzdGVuZXJcbiAgICogQHBhcmFtIHtib29sZWFufSB1c2VDYXB0dXJlXG4gICAqIEByZXR1cm4gdm9pZFxuICAgKi9cbiAgV2ViU29ja2V0LnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIsIHVzZUNhcHR1cmUpIHtcbiAgICBpZiAoISh0eXBlIGluIHRoaXMuX19ldmVudHMpKSB7XG4gICAgICB0aGlzLl9fZXZlbnRzW3R5cGVdID0gW107XG4gICAgfVxuICAgIHRoaXMuX19ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIHtAbGluayA8YSBocmVmPVwiaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItRXZlbnRzL2V2ZW50cy5odG1sI0V2ZW50cy1yZWdpc3RyYXRpb25cIj5ET00gMiBFdmVudFRhcmdldCBJbnRlcmZhY2U8L2E+fVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHVzZUNhcHR1cmVcbiAgICogQHJldHVybiB2b2lkXG4gICAqL1xuICBXZWJTb2NrZXQucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lciwgdXNlQ2FwdHVyZSkge1xuICAgIGlmICghKHR5cGUgaW4gdGhpcy5fX2V2ZW50cykpIHJldHVybjtcbiAgICB2YXIgZXZlbnRzID0gdGhpcy5fX2V2ZW50c1t0eXBlXTtcbiAgICBmb3IgKHZhciBpID0gZXZlbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICBpZiAoZXZlbnRzW2ldID09PSBsaXN0ZW5lcikge1xuICAgICAgICBldmVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIHtAbGluayA8YSBocmVmPVwiaHR0cDovL3d3dy53My5vcmcvVFIvRE9NLUxldmVsLTItRXZlbnRzL2V2ZW50cy5odG1sI0V2ZW50cy1yZWdpc3RyYXRpb25cIj5ET00gMiBFdmVudFRhcmdldCBJbnRlcmZhY2U8L2E+fVxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICAgKiBAcmV0dXJuIHZvaWRcbiAgICovXG4gIFdlYlNvY2tldC5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIGV2ZW50cyA9IHRoaXMuX19ldmVudHNbZXZlbnQudHlwZV0gfHwgW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGV2ZW50c1tpXShldmVudCk7XG4gICAgfVxuICAgIHZhciBoYW5kbGVyID0gdGhpc1tcIm9uXCIgKyBldmVudC50eXBlXTtcbiAgICBpZiAoaGFuZGxlcikgaGFuZGxlcihldmVudCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgYW4gZXZlbnQgZnJvbSBGbGFzaC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGZsYXNoRXZlbnRcbiAgICovXG4gIFdlYlNvY2tldC5wcm90b3R5cGUuX19oYW5kbGVFdmVudCA9IGZ1bmN0aW9uKGZsYXNoRXZlbnQpIHtcbiAgICBpZiAoXCJyZWFkeVN0YXRlXCIgaW4gZmxhc2hFdmVudCkge1xuICAgICAgdGhpcy5yZWFkeVN0YXRlID0gZmxhc2hFdmVudC5yZWFkeVN0YXRlO1xuICAgIH1cbiAgICBpZiAoXCJwcm90b2NvbFwiIGluIGZsYXNoRXZlbnQpIHtcbiAgICAgIHRoaXMucHJvdG9jb2wgPSBmbGFzaEV2ZW50LnByb3RvY29sO1xuICAgIH1cbiAgICBcbiAgICB2YXIganNFdmVudDtcbiAgICBpZiAoZmxhc2hFdmVudC50eXBlID09IFwib3BlblwiIHx8IGZsYXNoRXZlbnQudHlwZSA9PSBcImVycm9yXCIpIHtcbiAgICAgIGpzRXZlbnQgPSB0aGlzLl9fY3JlYXRlU2ltcGxlRXZlbnQoZmxhc2hFdmVudC50eXBlKTtcbiAgICB9IGVsc2UgaWYgKGZsYXNoRXZlbnQudHlwZSA9PSBcImNsb3NlXCIpIHtcbiAgICAgIC8vIFRPRE8gaW1wbGVtZW50IGpzRXZlbnQud2FzQ2xlYW5cbiAgICAgIGpzRXZlbnQgPSB0aGlzLl9fY3JlYXRlU2ltcGxlRXZlbnQoXCJjbG9zZVwiKTtcbiAgICB9IGVsc2UgaWYgKGZsYXNoRXZlbnQudHlwZSA9PSBcIm1lc3NhZ2VcIikge1xuICAgICAgdmFyIGRhdGEgPSBkZWNvZGVVUklDb21wb25lbnQoZmxhc2hFdmVudC5tZXNzYWdlKTtcbiAgICAgIGpzRXZlbnQgPSB0aGlzLl9fY3JlYXRlTWVzc2FnZUV2ZW50KFwibWVzc2FnZVwiLCBkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgXCJ1bmtub3duIGV2ZW50IHR5cGU6IFwiICsgZmxhc2hFdmVudC50eXBlO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoanNFdmVudCk7XG4gIH07XG4gIFxuICBXZWJTb2NrZXQucHJvdG90eXBlLl9fY3JlYXRlU2ltcGxlRXZlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgaWYgKGRvY3VtZW50LmNyZWF0ZUV2ZW50ICYmIHdpbmRvdy5FdmVudCkge1xuICAgICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICAgIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIGV2ZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge3R5cGU6IHR5cGUsIGJ1YmJsZXM6IGZhbHNlLCBjYW5jZWxhYmxlOiBmYWxzZX07XG4gICAgfVxuICB9O1xuICBcbiAgV2ViU29ja2V0LnByb3RvdHlwZS5fX2NyZWF0ZU1lc3NhZ2VFdmVudCA9IGZ1bmN0aW9uKHR5cGUsIGRhdGEpIHtcbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQgJiYgd2luZG93Lk1lc3NhZ2VFdmVudCAmJiAhd2luZG93Lm9wZXJhKSB7XG4gICAgICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1lc3NhZ2VFdmVudFwiKTtcbiAgICAgIGV2ZW50LmluaXRNZXNzYWdlRXZlbnQoXCJtZXNzYWdlXCIsIGZhbHNlLCBmYWxzZSwgZGF0YSwgbnVsbCwgbnVsbCwgd2luZG93LCBudWxsKTtcbiAgICAgIHJldHVybiBldmVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUUgYW5kIE9wZXJhLCB0aGUgbGF0dGVyIG9uZSB0cnVuY2F0ZXMgdGhlIGRhdGEgcGFyYW1ldGVyIGFmdGVyIGFueSAweDAwIGJ5dGVzLlxuICAgICAgcmV0dXJuIHt0eXBlOiB0eXBlLCBkYXRhOiBkYXRhLCBidWJibGVzOiBmYWxzZSwgY2FuY2VsYWJsZTogZmFsc2V9O1xuICAgIH1cbiAgfTtcbiAgXG4gIC8qKlxuICAgKiBEZWZpbmUgdGhlIFdlYlNvY2tldCByZWFkeVN0YXRlIGVudW1lcmF0aW9uLlxuICAgKi9cbiAgV2ViU29ja2V0LkNPTk5FQ1RJTkcgPSAwO1xuICBXZWJTb2NrZXQuT1BFTiA9IDE7XG4gIFdlYlNvY2tldC5DTE9TSU5HID0gMjtcbiAgV2ViU29ja2V0LkNMT1NFRCA9IDM7XG5cbiAgV2ViU29ja2V0Ll9fZmxhc2ggPSBudWxsO1xuICBXZWJTb2NrZXQuX19pbnN0YW5jZXMgPSB7fTtcbiAgV2ViU29ja2V0Ll9fdGFza3MgPSBbXTtcbiAgV2ViU29ja2V0Ll9fbmV4dElkID0gMDtcbiAgXG4gIC8qKlxuICAgKiBMb2FkIGEgbmV3IGZsYXNoIHNlY3VyaXR5IHBvbGljeSBmaWxlLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gICAqL1xuICBXZWJTb2NrZXQubG9hZEZsYXNoUG9saWN5RmlsZSA9IGZ1bmN0aW9uKHVybCl7XG4gICAgV2ViU29ja2V0Ll9fYWRkVGFzayhmdW5jdGlvbigpIHtcbiAgICAgIFdlYlNvY2tldC5fX2ZsYXNoLmxvYWRNYW51YWxQb2xpY3lGaWxlKHVybCk7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIExvYWRzIFdlYlNvY2tldE1haW4uc3dmIGFuZCBjcmVhdGVzIFdlYlNvY2tldE1haW4gb2JqZWN0IGluIEZsYXNoLlxuICAgKi9cbiAgV2ViU29ja2V0Ll9faW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChXZWJTb2NrZXQuX19mbGFzaCkgcmV0dXJuO1xuICAgIFxuICAgIGlmIChXZWJTb2NrZXQuX19zd2ZMb2NhdGlvbikge1xuICAgICAgLy8gRm9yIGJhY2t3b3JkIGNvbXBhdGliaWxpdHkuXG4gICAgICB3aW5kb3cuV0VCX1NPQ0tFVF9TV0ZfTE9DQVRJT04gPSBXZWJTb2NrZXQuX19zd2ZMb2NhdGlvbjtcbiAgICB9XG4gICAgaWYgKCF3aW5kb3cuV0VCX1NPQ0tFVF9TV0ZfTE9DQVRJT04pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbV2ViU29ja2V0XSBzZXQgV0VCX1NPQ0tFVF9TV0ZfTE9DQVRJT04gdG8gbG9jYXRpb24gb2YgV2ViU29ja2V0TWFpbi5zd2ZcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGNvbnRhaW5lci5pZCA9IFwid2ViU29ja2V0Q29udGFpbmVyXCI7XG4gICAgLy8gSGlkZXMgRmxhc2ggYm94LiBXZSBjYW5ub3QgdXNlIGRpc3BsYXk6IG5vbmUgb3IgdmlzaWJpbGl0eTogaGlkZGVuIGJlY2F1c2UgaXQgcHJldmVudHNcbiAgICAvLyBGbGFzaCBmcm9tIGxvYWRpbmcgYXQgbGVhc3QgaW4gSUUuIFNvIHdlIG1vdmUgaXQgb3V0IG9mIHRoZSBzY3JlZW4gYXQgKC0xMDAsIC0xMDApLlxuICAgIC8vIEJ1dCB0aGlzIGV2ZW4gZG9lc24ndCB3b3JrIHdpdGggRmxhc2ggTGl0ZSAoZS5nLiBpbiBEcm9pZCBJbmNyZWRpYmxlKS4gU28gd2l0aCBGbGFzaFxuICAgIC8vIExpdGUsIHdlIHB1dCBpdCBhdCAoMCwgMCkuIFRoaXMgc2hvd3MgMXgxIGJveCB2aXNpYmxlIGF0IGxlZnQtdG9wIGNvcm5lciBidXQgdGhpcyBpc1xuICAgIC8vIHRoZSBiZXN0IHdlIGNhbiBkbyBhcyBmYXIgYXMgd2Uga25vdyBub3cuXG4gICAgY29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgIGlmIChXZWJTb2NrZXQuX19pc0ZsYXNoTGl0ZSgpKSB7XG4gICAgICBjb250YWluZXIuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG4gICAgICBjb250YWluZXIuc3R5bGUudG9wID0gXCIwcHhcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGFpbmVyLnN0eWxlLmxlZnQgPSBcIi0xMDBweFwiO1xuICAgICAgY29udGFpbmVyLnN0eWxlLnRvcCA9IFwiLTEwMHB4XCI7XG4gICAgfVxuICAgIHZhciBob2xkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGhvbGRlci5pZCA9IFwid2ViU29ja2V0Rmxhc2hcIjtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoaG9sZGVyKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW5lcik7XG4gICAgLy8gU2VlIHRoaXMgYXJ0aWNsZSBmb3IgaGFzUHJpb3JpdHk6XG4gICAgLy8gaHR0cDovL2hlbHAuYWRvYmUuY29tL2VuX1VTL2FzMy9tb2JpbGUvV1M0YmViY2Q2NmE3NDI3NWMzNmNmYjgxMzcxMjQzMThlZWJjNi03ZmZkLmh0bWxcbiAgICBzd2ZvYmplY3QuZW1iZWRTV0YoXG4gICAgICBXRUJfU09DS0VUX1NXRl9MT0NBVElPTixcbiAgICAgIFwid2ViU29ja2V0Rmxhc2hcIixcbiAgICAgIFwiMVwiIC8qIHdpZHRoICovLFxuICAgICAgXCIxXCIgLyogaGVpZ2h0ICovLFxuICAgICAgXCIxMC4wLjBcIiAvKiBTV0YgdmVyc2lvbiAqLyxcbiAgICAgIG51bGwsXG4gICAgICBudWxsLFxuICAgICAge2hhc1ByaW9yaXR5OiB0cnVlLCBzd2xpdmVjb25uZWN0IDogdHJ1ZSwgYWxsb3dTY3JpcHRBY2Nlc3M6IFwiYWx3YXlzXCJ9LFxuICAgICAgbnVsbCxcbiAgICAgIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKCFlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW1dlYlNvY2tldF0gc3dmb2JqZWN0LmVtYmVkU1dGIGZhaWxlZFwiKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH07XG4gIFxuICAvKipcbiAgICogQ2FsbGVkIGJ5IEZsYXNoIHRvIG5vdGlmeSBKUyB0aGF0IGl0J3MgZnVsbHkgbG9hZGVkIGFuZCByZWFkeVxuICAgKiBmb3IgY29tbXVuaWNhdGlvbi5cbiAgICovXG4gIFdlYlNvY2tldC5fX29uRmxhc2hJbml0aWFsaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFdlIG5lZWQgdG8gc2V0IGEgdGltZW91dCBoZXJlIHRvIGF2b2lkIHJvdW5kLXRyaXAgY2FsbHNcbiAgICAvLyB0byBmbGFzaCBkdXJpbmcgdGhlIGluaXRpYWxpemF0aW9uIHByb2Nlc3MuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgIFdlYlNvY2tldC5fX2ZsYXNoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ3ZWJTb2NrZXRGbGFzaFwiKTtcbiAgICAgIFdlYlNvY2tldC5fX2ZsYXNoLnNldENhbGxlclVybChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIFdlYlNvY2tldC5fX2ZsYXNoLnNldERlYnVnKCEhd2luZG93LldFQl9TT0NLRVRfREVCVUcpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBXZWJTb2NrZXQuX190YXNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICBXZWJTb2NrZXQuX190YXNrc1tpXSgpO1xuICAgICAgfVxuICAgICAgV2ViU29ja2V0Ll9fdGFza3MgPSBbXTtcbiAgICB9LCAwKTtcbiAgfTtcbiAgXG4gIC8qKlxuICAgKiBDYWxsZWQgYnkgRmxhc2ggdG8gbm90aWZ5IFdlYlNvY2tldHMgZXZlbnRzIGFyZSBmaXJlZC5cbiAgICovXG4gIFdlYlNvY2tldC5fX29uRmxhc2hFdmVudCA9IGZ1bmN0aW9uKCkge1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBHZXRzIGV2ZW50cyB1c2luZyByZWNlaXZlRXZlbnRzKCkgaW5zdGVhZCBvZiBnZXR0aW5nIGl0IGZyb20gZXZlbnQgb2JqZWN0XG4gICAgICAgIC8vIG9mIEZsYXNoIGV2ZW50LiBUaGlzIGlzIHRvIG1ha2Ugc3VyZSB0byBrZWVwIG1lc3NhZ2Ugb3JkZXIuXG4gICAgICAgIC8vIEl0IHNlZW1zIHNvbWV0aW1lcyBGbGFzaCBldmVudHMgZG9uJ3QgYXJyaXZlIGluIHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgYXJlIHNlbnQuXG4gICAgICAgIHZhciBldmVudHMgPSBXZWJTb2NrZXQuX19mbGFzaC5yZWNlaXZlRXZlbnRzKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgV2ViU29ja2V0Ll9faW5zdGFuY2VzW2V2ZW50c1tpXS53ZWJTb2NrZXRJZF0uX19oYW5kbGVFdmVudChldmVudHNbaV0pO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICB9XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG4gIFxuICAvLyBDYWxsZWQgYnkgRmxhc2guXG4gIFdlYlNvY2tldC5fX2xvZyA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmxvZyhkZWNvZGVVUklDb21wb25lbnQobWVzc2FnZSkpO1xuICB9O1xuICBcbiAgLy8gQ2FsbGVkIGJ5IEZsYXNoLlxuICBXZWJTb2NrZXQuX19lcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICBjb25zb2xlLmVycm9yKGRlY29kZVVSSUNvbXBvbmVudChtZXNzYWdlKSk7XG4gIH07XG4gIFxuICBXZWJTb2NrZXQuX19hZGRUYXNrID0gZnVuY3Rpb24odGFzaykge1xuICAgIGlmIChXZWJTb2NrZXQuX19mbGFzaCkge1xuICAgICAgdGFzaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBXZWJTb2NrZXQuX190YXNrcy5wdXNoKHRhc2spO1xuICAgIH1cbiAgfTtcbiAgXG4gIC8qKlxuICAgKiBUZXN0IGlmIHRoZSBicm93c2VyIGlzIHJ1bm5pbmcgZmxhc2ggbGl0ZS5cbiAgICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiBmbGFzaCBsaXRlIGlzIHJ1bm5pbmcsIGZhbHNlIG90aGVyd2lzZS5cbiAgICovXG4gIFdlYlNvY2tldC5fX2lzRmxhc2hMaXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF3aW5kb3cubmF2aWdhdG9yIHx8ICF3aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlcykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgbWltZVR5cGUgPSB3aW5kb3cubmF2aWdhdG9yLm1pbWVUeXBlc1tcImFwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoXCJdO1xuICAgIGlmICghbWltZVR5cGUgfHwgIW1pbWVUeXBlLmVuYWJsZWRQbHVnaW4gfHwgIW1pbWVUeXBlLmVuYWJsZWRQbHVnaW4uZmlsZW5hbWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG1pbWVUeXBlLmVuYWJsZWRQbHVnaW4uZmlsZW5hbWUubWF0Y2goL2ZsYXNobGl0ZS9pKSA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbiAgXG4gIGlmICghd2luZG93LldFQl9TT0NLRVRfRElTQUJMRV9BVVRPX0lOSVRJQUxJWkFUSU9OKSB7XG4gICAgaWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgV2ViU29ja2V0Ll9faW5pdGlhbGl6ZSgpO1xuICAgICAgfSwgZmFsc2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbmxvYWRcIiwgZnVuY3Rpb24oKXtcbiAgICAgICAgV2ViU29ja2V0Ll9faW5pdGlhbGl6ZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIFxufSkoKTtcblxuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgaW8sIGdsb2JhbCkge1xuXG4gIC8qKlxuICAgKiBFeHBvc2UgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGV4cG9ydHMuWEhSID0gWEhSO1xuXG4gIC8qKlxuICAgKiBYSFIgY29uc3RydWN0b3JcbiAgICpcbiAgICogQGNvc3RydWN0b3JcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgZnVuY3Rpb24gWEhSIChzb2NrZXQpIHtcbiAgICBpZiAoIXNvY2tldCkgcmV0dXJuO1xuXG4gICAgaW8uVHJhbnNwb3J0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5zZW5kQnVmZmVyID0gW107XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaGVyaXRzIGZyb20gVHJhbnNwb3J0LlxuICAgKi9cblxuICBpby51dGlsLmluaGVyaXQoWEhSLCBpby5UcmFuc3BvcnQpO1xuXG4gIC8qKlxuICAgKiBFc3RhYmxpc2ggYSBjb25uZWN0aW9uXG4gICAqXG4gICAqIEByZXR1cm5zIHtUcmFuc3BvcnR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFhIUi5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLnNvY2tldC5zZXRCdWZmZXIoZmFsc2UpO1xuICAgIHRoaXMub25PcGVuKCk7XG4gICAgdGhpcy5nZXQoKTtcblxuICAgIC8vIHdlIG5lZWQgdG8gbWFrZSBzdXJlIHRoZSByZXF1ZXN0IHN1Y2NlZWRzIHNpbmNlIHdlIGhhdmUgbm8gaW5kaWNhdGlvblxuICAgIC8vIHdoZXRoZXIgdGhlIHJlcXVlc3Qgb3BlbmVkIG9yIG5vdCB1bnRpbCBpdCBzdWNjZWVkZWQuXG4gICAgdGhpcy5zZXRDbG9zZVRpbWVvdXQoKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB3ZSBuZWVkIHRvIHNlbmQgZGF0YSB0byB0aGUgU29ja2V0LklPIHNlcnZlciwgaWYgd2UgaGF2ZSBkYXRhIGluIG91clxuICAgKiBidWZmZXIgd2UgZW5jb2RlIGl0IGFuZCBmb3J3YXJkIGl0IHRvIHRoZSBgcG9zdGAgbWV0aG9kLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgWEhSLnByb3RvdHlwZS5wYXlsb2FkID0gZnVuY3Rpb24gKHBheWxvYWQpIHtcbiAgICB2YXIgbXNncyA9IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXlsb2FkLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbXNncy5wdXNoKGlvLnBhcnNlci5lbmNvZGVQYWNrZXQocGF5bG9hZFtpXSkpO1xuICAgIH1cblxuICAgIHRoaXMuc2VuZChpby5wYXJzZXIuZW5jb2RlUGF5bG9hZChtc2dzKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNlbmQgZGF0YSB0byB0aGUgU29ja2V0LklPIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIGRhdGEgVGhlIG1lc3NhZ2VcbiAgICogQHJldHVybnMge1RyYW5zcG9ydH1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgWEhSLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB0aGlzLnBvc3QoZGF0YSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFBvc3RzIGEgZW5jb2RlZCBtZXNzYWdlIHRvIHRoZSBTb2NrZXQuSU8gc2VydmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZGF0YSBBIGVuY29kZWQgbWVzc2FnZS5cbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGVtcHR5ICgpIHsgfTtcblxuICBYSFIucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnNvY2tldC5zZXRCdWZmZXIodHJ1ZSk7XG5cbiAgICBmdW5jdGlvbiBzdGF0ZUNoYW5nZSAoKSB7XG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBlbXB0eTtcbiAgICAgICAgc2VsZi5wb3N0aW5nID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCl7XG4gICAgICAgICAgc2VsZi5zb2NrZXQuc2V0QnVmZmVyKGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLm9uQ2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9ubG9hZCAoKSB7XG4gICAgICB0aGlzLm9ubG9hZCA9IGVtcHR5O1xuICAgICAgc2VsZi5zb2NrZXQuc2V0QnVmZmVyKGZhbHNlKTtcbiAgICB9O1xuXG4gICAgdGhpcy5zZW5kWEhSID0gdGhpcy5yZXF1ZXN0KCdQT1NUJyk7XG5cbiAgICBpZiAoZ2xvYmFsLlhEb21haW5SZXF1ZXN0ICYmIHRoaXMuc2VuZFhIUiBpbnN0YW5jZW9mIFhEb21haW5SZXF1ZXN0KSB7XG4gICAgICB0aGlzLnNlbmRYSFIub25sb2FkID0gdGhpcy5zZW5kWEhSLm9uZXJyb3IgPSBvbmxvYWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2VuZFhIUi5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBzdGF0ZUNoYW5nZTtcbiAgICB9XG5cbiAgICB0aGlzLnNlbmRYSFIuc2VuZChkYXRhKTtcbiAgfTtcblxuICAvKipcbiAgICogRGlzY29ubmVjdHMgdGhlIGVzdGFibGlzaGVkIGBYSFJgIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtUcmFuc3BvcnR9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFhIUi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5vbkNsb3NlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIGNvbmZpZ3VyZWQgWEhSIHJlcXVlc3RcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRoYXQgbmVlZHMgdG8gYmUgcmVxdWVzdGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kIFRoZSBtZXRob2QgdGhlIHJlcXVlc3Qgc2hvdWxkIHVzZS5cbiAgICogQHJldHVybnMge1hNTEh0dHBSZXF1ZXN0fVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgWEhSLnByb3RvdHlwZS5yZXF1ZXN0ID0gZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIHZhciByZXEgPSBpby51dGlsLnJlcXVlc3QodGhpcy5zb2NrZXQuaXNYRG9tYWluKCkpXG4gICAgICAsIHF1ZXJ5ID0gaW8udXRpbC5xdWVyeSh0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5LCAndD0nICsgK25ldyBEYXRlKTtcblxuICAgIHJlcS5vcGVuKG1ldGhvZCB8fCAnR0VUJywgdGhpcy5wcmVwYXJlVXJsKCkgKyBxdWVyeSwgdHJ1ZSk7XG5cbiAgICBpZiAobWV0aG9kID09ICdQT1NUJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHJlcS5zZXRSZXF1ZXN0SGVhZGVyKSB7XG4gICAgICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtdHlwZScsICd0ZXh0L3BsYWluO2NoYXJzZXQ9VVRGLTgnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBYRG9tYWluUmVxdWVzdFxuICAgICAgICAgIHJlcS5jb250ZW50VHlwZSA9ICd0ZXh0L3BsYWluJztcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG5cbiAgICByZXR1cm4gcmVxO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBzY2hlbWUgdG8gdXNlIGZvciB0aGUgdHJhbnNwb3J0IFVSTHMuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBYSFIucHJvdG90eXBlLnNjaGVtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zb2NrZXQub3B0aW9ucy5zZWN1cmUgPyAnaHR0cHMnIDogJ2h0dHAnO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGUgWEhSIHRyYW5zcG9ydHMgYXJlIHN1cHBvcnRlZFxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHhkb21haW4gQ2hlY2sgaWYgd2Ugc3VwcG9ydCBjcm9zcyBkb21haW4gcmVxdWVzdHMuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBYSFIuY2hlY2sgPSBmdW5jdGlvbiAoc29ja2V0LCB4ZG9tYWluKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXF1ZXN0ID0gaW8udXRpbC5yZXF1ZXN0KHhkb21haW4pLFxuICAgICAgICAgIHVzZXNYRG9tUmVxID0gKGdsb2JhbC5YRG9tYWluUmVxdWVzdCAmJiByZXF1ZXN0IGluc3RhbmNlb2YgWERvbWFpblJlcXVlc3QpLFxuICAgICAgICAgIHNvY2tldFByb3RvY29sID0gKHNvY2tldCAmJiBzb2NrZXQub3B0aW9ucyAmJiBzb2NrZXQub3B0aW9ucy5zZWN1cmUgPyAnaHR0cHM6JyA6ICdodHRwOicpLFxuICAgICAgICAgIGlzWFByb3RvY29sID0gKGdsb2JhbC5sb2NhdGlvbiAmJiBzb2NrZXRQcm90b2NvbCAhPSBnbG9iYWwubG9jYXRpb24ucHJvdG9jb2wpO1xuICAgICAgaWYgKHJlcXVlc3QgJiYgISh1c2VzWERvbVJlcSAmJiBpc1hQcm90b2NvbCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGUgWEhSIHRyYW5zcG9ydCBzdXBwb3J0cyBjcm9zcyBkb21haW4gcmVxdWVzdHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBYSFIueGRvbWFpbkNoZWNrID0gZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIHJldHVybiBYSFIuY2hlY2soc29ja2V0LCB0cnVlKTtcbiAgfTtcblxufSkoXG4gICAgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8uVHJhbnNwb3J0IDogbW9kdWxlLmV4cG9ydHNcbiAgLCAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpbyA6IG1vZHVsZS5wYXJlbnQuZXhwb3J0c1xuICAsIHRoaXNcbik7XG4vKipcbiAqIHNvY2tldC5pb1xuICogQ29weXJpZ2h0KGMpIDIwMTEgTGVhcm5Cb29zdCA8ZGV2QGxlYXJuYm9vc3QuY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuKGZ1bmN0aW9uIChleHBvcnRzLCBpbykge1xuXG4gIC8qKlxuICAgKiBFeHBvc2UgY29uc3RydWN0b3IuXG4gICAqL1xuXG4gIGV4cG9ydHMuaHRtbGZpbGUgPSBIVE1MRmlsZTtcblxuICAvKipcbiAgICogVGhlIEhUTUxGaWxlIHRyYW5zcG9ydCBjcmVhdGVzIGEgYGZvcmV2ZXIgaWZyYW1lYCBiYXNlZCB0cmFuc3BvcnRcbiAgICogZm9yIEludGVybmV0IEV4cGxvcmVyLiBSZWd1bGFyIGZvcmV2ZXIgaWZyYW1lIGltcGxlbWVudGF0aW9ucyB3aWxsIFxuICAgKiBjb250aW51b3VzbHkgdHJpZ2dlciB0aGUgYnJvd3NlcnMgYnV6eSBpbmRpY2F0b3JzLiBJZiB0aGUgZm9yZXZlciBpZnJhbWVcbiAgICogaXMgY3JlYXRlZCBpbnNpZGUgYSBgaHRtbGZpbGVgIHRoZXNlIGluZGljYXRvcnMgd2lsbCBub3QgYmUgdHJpZ2dlZC5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBleHRlbmRzIHtpby5UcmFuc3BvcnQuWEhSfVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBIVE1MRmlsZSAoc29ja2V0KSB7XG4gICAgaW8uVHJhbnNwb3J0LlhIUi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbmhlcml0cyBmcm9tIFhIUiB0cmFuc3BvcnQuXG4gICAqL1xuXG4gIGlvLnV0aWwuaW5oZXJpdChIVE1MRmlsZSwgaW8uVHJhbnNwb3J0LlhIUik7XG5cbiAgLyoqXG4gICAqIFRyYW5zcG9ydCBuYW1lXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEhUTUxGaWxlLnByb3RvdHlwZS5uYW1lID0gJ2h0bWxmaWxlJztcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBBYy4uLmVYIGBodG1sZmlsZWAgd2l0aCBhIGZvcmV2ZXIgbG9hZGluZyBpZnJhbWVcbiAgICogdGhhdCBjYW4gYmUgdXNlZCB0byBsaXN0ZW4gdG8gbWVzc2FnZXMuIEluc2lkZSB0aGUgZ2VuZXJhdGVkXG4gICAqIGBodG1sZmlsZWAgYSByZWZlcmVuY2Ugd2lsbCBiZSBtYWRlIHRvIHRoZSBIVE1MRmlsZSB0cmFuc3BvcnQuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBIVE1MRmlsZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZG9jID0gbmV3IHdpbmRvd1soWydBY3RpdmUnXS5jb25jYXQoJ09iamVjdCcpLmpvaW4oJ1gnKSldKCdodG1sZmlsZScpO1xuICAgIHRoaXMuZG9jLm9wZW4oKTtcbiAgICB0aGlzLmRvYy53cml0ZSgnPGh0bWw+PC9odG1sPicpO1xuICAgIHRoaXMuZG9jLmNsb3NlKCk7XG4gICAgdGhpcy5kb2MucGFyZW50V2luZG93LnMgPSB0aGlzO1xuXG4gICAgdmFyIGlmcmFtZUMgPSB0aGlzLmRvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBpZnJhbWVDLmNsYXNzTmFtZSA9ICdzb2NrZXRpbyc7XG5cbiAgICB0aGlzLmRvYy5ib2R5LmFwcGVuZENoaWxkKGlmcmFtZUMpO1xuICAgIHRoaXMuaWZyYW1lID0gdGhpcy5kb2MuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG5cbiAgICBpZnJhbWVDLmFwcGVuZENoaWxkKHRoaXMuaWZyYW1lKTtcblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgLCBxdWVyeSA9IGlvLnV0aWwucXVlcnkodGhpcy5zb2NrZXQub3B0aW9ucy5xdWVyeSwgJ3Q9JysgK25ldyBEYXRlKTtcblxuICAgIHRoaXMuaWZyYW1lLnNyYyA9IHRoaXMucHJlcGFyZVVybCgpICsgcXVlcnk7XG5cbiAgICBpby51dGlsLm9uKHdpbmRvdywgJ3VubG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgU29ja2V0LklPIHNlcnZlciB3aWxsIHdyaXRlIHNjcmlwdCB0YWdzIGluc2lkZSB0aGUgZm9yZXZlclxuICAgKiBpZnJhbWUsIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSB1c2VkIGFzIGNhbGxiYWNrIGZvciB0aGUgaW5jb21pbmdcbiAgICogaW5mb3JtYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIFRoZSBtZXNzYWdlXG4gICAqIEBwYXJhbSB7ZG9jdW1lbnR9IGRvYyBSZWZlcmVuY2UgdG8gdGhlIGNvbnRleHRcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIEhUTUxGaWxlLnByb3RvdHlwZS5fID0gZnVuY3Rpb24gKGRhdGEsIGRvYykge1xuICAgIC8vIHVuZXNjYXBlIGFsbCBmb3J3YXJkIHNsYXNoZXMuIHNlZSBHSC0xMjUxXG4gICAgZGF0YSA9IGRhdGEucmVwbGFjZSgvXFxcXFxcLy9nLCAnLycpO1xuICAgIHRoaXMub25EYXRhKGRhdGEpO1xuICAgIHRyeSB7XG4gICAgICB2YXIgc2NyaXB0ID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbiAgICAgIHNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgfSBjYXRjaCAoZSkgeyB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3kgdGhlIGVzdGFibGlzaGVkIGNvbm5lY3Rpb24sIGlmcmFtZSBhbmQgYGh0bWxmaWxlYC5cbiAgICogQW5kIGNhbGxzIHRoZSBgQ29sbGVjdEdhcmJhZ2VgIGZ1bmN0aW9uIG9mIEludGVybmV0IEV4cGxvcmVyXG4gICAqIHRvIHJlbGVhc2UgdGhlIG1lbW9yeS5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIEhUTUxGaWxlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmlmcmFtZSl7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLmlmcmFtZS5zcmMgPSAnYWJvdXQ6YmxhbmsnO1xuICAgICAgfSBjYXRjaChlKXt9XG5cbiAgICAgIHRoaXMuZG9jID0gbnVsbDtcbiAgICAgIHRoaXMuaWZyYW1lLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5pZnJhbWUpO1xuICAgICAgdGhpcy5pZnJhbWUgPSBudWxsO1xuXG4gICAgICBDb2xsZWN0R2FyYmFnZSgpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzY29ubmVjdHMgdGhlIGVzdGFibGlzaGVkIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtUcmFuc3BvcnR9IENoYWluaW5nLlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBIVE1MRmlsZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5kZXN0cm95KCk7XG4gICAgcmV0dXJuIGlvLlRyYW5zcG9ydC5YSFIucHJvdG90eXBlLmNsb3NlLmNhbGwodGhpcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0aGlzIHRyYW5zcG9ydC4gVGhlIGJyb3dzZXJcbiAgICogbXVzdCBoYXZlIGFuIGBBYy4uLmVYT2JqZWN0YCBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgSFRNTEZpbGUuY2hlY2sgPSBmdW5jdGlvbiAoc29ja2V0KSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT0gXCJ1bmRlZmluZWRcIiAmJiAoWydBY3RpdmUnXS5jb25jYXQoJ09iamVjdCcpLmpvaW4oJ1gnKSkgaW4gd2luZG93KXtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBhID0gbmV3IHdpbmRvd1soWydBY3RpdmUnXS5jb25jYXQoJ09iamVjdCcpLmpvaW4oJ1gnKSldKCdodG1sZmlsZScpO1xuICAgICAgICByZXR1cm4gYSAmJiBpby5UcmFuc3BvcnQuWEhSLmNoZWNrKHNvY2tldCk7XG4gICAgICB9IGNhdGNoKGUpe31cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjcm9zcyBkb21haW4gcmVxdWVzdHMgYXJlIHN1cHBvcnRlZC5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEhUTUxGaWxlLnhkb21haW5DaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyB3ZSBjYW4gcHJvYmFibHkgZG8gaGFuZGxpbmcgZm9yIHN1Yi1kb21haW5zLCB3ZSBzaG91bGRcbiAgICAvLyB0ZXN0IHRoYXQgaXQncyBjcm9zcyBkb21haW4gYnV0IGEgc3ViZG9tYWluIGhlcmVcbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgdHJhbnNwb3J0IHRvIHlvdXIgcHVibGljIGlvLnRyYW5zcG9ydHMgYXJyYXkuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBpby50cmFuc3BvcnRzLnB1c2goJ2h0bWxmaWxlJyk7XG5cbn0pKFxuICAgICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvLlRyYW5zcG9ydCA6IG1vZHVsZS5leHBvcnRzXG4gICwgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8gOiBtb2R1bGUucGFyZW50LmV4cG9ydHNcbik7XG5cbi8qKlxuICogc29ja2V0LmlvXG4gKiBDb3B5cmlnaHQoYykgMjAxMSBMZWFybkJvb3N0IDxkZXZAbGVhcm5ib29zdC5jb20+XG4gKiBNSVQgTGljZW5zZWRcbiAqL1xuXG4oZnVuY3Rpb24gKGV4cG9ydHMsIGlvLCBnbG9iYWwpIHtcblxuICAvKipcbiAgICogRXhwb3NlIGNvbnN0cnVjdG9yLlxuICAgKi9cblxuICBleHBvcnRzWyd4aHItcG9sbGluZyddID0gWEhSUG9sbGluZztcblxuICAvKipcbiAgICogVGhlIFhIUi1wb2xsaW5nIHRyYW5zcG9ydCB1c2VzIGxvbmcgcG9sbGluZyBYSFIgcmVxdWVzdHMgdG8gY3JlYXRlIGFcbiAgICogXCJwZXJzaXN0ZW50XCIgY29ubmVjdGlvbiB3aXRoIHRoZSBzZXJ2ZXIuXG4gICAqXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBmdW5jdGlvbiBYSFJQb2xsaW5nICgpIHtcbiAgICBpby5UcmFuc3BvcnQuWEhSLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaGVyaXRzIGZyb20gWEhSIHRyYW5zcG9ydC5cbiAgICovXG5cbiAgaW8udXRpbC5pbmhlcml0KFhIUlBvbGxpbmcsIGlvLlRyYW5zcG9ydC5YSFIpO1xuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgcHJvcGVydGllcyBmcm9tIFhIUiB0cmFuc3BvcnRcbiAgICovXG5cbiAgaW8udXRpbC5tZXJnZShYSFJQb2xsaW5nLCBpby5UcmFuc3BvcnQuWEhSKTtcblxuICAvKipcbiAgICogVHJhbnNwb3J0IG5hbWVcbiAgICpcbiAgICogQGFwaSBwdWJsaWNcbiAgICovXG5cbiAgWEhSUG9sbGluZy5wcm90b3R5cGUubmFtZSA9ICd4aHItcG9sbGluZyc7XG5cbiAgLyoqXG4gICAqIEluZGljYXRlcyB3aGV0aGVyIGhlYXJ0YmVhdHMgaXMgZW5hYmxlZCBmb3IgdGhpcyB0cmFuc3BvcnRcbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFhIUlBvbGxpbmcucHJvdG90eXBlLmhlYXJ0YmVhdHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gIC8qKiBcbiAgICogRXN0YWJsaXNoIGEgY29ubmVjdGlvbiwgZm9yIGlQaG9uZSBhbmQgQW5kcm9pZCB0aGlzIHdpbGwgYmUgZG9uZSBvbmNlIHRoZSBwYWdlXG4gICAqIGlzIGxvYWRlZC5cbiAgICpcbiAgICogQHJldHVybnMge1RyYW5zcG9ydH0gQ2hhaW5pbmcuXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIFhIUlBvbGxpbmcucHJvdG90eXBlLm9wZW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaW8uVHJhbnNwb3J0LlhIUi5wcm90b3R5cGUub3Blbi5jYWxsKHNlbGYpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvKipcbiAgICogU3RhcnRzIGEgWEhSIHJlcXVlc3QgdG8gd2FpdCBmb3IgaW5jb21pbmcgbWVzc2FnZXMuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBmdW5jdGlvbiBlbXB0eSAoKSB7fTtcblxuICBYSFJQb2xsaW5nLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLmlzT3BlbikgcmV0dXJuO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gc3RhdGVDaGFuZ2UgKCkge1xuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgIHRoaXMub25yZWFkeXN0YXRlY2hhbmdlID0gZW1wdHk7XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAgIHNlbGYub25EYXRhKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICBzZWxmLmdldCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYub25DbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIG9ubG9hZCAoKSB7XG4gICAgICB0aGlzLm9ubG9hZCA9IGVtcHR5O1xuICAgICAgdGhpcy5vbmVycm9yID0gZW1wdHk7XG4gICAgICBzZWxmLnJldHJ5Q291bnRlciA9IDE7XG4gICAgICBzZWxmLm9uRGF0YSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICBzZWxmLmdldCgpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBvbmVycm9yICgpIHtcbiAgICAgIHNlbGYucmV0cnlDb3VudGVyICsrO1xuICAgICAgaWYoIXNlbGYucmV0cnlDb3VudGVyIHx8IHNlbGYucmV0cnlDb3VudGVyID4gMykge1xuICAgICAgICBzZWxmLm9uQ2xvc2UoKTsgIFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5nZXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy54aHIgPSB0aGlzLnJlcXVlc3QoKTtcblxuICAgIGlmIChnbG9iYWwuWERvbWFpblJlcXVlc3QgJiYgdGhpcy54aHIgaW5zdGFuY2VvZiBYRG9tYWluUmVxdWVzdCkge1xuICAgICAgdGhpcy54aHIub25sb2FkID0gb25sb2FkO1xuICAgICAgdGhpcy54aHIub25lcnJvciA9IG9uZXJyb3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMueGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IHN0YXRlQ2hhbmdlO1xuICAgIH1cblxuICAgIHRoaXMueGhyLnNlbmQobnVsbCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhhbmRsZSB0aGUgdW5jbGVhbiBjbG9zZSBiZWhhdmlvci5cbiAgICpcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIFhIUlBvbGxpbmcucHJvdG90eXBlLm9uQ2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaW8uVHJhbnNwb3J0LlhIUi5wcm90b3R5cGUub25DbG9zZS5jYWxsKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMueGhyKSB7XG4gICAgICB0aGlzLnhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSB0aGlzLnhoci5vbmxvYWQgPSB0aGlzLnhoci5vbmVycm9yID0gZW1wdHk7XG4gICAgICB0cnkge1xuICAgICAgICB0aGlzLnhoci5hYm9ydCgpO1xuICAgICAgfSBjYXRjaChlKXt9XG4gICAgICB0aGlzLnhociA9IG51bGw7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBXZWJraXQgYmFzZWQgYnJvd3NlcnMgc2hvdyBhIGluZmluaXQgc3Bpbm5lciB3aGVuIHlvdSBzdGFydCBhIFhIUiByZXF1ZXN0XG4gICAqIGJlZm9yZSB0aGUgYnJvd3NlcnMgb25sb2FkIGV2ZW50IGlzIGNhbGxlZCBzbyB3ZSBuZWVkIHRvIGRlZmVyIG9wZW5pbmcgb2ZcbiAgICogdGhlIHRyYW5zcG9ydCB1bnRpbCB0aGUgb25sb2FkIGV2ZW50IGlzIGNhbGxlZC4gV3JhcHBpbmcgdGhlIGNiIGluIG91clxuICAgKiBkZWZlciBtZXRob2Qgc29sdmUgdGhpcy5cbiAgICpcbiAgICogQHBhcmFtIHtTb2NrZXR9IHNvY2tldCBUaGUgc29ja2V0IGluc3RhbmNlIHRoYXQgbmVlZHMgYSB0cmFuc3BvcnRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGNhbGxiYWNrXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICBYSFJQb2xsaW5nLnByb3RvdHlwZS5yZWFkeSA9IGZ1bmN0aW9uIChzb2NrZXQsIGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaW8udXRpbC5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICBmbi5jYWxsKHNlbGYpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgdGhlIHRyYW5zcG9ydCB0byB5b3VyIHB1YmxpYyBpby50cmFuc3BvcnRzIGFycmF5LlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgaW8udHJhbnNwb3J0cy5wdXNoKCd4aHItcG9sbGluZycpO1xuXG59KShcbiAgICAndW5kZWZpbmVkJyAhPSB0eXBlb2YgaW8gPyBpby5UcmFuc3BvcnQgOiBtb2R1bGUuZXhwb3J0c1xuICAsICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvIDogbW9kdWxlLnBhcmVudC5leHBvcnRzXG4gICwgdGhpc1xuKTtcblxuLyoqXG4gKiBzb2NrZXQuaW9cbiAqIENvcHlyaWdodChjKSAyMDExIExlYXJuQm9vc3QgPGRldkBsZWFybmJvb3N0LmNvbT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbihmdW5jdGlvbiAoZXhwb3J0cywgaW8sIGdsb2JhbCkge1xuICAvKipcbiAgICogVGhlcmUgaXMgYSB3YXkgdG8gaGlkZSB0aGUgbG9hZGluZyBpbmRpY2F0b3IgaW4gRmlyZWZveC4gSWYgeW91IGNyZWF0ZSBhbmRcbiAgICogcmVtb3ZlIGEgaWZyYW1lIGl0IHdpbGwgc3RvcCBzaG93aW5nIHRoZSBjdXJyZW50IGxvYWRpbmcgaW5kaWNhdG9yLlxuICAgKiBVbmZvcnR1bmF0ZWx5IHdlIGNhbid0IGZlYXR1cmUgZGV0ZWN0IHRoYXQgYW5kIFVBIHNuaWZmaW5nIGlzIGV2aWwuXG4gICAqXG4gICAqIEBhcGkgcHJpdmF0ZVxuICAgKi9cblxuICB2YXIgaW5kaWNhdG9yID0gZ2xvYmFsLmRvY3VtZW50ICYmIFwiTW96QXBwZWFyYW5jZVwiIGluXG4gICAgZ2xvYmFsLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZTtcblxuICAvKipcbiAgICogRXhwb3NlIGNvbnN0cnVjdG9yLlxuICAgKi9cblxuICBleHBvcnRzWydqc29ucC1wb2xsaW5nJ10gPSBKU09OUFBvbGxpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBKU09OUCB0cmFuc3BvcnQgY3JlYXRlcyBhbiBwZXJzaXN0ZW50IGNvbm5lY3Rpb24gYnkgZHluYW1pY2FsbHlcbiAgICogaW5zZXJ0aW5nIGEgc2NyaXB0IHRhZyBpbiB0aGUgcGFnZS4gVGhpcyBzY3JpcHQgdGFnIHdpbGwgcmVjZWl2ZSB0aGVcbiAgICogaW5mb3JtYXRpb24gb2YgdGhlIFNvY2tldC5JTyBzZXJ2ZXIuIFdoZW4gbmV3IGluZm9ybWF0aW9uIGlzIHJlY2VpdmVkXG4gICAqIGl0IGNyZWF0ZXMgYSBuZXcgc2NyaXB0IHRhZyBmb3IgdGhlIG5ldyBkYXRhIHN0cmVhbS5cbiAgICpcbiAgICogQGNvbnN0cnVjdG9yXG4gICAqIEBleHRlbmRzIHtpby5UcmFuc3BvcnQueGhyLXBvbGxpbmd9XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIEpTT05QUG9sbGluZyAoc29ja2V0KSB7XG4gICAgaW8uVHJhbnNwb3J0Wyd4aHItcG9sbGluZyddLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmluZGV4ID0gaW8uai5sZW5ndGg7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpby5qLnB1c2goZnVuY3Rpb24gKG1zZykge1xuICAgICAgc2VsZi5fKG1zZyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaGVyaXRzIGZyb20gWEhSIHBvbGxpbmcgdHJhbnNwb3J0LlxuICAgKi9cblxuICBpby51dGlsLmluaGVyaXQoSlNPTlBQb2xsaW5nLCBpby5UcmFuc3BvcnRbJ3hoci1wb2xsaW5nJ10pO1xuXG4gIC8qKlxuICAgKiBUcmFuc3BvcnQgbmFtZVxuICAgKlxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBKU09OUFBvbGxpbmcucHJvdG90eXBlLm5hbWUgPSAnanNvbnAtcG9sbGluZyc7XG5cbiAgLyoqXG4gICAqIFBvc3RzIGEgZW5jb2RlZCBtZXNzYWdlIHRvIHRoZSBTb2NrZXQuSU8gc2VydmVyIHVzaW5nIGFuIGlmcmFtZS5cbiAgICogVGhlIGlmcmFtZSBpcyB1c2VkIGJlY2F1c2Ugc2NyaXB0IHRhZ3MgY2FuIGNyZWF0ZSBQT1NUIGJhc2VkIHJlcXVlc3RzLlxuICAgKiBUaGUgaWZyYW1lIGlzIHBvc2l0aW9uZWQgb3V0c2lkZSBvZiB0aGUgdmlldyBzbyB0aGUgdXNlciBkb2VzIG5vdFxuICAgKiBub3RpY2UgaXQncyBleGlzdGVuY2UuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkYXRhIEEgZW5jb2RlZCBtZXNzYWdlLlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgSlNPTlBQb2xsaW5nLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICAgICwgcXVlcnkgPSBpby51dGlsLnF1ZXJ5KFxuICAgICAgICAgICAgIHRoaXMuc29ja2V0Lm9wdGlvbnMucXVlcnlcbiAgICAgICAgICAsICd0PScrICgrbmV3IERhdGUpICsgJyZpPScgKyB0aGlzLmluZGV4XG4gICAgICAgICk7XG5cbiAgICBpZiAoIXRoaXMuZm9ybSkge1xuICAgICAgdmFyIGZvcm0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdmb3JtJylcbiAgICAgICAgLCBhcmVhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKVxuICAgICAgICAsIGlkID0gdGhpcy5pZnJhbWVJZCA9ICdzb2NrZXRpb19pZnJhbWVfJyArIHRoaXMuaW5kZXhcbiAgICAgICAgLCBpZnJhbWU7XG5cbiAgICAgIGZvcm0uY2xhc3NOYW1lID0gJ3NvY2tldGlvJztcbiAgICAgIGZvcm0uc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnO1xuICAgICAgZm9ybS5zdHlsZS50b3AgPSAnMHB4JztcbiAgICAgIGZvcm0uc3R5bGUubGVmdCA9ICcwcHgnO1xuICAgICAgZm9ybS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgZm9ybS50YXJnZXQgPSBpZDtcbiAgICAgIGZvcm0ubWV0aG9kID0gJ1BPU1QnO1xuICAgICAgZm9ybS5zZXRBdHRyaWJ1dGUoJ2FjY2VwdC1jaGFyc2V0JywgJ3V0Zi04Jyk7XG4gICAgICBhcmVhLm5hbWUgPSAnZCc7XG4gICAgICBmb3JtLmFwcGVuZENoaWxkKGFyZWEpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmb3JtKTtcblxuICAgICAgdGhpcy5mb3JtID0gZm9ybTtcbiAgICAgIHRoaXMuYXJlYSA9IGFyZWE7XG4gICAgfVxuXG4gICAgdGhpcy5mb3JtLmFjdGlvbiA9IHRoaXMucHJlcGFyZVVybCgpICsgcXVlcnk7XG5cbiAgICBmdW5jdGlvbiBjb21wbGV0ZSAoKSB7XG4gICAgICBpbml0SWZyYW1lKCk7XG4gICAgICBzZWxmLnNvY2tldC5zZXRCdWZmZXIoZmFsc2UpO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBpbml0SWZyYW1lICgpIHtcbiAgICAgIGlmIChzZWxmLmlmcmFtZSkge1xuICAgICAgICBzZWxmLmZvcm0ucmVtb3ZlQ2hpbGQoc2VsZi5pZnJhbWUpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICAvLyBpZTYgZHluYW1pYyBpZnJhbWVzIHdpdGggdGFyZ2V0PVwiXCIgc3VwcG9ydCAodGhhbmtzIENocmlzIExhbWJhY2hlcilcbiAgICAgICAgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnPGlmcmFtZSBuYW1lPVwiJysgc2VsZi5pZnJhbWVJZCArJ1wiPicpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgaWZyYW1lLm5hbWUgPSBzZWxmLmlmcmFtZUlkO1xuICAgICAgfVxuXG4gICAgICBpZnJhbWUuaWQgPSBzZWxmLmlmcmFtZUlkO1xuXG4gICAgICBzZWxmLmZvcm0uYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICAgIHNlbGYuaWZyYW1lID0gaWZyYW1lO1xuICAgIH07XG5cbiAgICBpbml0SWZyYW1lKCk7XG5cbiAgICAvLyB3ZSB0ZW1wb3JhcmlseSBzdHJpbmdpZnkgdW50aWwgd2UgZmlndXJlIG91dCBob3cgdG8gcHJldmVudFxuICAgIC8vIGJyb3dzZXJzIGZyb20gdHVybmluZyBgXFxuYCBpbnRvIGBcXHJcXG5gIGluIGZvcm0gaW5wdXRzXG4gICAgdGhpcy5hcmVhLnZhbHVlID0gaW8uSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5mb3JtLnN1Ym1pdCgpO1xuICAgIH0gY2F0Y2goZSkge31cblxuICAgIGlmICh0aGlzLmlmcmFtZS5hdHRhY2hFdmVudCkge1xuICAgICAgaWZyYW1lLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuaWZyYW1lLnJlYWR5U3RhdGUgPT0gJ2NvbXBsZXRlJykge1xuICAgICAgICAgIGNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaWZyYW1lLm9ubG9hZCA9IGNvbXBsZXRlO1xuICAgIH1cblxuICAgIHRoaXMuc29ja2V0LnNldEJ1ZmZlcih0cnVlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBKU09OUCBwb2xsIHRoYXQgY2FuIGJlIHVzZWQgdG8gbGlzdGVuXG4gICAqIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBTb2NrZXQuSU8gc2VydmVyLlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgSlNPTlBQb2xsaW5nLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgICAsIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgICAsIHF1ZXJ5ID0gaW8udXRpbC5xdWVyeShcbiAgICAgICAgICAgICB0aGlzLnNvY2tldC5vcHRpb25zLnF1ZXJ5XG4gICAgICAgICAgLCAndD0nKyAoK25ldyBEYXRlKSArICcmaT0nICsgdGhpcy5pbmRleFxuICAgICAgICApO1xuXG4gICAgaWYgKHRoaXMuc2NyaXB0KSB7XG4gICAgICB0aGlzLnNjcmlwdC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuc2NyaXB0KTtcbiAgICAgIHRoaXMuc2NyaXB0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlO1xuICAgIHNjcmlwdC5zcmMgPSB0aGlzLnByZXBhcmVVcmwoKSArIHF1ZXJ5O1xuICAgIHNjcmlwdC5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5vbkNsb3NlKCk7XG4gICAgfTtcblxuICAgIHZhciBpbnNlcnRBdCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKVswXTtcbiAgICBpbnNlcnRBdC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShzY3JpcHQsIGluc2VydEF0KTtcbiAgICB0aGlzLnNjcmlwdCA9IHNjcmlwdDtcblxuICAgIGlmIChpbmRpY2F0b3IpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaWZyYW1lKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChpZnJhbWUpO1xuICAgICAgfSwgMTAwKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciB0aGUgaW5jb21pbmcgbWVzc2FnZSBzdHJlYW0gZnJvbSB0aGUgU29ja2V0LklPIHNlcnZlci5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRhdGEgVGhlIG1lc3NhZ2VcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIEpTT05QUG9sbGluZy5wcm90b3R5cGUuXyA9IGZ1bmN0aW9uIChtc2cpIHtcbiAgICB0aGlzLm9uRGF0YShtc2cpO1xuICAgIGlmICh0aGlzLmlzT3Blbikge1xuICAgICAgdGhpcy5nZXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBpbmRpY2F0b3IgaGFjayBvbmx5IHdvcmtzIGFmdGVyIG9ubG9hZFxuICAgKlxuICAgKiBAcGFyYW0ge1NvY2tldH0gc29ja2V0IFRoZSBzb2NrZXQgaW5zdGFuY2UgdGhhdCBuZWVkcyBhIHRyYW5zcG9ydFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2tcbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuXG4gIEpTT05QUG9sbGluZy5wcm90b3R5cGUucmVhZHkgPSBmdW5jdGlvbiAoc29ja2V0LCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIWluZGljYXRvcikgcmV0dXJuIGZuLmNhbGwodGhpcyk7XG5cbiAgICBpby51dGlsLmxvYWQoZnVuY3Rpb24gKCkge1xuICAgICAgZm4uY2FsbChzZWxmKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIGJyb3dzZXIgc3VwcG9ydHMgdGhpcyB0cmFuc3BvcnQuXG4gICAqXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIEpTT05QUG9sbGluZy5jaGVjayA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJ2RvY3VtZW50JyBpbiBnbG9iYWw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGNyb3NzIGRvbWFpbiByZXF1ZXN0cyBhcmUgc3VwcG9ydGVkXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKiBAYXBpIHB1YmxpY1xuICAgKi9cblxuICBKU09OUFBvbGxpbmcueGRvbWFpbkNoZWNrID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBZGQgdGhlIHRyYW5zcG9ydCB0byB5b3VyIHB1YmxpYyBpby50cmFuc3BvcnRzIGFycmF5LlxuICAgKlxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG5cbiAgaW8udHJhbnNwb3J0cy5wdXNoKCdqc29ucC1wb2xsaW5nJyk7XG5cbn0pKFxuICAgICd1bmRlZmluZWQnICE9IHR5cGVvZiBpbyA/IGlvLlRyYW5zcG9ydCA6IG1vZHVsZS5leHBvcnRzXG4gICwgJ3VuZGVmaW5lZCcgIT0gdHlwZW9mIGlvID8gaW8gOiBtb2R1bGUucGFyZW50LmV4cG9ydHNcbiAgLCB0aGlzXG4pO1xuXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7IHJldHVybiBpbzsgfSk7XG59XG59KSgpO1xufSkoKSIsInZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG5mdW5jdGlvbiBTdHJlYW0oKSB7XG4gIGV2ZW50cy5FdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoU3RyZWFtLCBldmVudHMuRXZlbnRFbWl0dGVyKTtcbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtO1xuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC40LnhcblN0cmVhbS5TdHJlYW0gPSBTdHJlYW07XG5cblN0cmVhbS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIG9wdGlvbnMpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXM7XG5cbiAgZnVuY3Rpb24gb25kYXRhKGNodW5rKSB7XG4gICAgaWYgKGRlc3Qud3JpdGFibGUpIHtcbiAgICAgIGlmIChmYWxzZSA9PT0gZGVzdC53cml0ZShjaHVuaykgJiYgc291cmNlLnBhdXNlKSB7XG4gICAgICAgIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNvdXJjZS5vbignZGF0YScsIG9uZGF0YSk7XG5cbiAgZnVuY3Rpb24gb25kcmFpbigpIHtcbiAgICBpZiAoc291cmNlLnJlYWRhYmxlICYmIHNvdXJjZS5yZXN1bWUpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKTtcbiAgICB9XG4gIH1cblxuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIC8vIElmIHRoZSAnZW5kJyBvcHRpb24gaXMgbm90IHN1cHBsaWVkLCBkZXN0LmVuZCgpIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgLy8gc291cmNlIGdldHMgdGhlICdlbmQnIG9yICdjbG9zZScgZXZlbnRzLiAgT25seSBkZXN0LmVuZCgpIG9uY2UsIGFuZFxuICAvLyBvbmx5IHdoZW4gYWxsIHNvdXJjZXMgaGF2ZSBlbmRlZC5cbiAgaWYgKCFkZXN0Ll9pc1N0ZGlvICYmICghb3B0aW9ucyB8fCBvcHRpb25zLmVuZCAhPT0gZmFsc2UpKSB7XG4gICAgZGVzdC5fcGlwZUNvdW50ID0gZGVzdC5fcGlwZUNvdW50IHx8IDA7XG4gICAgZGVzdC5fcGlwZUNvdW50Kys7XG5cbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5fcGlwZUNvdW50LS07XG5cbiAgICAvLyByZW1vdmUgdGhlIGxpc3RlbmVyc1xuICAgIGNsZWFudXAoKTtcblxuICAgIGlmIChkZXN0Ll9waXBlQ291bnQgPiAwKSB7XG4gICAgICAvLyB3YWl0aW5nIGZvciBvdGhlciBpbmNvbWluZyBzdHJlYW1zIHRvIGVuZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGlmIChkaWRPbkVuZCkgcmV0dXJuO1xuICAgIGRpZE9uRW5kID0gdHJ1ZTtcblxuICAgIGRlc3QuX3BpcGVDb3VudC0tO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBsaXN0ZW5lcnNcbiAgICBjbGVhbnVwKCk7XG5cbiAgICBpZiAoZGVzdC5fcGlwZUNvdW50ID4gMCkge1xuICAgICAgLy8gd2FpdGluZyBmb3Igb3RoZXIgaW5jb21pbmcgc3RyZWFtcyB0byBlbmQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKHRoaXMubGlzdGVuZXJzKCdlcnJvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCBzdHJlYW0gZXJyb3IgaW4gcGlwZS5cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgLy8gcmVtb3ZlIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzIHRoYXQgd2VyZSBhZGRlZC5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2RhdGEnLCBvbmRhdGEpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcblxuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIGNsZWFudXApO1xuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfVxuXG4gIHNvdXJjZS5vbignZW5kJywgY2xlYW51cCk7XG4gIHNvdXJjZS5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0Lm9uKCdlbmQnLCBjbGVhbnVwKTtcbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsInZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcblxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcbmV4cG9ydHMuaXNEYXRlID0gZnVuY3Rpb24ob2JqKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IERhdGVdJ307XG5leHBvcnRzLmlzUmVnRXhwID0gZnVuY3Rpb24ob2JqKXtyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nfTtcblxuXG5leHBvcnRzLnByaW50ID0gZnVuY3Rpb24gKCkge307XG5leHBvcnRzLnB1dHMgPSBmdW5jdGlvbiAoKSB7fTtcbmV4cG9ydHMuZGVidWcgPSBmdW5jdGlvbigpIHt9O1xuXG5leHBvcnRzLmluc3BlY3QgPSBmdW5jdGlvbihvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMpIHtcbiAgdmFyIHNlZW4gPSBbXTtcblxuICB2YXIgc3R5bGl6ZSA9IGZ1bmN0aW9uKHN0ciwgc3R5bGVUeXBlKSB7XG4gICAgLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG4gICAgdmFyIHN0eWxlcyA9XG4gICAgICAgIHsgJ2JvbGQnIDogWzEsIDIyXSxcbiAgICAgICAgICAnaXRhbGljJyA6IFszLCAyM10sXG4gICAgICAgICAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAgICAgICAgICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICAgICAgICAgJ3doaXRlJyA6IFszNywgMzldLFxuICAgICAgICAgICdncmV5JyA6IFs5MCwgMzldLFxuICAgICAgICAgICdibGFjaycgOiBbMzAsIDM5XSxcbiAgICAgICAgICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgICAgICAgICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgICAgICAgICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICAgICAgICAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICAgICAgICAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgICAgICAgICAneWVsbG93JyA6IFszMywgMzldIH07XG5cbiAgICB2YXIgc3R5bGUgPVxuICAgICAgICB7ICdzcGVjaWFsJzogJ2N5YW4nLFxuICAgICAgICAgICdudW1iZXInOiAnYmx1ZScsXG4gICAgICAgICAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgICAgICAgICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAgICAgICAgICdudWxsJzogJ2JvbGQnLFxuICAgICAgICAgICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAgICAgICAgICdkYXRlJzogJ21hZ2VudGEnLFxuICAgICAgICAgIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICAgICAgICAgJ3JlZ2V4cCc6ICdyZWQnIH1bc3R5bGVUeXBlXTtcblxuICAgIGlmIChzdHlsZSkge1xuICAgICAgcmV0dXJuICdcXDAzM1snICsgc3R5bGVzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICAgJ1xcMDMzWycgKyBzdHlsZXNbc3R5bGVdWzFdICsgJ20nO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgfTtcbiAgaWYgKCEgY29sb3JzKSB7XG4gICAgc3R5bGl6ZSA9IGZ1bmN0aW9uKHN0ciwgc3R5bGVUeXBlKSB7IHJldHVybiBzdHI7IH07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXQodmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAgIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLmluc3BlY3QgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICAgIHZhbHVlICE9PSBleHBvcnRzICYmXG4gICAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMpO1xuICAgIH1cblxuICAgIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gICAgc3dpdGNoICh0eXBlb2YgdmFsdWUpIHtcbiAgICAgIGNhc2UgJ3VuZGVmaW5lZCc6XG4gICAgICAgIHJldHVybiBzdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG5cbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgICAgIHJldHVybiBzdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuXG4gICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG5cbiAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAgIH1cbiAgICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG4gICAgfVxuXG4gICAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICAgIHZhciB2aXNpYmxlX2tleXMgPSBPYmplY3Rfa2V5cyh2YWx1ZSk7XG4gICAgdmFyIGtleXMgPSBzaG93SGlkZGVuID8gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXModmFsdWUpIDogdmlzaWJsZV9rZXlzO1xuXG4gICAgLy8gRnVuY3Rpb25zIHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnJyArIHZhbHVlLCAncmVnZXhwJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGF0ZXMgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZFxuICAgIGlmIChpc0RhdGUodmFsdWUpICYmIGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc3R5bGl6ZSh2YWx1ZS50b1VUQ1N0cmluZygpLCAnZGF0ZScpO1xuICAgIH1cblxuICAgIHZhciBiYXNlLCB0eXBlLCBicmFjZXM7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBvYmplY3QgdHlwZVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgdHlwZSA9ICdBcnJheSc7XG4gICAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICAgIH0gZWxzZSB7XG4gICAgICB0eXBlID0gJ09iamVjdCc7XG4gICAgICBicmFjZXMgPSBbJ3snLCAnfSddO1xuICAgIH1cblxuICAgIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICBiYXNlID0gKGlzUmVnRXhwKHZhbHVlKSkgPyAnICcgKyB2YWx1ZSA6ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJhc2UgPSAnJztcbiAgICB9XG5cbiAgICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgYmFzZSA9ICcgJyArIHZhbHVlLnRvVVRDU3RyaW5nKCk7XG4gICAgfVxuXG4gICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgICB9XG5cbiAgICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnJyArIHZhbHVlLCAncmVnZXhwJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgICB2YXIgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgbmFtZSwgc3RyO1xuICAgICAgaWYgKHZhbHVlLl9fbG9va3VwR2V0dGVyX18pIHtcbiAgICAgICAgaWYgKHZhbHVlLl9fbG9va3VwR2V0dGVyX18oa2V5KSkge1xuICAgICAgICAgIGlmICh2YWx1ZS5fX2xvb2t1cFNldHRlcl9fKGtleSkpIHtcbiAgICAgICAgICAgIHN0ciA9IHN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0ciA9IHN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHZhbHVlLl9fbG9va3VwU2V0dGVyX18oa2V5KSkge1xuICAgICAgICAgICAgc3RyID0gc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHZpc2libGVfa2V5cy5pbmRleE9mKGtleSkgPCAwKSB7XG4gICAgICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gICAgICB9XG4gICAgICBpZiAoIXN0cikge1xuICAgICAgICBpZiAoc2Vlbi5pbmRleE9mKHZhbHVlW2tleV0pIDwgMCkge1xuICAgICAgICAgIGlmIChyZWN1cnNlVGltZXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0ciA9IGZvcm1hdCh2YWx1ZVtrZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RyID0gZm9ybWF0KHZhbHVlW2tleV0sIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGUgPT09ICdBcnJheScgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cbiAgICAgICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICAgICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICAgICAgbmFtZSA9IHN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgICAgIG5hbWUgPSBzdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG4gICAgfSk7XG5cbiAgICBzZWVuLnBvcCgpO1xuXG4gICAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICAgIG51bUxpbmVzRXN0Kys7XG4gICAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgICByZXR1cm4gcHJldiArIGN1ci5sZW5ndGggKyAxO1xuICAgIH0sIDApO1xuXG4gICAgaWYgKGxlbmd0aCA+IDUwKSB7XG4gICAgICBvdXRwdXQgPSBicmFjZXNbMF0gK1xuICAgICAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICAgICAnICcgK1xuICAgICAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgICAgICcgJyArXG4gICAgICAgICAgICAgICBicmFjZXNbMV07XG5cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0ID0gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cbiAgcmV0dXJuIGZvcm1hdChvYmosICh0eXBlb2YgZGVwdGggPT09ICd1bmRlZmluZWQnID8gMiA6IGRlcHRoKSk7XG59O1xuXG5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIGFyIGluc3RhbmNlb2YgQXJyYXkgfHxcbiAgICAgICAgIEFycmF5LmlzQXJyYXkoYXIpIHx8XG4gICAgICAgICAoYXIgJiYgYXIgIT09IE9iamVjdC5wcm90b3R5cGUgJiYgaXNBcnJheShhci5fX3Byb3RvX18pKTtcbn1cblxuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gcmUgaW5zdGFuY2VvZiBSZWdFeHAgfHxcbiAgICAodHlwZW9mIHJlID09PSAnb2JqZWN0JyAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocmUpID09PSAnW29iamVjdCBSZWdFeHBdJyk7XG59XG5cblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgaWYgKGQgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKHR5cGVvZiBkICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICB2YXIgcHJvcGVydGllcyA9IERhdGUucHJvdG90eXBlICYmIE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzKERhdGUucHJvdG90eXBlKTtcbiAgdmFyIHByb3RvID0gZC5fX3Byb3RvX18gJiYgT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXMoZC5fX3Byb3RvX18pO1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocHJvdG8pID09PSBKU09OLnN0cmluZ2lmeShwcm9wZXJ0aWVzKTtcbn1cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cbmV4cG9ydHMubG9nID0gZnVuY3Rpb24gKG1zZykge307XG5cbmV4cG9ydHMucHVtcCA9IG51bGw7XG5cbnZhciBPYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgcmVzLnB1c2goa2V5KTtcbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgT2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICAgIC8vIGZyb20gZXM1LXNoaW1cbiAgICB2YXIgb2JqZWN0O1xuICAgIGlmIChwcm90b3R5cGUgPT09IG51bGwpIHtcbiAgICAgICAgb2JqZWN0ID0geyAnX19wcm90b19fJyA6IG51bGwgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAndHlwZW9mIHByb3RvdHlwZVsnICsgKHR5cGVvZiBwcm90b3R5cGUpICsgJ10gIT0gXFwnb2JqZWN0XFwnJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgVHlwZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICAgICAgb2JqZWN0ID0gbmV3IFR5cGUoKTtcbiAgICAgICAgb2JqZWN0Ll9fcHJvdG9fXyA9IHByb3RvdHlwZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhvYmplY3QsIHByb3BlcnRpZXMpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xufTtcblxuZXhwb3J0cy5pbmhlcml0cyA9IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3RfY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfVxuICB9KTtcbn07XG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICh0eXBlb2YgZiAhPT0gJ3N0cmluZycpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goZXhwb3J0cy5pbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzogcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKXtcbiAgICBpZiAoeCA9PT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgZXhwb3J0cy5pbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcbiIsInZhciBpc0FycmF5ID0gdHlwZW9mIEFycmF5LmlzQXJyYXkgPT09ICdmdW5jdGlvbidcbiAgICA/IEFycmF5LmlzQXJyYXlcbiAgICA6IGZ1bmN0aW9uICh4cykge1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgIH07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gb2JqZWN0S2V5cyhvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0ICE9PSBPYmplY3Qob2JqZWN0KSkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBvYmplY3QnKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoa2V5KSkga2V5c1trZXlzLmxlbmd0aF0gPSBrZXk7XG4gICAgcmV0dXJuIGtleXM7XG59XG5cblxuLyohXG4gKiBxdWVyeXN0cmluZ1xuICogQ29weXJpZ2h0KGMpIDIwMTAgVEogSG9sb3dheWNodWsgPHRqQHZpc2lvbi1tZWRpYS5jYT5cbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogTGlicmFyeSB2ZXJzaW9uLlxuICovXG5cbmV4cG9ydHMudmVyc2lvbiA9ICcwLjMuMSc7XG5cbi8qKlxuICogT2JqZWN0I3RvU3RyaW5nKCkgcmVmIGZvciBzdHJpbmdpZnkoKS5cbiAqL1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIENhY2hlIG5vbi1pbnRlZ2VyIHRlc3QgcmVnZXhwLlxuICovXG5cbnZhciBub3RpbnQgPSAvW14wLTldLztcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gcXVlcnkgYHN0cmAsIHJldHVybmluZyBhbiBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24oc3RyKXtcbiAgaWYgKG51bGwgPT0gc3RyIHx8ICcnID09IHN0cikgcmV0dXJuIHt9O1xuXG4gIGZ1bmN0aW9uIHByb21vdGUocGFyZW50LCBrZXkpIHtcbiAgICBpZiAocGFyZW50W2tleV0ubGVuZ3RoID09IDApIHJldHVybiBwYXJlbnRba2V5XSA9IHt9O1xuICAgIHZhciB0ID0ge307XG4gICAgZm9yICh2YXIgaSBpbiBwYXJlbnRba2V5XSkgdFtpXSA9IHBhcmVudFtrZXldW2ldO1xuICAgIHBhcmVudFtrZXldID0gdDtcbiAgICByZXR1cm4gdDtcbiAgfVxuXG4gIHJldHVybiBTdHJpbmcoc3RyKVxuICAgIC5zcGxpdCgnJicpXG4gICAgLnJlZHVjZShmdW5jdGlvbihyZXQsIHBhaXIpe1xuICAgICAgdHJ5eyBcbiAgICAgICAgcGFpciA9IGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAvLyBpZ25vcmVcbiAgICAgIH1cblxuICAgICAgdmFyIGVxbCA9IHBhaXIuaW5kZXhPZignPScpXG4gICAgICAgICwgYnJhY2UgPSBsYXN0QnJhY2VJbktleShwYWlyKVxuICAgICAgICAsIGtleSA9IHBhaXIuc3Vic3RyKDAsIGJyYWNlIHx8IGVxbClcbiAgICAgICAgLCB2YWwgPSBwYWlyLnN1YnN0cihicmFjZSB8fCBlcWwsIHBhaXIubGVuZ3RoKVxuICAgICAgICAsIHZhbCA9IHZhbC5zdWJzdHIodmFsLmluZGV4T2YoJz0nKSArIDEsIHZhbC5sZW5ndGgpXG4gICAgICAgICwgcGFyZW50ID0gcmV0O1xuXG4gICAgICAvLyA/Zm9vXG4gICAgICBpZiAoJycgPT0ga2V5KSBrZXkgPSBwYWlyLCB2YWwgPSAnJztcblxuICAgICAgLy8gbmVzdGVkXG4gICAgICBpZiAofmtleS5pbmRleE9mKCddJykpIHtcbiAgICAgICAgdmFyIHBhcnRzID0ga2V5LnNwbGl0KCdbJylcbiAgICAgICAgICAsIGxlbiA9IHBhcnRzLmxlbmd0aFxuICAgICAgICAgICwgbGFzdCA9IGxlbiAtIDE7XG5cbiAgICAgICAgZnVuY3Rpb24gcGFyc2UocGFydHMsIHBhcmVudCwga2V5KSB7XG4gICAgICAgICAgdmFyIHBhcnQgPSBwYXJ0cy5zaGlmdCgpO1xuXG4gICAgICAgICAgLy8gZW5kXG4gICAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBpZiAoaXNBcnJheShwYXJlbnRba2V5XSkpIHtcbiAgICAgICAgICAgICAgcGFyZW50W2tleV0ucHVzaCh2YWwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgnb2JqZWN0JyA9PSB0eXBlb2YgcGFyZW50W2tleV0pIHtcbiAgICAgICAgICAgICAgcGFyZW50W2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCd1bmRlZmluZWQnID09IHR5cGVvZiBwYXJlbnRba2V5XSkge1xuICAgICAgICAgICAgICBwYXJlbnRba2V5XSA9IHZhbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBhcmVudFtrZXldID0gW3BhcmVudFtrZXldLCB2YWxdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIC8vIGFycmF5XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9iaiA9IHBhcmVudFtrZXldID0gcGFyZW50W2tleV0gfHwgW107XG4gICAgICAgICAgICBpZiAoJ10nID09IHBhcnQpIHtcbiAgICAgICAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgICAgICAgIGlmICgnJyAhPSB2YWwpIG9iai5wdXNoKHZhbCk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT0gdHlwZW9mIG9iaikge1xuICAgICAgICAgICAgICAgIG9ialtvYmplY3RLZXlzKG9iaikubGVuZ3RoXSA9IHZhbDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBvYmogPSBwYXJlbnRba2V5XSA9IFtwYXJlbnRba2V5XSwgdmFsXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcHJvcFxuICAgICAgICAgICAgfSBlbHNlIGlmICh+cGFydC5pbmRleE9mKCddJykpIHtcbiAgICAgICAgICAgICAgcGFydCA9IHBhcnQuc3Vic3RyKDAsIHBhcnQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgIGlmKG5vdGludC50ZXN0KHBhcnQpICYmIGlzQXJyYXkob2JqKSkgb2JqID0gcHJvbW90ZShwYXJlbnQsIGtleSk7XG4gICAgICAgICAgICAgIHBhcnNlKHBhcnRzLCBvYmosIHBhcnQpO1xuICAgICAgICAgICAgLy8ga2V5XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZihub3RpbnQudGVzdChwYXJ0KSAmJiBpc0FycmF5KG9iaikpIG9iaiA9IHByb21vdGUocGFyZW50LCBrZXkpO1xuICAgICAgICAgICAgICBwYXJzZShwYXJ0cywgb2JqLCBwYXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwYXJzZShwYXJ0cywgcGFyZW50LCAnYmFzZScpO1xuICAgICAgLy8gb3B0aW1pemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChub3RpbnQudGVzdChrZXkpICYmIGlzQXJyYXkocGFyZW50LmJhc2UpKSB7XG4gICAgICAgICAgdmFyIHQgPSB7fTtcbiAgICAgICAgICBmb3IodmFyIGsgaW4gcGFyZW50LmJhc2UpIHRba10gPSBwYXJlbnQuYmFzZVtrXTtcbiAgICAgICAgICBwYXJlbnQuYmFzZSA9IHQ7XG4gICAgICAgIH1cbiAgICAgICAgc2V0KHBhcmVudC5iYXNlLCBrZXksIHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSwge2Jhc2U6IHt9fSkuYmFzZTtcbn07XG5cbi8qKlxuICogVHVybiB0aGUgZ2l2ZW4gYG9iamAgaW50byBhIHF1ZXJ5IHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxudmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24ob2JqLCBwcmVmaXgpIHtcbiAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBzdHJpbmdpZnlBcnJheShvYmosIHByZWZpeCk7XG4gIH0gZWxzZSBpZiAoJ1tvYmplY3QgT2JqZWN0XScgPT0gdG9TdHJpbmcuY2FsbChvYmopKSB7XG4gICAgcmV0dXJuIHN0cmluZ2lmeU9iamVjdChvYmosIHByZWZpeCk7XG4gIH0gZWxzZSBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIG9iaikge1xuICAgIHJldHVybiBzdHJpbmdpZnlTdHJpbmcob2JqLCBwcmVmaXgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmVmaXg7XG4gIH1cbn07XG5cbi8qKlxuICogU3RyaW5naWZ5IHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzdHJpbmdpZnlTdHJpbmcoc3RyLCBwcmVmaXgpIHtcbiAgaWYgKCFwcmVmaXgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0cmluZ2lmeSBleHBlY3RzIGFuIG9iamVjdCcpO1xuICByZXR1cm4gcHJlZml4ICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IHRoZSBnaXZlbiBgYXJyYC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHN0cmluZ2lmeUFycmF5KGFyciwgcHJlZml4KSB7XG4gIHZhciByZXQgPSBbXTtcbiAgaWYgKCFwcmVmaXgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0cmluZ2lmeSBleHBlY3RzIGFuIG9iamVjdCcpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIHJldC5wdXNoKHN0cmluZ2lmeShhcnJbaV0sIHByZWZpeCArICdbXScpKTtcbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdGhlIGdpdmVuIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHN0cmluZ2lmeU9iamVjdChvYmosIHByZWZpeCkge1xuICB2YXIgcmV0ID0gW11cbiAgICAsIGtleXMgPSBvYmplY3RLZXlzKG9iailcbiAgICAsIGtleTtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHJldC5wdXNoKHN0cmluZ2lmeShvYmpba2V5XSwgcHJlZml4XG4gICAgICA/IHByZWZpeCArICdbJyArIGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJ10nXG4gICAgICA6IGVuY29kZVVSSUNvbXBvbmVudChrZXkpKSk7XG4gIH1cbiAgcmV0dXJuIHJldC5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogU2V0IGBvYmpgJ3MgYGtleWAgdG8gYHZhbGAgcmVzcGVjdGluZ1xuICogdGhlIHdlaXJkIGFuZCB3b25kZXJmdWwgc3ludGF4IG9mIGEgcXMsXG4gKiB3aGVyZSBcImZvbz1iYXImZm9vPWJhelwiIGJlY29tZXMgYW4gYXJyYXkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2V0KG9iaiwga2V5LCB2YWwpIHtcbiAgdmFyIHYgPSBvYmpba2V5XTtcbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIG9ialtrZXldID0gdmFsO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodikpIHtcbiAgICB2LnB1c2godmFsKTtcbiAgfSBlbHNlIHtcbiAgICBvYmpba2V5XSA9IFt2LCB2YWxdO1xuICB9XG59XG5cbi8qKlxuICogTG9jYXRlIGxhc3QgYnJhY2UgaW4gYHN0cmAgd2l0aGluIHRoZSBrZXkuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbGFzdEJyYWNlSW5LZXkoc3RyKSB7XG4gIHZhciBsZW4gPSBzdHIubGVuZ3RoXG4gICAgLCBicmFjZVxuICAgICwgYztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGMgPSBzdHJbaV07XG4gICAgaWYgKCddJyA9PSBjKSBicmFjZSA9IGZhbHNlO1xuICAgIGlmICgnWycgPT0gYykgYnJhY2UgPSB0cnVlO1xuICAgIGlmICgnPScgPT0gYyAmJiAhYnJhY2UpIHJldHVybiBpO1xuICB9XG59XG4iLCIvLyBub3RoaW5nIHRvIHNlZSBoZXJlLi4uIG5vIGZpbGUgbWV0aG9kcyBmb3IgdGhlIGJyb3dzZXJcbiIsInZhciBxcyA9IHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJylcbiAgLCBldmVyID0gcmVxdWlyZSgnZXZlcicpXG4gICwgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKVxuICAsICQgPSByZXF1aXJlKCdzaXp6bGUnKVxuICAsIGZzID0gcmVxdWlyZSgnZnMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHVwXG5cbmZ1bmN0aW9uIHNldHVwKGVycm9yLCB1c2VyLCBzb3VyY2UpIHtcbiAgdmFyIGFjY291bnQgPSBuZXcgTG9naW4oZXJyb3IsIHVzZXIsIHNvdXJjZSkgXG5cbiAgaGFzaF9sb2dpbih0cnlfaGFzaClcblxuICBhY2NvdW50LnNvdXJjZS5vbignbG9naW4gZmFpbGVkJywgbG9naW5fZmFpbGVkKVxuICBhY2NvdW50LnNvdXJjZS5vbmNlKCdsb2dpbiBzdWNjZXNzJywgYWNjb3VudC5sb2dpbl9zdWNjZXNzKVxuXG4gIHJldHVybiBhY2NvdW50XG5cblxuICBmdW5jdGlvbiB0cnlfaGFzaChlcnIsIHlvdSkge1xuICAgIGlmKGVycikge1xuICAgICAgYWNjb3VudC51c2VyLmVtaXQoJ2xvZ2luJywgbnVsbClcbiAgICAgIGFjY291bnQuc291cmNlLmVtaXQoJ2xvZ2luJywgbnVsbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHNvdXJjZS5lbWl0KCdsb2dpbicsIHlvdSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGxvZ2luX2ZhaWxlZChtZXNzYWdlKSB7XG4gICAgIGFjY291bnQuZXJyb3IucXVldWUobWVzc2FnZSlcbiAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJ1xuICB9XG59XG5cblxuZnVuY3Rpb24gTG9naW4oZXJyb3IsIHVzZXIsIHNvdXJjZSkge1xuICB0aGlzLmVycm9yID0gZXJyb3JcbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2VcbiAgdGhpcy51c2VyID0gdXNlclxufVxuXG52YXIgY29ucyA9IExvZ2luXG52YXIgcHJvdG8gPSBjb25zLnByb3RvdHlwZVxuXG5wcm90by5jb25zdHJ1Y3RvciA9IGNvbnNcblxuXG5wcm90by5yZW5kZXIgPSBmdW5jdGlvbihlbCwgc3RhdGUpIHtcblxuICBpZighc3RhdGUuYWNjb3VudCkge1xuICAgIGZvcm1fbG9naW4oZWwsIHRyeV9mb3JtKVxuICB9XG5cbiAgZnVuY3Rpb24gZm9ybV9sb2dpbihlbCwgcmVhZHkpIHtcbiAgICB2YXIgbG9naW5faHRtbCA9IFwiPGZvcm0+XFxuICAgIDxkaXY+XFxuICAgICAgICA8bGFiZWwgZm9yPVxcXCJuaWNrXFxcIj5OaWNrOjwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgcmVxdWlyZWQgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcIm5pY2tcXFwiIC8+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZXJyb3JcXFwiIGFyaWEtbGl2ZT1cXFwicG9saXRlXFxcIj48L3NwYW4+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2PlxcbiAgICAgICAgPGxhYmVsIGZvcj1cXFwiZW1haWxcXFwiPkVtYWlsOjwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgcmVxdWlyZWQgdHlwZT1cXFwiZW1haWxcXFwiIGlkPVxcXCJlbWFpbFxcXCIvPlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImVycm9yXFxcIiBhcmlhLWxpdmU9XFxcInBvbGl0ZVxcXCI+PC9zcGFuPlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiYnV0dG9uXFxcIj5cXG4gICAgICAgIDxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIj5QbGF5ITwvYnV0dG9uPlxcbiAgICA8L2Rpdj5cXG48L2Zvcm0+XFxuXCJcblxuICAgIGVsLmlubmVySFRNTCA9IGxvZ2luX2h0bWxcblxuICAgIHZhciBmb3JtID0gJCgnZm9ybScsIGVsKVswXVxuICAgICAgLCBmb3JtX2V2ZW50cyA9IGV2ZXIoZm9ybSlcblxuICAgIGZvcm1fZXZlbnRzXG4gICAgICAub24oJ3N1Ym1pdCcsIHByZXZlbnREZWZhdWx0KVxuICAgICAgLm9uKCdzdWJtaXQnLCBzZW5kKVxuXG4gICAgZnVuY3Rpb24gcHJldmVudERlZmF1bHQoZXYpIHtcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZW5kKGV2KSB7XG4gICAgICB2YXIgZW1haWwgPSAkKCcjZW1haWwnLCBmb3JtKVswXVxuICAgICAgICAsIG5pY2sgPSAkKCcjbmljaycsIGZvcm0pWzBdXG5cbiAgICAgIHZhciB5b3UgPSB7fVxuICAgICAgeW91LmVtYWlsID0gZW1haWwudmFsdWVcbiAgICAgIHlvdS5uaWNrID0gbmljay52YWx1ZVxuICAgICAgcmVhZHkoeW91KVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRyeV9mb3JtKGVyciwgeW91KSB7XG4gICAgaWYoZXJyKSB7XG4gICAgICBlcnJvci5xdWV1ZShlcnIpIFxuICAgIH1cblxuICAgIHNvdXJjZS5lbWl0KCdsb2dpbicsIHlvdSlcbiAgfVxufVxuXG5wcm90by5sb2dpbl9zdWNjZXNzID0gZnVuY3Rpb24oeW91KSB7XG4gICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IHFzLnN0cmluZ2lmeSh5b3UpXG5cbiAgIHRoaXMuc291cmNlLnJlbW92ZUFsbExpc3RlbmVycygnbG9naW4gZmFpbGVkJylcbiAgIHRoaXMudXNlci5lbWl0KCdsb2dpbicsIHlvdSlcbn1cblxuZnVuY3Rpb24gaGFzaF9sb2dpbihyZWFkeSkge1xuICBpZih3aW5kb3cubG9jYXRpb24uaGFzaC5sZW5ndGggPiAxKSB7XG4gICAgdmFyIGhhc2ggPSBxcy5wYXJzZSh3aW5kb3cubG9jYXRpb24uaGFzaC5zbGljZSgxKSlcblxuICAgIGlmKGhhc2gubmljayAmJiBoYXNoLmVtYWlsKSB7XG4gICAgICB5b3UubmljayA9IGhhc2gubmlja1xuICAgICAgeW91LmVtYWlsID0gaGFzaC5lbWFpbFxuXG4gICAgICByZXR1cm4gcmVhZHkobnVsbCwgeW91KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZWFkeShuZXcgRXJyb3IoJ05vIEhhc2ggTG9naW4nKSlcbn1cblxuXG4iLCIoZnVuY3Rpb24oKXsvKiFcbiAqIFNpenpsZSBDU1MgU2VsZWN0b3IgRW5naW5lXG4gKiAgQ29weXJpZ2h0IDIwMTEsIFRoZSBEb2pvIEZvdW5kYXRpb25cbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlULCBCU0QsIGFuZCBHUEwgTGljZW5zZXMuXG4gKiAgTW9yZSBpbmZvcm1hdGlvbjogaHR0cDovL3NpenpsZWpzLmNvbS9cbiAqL1xuKGZ1bmN0aW9uKCl7XG5cbnZhciBjaHVua2VyID0gLygoPzpcXCgoPzpcXChbXigpXStcXCl8W14oKV0rKStcXCl8XFxbKD86XFxbW15cXFtcXF1dKlxcXXxbJ1wiXVteJ1wiXSpbJ1wiXXxbXlxcW1xcXSdcIl0rKStcXF18XFxcXC58W14gPit+LChcXFtcXFxcXSspK3xbPit+XSkoXFxzKixcXHMqKT8oKD86LnxcXHJ8XFxuKSopL2csXG5cdGV4cGFuZG8gPSBcInNpemNhY2hlXCIgKyAoTWF0aC5yYW5kb20oKSArICcnKS5yZXBsYWNlKCcuJywgJycpLFxuXHRkb25lID0gMCxcblx0dG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRoYXNEdXBsaWNhdGUgPSBmYWxzZSxcblx0YmFzZUhhc0R1cGxpY2F0ZSA9IHRydWUsXG5cdHJCYWNrc2xhc2ggPSAvXFxcXC9nLFxuXHRyUmV0dXJuID0gL1xcclxcbi9nLFxuXHRyTm9uV29yZCA9IC9cXFcvO1xuXG4vLyBIZXJlIHdlIGNoZWNrIGlmIHRoZSBKYXZhU2NyaXB0IGVuZ2luZSBpcyB1c2luZyBzb21lIHNvcnQgb2Zcbi8vIG9wdGltaXphdGlvbiB3aGVyZSBpdCBkb2VzIG5vdCBhbHdheXMgY2FsbCBvdXIgY29tcGFyaXNpb25cbi8vIGZ1bmN0aW9uLiBJZiB0aGF0IGlzIHRoZSBjYXNlLCBkaXNjYXJkIHRoZSBoYXNEdXBsaWNhdGUgdmFsdWUuXG4vLyAgIFRodXMgZmFyIHRoYXQgaW5jbHVkZXMgR29vZ2xlIENocm9tZS5cblswLCAwXS5zb3J0KGZ1bmN0aW9uKCkge1xuXHRiYXNlSGFzRHVwbGljYXRlID0gZmFsc2U7XG5cdHJldHVybiAwO1xufSk7XG5cbnZhciBTaXp6bGUgPSBmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQsIHJlc3VsdHMsIHNlZWQgKSB7XG5cdHJlc3VsdHMgPSByZXN1bHRzIHx8IFtdO1xuXHRjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcblxuXHR2YXIgb3JpZ0NvbnRleHQgPSBjb250ZXh0O1xuXG5cdGlmICggY29udGV4dC5ub2RlVHlwZSAhPT0gMSAmJiBjb250ZXh0Lm5vZGVUeXBlICE9PSA5ICkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdGlmICggIXNlbGVjdG9yIHx8IHR5cGVvZiBzZWxlY3RvciAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRyZXR1cm4gcmVzdWx0cztcblx0fVxuXG5cdHZhciBtLCBzZXQsIGNoZWNrU2V0LCBleHRyYSwgcmV0LCBjdXIsIHBvcCwgaSxcblx0XHRwcnVuZSA9IHRydWUsXG5cdFx0Y29udGV4dFhNTCA9IFNpenpsZS5pc1hNTCggY29udGV4dCApLFxuXHRcdHBhcnRzID0gW10sXG5cdFx0c29GYXIgPSBzZWxlY3RvcjtcblxuXHQvLyBSZXNldCB0aGUgcG9zaXRpb24gb2YgdGhlIGNodW5rZXIgcmVnZXhwIChzdGFydCBmcm9tIGhlYWQpXG5cdGRvIHtcblx0XHRjaHVua2VyLmV4ZWMoIFwiXCIgKTtcblx0XHRtID0gY2h1bmtlci5leGVjKCBzb0ZhciApO1xuXG5cdFx0aWYgKCBtICkge1xuXHRcdFx0c29GYXIgPSBtWzNdO1xuXG5cdFx0XHRwYXJ0cy5wdXNoKCBtWzFdICk7XG5cblx0XHRcdGlmICggbVsyXSApIHtcblx0XHRcdFx0ZXh0cmEgPSBtWzNdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH0gd2hpbGUgKCBtICk7XG5cblx0aWYgKCBwYXJ0cy5sZW5ndGggPiAxICYmIG9yaWdQT1MuZXhlYyggc2VsZWN0b3IgKSApIHtcblxuXHRcdGlmICggcGFydHMubGVuZ3RoID09PSAyICYmIEV4cHIucmVsYXRpdmVbIHBhcnRzWzBdIF0gKSB7XG5cdFx0XHRzZXQgPSBwb3NQcm9jZXNzKCBwYXJ0c1swXSArIHBhcnRzWzFdLCBjb250ZXh0LCBzZWVkICk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0c2V0ID0gRXhwci5yZWxhdGl2ZVsgcGFydHNbMF0gXSA/XG5cdFx0XHRcdFsgY29udGV4dCBdIDpcblx0XHRcdFx0U2l6emxlKCBwYXJ0cy5zaGlmdCgpLCBjb250ZXh0ICk7XG5cblx0XHRcdHdoaWxlICggcGFydHMubGVuZ3RoICkge1xuXHRcdFx0XHRzZWxlY3RvciA9IHBhcnRzLnNoaWZ0KCk7XG5cblx0XHRcdFx0aWYgKCBFeHByLnJlbGF0aXZlWyBzZWxlY3RvciBdICkge1xuXHRcdFx0XHRcdHNlbGVjdG9yICs9IHBhcnRzLnNoaWZ0KCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzZXQgPSBwb3NQcm9jZXNzKCBzZWxlY3Rvciwgc2V0LCBzZWVkICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdH0gZWxzZSB7XG5cdFx0Ly8gVGFrZSBhIHNob3J0Y3V0IGFuZCBzZXQgdGhlIGNvbnRleHQgaWYgdGhlIHJvb3Qgc2VsZWN0b3IgaXMgYW4gSURcblx0XHQvLyAoYnV0IG5vdCBpZiBpdCdsbCBiZSBmYXN0ZXIgaWYgdGhlIGlubmVyIHNlbGVjdG9yIGlzIGFuIElEKVxuXHRcdGlmICggIXNlZWQgJiYgcGFydHMubGVuZ3RoID4gMSAmJiBjb250ZXh0Lm5vZGVUeXBlID09PSA5ICYmICFjb250ZXh0WE1MICYmXG5cdFx0XHRcdEV4cHIubWF0Y2guSUQudGVzdChwYXJ0c1swXSkgJiYgIUV4cHIubWF0Y2guSUQudGVzdChwYXJ0c1twYXJ0cy5sZW5ndGggLSAxXSkgKSB7XG5cblx0XHRcdHJldCA9IFNpenpsZS5maW5kKCBwYXJ0cy5zaGlmdCgpLCBjb250ZXh0LCBjb250ZXh0WE1MICk7XG5cdFx0XHRjb250ZXh0ID0gcmV0LmV4cHIgP1xuXHRcdFx0XHRTaXp6bGUuZmlsdGVyKCByZXQuZXhwciwgcmV0LnNldCApWzBdIDpcblx0XHRcdFx0cmV0LnNldFswXTtcblx0XHR9XG5cblx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRyZXQgPSBzZWVkID9cblx0XHRcdFx0eyBleHByOiBwYXJ0cy5wb3AoKSwgc2V0OiBtYWtlQXJyYXkoc2VlZCkgfSA6XG5cdFx0XHRcdFNpenpsZS5maW5kKCBwYXJ0cy5wb3AoKSwgcGFydHMubGVuZ3RoID09PSAxICYmIChwYXJ0c1swXSA9PT0gXCJ+XCIgfHwgcGFydHNbMF0gPT09IFwiK1wiKSAmJiBjb250ZXh0LnBhcmVudE5vZGUgPyBjb250ZXh0LnBhcmVudE5vZGUgOiBjb250ZXh0LCBjb250ZXh0WE1MICk7XG5cblx0XHRcdHNldCA9IHJldC5leHByID9cblx0XHRcdFx0U2l6emxlLmZpbHRlciggcmV0LmV4cHIsIHJldC5zZXQgKSA6XG5cdFx0XHRcdHJldC5zZXQ7XG5cblx0XHRcdGlmICggcGFydHMubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0Y2hlY2tTZXQgPSBtYWtlQXJyYXkoIHNldCApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwcnVuZSA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR3aGlsZSAoIHBhcnRzLmxlbmd0aCApIHtcblx0XHRcdFx0Y3VyID0gcGFydHMucG9wKCk7XG5cdFx0XHRcdHBvcCA9IGN1cjtcblxuXHRcdFx0XHRpZiAoICFFeHByLnJlbGF0aXZlWyBjdXIgXSApIHtcblx0XHRcdFx0XHRjdXIgPSBcIlwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBvcCA9IHBhcnRzLnBvcCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBwb3AgPT0gbnVsbCApIHtcblx0XHRcdFx0XHRwb3AgPSBjb250ZXh0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0RXhwci5yZWxhdGl2ZVsgY3VyIF0oIGNoZWNrU2V0LCBwb3AsIGNvbnRleHRYTUwgKTtcblx0XHRcdH1cblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRjaGVja1NldCA9IHBhcnRzID0gW107XG5cdFx0fVxuXHR9XG5cblx0aWYgKCAhY2hlY2tTZXQgKSB7XG5cdFx0Y2hlY2tTZXQgPSBzZXQ7XG5cdH1cblxuXHRpZiAoICFjaGVja1NldCApIHtcblx0XHRTaXp6bGUuZXJyb3IoIGN1ciB8fCBzZWxlY3RvciApO1xuXHR9XG5cblx0aWYgKCB0b1N0cmluZy5jYWxsKGNoZWNrU2V0KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICkge1xuXHRcdGlmICggIXBydW5lICkge1xuXHRcdFx0cmVzdWx0cy5wdXNoLmFwcGx5KCByZXN1bHRzLCBjaGVja1NldCApO1xuXG5cdFx0fSBlbHNlIGlmICggY29udGV4dCAmJiBjb250ZXh0Lm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0Zm9yICggaSA9IDA7IGNoZWNrU2V0W2ldICE9IG51bGw7IGkrKyApIHtcblx0XHRcdFx0aWYgKCBjaGVja1NldFtpXSAmJiAoY2hlY2tTZXRbaV0gPT09IHRydWUgfHwgY2hlY2tTZXRbaV0ubm9kZVR5cGUgPT09IDEgJiYgU2l6emxlLmNvbnRhaW5zKGNvbnRleHQsIGNoZWNrU2V0W2ldKSkgKSB7XG5cdFx0XHRcdFx0cmVzdWx0cy5wdXNoKCBzZXRbaV0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGZvciAoIGkgPSAwOyBjaGVja1NldFtpXSAhPSBudWxsOyBpKysgKSB7XG5cdFx0XHRcdGlmICggY2hlY2tTZXRbaV0gJiYgY2hlY2tTZXRbaV0ubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdFx0cmVzdWx0cy5wdXNoKCBzZXRbaV0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9IGVsc2Uge1xuXHRcdG1ha2VBcnJheSggY2hlY2tTZXQsIHJlc3VsdHMgKTtcblx0fVxuXG5cdGlmICggZXh0cmEgKSB7XG5cdFx0U2l6emxlKCBleHRyYSwgb3JpZ0NvbnRleHQsIHJlc3VsdHMsIHNlZWQgKTtcblx0XHRTaXp6bGUudW5pcXVlU29ydCggcmVzdWx0cyApO1xuXHR9XG5cblx0cmV0dXJuIHJlc3VsdHM7XG59O1xuXG5TaXp6bGUudW5pcXVlU29ydCA9IGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRpZiAoIHNvcnRPcmRlciApIHtcblx0XHRoYXNEdXBsaWNhdGUgPSBiYXNlSGFzRHVwbGljYXRlO1xuXHRcdHJlc3VsdHMuc29ydCggc29ydE9yZGVyICk7XG5cblx0XHRpZiAoIGhhc0R1cGxpY2F0ZSApIHtcblx0XHRcdGZvciAoIHZhciBpID0gMTsgaSA8IHJlc3VsdHMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdGlmICggcmVzdWx0c1tpXSA9PT0gcmVzdWx0c1sgaSAtIDEgXSApIHtcblx0XHRcdFx0XHRyZXN1bHRzLnNwbGljZSggaS0tLCAxICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0cztcbn07XG5cblNpenpsZS5tYXRjaGVzID0gZnVuY3Rpb24oIGV4cHIsIHNldCApIHtcblx0cmV0dXJuIFNpenpsZSggZXhwciwgbnVsbCwgbnVsbCwgc2V0ICk7XG59O1xuXG5TaXp6bGUubWF0Y2hlc1NlbGVjdG9yID0gZnVuY3Rpb24oIG5vZGUsIGV4cHIgKSB7XG5cdHJldHVybiBTaXp6bGUoIGV4cHIsIG51bGwsIG51bGwsIFtub2RlXSApLmxlbmd0aCA+IDA7XG59O1xuXG5TaXp6bGUuZmluZCA9IGZ1bmN0aW9uKCBleHByLCBjb250ZXh0LCBpc1hNTCApIHtcblx0dmFyIHNldCwgaSwgbGVuLCBtYXRjaCwgdHlwZSwgbGVmdDtcblxuXHRpZiAoICFleHByICkge1xuXHRcdHJldHVybiBbXTtcblx0fVxuXG5cdGZvciAoIGkgPSAwLCBsZW4gPSBFeHByLm9yZGVyLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdHR5cGUgPSBFeHByLm9yZGVyW2ldO1xuXG5cdFx0aWYgKCAobWF0Y2ggPSBFeHByLmxlZnRNYXRjaFsgdHlwZSBdLmV4ZWMoIGV4cHIgKSkgKSB7XG5cdFx0XHRsZWZ0ID0gbWF0Y2hbMV07XG5cdFx0XHRtYXRjaC5zcGxpY2UoIDEsIDEgKTtcblxuXHRcdFx0aWYgKCBsZWZ0LnN1YnN0ciggbGVmdC5sZW5ndGggLSAxICkgIT09IFwiXFxcXFwiICkge1xuXHRcdFx0XHRtYXRjaFsxXSA9IChtYXRjaFsxXSB8fCBcIlwiKS5yZXBsYWNlKCByQmFja3NsYXNoLCBcIlwiICk7XG5cdFx0XHRcdHNldCA9IEV4cHIuZmluZFsgdHlwZSBdKCBtYXRjaCwgY29udGV4dCwgaXNYTUwgKTtcblxuXHRcdFx0XHRpZiAoIHNldCAhPSBudWxsICkge1xuXHRcdFx0XHRcdGV4cHIgPSBleHByLnJlcGxhY2UoIEV4cHIubWF0Y2hbIHR5cGUgXSwgXCJcIiApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKCAhc2V0ICkge1xuXHRcdHNldCA9IHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lICE9PSBcInVuZGVmaW5lZFwiID9cblx0XHRcdGNvbnRleHQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIFwiKlwiICkgOlxuXHRcdFx0W107XG5cdH1cblxuXHRyZXR1cm4geyBzZXQ6IHNldCwgZXhwcjogZXhwciB9O1xufTtcblxuU2l6emxlLmZpbHRlciA9IGZ1bmN0aW9uKCBleHByLCBzZXQsIGlucGxhY2UsIG5vdCApIHtcblx0dmFyIG1hdGNoLCBhbnlGb3VuZCxcblx0XHR0eXBlLCBmb3VuZCwgaXRlbSwgZmlsdGVyLCBsZWZ0LFxuXHRcdGksIHBhc3MsXG5cdFx0b2xkID0gZXhwcixcblx0XHRyZXN1bHQgPSBbXSxcblx0XHRjdXJMb29wID0gc2V0LFxuXHRcdGlzWE1MRmlsdGVyID0gc2V0ICYmIHNldFswXSAmJiBTaXp6bGUuaXNYTUwoIHNldFswXSApO1xuXG5cdHdoaWxlICggZXhwciAmJiBzZXQubGVuZ3RoICkge1xuXHRcdGZvciAoIHR5cGUgaW4gRXhwci5maWx0ZXIgKSB7XG5cdFx0XHRpZiAoIChtYXRjaCA9IEV4cHIubGVmdE1hdGNoWyB0eXBlIF0uZXhlYyggZXhwciApKSAhPSBudWxsICYmIG1hdGNoWzJdICkge1xuXHRcdFx0XHRmaWx0ZXIgPSBFeHByLmZpbHRlclsgdHlwZSBdO1xuXHRcdFx0XHRsZWZ0ID0gbWF0Y2hbMV07XG5cblx0XHRcdFx0YW55Rm91bmQgPSBmYWxzZTtcblxuXHRcdFx0XHRtYXRjaC5zcGxpY2UoMSwxKTtcblxuXHRcdFx0XHRpZiAoIGxlZnQuc3Vic3RyKCBsZWZ0Lmxlbmd0aCAtIDEgKSA9PT0gXCJcXFxcXCIgKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGN1ckxvb3AgPT09IHJlc3VsdCApIHtcblx0XHRcdFx0XHRyZXN1bHQgPSBbXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggRXhwci5wcmVGaWx0ZXJbIHR5cGUgXSApIHtcblx0XHRcdFx0XHRtYXRjaCA9IEV4cHIucHJlRmlsdGVyWyB0eXBlIF0oIG1hdGNoLCBjdXJMb29wLCBpbnBsYWNlLCByZXN1bHQsIG5vdCwgaXNYTUxGaWx0ZXIgKTtcblxuXHRcdFx0XHRcdGlmICggIW1hdGNoICkge1xuXHRcdFx0XHRcdFx0YW55Rm91bmQgPSBmb3VuZCA9IHRydWU7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBtYXRjaCA9PT0gdHJ1ZSApIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggbWF0Y2ggKSB7XG5cdFx0XHRcdFx0Zm9yICggaSA9IDA7IChpdGVtID0gY3VyTG9vcFtpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdFx0XHRcdFx0aWYgKCBpdGVtICkge1xuXHRcdFx0XHRcdFx0XHRmb3VuZCA9IGZpbHRlciggaXRlbSwgbWF0Y2gsIGksIGN1ckxvb3AgKTtcblx0XHRcdFx0XHRcdFx0cGFzcyA9IG5vdCBeIGZvdW5kO1xuXG5cdFx0XHRcdFx0XHRcdGlmICggaW5wbGFjZSAmJiBmb3VuZCAhPSBudWxsICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggcGFzcyApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGFueUZvdW5kID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjdXJMb29wW2ldID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIHBhc3MgKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVzdWx0LnB1c2goIGl0ZW0gKTtcblx0XHRcdFx0XHRcdFx0XHRhbnlGb3VuZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIGZvdW5kICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhaW5wbGFjZSApIHtcblx0XHRcdFx0XHRcdGN1ckxvb3AgPSByZXN1bHQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZXhwciA9IGV4cHIucmVwbGFjZSggRXhwci5tYXRjaFsgdHlwZSBdLCBcIlwiICk7XG5cblx0XHRcdFx0XHRpZiAoICFhbnlGb3VuZCApIHtcblx0XHRcdFx0XHRcdHJldHVybiBbXTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEltcHJvcGVyIGV4cHJlc3Npb25cblx0XHRpZiAoIGV4cHIgPT09IG9sZCApIHtcblx0XHRcdGlmICggYW55Rm91bmQgPT0gbnVsbCApIHtcblx0XHRcdFx0U2l6emxlLmVycm9yKCBleHByICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdG9sZCA9IGV4cHI7XG5cdH1cblxuXHRyZXR1cm4gY3VyTG9vcDtcbn07XG5cblNpenpsZS5lcnJvciA9IGZ1bmN0aW9uKCBtc2cgKSB7XG5cdHRocm93IG5ldyBFcnJvciggXCJTeW50YXggZXJyb3IsIHVucmVjb2duaXplZCBleHByZXNzaW9uOiBcIiArIG1zZyApO1xufTtcblxuLyoqXG4gKiBVdGlsaXR5IGZ1bmN0aW9uIGZvciByZXRyZWl2aW5nIHRoZSB0ZXh0IHZhbHVlIG9mIGFuIGFycmF5IG9mIERPTSBub2Rlc1xuICogQHBhcmFtIHtBcnJheXxFbGVtZW50fSBlbGVtXG4gKi9cbnZhciBnZXRUZXh0ID0gU2l6emxlLmdldFRleHQgPSBmdW5jdGlvbiggZWxlbSApIHtcbiAgICB2YXIgaSwgbm9kZSxcblx0XHRub2RlVHlwZSA9IGVsZW0ubm9kZVR5cGUsXG5cdFx0cmV0ID0gXCJcIjtcblxuXHRpZiAoIG5vZGVUeXBlICkge1xuXHRcdGlmICggbm9kZVR5cGUgPT09IDEgfHwgbm9kZVR5cGUgPT09IDkgfHwgbm9kZVR5cGUgPT09IDExICkge1xuXHRcdFx0Ly8gVXNlIHRleHRDb250ZW50IHx8IGlubmVyVGV4dCBmb3IgZWxlbWVudHNcblx0XHRcdGlmICggdHlwZW9mIGVsZW0udGV4dENvbnRlbnQgPT09ICdzdHJpbmcnICkge1xuXHRcdFx0XHRyZXR1cm4gZWxlbS50ZXh0Q29udGVudDtcblx0XHRcdH0gZWxzZSBpZiAoIHR5cGVvZiBlbGVtLmlubmVyVGV4dCA9PT0gJ3N0cmluZycgKSB7XG5cdFx0XHRcdC8vIFJlcGxhY2UgSUUncyBjYXJyaWFnZSByZXR1cm5zXG5cdFx0XHRcdHJldHVybiBlbGVtLmlubmVyVGV4dC5yZXBsYWNlKCByUmV0dXJuLCAnJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gVHJhdmVyc2UgaXQncyBjaGlsZHJlblxuXHRcdFx0XHRmb3IgKCBlbGVtID0gZWxlbS5maXJzdENoaWxkOyBlbGVtOyBlbGVtID0gZWxlbS5uZXh0U2libGluZykge1xuXHRcdFx0XHRcdHJldCArPSBnZXRUZXh0KCBlbGVtICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKCBub2RlVHlwZSA9PT0gMyB8fCBub2RlVHlwZSA9PT0gNCApIHtcblx0XHRcdHJldHVybiBlbGVtLm5vZGVWYWx1ZTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cblx0XHQvLyBJZiBubyBub2RlVHlwZSwgdGhpcyBpcyBleHBlY3RlZCB0byBiZSBhbiBhcnJheVxuXHRcdGZvciAoIGkgPSAwOyAobm9kZSA9IGVsZW1baV0pOyBpKysgKSB7XG5cdFx0XHQvLyBEbyBub3QgdHJhdmVyc2UgY29tbWVudCBub2Rlc1xuXHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlICE9PSA4ICkge1xuXHRcdFx0XHRyZXQgKz0gZ2V0VGV4dCggbm9kZSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmV0O1xufTtcblxudmFyIEV4cHIgPSBTaXp6bGUuc2VsZWN0b3JzID0ge1xuXHRvcmRlcjogWyBcIklEXCIsIFwiTkFNRVwiLCBcIlRBR1wiIF0sXG5cblx0bWF0Y2g6IHtcblx0XHRJRDogLyMoKD86W1xcd1xcdTAwYzAtXFx1RkZGRlxcLV18XFxcXC4pKykvLFxuXHRcdENMQVNTOiAvXFwuKCg/OltcXHdcXHUwMGMwLVxcdUZGRkZcXC1dfFxcXFwuKSspLyxcblx0XHROQU1FOiAvXFxbbmFtZT1bJ1wiXSooKD86W1xcd1xcdTAwYzAtXFx1RkZGRlxcLV18XFxcXC4pKylbJ1wiXSpcXF0vLFxuXHRcdEFUVFI6IC9cXFtcXHMqKCg/OltcXHdcXHUwMGMwLVxcdUZGRkZcXC1dfFxcXFwuKSspXFxzKig/OihcXFM/PSlcXHMqKD86KFsnXCJdKSguKj8pXFwzfCgjPyg/OltcXHdcXHUwMGMwLVxcdUZGRkZcXC1dfFxcXFwuKSopfCl8KVxccypcXF0vLFxuXHRcdFRBRzogL14oKD86W1xcd1xcdTAwYzAtXFx1RkZGRlxcKlxcLV18XFxcXC4pKykvLFxuXHRcdENISUxEOiAvOihvbmx5fG50aHxsYXN0fGZpcnN0KS1jaGlsZCg/OlxcKFxccyooZXZlbnxvZGR8KD86WytcXC1dP1xcZCt8KD86WytcXC1dP1xcZCopP25cXHMqKD86WytcXC1dXFxzKlxcZCspPykpXFxzKlxcKSk/Lyxcblx0XHRQT1M6IC86KG50aHxlcXxndHxsdHxmaXJzdHxsYXN0fGV2ZW58b2RkKSg/OlxcKChcXGQqKVxcKSk/KD89W15cXC1dfCQpLyxcblx0XHRQU0VVRE86IC86KCg/OltcXHdcXHUwMGMwLVxcdUZGRkZcXC1dfFxcXFwuKSspKD86XFwoKFsnXCJdPykoKD86XFwoW15cXCldK1xcKXxbXlxcKFxcKV0qKSspXFwyXFwpKT8vXG5cdH0sXG5cblx0bGVmdE1hdGNoOiB7fSxcblxuXHRhdHRyTWFwOiB7XG5cdFx0XCJjbGFzc1wiOiBcImNsYXNzTmFtZVwiLFxuXHRcdFwiZm9yXCI6IFwiaHRtbEZvclwiXG5cdH0sXG5cblx0YXR0ckhhbmRsZToge1xuXHRcdGhyZWY6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKCBcImhyZWZcIiApO1xuXHRcdH0sXG5cdFx0dHlwZTogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoIFwidHlwZVwiICk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbGF0aXZlOiB7XG5cdFx0XCIrXCI6IGZ1bmN0aW9uKGNoZWNrU2V0LCBwYXJ0KXtcblx0XHRcdHZhciBpc1BhcnRTdHIgPSB0eXBlb2YgcGFydCA9PT0gXCJzdHJpbmdcIixcblx0XHRcdFx0aXNUYWcgPSBpc1BhcnRTdHIgJiYgIXJOb25Xb3JkLnRlc3QoIHBhcnQgKSxcblx0XHRcdFx0aXNQYXJ0U3RyTm90VGFnID0gaXNQYXJ0U3RyICYmICFpc1RhZztcblxuXHRcdFx0aWYgKCBpc1RhZyApIHtcblx0XHRcdFx0cGFydCA9IHBhcnQudG9Mb3dlckNhc2UoKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9yICggdmFyIGkgPSAwLCBsID0gY2hlY2tTZXQubGVuZ3RoLCBlbGVtOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIChlbGVtID0gY2hlY2tTZXRbaV0pICkge1xuXHRcdFx0XHRcdHdoaWxlICggKGVsZW0gPSBlbGVtLnByZXZpb3VzU2libGluZykgJiYgZWxlbS5ub2RlVHlwZSAhPT0gMSApIHt9XG5cblx0XHRcdFx0XHRjaGVja1NldFtpXSA9IGlzUGFydFN0ck5vdFRhZyB8fCBlbGVtICYmIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gcGFydCA/XG5cdFx0XHRcdFx0XHRlbGVtIHx8IGZhbHNlIDpcblx0XHRcdFx0XHRcdGVsZW0gPT09IHBhcnQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBpc1BhcnRTdHJOb3RUYWcgKSB7XG5cdFx0XHRcdFNpenpsZS5maWx0ZXIoIHBhcnQsIGNoZWNrU2V0LCB0cnVlICk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFwiPlwiOiBmdW5jdGlvbiggY2hlY2tTZXQsIHBhcnQgKSB7XG5cdFx0XHR2YXIgZWxlbSxcblx0XHRcdFx0aXNQYXJ0U3RyID0gdHlwZW9mIHBhcnQgPT09IFwic3RyaW5nXCIsXG5cdFx0XHRcdGkgPSAwLFxuXHRcdFx0XHRsID0gY2hlY2tTZXQubGVuZ3RoO1xuXG5cdFx0XHRpZiAoIGlzUGFydFN0ciAmJiAhck5vbldvcmQudGVzdCggcGFydCApICkge1xuXHRcdFx0XHRwYXJ0ID0gcGFydC50b0xvd2VyQ2FzZSgpO1xuXG5cdFx0XHRcdGZvciAoIDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdFx0XHRlbGVtID0gY2hlY2tTZXRbaV07XG5cblx0XHRcdFx0XHRpZiAoIGVsZW0gKSB7XG5cdFx0XHRcdFx0XHR2YXIgcGFyZW50ID0gZWxlbS5wYXJlbnROb2RlO1xuXHRcdFx0XHRcdFx0Y2hlY2tTZXRbaV0gPSBwYXJlbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gcGFydCA/IHBhcmVudCA6IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb3IgKCA7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRcdFx0ZWxlbSA9IGNoZWNrU2V0W2ldO1xuXG5cdFx0XHRcdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0XHRcdFx0Y2hlY2tTZXRbaV0gPSBpc1BhcnRTdHIgP1xuXHRcdFx0XHRcdFx0XHRlbGVtLnBhcmVudE5vZGUgOlxuXHRcdFx0XHRcdFx0XHRlbGVtLnBhcmVudE5vZGUgPT09IHBhcnQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBpc1BhcnRTdHIgKSB7XG5cdFx0XHRcdFx0U2l6emxlLmZpbHRlciggcGFydCwgY2hlY2tTZXQsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRcIlwiOiBmdW5jdGlvbihjaGVja1NldCwgcGFydCwgaXNYTUwpe1xuXHRcdFx0dmFyIG5vZGVDaGVjayxcblx0XHRcdFx0ZG9uZU5hbWUgPSBkb25lKyssXG5cdFx0XHRcdGNoZWNrRm4gPSBkaXJDaGVjaztcblxuXHRcdFx0aWYgKCB0eXBlb2YgcGFydCA9PT0gXCJzdHJpbmdcIiAmJiAhck5vbldvcmQudGVzdCggcGFydCApICkge1xuXHRcdFx0XHRwYXJ0ID0gcGFydC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRub2RlQ2hlY2sgPSBwYXJ0O1xuXHRcdFx0XHRjaGVja0ZuID0gZGlyTm9kZUNoZWNrO1xuXHRcdFx0fVxuXG5cdFx0XHRjaGVja0ZuKCBcInBhcmVudE5vZGVcIiwgcGFydCwgZG9uZU5hbWUsIGNoZWNrU2V0LCBub2RlQ2hlY2ssIGlzWE1MICk7XG5cdFx0fSxcblxuXHRcdFwiflwiOiBmdW5jdGlvbiggY2hlY2tTZXQsIHBhcnQsIGlzWE1MICkge1xuXHRcdFx0dmFyIG5vZGVDaGVjayxcblx0XHRcdFx0ZG9uZU5hbWUgPSBkb25lKyssXG5cdFx0XHRcdGNoZWNrRm4gPSBkaXJDaGVjaztcblxuXHRcdFx0aWYgKCB0eXBlb2YgcGFydCA9PT0gXCJzdHJpbmdcIiAmJiAhck5vbldvcmQudGVzdCggcGFydCApICkge1xuXHRcdFx0XHRwYXJ0ID0gcGFydC50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRub2RlQ2hlY2sgPSBwYXJ0O1xuXHRcdFx0XHRjaGVja0ZuID0gZGlyTm9kZUNoZWNrO1xuXHRcdFx0fVxuXG5cdFx0XHRjaGVja0ZuKCBcInByZXZpb3VzU2libGluZ1wiLCBwYXJ0LCBkb25lTmFtZSwgY2hlY2tTZXQsIG5vZGVDaGVjaywgaXNYTUwgKTtcblx0XHR9XG5cdH0sXG5cblx0ZmluZDoge1xuXHRcdElEOiBmdW5jdGlvbiggbWF0Y2gsIGNvbnRleHQsIGlzWE1MICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgY29udGV4dC5nZXRFbGVtZW50QnlJZCAhPT0gXCJ1bmRlZmluZWRcIiAmJiAhaXNYTUwgKSB7XG5cdFx0XHRcdHZhciBtID0gY29udGV4dC5nZXRFbGVtZW50QnlJZChtYXRjaFsxXSk7XG5cdFx0XHRcdC8vIENoZWNrIHBhcmVudE5vZGUgdG8gY2F0Y2ggd2hlbiBCbGFja2JlcnJ5IDQuNiByZXR1cm5zXG5cdFx0XHRcdC8vIG5vZGVzIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgZG9jdW1lbnQgIzY5NjNcblx0XHRcdFx0cmV0dXJuIG0gJiYgbS5wYXJlbnROb2RlID8gW21dIDogW107XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdE5BTUU6IGZ1bmN0aW9uKCBtYXRjaCwgY29udGV4dCApIHtcblx0XHRcdGlmICggdHlwZW9mIGNvbnRleHQuZ2V0RWxlbWVudHNCeU5hbWUgIT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRcdHZhciByZXQgPSBbXSxcblx0XHRcdFx0XHRyZXN1bHRzID0gY29udGV4dC5nZXRFbGVtZW50c0J5TmFtZSggbWF0Y2hbMV0gKTtcblxuXHRcdFx0XHRmb3IgKCB2YXIgaSA9IDAsIGwgPSByZXN1bHRzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdFx0XHRpZiAoIHJlc3VsdHNbaV0uZ2V0QXR0cmlidXRlKFwibmFtZVwiKSA9PT0gbWF0Y2hbMV0gKSB7XG5cdFx0XHRcdFx0XHRyZXQucHVzaCggcmVzdWx0c1tpXSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiByZXQubGVuZ3RoID09PSAwID8gbnVsbCA6IHJldDtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0VEFHOiBmdW5jdGlvbiggbWF0Y2gsIGNvbnRleHQgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lICE9PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0XHRyZXR1cm4gY29udGV4dC5nZXRFbGVtZW50c0J5VGFnTmFtZSggbWF0Y2hbMV0gKTtcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHByZUZpbHRlcjoge1xuXHRcdENMQVNTOiBmdW5jdGlvbiggbWF0Y2gsIGN1ckxvb3AsIGlucGxhY2UsIHJlc3VsdCwgbm90LCBpc1hNTCApIHtcblx0XHRcdG1hdGNoID0gXCIgXCIgKyBtYXRjaFsxXS5yZXBsYWNlKCByQmFja3NsYXNoLCBcIlwiICkgKyBcIiBcIjtcblxuXHRcdFx0aWYgKCBpc1hNTCApIHtcblx0XHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKCB2YXIgaSA9IDAsIGVsZW07IChlbGVtID0gY3VyTG9vcFtpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIGVsZW0gKSB7XG5cdFx0XHRcdFx0aWYgKCBub3QgXiAoZWxlbS5jbGFzc05hbWUgJiYgKFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIikucmVwbGFjZSgvW1xcdFxcblxccl0vZywgXCIgXCIpLmluZGV4T2YobWF0Y2gpID49IDApICkge1xuXHRcdFx0XHRcdFx0aWYgKCAhaW5wbGFjZSApIHtcblx0XHRcdFx0XHRcdFx0cmVzdWx0LnB1c2goIGVsZW0gKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIGlucGxhY2UgKSB7XG5cdFx0XHRcdFx0XHRjdXJMb29wW2ldID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9LFxuXG5cdFx0SUQ6IGZ1bmN0aW9uKCBtYXRjaCApIHtcblx0XHRcdHJldHVybiBtYXRjaFsxXS5yZXBsYWNlKCByQmFja3NsYXNoLCBcIlwiICk7XG5cdFx0fSxcblxuXHRcdFRBRzogZnVuY3Rpb24oIG1hdGNoLCBjdXJMb29wICkge1xuXHRcdFx0cmV0dXJuIG1hdGNoWzFdLnJlcGxhY2UoIHJCYWNrc2xhc2gsIFwiXCIgKS50b0xvd2VyQ2FzZSgpO1xuXHRcdH0sXG5cblx0XHRDSElMRDogZnVuY3Rpb24oIG1hdGNoICkge1xuXHRcdFx0aWYgKCBtYXRjaFsxXSA9PT0gXCJudGhcIiApIHtcblx0XHRcdFx0aWYgKCAhbWF0Y2hbMl0gKSB7XG5cdFx0XHRcdFx0U2l6emxlLmVycm9yKCBtYXRjaFswXSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bWF0Y2hbMl0gPSBtYXRjaFsyXS5yZXBsYWNlKC9eXFwrfFxccyovZywgJycpO1xuXG5cdFx0XHRcdC8vIHBhcnNlIGVxdWF0aW9ucyBsaWtlICdldmVuJywgJ29kZCcsICc1JywgJzJuJywgJzNuKzInLCAnNG4tMScsICctbis2J1xuXHRcdFx0XHR2YXIgdGVzdCA9IC8oLT8pKFxcZCopKD86bihbK1xcLV0/XFxkKikpPy8uZXhlYyhcblx0XHRcdFx0XHRtYXRjaFsyXSA9PT0gXCJldmVuXCIgJiYgXCIyblwiIHx8IG1hdGNoWzJdID09PSBcIm9kZFwiICYmIFwiMm4rMVwiIHx8XG5cdFx0XHRcdFx0IS9cXEQvLnRlc3QoIG1hdGNoWzJdICkgJiYgXCIwbitcIiArIG1hdGNoWzJdIHx8IG1hdGNoWzJdKTtcblxuXHRcdFx0XHQvLyBjYWxjdWxhdGUgdGhlIG51bWJlcnMgKGZpcnN0KW4rKGxhc3QpIGluY2x1ZGluZyBpZiB0aGV5IGFyZSBuZWdhdGl2ZVxuXHRcdFx0XHRtYXRjaFsyXSA9ICh0ZXN0WzFdICsgKHRlc3RbMl0gfHwgMSkpIC0gMDtcblx0XHRcdFx0bWF0Y2hbM10gPSB0ZXN0WzNdIC0gMDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKCBtYXRjaFsyXSApIHtcblx0XHRcdFx0U2l6emxlLmVycm9yKCBtYXRjaFswXSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUT0RPOiBNb3ZlIHRvIG5vcm1hbCBjYWNoaW5nIHN5c3RlbVxuXHRcdFx0bWF0Y2hbMF0gPSBkb25lKys7XG5cblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9LFxuXG5cdFx0QVRUUjogZnVuY3Rpb24oIG1hdGNoLCBjdXJMb29wLCBpbnBsYWNlLCByZXN1bHQsIG5vdCwgaXNYTUwgKSB7XG5cdFx0XHR2YXIgbmFtZSA9IG1hdGNoWzFdID0gbWF0Y2hbMV0ucmVwbGFjZSggckJhY2tzbGFzaCwgXCJcIiApO1xuXG5cdFx0XHRpZiAoICFpc1hNTCAmJiBFeHByLmF0dHJNYXBbbmFtZV0gKSB7XG5cdFx0XHRcdG1hdGNoWzFdID0gRXhwci5hdHRyTWFwW25hbWVdO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBIYW5kbGUgaWYgYW4gdW4tcXVvdGVkIHZhbHVlIHdhcyB1c2VkXG5cdFx0XHRtYXRjaFs0XSA9ICggbWF0Y2hbNF0gfHwgbWF0Y2hbNV0gfHwgXCJcIiApLnJlcGxhY2UoIHJCYWNrc2xhc2gsIFwiXCIgKTtcblxuXHRcdFx0aWYgKCBtYXRjaFsyXSA9PT0gXCJ+PVwiICkge1xuXHRcdFx0XHRtYXRjaFs0XSA9IFwiIFwiICsgbWF0Y2hbNF0gKyBcIiBcIjtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG1hdGNoO1xuXHRcdH0sXG5cblx0XHRQU0VVRE86IGZ1bmN0aW9uKCBtYXRjaCwgY3VyTG9vcCwgaW5wbGFjZSwgcmVzdWx0LCBub3QgKSB7XG5cdFx0XHRpZiAoIG1hdGNoWzFdID09PSBcIm5vdFwiICkge1xuXHRcdFx0XHQvLyBJZiB3ZSdyZSBkZWFsaW5nIHdpdGggYSBjb21wbGV4IGV4cHJlc3Npb24sIG9yIGEgc2ltcGxlIG9uZVxuXHRcdFx0XHRpZiAoICggY2h1bmtlci5leGVjKG1hdGNoWzNdKSB8fCBcIlwiICkubGVuZ3RoID4gMSB8fCAvXlxcdy8udGVzdChtYXRjaFszXSkgKSB7XG5cdFx0XHRcdFx0bWF0Y2hbM10gPSBTaXp6bGUobWF0Y2hbM10sIG51bGwsIG51bGwsIGN1ckxvb3ApO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFyIHJldCA9IFNpenpsZS5maWx0ZXIobWF0Y2hbM10sIGN1ckxvb3AsIGlucGxhY2UsIHRydWUgXiBub3QpO1xuXG5cdFx0XHRcdFx0aWYgKCAhaW5wbGFjZSApIHtcblx0XHRcdFx0XHRcdHJlc3VsdC5wdXNoLmFwcGx5KCByZXN1bHQsIHJldCApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgaWYgKCBFeHByLm1hdGNoLlBPUy50ZXN0KCBtYXRjaFswXSApIHx8IEV4cHIubWF0Y2guQ0hJTEQudGVzdCggbWF0Y2hbMF0gKSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9LFxuXG5cdFx0UE9TOiBmdW5jdGlvbiggbWF0Y2ggKSB7XG5cdFx0XHRtYXRjaC51bnNoaWZ0KCB0cnVlICk7XG5cblx0XHRcdHJldHVybiBtYXRjaDtcblx0XHR9XG5cdH0sXG5cblx0ZmlsdGVyczoge1xuXHRcdGVuYWJsZWQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0uZGlzYWJsZWQgPT09IGZhbHNlICYmIGVsZW0udHlwZSAhPT0gXCJoaWRkZW5cIjtcblx0XHR9LFxuXG5cdFx0ZGlzYWJsZWQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0uZGlzYWJsZWQgPT09IHRydWU7XG5cdFx0fSxcblxuXHRcdGNoZWNrZWQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0uY2hlY2tlZCA9PT0gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0c2VsZWN0ZWQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0Ly8gQWNjZXNzaW5nIHRoaXMgcHJvcGVydHkgbWFrZXMgc2VsZWN0ZWQtYnktZGVmYXVsdFxuXHRcdFx0Ly8gb3B0aW9ucyBpbiBTYWZhcmkgd29yayBwcm9wZXJseVxuXHRcdFx0aWYgKCBlbGVtLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdGVsZW0ucGFyZW50Tm9kZS5zZWxlY3RlZEluZGV4O1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZWxlbS5zZWxlY3RlZCA9PT0gdHJ1ZTtcblx0XHR9LFxuXG5cdFx0cGFyZW50OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiAhIWVsZW0uZmlyc3RDaGlsZDtcblx0XHR9LFxuXG5cdFx0ZW1wdHk6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuICFlbGVtLmZpcnN0Q2hpbGQ7XG5cdFx0fSxcblxuXHRcdGhhczogZnVuY3Rpb24oIGVsZW0sIGksIG1hdGNoICkge1xuXHRcdFx0cmV0dXJuICEhU2l6emxlKCBtYXRjaFszXSwgZWxlbSApLmxlbmd0aDtcblx0XHR9LFxuXG5cdFx0aGVhZGVyOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiAoL2hcXGQvaSkudGVzdCggZWxlbS5ub2RlTmFtZSApO1xuXHRcdH0sXG5cblx0XHR0ZXh0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHZhciBhdHRyID0gZWxlbS5nZXRBdHRyaWJ1dGUoIFwidHlwZVwiICksIHR5cGUgPSBlbGVtLnR5cGU7XG5cdFx0XHQvLyBJRTYgYW5kIDcgd2lsbCBtYXAgZWxlbS50eXBlIHRvICd0ZXh0JyBmb3IgbmV3IEhUTUw1IHR5cGVzIChzZWFyY2gsIGV0Yylcblx0XHRcdC8vIHVzZSBnZXRBdHRyaWJ1dGUgaW5zdGVhZCB0byB0ZXN0IHRoaXMgY2FzZVxuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJpbnB1dFwiICYmIFwidGV4dFwiID09PSB0eXBlICYmICggYXR0ciA9PT0gdHlwZSB8fCBhdHRyID09PSBudWxsICk7XG5cdFx0fSxcblxuXHRcdHJhZGlvOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiaW5wdXRcIiAmJiBcInJhZGlvXCIgPT09IGVsZW0udHlwZTtcblx0XHR9LFxuXG5cdFx0Y2hlY2tib3g6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJpbnB1dFwiICYmIFwiY2hlY2tib3hcIiA9PT0gZWxlbS50eXBlO1xuXHRcdH0sXG5cblx0XHRmaWxlOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHJldHVybiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiaW5wdXRcIiAmJiBcImZpbGVcIiA9PT0gZWxlbS50eXBlO1xuXHRcdH0sXG5cblx0XHRwYXNzd29yZDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImlucHV0XCIgJiYgXCJwYXNzd29yZFwiID09PSBlbGVtLnR5cGU7XG5cdFx0fSxcblxuXHRcdHN1Ym1pdDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHR2YXIgbmFtZSA9IGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdHJldHVybiAobmFtZSA9PT0gXCJpbnB1dFwiIHx8IG5hbWUgPT09IFwiYnV0dG9uXCIpICYmIFwic3VibWl0XCIgPT09IGVsZW0udHlwZTtcblx0XHR9LFxuXG5cdFx0aW1hZ2U6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJpbnB1dFwiICYmIFwiaW1hZ2VcIiA9PT0gZWxlbS50eXBlO1xuXHRcdH0sXG5cblx0XHRyZXNldDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHR2YXIgbmFtZSA9IGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdHJldHVybiAobmFtZSA9PT0gXCJpbnB1dFwiIHx8IG5hbWUgPT09IFwiYnV0dG9uXCIpICYmIFwicmVzZXRcIiA9PT0gZWxlbS50eXBlO1xuXHRcdH0sXG5cblx0XHRidXR0b246IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0dmFyIG5hbWUgPSBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRyZXR1cm4gbmFtZSA9PT0gXCJpbnB1dFwiICYmIFwiYnV0dG9uXCIgPT09IGVsZW0udHlwZSB8fCBuYW1lID09PSBcImJ1dHRvblwiO1xuXHRcdH0sXG5cblx0XHRpbnB1dDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gKC9pbnB1dHxzZWxlY3R8dGV4dGFyZWF8YnV0dG9uL2kpLnRlc3QoIGVsZW0ubm9kZU5hbWUgKTtcblx0XHR9LFxuXG5cdFx0Zm9jdXM6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0cmV0dXJuIGVsZW0gPT09IGVsZW0ub3duZXJEb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuXHRcdH1cblx0fSxcblx0c2V0RmlsdGVyczoge1xuXHRcdGZpcnN0OiBmdW5jdGlvbiggZWxlbSwgaSApIHtcblx0XHRcdHJldHVybiBpID09PSAwO1xuXHRcdH0sXG5cblx0XHRsYXN0OiBmdW5jdGlvbiggZWxlbSwgaSwgbWF0Y2gsIGFycmF5ICkge1xuXHRcdFx0cmV0dXJuIGkgPT09IGFycmF5Lmxlbmd0aCAtIDE7XG5cdFx0fSxcblxuXHRcdGV2ZW46IGZ1bmN0aW9uKCBlbGVtLCBpICkge1xuXHRcdFx0cmV0dXJuIGkgJSAyID09PSAwO1xuXHRcdH0sXG5cblx0XHRvZGQ6IGZ1bmN0aW9uKCBlbGVtLCBpICkge1xuXHRcdFx0cmV0dXJuIGkgJSAyID09PSAxO1xuXHRcdH0sXG5cblx0XHRsdDogZnVuY3Rpb24oIGVsZW0sIGksIG1hdGNoICkge1xuXHRcdFx0cmV0dXJuIGkgPCBtYXRjaFszXSAtIDA7XG5cdFx0fSxcblxuXHRcdGd0OiBmdW5jdGlvbiggZWxlbSwgaSwgbWF0Y2ggKSB7XG5cdFx0XHRyZXR1cm4gaSA+IG1hdGNoWzNdIC0gMDtcblx0XHR9LFxuXG5cdFx0bnRoOiBmdW5jdGlvbiggZWxlbSwgaSwgbWF0Y2ggKSB7XG5cdFx0XHRyZXR1cm4gbWF0Y2hbM10gLSAwID09PSBpO1xuXHRcdH0sXG5cblx0XHRlcTogZnVuY3Rpb24oIGVsZW0sIGksIG1hdGNoICkge1xuXHRcdFx0cmV0dXJuIG1hdGNoWzNdIC0gMCA9PT0gaTtcblx0XHR9XG5cdH0sXG5cdGZpbHRlcjoge1xuXHRcdFBTRVVETzogZnVuY3Rpb24oIGVsZW0sIG1hdGNoLCBpLCBhcnJheSApIHtcblx0XHRcdHZhciBuYW1lID0gbWF0Y2hbMV0sXG5cdFx0XHRcdGZpbHRlciA9IEV4cHIuZmlsdGVyc1sgbmFtZSBdO1xuXG5cdFx0XHRpZiAoIGZpbHRlciApIHtcblx0XHRcdFx0cmV0dXJuIGZpbHRlciggZWxlbSwgaSwgbWF0Y2gsIGFycmF5ICk7XG5cblx0XHRcdH0gZWxzZSBpZiAoIG5hbWUgPT09IFwiY29udGFpbnNcIiApIHtcblx0XHRcdFx0cmV0dXJuIChlbGVtLnRleHRDb250ZW50IHx8IGVsZW0uaW5uZXJUZXh0IHx8IGdldFRleHQoWyBlbGVtIF0pIHx8IFwiXCIpLmluZGV4T2YobWF0Y2hbM10pID49IDA7XG5cblx0XHRcdH0gZWxzZSBpZiAoIG5hbWUgPT09IFwibm90XCIgKSB7XG5cdFx0XHRcdHZhciBub3QgPSBtYXRjaFszXTtcblxuXHRcdFx0XHRmb3IgKCB2YXIgaiA9IDAsIGwgPSBub3QubGVuZ3RoOyBqIDwgbDsgaisrICkge1xuXHRcdFx0XHRcdGlmICggbm90W2pdID09PSBlbGVtICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRTaXp6bGUuZXJyb3IoIG5hbWUgKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0Q0hJTEQ6IGZ1bmN0aW9uKCBlbGVtLCBtYXRjaCApIHtcblx0XHRcdHZhciBmaXJzdCwgbGFzdCxcblx0XHRcdFx0ZG9uZU5hbWUsIHBhcmVudCwgY2FjaGUsXG5cdFx0XHRcdGNvdW50LCBkaWZmLFxuXHRcdFx0XHR0eXBlID0gbWF0Y2hbMV0sXG5cdFx0XHRcdG5vZGUgPSBlbGVtO1xuXG5cdFx0XHRzd2l0Y2ggKCB0eXBlICkge1xuXHRcdFx0XHRjYXNlIFwib25seVwiOlxuXHRcdFx0XHRjYXNlIFwiZmlyc3RcIjpcblx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmcpICkge1xuXHRcdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCB0eXBlID09PSBcImZpcnN0XCIgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRub2RlID0gZWxlbTtcblxuXHRcdFx0XHRcdC8qIGZhbGxzIHRocm91Z2ggKi9cblx0XHRcdFx0Y2FzZSBcImxhc3RcIjpcblx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gbm9kZS5uZXh0U2libGluZykgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIG5vZGUubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0XHRjYXNlIFwibnRoXCI6XG5cdFx0XHRcdFx0Zmlyc3QgPSBtYXRjaFsyXTtcblx0XHRcdFx0XHRsYXN0ID0gbWF0Y2hbM107XG5cblx0XHRcdFx0XHRpZiAoIGZpcnN0ID09PSAxICYmIGxhc3QgPT09IDAgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRkb25lTmFtZSA9IG1hdGNoWzBdO1xuXHRcdFx0XHRcdHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcblxuXHRcdFx0XHRcdGlmICggcGFyZW50ICYmIChwYXJlbnRbIGV4cGFuZG8gXSAhPT0gZG9uZU5hbWUgfHwgIWVsZW0ubm9kZUluZGV4KSApIHtcblx0XHRcdFx0XHRcdGNvdW50ID0gMDtcblxuXHRcdFx0XHRcdFx0Zm9yICggbm9kZSA9IHBhcmVudC5maXJzdENoaWxkOyBub2RlOyBub2RlID0gbm9kZS5uZXh0U2libGluZyApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdFx0XHRcdG5vZGUubm9kZUluZGV4ID0gKytjb3VudDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRwYXJlbnRbIGV4cGFuZG8gXSA9IGRvbmVOYW1lO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRpZmYgPSBlbGVtLm5vZGVJbmRleCAtIGxhc3Q7XG5cblx0XHRcdFx0XHRpZiAoIGZpcnN0ID09PSAwICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGRpZmYgPT09IDA7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuICggZGlmZiAlIGZpcnN0ID09PSAwICYmIGRpZmYgLyBmaXJzdCA+PSAwICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRJRDogZnVuY3Rpb24oIGVsZW0sIG1hdGNoICkge1xuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgZWxlbS5nZXRBdHRyaWJ1dGUoXCJpZFwiKSA9PT0gbWF0Y2g7XG5cdFx0fSxcblxuXHRcdFRBRzogZnVuY3Rpb24oIGVsZW0sIG1hdGNoICkge1xuXHRcdFx0cmV0dXJuIChtYXRjaCA9PT0gXCIqXCIgJiYgZWxlbS5ub2RlVHlwZSA9PT0gMSkgfHwgISFlbGVtLm5vZGVOYW1lICYmIGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbWF0Y2g7XG5cdFx0fSxcblxuXHRcdENMQVNTOiBmdW5jdGlvbiggZWxlbSwgbWF0Y2ggKSB7XG5cdFx0XHRyZXR1cm4gKFwiIFwiICsgKGVsZW0uY2xhc3NOYW1lIHx8IGVsZW0uZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikpICsgXCIgXCIpXG5cdFx0XHRcdC5pbmRleE9mKCBtYXRjaCApID4gLTE7XG5cdFx0fSxcblxuXHRcdEFUVFI6IGZ1bmN0aW9uKCBlbGVtLCBtYXRjaCApIHtcblx0XHRcdHZhciBuYW1lID0gbWF0Y2hbMV0sXG5cdFx0XHRcdHJlc3VsdCA9IFNpenpsZS5hdHRyID9cblx0XHRcdFx0XHRTaXp6bGUuYXR0ciggZWxlbSwgbmFtZSApIDpcblx0XHRcdFx0XHRFeHByLmF0dHJIYW5kbGVbIG5hbWUgXSA/XG5cdFx0XHRcdFx0RXhwci5hdHRySGFuZGxlWyBuYW1lIF0oIGVsZW0gKSA6XG5cdFx0XHRcdFx0ZWxlbVsgbmFtZSBdICE9IG51bGwgP1xuXHRcdFx0XHRcdFx0ZWxlbVsgbmFtZSBdIDpcblx0XHRcdFx0XHRcdGVsZW0uZ2V0QXR0cmlidXRlKCBuYW1lICksXG5cdFx0XHRcdHZhbHVlID0gcmVzdWx0ICsgXCJcIixcblx0XHRcdFx0dHlwZSA9IG1hdGNoWzJdLFxuXHRcdFx0XHRjaGVjayA9IG1hdGNoWzRdO1xuXG5cdFx0XHRyZXR1cm4gcmVzdWx0ID09IG51bGwgP1xuXHRcdFx0XHR0eXBlID09PSBcIiE9XCIgOlxuXHRcdFx0XHQhdHlwZSAmJiBTaXp6bGUuYXR0ciA/XG5cdFx0XHRcdHJlc3VsdCAhPSBudWxsIDpcblx0XHRcdFx0dHlwZSA9PT0gXCI9XCIgP1xuXHRcdFx0XHR2YWx1ZSA9PT0gY2hlY2sgOlxuXHRcdFx0XHR0eXBlID09PSBcIio9XCIgP1xuXHRcdFx0XHR2YWx1ZS5pbmRleE9mKGNoZWNrKSA+PSAwIDpcblx0XHRcdFx0dHlwZSA9PT0gXCJ+PVwiID9cblx0XHRcdFx0KFwiIFwiICsgdmFsdWUgKyBcIiBcIikuaW5kZXhPZihjaGVjaykgPj0gMCA6XG5cdFx0XHRcdCFjaGVjayA/XG5cdFx0XHRcdHZhbHVlICYmIHJlc3VsdCAhPT0gZmFsc2UgOlxuXHRcdFx0XHR0eXBlID09PSBcIiE9XCIgP1xuXHRcdFx0XHR2YWx1ZSAhPT0gY2hlY2sgOlxuXHRcdFx0XHR0eXBlID09PSBcIl49XCIgP1xuXHRcdFx0XHR2YWx1ZS5pbmRleE9mKGNoZWNrKSA9PT0gMCA6XG5cdFx0XHRcdHR5cGUgPT09IFwiJD1cIiA/XG5cdFx0XHRcdHZhbHVlLnN1YnN0cih2YWx1ZS5sZW5ndGggLSBjaGVjay5sZW5ndGgpID09PSBjaGVjayA6XG5cdFx0XHRcdHR5cGUgPT09IFwifD1cIiA/XG5cdFx0XHRcdHZhbHVlID09PSBjaGVjayB8fCB2YWx1ZS5zdWJzdHIoMCwgY2hlY2subGVuZ3RoICsgMSkgPT09IGNoZWNrICsgXCItXCIgOlxuXHRcdFx0XHRmYWxzZTtcblx0XHR9LFxuXG5cdFx0UE9TOiBmdW5jdGlvbiggZWxlbSwgbWF0Y2gsIGksIGFycmF5ICkge1xuXHRcdFx0dmFyIG5hbWUgPSBtYXRjaFsyXSxcblx0XHRcdFx0ZmlsdGVyID0gRXhwci5zZXRGaWx0ZXJzWyBuYW1lIF07XG5cblx0XHRcdGlmICggZmlsdGVyICkge1xuXHRcdFx0XHRyZXR1cm4gZmlsdGVyKCBlbGVtLCBpLCBtYXRjaCwgYXJyYXkgKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbnZhciBvcmlnUE9TID0gRXhwci5tYXRjaC5QT1MsXG5cdGZlc2NhcGUgPSBmdW5jdGlvbihhbGwsIG51bSl7XG5cdFx0cmV0dXJuIFwiXFxcXFwiICsgKG51bSAtIDAgKyAxKTtcblx0fTtcblxuZm9yICggdmFyIHR5cGUgaW4gRXhwci5tYXRjaCApIHtcblx0RXhwci5tYXRjaFsgdHlwZSBdID0gbmV3IFJlZ0V4cCggRXhwci5tYXRjaFsgdHlwZSBdLnNvdXJjZSArICgvKD8hW15cXFtdKlxcXSkoPyFbXlxcKF0qXFwpKS8uc291cmNlKSApO1xuXHRFeHByLmxlZnRNYXRjaFsgdHlwZSBdID0gbmV3IFJlZ0V4cCggLyheKD86LnxcXHJ8XFxuKSo/KS8uc291cmNlICsgRXhwci5tYXRjaFsgdHlwZSBdLnNvdXJjZS5yZXBsYWNlKC9cXFxcKFxcZCspL2csIGZlc2NhcGUpICk7XG59XG4vLyBFeHBvc2Ugb3JpZ1BPU1xuLy8gXCJnbG9iYWxcIiBhcyBpbiByZWdhcmRsZXNzIG9mIHJlbGF0aW9uIHRvIGJyYWNrZXRzL3BhcmVuc1xuRXhwci5tYXRjaC5nbG9iYWxQT1MgPSBvcmlnUE9TO1xuXG52YXIgbWFrZUFycmF5ID0gZnVuY3Rpb24oIGFycmF5LCByZXN1bHRzICkge1xuXHRhcnJheSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcnJheSwgMCApO1xuXG5cdGlmICggcmVzdWx0cyApIHtcblx0XHRyZXN1bHRzLnB1c2guYXBwbHkoIHJlc3VsdHMsIGFycmF5ICk7XG5cdFx0cmV0dXJuIHJlc3VsdHM7XG5cdH1cblxuXHRyZXR1cm4gYXJyYXk7XG59O1xuXG4vLyBQZXJmb3JtIGEgc2ltcGxlIGNoZWNrIHRvIGRldGVybWluZSBpZiB0aGUgYnJvd3NlciBpcyBjYXBhYmxlIG9mXG4vLyBjb252ZXJ0aW5nIGEgTm9kZUxpc3QgdG8gYW4gYXJyYXkgdXNpbmcgYnVpbHRpbiBtZXRob2RzLlxuLy8gQWxzbyB2ZXJpZmllcyB0aGF0IHRoZSByZXR1cm5lZCBhcnJheSBob2xkcyBET00gbm9kZXNcbi8vICh3aGljaCBpcyBub3QgdGhlIGNhc2UgaW4gdGhlIEJsYWNrYmVycnkgYnJvd3NlcilcbnRyeSB7XG5cdEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2hpbGROb2RlcywgMCApWzBdLm5vZGVUeXBlO1xuXG4vLyBQcm92aWRlIGEgZmFsbGJhY2sgbWV0aG9kIGlmIGl0IGRvZXMgbm90IHdvcmtcbn0gY2F0Y2goIGUgKSB7XG5cdG1ha2VBcnJheSA9IGZ1bmN0aW9uKCBhcnJheSwgcmVzdWx0cyApIHtcblx0XHR2YXIgaSA9IDAsXG5cdFx0XHRyZXQgPSByZXN1bHRzIHx8IFtdO1xuXG5cdFx0aWYgKCB0b1N0cmluZy5jYWxsKGFycmF5KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICkge1xuXHRcdFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoIHJldCwgYXJyYXkgKTtcblxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBhcnJheS5sZW5ndGggPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdGZvciAoIHZhciBsID0gYXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRcdHJldC5wdXNoKCBhcnJheVtpXSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZvciAoIDsgYXJyYXlbaV07IGkrKyApIHtcblx0XHRcdFx0XHRyZXQucHVzaCggYXJyYXlbaV0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXQ7XG5cdH07XG59XG5cbnZhciBzb3J0T3JkZXIsIHNpYmxpbmdDaGVjaztcblxuaWYgKCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY29tcGFyZURvY3VtZW50UG9zaXRpb24gKSB7XG5cdHNvcnRPcmRlciA9IGZ1bmN0aW9uKCBhLCBiICkge1xuXHRcdGlmICggYSA9PT0gYiApIHtcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHRpZiAoICFhLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uIHx8ICFiLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uICkge1xuXHRcdFx0cmV0dXJuIGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24gPyAtMSA6IDE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYikgJiA0ID8gLTEgOiAxO1xuXHR9O1xuXG59IGVsc2Uge1xuXHRzb3J0T3JkZXIgPSBmdW5jdGlvbiggYSwgYiApIHtcblx0XHQvLyBUaGUgbm9kZXMgYXJlIGlkZW50aWNhbCwgd2UgY2FuIGV4aXQgZWFybHlcblx0XHRpZiAoIGEgPT09IGIgKSB7XG5cdFx0XHRoYXNEdXBsaWNhdGUgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIDA7XG5cblx0XHQvLyBGYWxsYmFjayB0byB1c2luZyBzb3VyY2VJbmRleCAoaW4gSUUpIGlmIGl0J3MgYXZhaWxhYmxlIG9uIGJvdGggbm9kZXNcblx0XHR9IGVsc2UgaWYgKCBhLnNvdXJjZUluZGV4ICYmIGIuc291cmNlSW5kZXggKSB7XG5cdFx0XHRyZXR1cm4gYS5zb3VyY2VJbmRleCAtIGIuc291cmNlSW5kZXg7XG5cdFx0fVxuXG5cdFx0dmFyIGFsLCBibCxcblx0XHRcdGFwID0gW10sXG5cdFx0XHRicCA9IFtdLFxuXHRcdFx0YXVwID0gYS5wYXJlbnROb2RlLFxuXHRcdFx0YnVwID0gYi5wYXJlbnROb2RlLFxuXHRcdFx0Y3VyID0gYXVwO1xuXG5cdFx0Ly8gSWYgdGhlIG5vZGVzIGFyZSBzaWJsaW5ncyAob3IgaWRlbnRpY2FsKSB3ZSBjYW4gZG8gYSBxdWljayBjaGVja1xuXHRcdGlmICggYXVwID09PSBidXAgKSB7XG5cdFx0XHRyZXR1cm4gc2libGluZ0NoZWNrKCBhLCBiICk7XG5cblx0XHQvLyBJZiBubyBwYXJlbnRzIHdlcmUgZm91bmQgdGhlbiB0aGUgbm9kZXMgYXJlIGRpc2Nvbm5lY3RlZFxuXHRcdH0gZWxzZSBpZiAoICFhdXAgKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cblx0XHR9IGVsc2UgaWYgKCAhYnVwICkge1xuXHRcdFx0cmV0dXJuIDE7XG5cdFx0fVxuXG5cdFx0Ly8gT3RoZXJ3aXNlIHRoZXkncmUgc29tZXdoZXJlIGVsc2UgaW4gdGhlIHRyZWUgc28gd2UgbmVlZFxuXHRcdC8vIHRvIGJ1aWxkIHVwIGEgZnVsbCBsaXN0IG9mIHRoZSBwYXJlbnROb2RlcyBmb3IgY29tcGFyaXNvblxuXHRcdHdoaWxlICggY3VyICkge1xuXHRcdFx0YXAudW5zaGlmdCggY3VyICk7XG5cdFx0XHRjdXIgPSBjdXIucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRjdXIgPSBidXA7XG5cblx0XHR3aGlsZSAoIGN1ciApIHtcblx0XHRcdGJwLnVuc2hpZnQoIGN1ciApO1xuXHRcdFx0Y3VyID0gY3VyLnBhcmVudE5vZGU7XG5cdFx0fVxuXG5cdFx0YWwgPSBhcC5sZW5ndGg7XG5cdFx0YmwgPSBicC5sZW5ndGg7XG5cblx0XHQvLyBTdGFydCB3YWxraW5nIGRvd24gdGhlIHRyZWUgbG9va2luZyBmb3IgYSBkaXNjcmVwYW5jeVxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IGFsICYmIGkgPCBibDsgaSsrICkge1xuXHRcdFx0aWYgKCBhcFtpXSAhPT0gYnBbaV0gKSB7XG5cdFx0XHRcdHJldHVybiBzaWJsaW5nQ2hlY2soIGFwW2ldLCBicFtpXSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFdlIGVuZGVkIHNvbWVwbGFjZSB1cCB0aGUgdHJlZSBzbyBkbyBhIHNpYmxpbmcgY2hlY2tcblx0XHRyZXR1cm4gaSA9PT0gYWwgP1xuXHRcdFx0c2libGluZ0NoZWNrKCBhLCBicFtpXSwgLTEgKSA6XG5cdFx0XHRzaWJsaW5nQ2hlY2soIGFwW2ldLCBiLCAxICk7XG5cdH07XG5cblx0c2libGluZ0NoZWNrID0gZnVuY3Rpb24oIGEsIGIsIHJldCApIHtcblx0XHRpZiAoIGEgPT09IGIgKSB7XG5cdFx0XHRyZXR1cm4gcmV0O1xuXHRcdH1cblxuXHRcdHZhciBjdXIgPSBhLm5leHRTaWJsaW5nO1xuXG5cdFx0d2hpbGUgKCBjdXIgKSB7XG5cdFx0XHRpZiAoIGN1ciA9PT0gYiApIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXG5cdFx0XHRjdXIgPSBjdXIubmV4dFNpYmxpbmc7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDE7XG5cdH07XG59XG5cbi8vIENoZWNrIHRvIHNlZSBpZiB0aGUgYnJvd3NlciByZXR1cm5zIGVsZW1lbnRzIGJ5IG5hbWUgd2hlblxuLy8gcXVlcnlpbmcgYnkgZ2V0RWxlbWVudEJ5SWQgKGFuZCBwcm92aWRlIGEgd29ya2Fyb3VuZClcbihmdW5jdGlvbigpe1xuXHQvLyBXZSdyZSBnb2luZyB0byBpbmplY3QgYSBmYWtlIGlucHV0IGVsZW1lbnQgd2l0aCBhIHNwZWNpZmllZCBuYW1lXG5cdHZhciBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSxcblx0XHRpZCA9IFwic2NyaXB0XCIgKyAobmV3IERhdGUoKSkuZ2V0VGltZSgpLFxuXHRcdHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cblx0Zm9ybS5pbm5lckhUTUwgPSBcIjxhIG5hbWU9J1wiICsgaWQgKyBcIicvPlwiO1xuXG5cdC8vIEluamVjdCBpdCBpbnRvIHRoZSByb290IGVsZW1lbnQsIGNoZWNrIGl0cyBzdGF0dXMsIGFuZCByZW1vdmUgaXQgcXVpY2tseVxuXHRyb290Lmluc2VydEJlZm9yZSggZm9ybSwgcm9vdC5maXJzdENoaWxkICk7XG5cblx0Ly8gVGhlIHdvcmthcm91bmQgaGFzIHRvIGRvIGFkZGl0aW9uYWwgY2hlY2tzIGFmdGVyIGEgZ2V0RWxlbWVudEJ5SWRcblx0Ly8gV2hpY2ggc2xvd3MgdGhpbmdzIGRvd24gZm9yIG90aGVyIGJyb3dzZXJzIChoZW5jZSB0aGUgYnJhbmNoaW5nKVxuXHRpZiAoIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBpZCApICkge1xuXHRcdEV4cHIuZmluZC5JRCA9IGZ1bmN0aW9uKCBtYXRjaCwgY29udGV4dCwgaXNYTUwgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRCeUlkICE9PSBcInVuZGVmaW5lZFwiICYmICFpc1hNTCApIHtcblx0XHRcdFx0dmFyIG0gPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKG1hdGNoWzFdKTtcblxuXHRcdFx0XHRyZXR1cm4gbSA/XG5cdFx0XHRcdFx0bS5pZCA9PT0gbWF0Y2hbMV0gfHwgdHlwZW9mIG0uZ2V0QXR0cmlidXRlTm9kZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtLmdldEF0dHJpYnV0ZU5vZGUoXCJpZFwiKS5ub2RlVmFsdWUgPT09IG1hdGNoWzFdID9cblx0XHRcdFx0XHRcdFttXSA6XG5cdFx0XHRcdFx0XHR1bmRlZmluZWQgOlxuXHRcdFx0XHRcdFtdO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRFeHByLmZpbHRlci5JRCA9IGZ1bmN0aW9uKCBlbGVtLCBtYXRjaCApIHtcblx0XHRcdHZhciBub2RlID0gdHlwZW9mIGVsZW0uZ2V0QXR0cmlidXRlTm9kZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBlbGVtLmdldEF0dHJpYnV0ZU5vZGUoXCJpZFwiKTtcblxuXHRcdFx0cmV0dXJuIGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgbm9kZSAmJiBub2RlLm5vZGVWYWx1ZSA9PT0gbWF0Y2g7XG5cdFx0fTtcblx0fVxuXG5cdHJvb3QucmVtb3ZlQ2hpbGQoIGZvcm0gKTtcblxuXHQvLyByZWxlYXNlIG1lbW9yeSBpbiBJRVxuXHRyb290ID0gZm9ybSA9IG51bGw7XG59KSgpO1xuXG4oZnVuY3Rpb24oKXtcblx0Ly8gQ2hlY2sgdG8gc2VlIGlmIHRoZSBicm93c2VyIHJldHVybnMgb25seSBlbGVtZW50c1xuXHQvLyB3aGVuIGRvaW5nIGdldEVsZW1lbnRzQnlUYWdOYW1lKFwiKlwiKVxuXG5cdC8vIENyZWF0ZSBhIGZha2UgZWxlbWVudFxuXHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0ZGl2LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVDb21tZW50KFwiXCIpICk7XG5cblx0Ly8gTWFrZSBzdXJlIG5vIGNvbW1lbnRzIGFyZSBmb3VuZFxuXHRpZiAoIGRpdi5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIikubGVuZ3RoID4gMCApIHtcblx0XHRFeHByLmZpbmQuVEFHID0gZnVuY3Rpb24oIG1hdGNoLCBjb250ZXh0ICkge1xuXHRcdFx0dmFyIHJlc3VsdHMgPSBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBtYXRjaFsxXSApO1xuXG5cdFx0XHQvLyBGaWx0ZXIgb3V0IHBvc3NpYmxlIGNvbW1lbnRzXG5cdFx0XHRpZiAoIG1hdGNoWzFdID09PSBcIipcIiApIHtcblx0XHRcdFx0dmFyIHRtcCA9IFtdO1xuXG5cdFx0XHRcdGZvciAoIHZhciBpID0gMDsgcmVzdWx0c1tpXTsgaSsrICkge1xuXHRcdFx0XHRcdGlmICggcmVzdWx0c1tpXS5ub2RlVHlwZSA9PT0gMSApIHtcblx0XHRcdFx0XHRcdHRtcC5wdXNoKCByZXN1bHRzW2ldICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmVzdWx0cyA9IHRtcDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0fTtcblx0fVxuXG5cdC8vIENoZWNrIHRvIHNlZSBpZiBhbiBhdHRyaWJ1dGUgcmV0dXJucyBub3JtYWxpemVkIGhyZWYgYXR0cmlidXRlc1xuXHRkaXYuaW5uZXJIVE1MID0gXCI8YSBocmVmPScjJz48L2E+XCI7XG5cblx0aWYgKCBkaXYuZmlyc3RDaGlsZCAmJiB0eXBlb2YgZGl2LmZpcnN0Q2hpbGQuZ2V0QXR0cmlidXRlICE9PSBcInVuZGVmaW5lZFwiICYmXG5cdFx0XHRkaXYuZmlyc3RDaGlsZC5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpICE9PSBcIiNcIiApIHtcblxuXHRcdEV4cHIuYXR0ckhhbmRsZS5ocmVmID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5nZXRBdHRyaWJ1dGUoIFwiaHJlZlwiLCAyICk7XG5cdFx0fTtcblx0fVxuXG5cdC8vIHJlbGVhc2UgbWVtb3J5IGluIElFXG5cdGRpdiA9IG51bGw7XG59KSgpO1xuXG5pZiAoIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwgKSB7XG5cdChmdW5jdGlvbigpe1xuXHRcdHZhciBvbGRTaXp6bGUgPSBTaXp6bGUsXG5cdFx0XHRkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuXHRcdFx0aWQgPSBcIl9fc2l6emxlX19cIjtcblxuXHRcdGRpdi5pbm5lckhUTUwgPSBcIjxwIGNsYXNzPSdURVNUJz48L3A+XCI7XG5cblx0XHQvLyBTYWZhcmkgY2FuJ3QgaGFuZGxlIHVwcGVyY2FzZSBvciB1bmljb2RlIGNoYXJhY3RlcnMgd2hlblxuXHRcdC8vIGluIHF1aXJrcyBtb2RlLlxuXHRcdGlmICggZGl2LnF1ZXJ5U2VsZWN0b3JBbGwgJiYgZGl2LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuVEVTVFwiKS5sZW5ndGggPT09IDAgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0U2l6emxlID0gZnVuY3Rpb24oIHF1ZXJ5LCBjb250ZXh0LCBleHRyYSwgc2VlZCApIHtcblx0XHRcdGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuXG5cdFx0XHQvLyBPbmx5IHVzZSBxdWVyeVNlbGVjdG9yQWxsIG9uIG5vbi1YTUwgZG9jdW1lbnRzXG5cdFx0XHQvLyAoSUQgc2VsZWN0b3JzIGRvbid0IHdvcmsgaW4gbm9uLUhUTUwgZG9jdW1lbnRzKVxuXHRcdFx0aWYgKCAhc2VlZCAmJiAhU2l6emxlLmlzWE1MKGNvbnRleHQpICkge1xuXHRcdFx0XHQvLyBTZWUgaWYgd2UgZmluZCBhIHNlbGVjdG9yIHRvIHNwZWVkIHVwXG5cdFx0XHRcdHZhciBtYXRjaCA9IC9eKFxcdyskKXxeXFwuKFtcXHdcXC1dKyQpfF4jKFtcXHdcXC1dKyQpLy5leGVjKCBxdWVyeSApO1xuXG5cdFx0XHRcdGlmICggbWF0Y2ggJiYgKGNvbnRleHQubm9kZVR5cGUgPT09IDEgfHwgY29udGV4dC5ub2RlVHlwZSA9PT0gOSkgKSB7XG5cdFx0XHRcdFx0Ly8gU3BlZWQtdXA6IFNpenpsZShcIlRBR1wiKVxuXHRcdFx0XHRcdGlmICggbWF0Y2hbMV0gKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbWFrZUFycmF5KCBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBxdWVyeSApLCBleHRyYSApO1xuXG5cdFx0XHRcdFx0Ly8gU3BlZWQtdXA6IFNpenpsZShcIi5DTEFTU1wiKVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIG1hdGNoWzJdICYmIEV4cHIuZmluZC5DTEFTUyAmJiBjb250ZXh0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbWFrZUFycmF5KCBjb250ZXh0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoIG1hdGNoWzJdICksIGV4dHJhICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBjb250ZXh0Lm5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHRcdC8vIFNwZWVkLXVwOiBTaXp6bGUoXCJib2R5XCIpXG5cdFx0XHRcdFx0Ly8gVGhlIGJvZHkgZWxlbWVudCBvbmx5IGV4aXN0cyBvbmNlLCBvcHRpbWl6ZSBmaW5kaW5nIGl0XG5cdFx0XHRcdFx0aWYgKCBxdWVyeSA9PT0gXCJib2R5XCIgJiYgY29udGV4dC5ib2R5ICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG1ha2VBcnJheSggWyBjb250ZXh0LmJvZHkgXSwgZXh0cmEgKTtcblxuXHRcdFx0XHRcdC8vIFNwZWVkLXVwOiBTaXp6bGUoXCIjSURcIilcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBtYXRjaCAmJiBtYXRjaFszXSApIHtcblx0XHRcdFx0XHRcdHZhciBlbGVtID0gY29udGV4dC5nZXRFbGVtZW50QnlJZCggbWF0Y2hbM10gKTtcblxuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgcGFyZW50Tm9kZSB0byBjYXRjaCB3aGVuIEJsYWNrYmVycnkgNC42IHJldHVybnNcblx0XHRcdFx0XHRcdC8vIG5vZGVzIHRoYXQgYXJlIG5vIGxvbmdlciBpbiB0aGUgZG9jdW1lbnQgIzY5NjNcblx0XHRcdFx0XHRcdGlmICggZWxlbSAmJiBlbGVtLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSBJRSBhbmQgT3BlcmEgcmV0dXJuIGl0ZW1zXG5cdFx0XHRcdFx0XHRcdC8vIGJ5IG5hbWUgaW5zdGVhZCBvZiBJRFxuXHRcdFx0XHRcdFx0XHRpZiAoIGVsZW0uaWQgPT09IG1hdGNoWzNdICkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBtYWtlQXJyYXkoIFsgZWxlbSBdLCBleHRyYSApO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtYWtlQXJyYXkoIFtdLCBleHRyYSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbWFrZUFycmF5KCBjb250ZXh0LnF1ZXJ5U2VsZWN0b3JBbGwocXVlcnkpLCBleHRyYSApO1xuXHRcdFx0XHRcdH0gY2F0Y2gocXNhRXJyb3IpIHt9XG5cblx0XHRcdFx0Ly8gcVNBIHdvcmtzIHN0cmFuZ2VseSBvbiBFbGVtZW50LXJvb3RlZCBxdWVyaWVzXG5cdFx0XHRcdC8vIFdlIGNhbiB3b3JrIGFyb3VuZCB0aGlzIGJ5IHNwZWNpZnlpbmcgYW4gZXh0cmEgSUQgb24gdGhlIHJvb3Rcblx0XHRcdFx0Ly8gYW5kIHdvcmtpbmcgdXAgZnJvbSB0aGVyZSAoVGhhbmtzIHRvIEFuZHJldyBEdXBvbnQgZm9yIHRoZSB0ZWNobmlxdWUpXG5cdFx0XHRcdC8vIElFIDggZG9lc24ndCB3b3JrIG9uIG9iamVjdCBlbGVtZW50c1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBjb250ZXh0Lm5vZGVUeXBlID09PSAxICYmIGNvbnRleHQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJvYmplY3RcIiApIHtcblx0XHRcdFx0XHR2YXIgb2xkQ29udGV4dCA9IGNvbnRleHQsXG5cdFx0XHRcdFx0XHRvbGQgPSBjb250ZXh0LmdldEF0dHJpYnV0ZSggXCJpZFwiICksXG5cdFx0XHRcdFx0XHRuaWQgPSBvbGQgfHwgaWQsXG5cdFx0XHRcdFx0XHRoYXNQYXJlbnQgPSBjb250ZXh0LnBhcmVudE5vZGUsXG5cdFx0XHRcdFx0XHRyZWxhdGl2ZUhpZXJhcmNoeVNlbGVjdG9yID0gL15cXHMqWyt+XS8udGVzdCggcXVlcnkgKTtcblxuXHRcdFx0XHRcdGlmICggIW9sZCApIHtcblx0XHRcdFx0XHRcdGNvbnRleHQuc2V0QXR0cmlidXRlKCBcImlkXCIsIG5pZCApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRuaWQgPSBuaWQucmVwbGFjZSggLycvZywgXCJcXFxcJCZcIiApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHJlbGF0aXZlSGllcmFyY2h5U2VsZWN0b3IgJiYgaGFzUGFyZW50ICkge1xuXHRcdFx0XHRcdFx0Y29udGV4dCA9IGNvbnRleHQucGFyZW50Tm9kZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0aWYgKCAhcmVsYXRpdmVIaWVyYXJjaHlTZWxlY3RvciB8fCBoYXNQYXJlbnQgKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtYWtlQXJyYXkoIGNvbnRleHQucXVlcnlTZWxlY3RvckFsbCggXCJbaWQ9J1wiICsgbmlkICsgXCInXSBcIiArIHF1ZXJ5ICksIGV4dHJhICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9IGNhdGNoKHBzZXVkb0Vycm9yKSB7XG5cdFx0XHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0XHRcdGlmICggIW9sZCApIHtcblx0XHRcdFx0XHRcdFx0b2xkQ29udGV4dC5yZW1vdmVBdHRyaWJ1dGUoIFwiaWRcIiApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gb2xkU2l6emxlKHF1ZXJ5LCBjb250ZXh0LCBleHRyYSwgc2VlZCk7XG5cdFx0fTtcblxuXHRcdGZvciAoIHZhciBwcm9wIGluIG9sZFNpenpsZSApIHtcblx0XHRcdFNpenpsZVsgcHJvcCBdID0gb2xkU2l6emxlWyBwcm9wIF07XG5cdFx0fVxuXG5cdFx0Ly8gcmVsZWFzZSBtZW1vcnkgaW4gSUVcblx0XHRkaXYgPSBudWxsO1xuXHR9KSgpO1xufVxuXG4oZnVuY3Rpb24oKXtcblx0dmFyIGh0bWwgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXG5cdFx0bWF0Y2hlcyA9IGh0bWwubWF0Y2hlc1NlbGVjdG9yIHx8IGh0bWwubW96TWF0Y2hlc1NlbGVjdG9yIHx8IGh0bWwud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IGh0bWwubXNNYXRjaGVzU2VsZWN0b3I7XG5cblx0aWYgKCBtYXRjaGVzICkge1xuXHRcdC8vIENoZWNrIHRvIHNlZSBpZiBpdCdzIHBvc3NpYmxlIHRvIGRvIG1hdGNoZXNTZWxlY3RvclxuXHRcdC8vIG9uIGEgZGlzY29ubmVjdGVkIG5vZGUgKElFIDkgZmFpbHMgdGhpcylcblx0XHR2YXIgZGlzY29ubmVjdGVkTWF0Y2ggPSAhbWF0Y2hlcy5jYWxsKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImRpdlwiICksIFwiZGl2XCIgKSxcblx0XHRcdHBzZXVkb1dvcmtzID0gZmFsc2U7XG5cblx0XHR0cnkge1xuXHRcdFx0Ly8gVGhpcyBzaG91bGQgZmFpbCB3aXRoIGFuIGV4Y2VwdGlvblxuXHRcdFx0Ly8gR2Vja28gZG9lcyBub3QgZXJyb3IsIHJldHVybnMgZmFsc2UgaW5zdGVhZFxuXHRcdFx0bWF0Y2hlcy5jYWxsKCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIFwiW3Rlc3QhPScnXTpzaXp6bGVcIiApO1xuXG5cdFx0fSBjYXRjaCggcHNldWRvRXJyb3IgKSB7XG5cdFx0XHRwc2V1ZG9Xb3JrcyA9IHRydWU7XG5cdFx0fVxuXG5cdFx0U2l6emxlLm1hdGNoZXNTZWxlY3RvciA9IGZ1bmN0aW9uKCBub2RlLCBleHByICkge1xuXHRcdFx0Ly8gTWFrZSBzdXJlIHRoYXQgYXR0cmlidXRlIHNlbGVjdG9ycyBhcmUgcXVvdGVkXG5cdFx0XHRleHByID0gZXhwci5yZXBsYWNlKC9cXD1cXHMqKFteJ1wiXFxdXSopXFxzKlxcXS9nLCBcIj0nJDEnXVwiKTtcblxuXHRcdFx0aWYgKCAhU2l6emxlLmlzWE1MKCBub2RlICkgKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0aWYgKCBwc2V1ZG9Xb3JrcyB8fCAhRXhwci5tYXRjaC5QU0VVRE8udGVzdCggZXhwciApICYmICEvIT0vLnRlc3QoIGV4cHIgKSApIHtcblx0XHRcdFx0XHRcdHZhciByZXQgPSBtYXRjaGVzLmNhbGwoIG5vZGUsIGV4cHIgKTtcblxuXHRcdFx0XHRcdFx0Ly8gSUUgOSdzIG1hdGNoZXNTZWxlY3RvciByZXR1cm5zIGZhbHNlIG9uIGRpc2Nvbm5lY3RlZCBub2Rlc1xuXHRcdFx0XHRcdFx0aWYgKCByZXQgfHwgIWRpc2Nvbm5lY3RlZE1hdGNoIHx8XG5cdFx0XHRcdFx0XHRcdFx0Ly8gQXMgd2VsbCwgZGlzY29ubmVjdGVkIG5vZGVzIGFyZSBzYWlkIHRvIGJlIGluIGEgZG9jdW1lbnRcblx0XHRcdFx0XHRcdFx0XHQvLyBmcmFnbWVudCBpbiBJRSA5LCBzbyBjaGVjayBmb3IgdGhhdFxuXHRcdFx0XHRcdFx0XHRcdG5vZGUuZG9jdW1lbnQgJiYgbm9kZS5kb2N1bWVudC5ub2RlVHlwZSAhPT0gMTEgKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGNhdGNoKGUpIHt9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBTaXp6bGUoZXhwciwgbnVsbCwgbnVsbCwgW25vZGVdKS5sZW5ndGggPiAwO1xuXHRcdH07XG5cdH1cbn0pKCk7XG5cbihmdW5jdGlvbigpe1xuXHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuXHRkaXYuaW5uZXJIVE1MID0gXCI8ZGl2IGNsYXNzPSd0ZXN0IGUnPjwvZGl2PjxkaXYgY2xhc3M9J3Rlc3QnPjwvZGl2PlwiO1xuXG5cdC8vIE9wZXJhIGNhbid0IGZpbmQgYSBzZWNvbmQgY2xhc3NuYW1lIChpbiA5LjYpXG5cdC8vIEFsc28sIG1ha2Ugc3VyZSB0aGF0IGdldEVsZW1lbnRzQnlDbGFzc05hbWUgYWN0dWFsbHkgZXhpc3RzXG5cdGlmICggIWRpdi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lIHx8IGRpdi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZVwiKS5sZW5ndGggPT09IDAgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Ly8gU2FmYXJpIGNhY2hlcyBjbGFzcyBhdHRyaWJ1dGVzLCBkb2Vzbid0IGNhdGNoIGNoYW5nZXMgKGluIDMuMilcblx0ZGl2Lmxhc3RDaGlsZC5jbGFzc05hbWUgPSBcImVcIjtcblxuXHRpZiAoIGRpdi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZVwiKS5sZW5ndGggPT09IDEgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0RXhwci5vcmRlci5zcGxpY2UoMSwgMCwgXCJDTEFTU1wiKTtcblx0RXhwci5maW5kLkNMQVNTID0gZnVuY3Rpb24oIG1hdGNoLCBjb250ZXh0LCBpc1hNTCApIHtcblx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlDbGFzc05hbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgIWlzWE1MICkge1xuXHRcdFx0cmV0dXJuIGNvbnRleHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShtYXRjaFsxXSk7XG5cdFx0fVxuXHR9O1xuXG5cdC8vIHJlbGVhc2UgbWVtb3J5IGluIElFXG5cdGRpdiA9IG51bGw7XG59KSgpO1xuXG5mdW5jdGlvbiBkaXJOb2RlQ2hlY2soIGRpciwgY3VyLCBkb25lTmFtZSwgY2hlY2tTZXQsIG5vZGVDaGVjaywgaXNYTUwgKSB7XG5cdGZvciAoIHZhciBpID0gMCwgbCA9IGNoZWNrU2V0Lmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHR2YXIgZWxlbSA9IGNoZWNrU2V0W2ldO1xuXG5cdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0dmFyIG1hdGNoID0gZmFsc2U7XG5cblx0XHRcdGVsZW0gPSBlbGVtW2Rpcl07XG5cblx0XHRcdHdoaWxlICggZWxlbSApIHtcblx0XHRcdFx0aWYgKCBlbGVtWyBleHBhbmRvIF0gPT09IGRvbmVOYW1lICkge1xuXHRcdFx0XHRcdG1hdGNoID0gY2hlY2tTZXRbZWxlbS5zaXpzZXRdO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICYmICFpc1hNTCApe1xuXHRcdFx0XHRcdGVsZW1bIGV4cGFuZG8gXSA9IGRvbmVOYW1lO1xuXHRcdFx0XHRcdGVsZW0uc2l6c2V0ID0gaTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBjdXIgKSB7XG5cdFx0XHRcdFx0bWF0Y2ggPSBlbGVtO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZWxlbSA9IGVsZW1bZGlyXTtcblx0XHRcdH1cblxuXHRcdFx0Y2hlY2tTZXRbaV0gPSBtYXRjaDtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gZGlyQ2hlY2soIGRpciwgY3VyLCBkb25lTmFtZSwgY2hlY2tTZXQsIG5vZGVDaGVjaywgaXNYTUwgKSB7XG5cdGZvciAoIHZhciBpID0gMCwgbCA9IGNoZWNrU2V0Lmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHR2YXIgZWxlbSA9IGNoZWNrU2V0W2ldO1xuXG5cdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0dmFyIG1hdGNoID0gZmFsc2U7XG5cblx0XHRcdGVsZW0gPSBlbGVtW2Rpcl07XG5cblx0XHRcdHdoaWxlICggZWxlbSApIHtcblx0XHRcdFx0aWYgKCBlbGVtWyBleHBhbmRvIF0gPT09IGRvbmVOYW1lICkge1xuXHRcdFx0XHRcdG1hdGNoID0gY2hlY2tTZXRbZWxlbS5zaXpzZXRdO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdGlmICggIWlzWE1MICkge1xuXHRcdFx0XHRcdFx0ZWxlbVsgZXhwYW5kbyBdID0gZG9uZU5hbWU7XG5cdFx0XHRcdFx0XHRlbGVtLnNpenNldCA9IGk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgY3VyICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHRcdFx0aWYgKCBlbGVtID09PSBjdXIgKSB7XG5cdFx0XHRcdFx0XHRcdG1hdGNoID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCBTaXp6bGUuZmlsdGVyKCBjdXIsIFtlbGVtXSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRtYXRjaCA9IGVsZW07XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRlbGVtID0gZWxlbVtkaXJdO1xuXHRcdFx0fVxuXG5cdFx0XHRjaGVja1NldFtpXSA9IG1hdGNoO1xuXHRcdH1cblx0fVxufVxuXG5pZiAoIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jb250YWlucyApIHtcblx0U2l6emxlLmNvbnRhaW5zID0gZnVuY3Rpb24oIGEsIGIgKSB7XG5cdFx0cmV0dXJuIGEgIT09IGIgJiYgKGEuY29udGFpbnMgPyBhLmNvbnRhaW5zKGIpIDogdHJ1ZSk7XG5cdH07XG5cbn0gZWxzZSBpZiAoIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiApIHtcblx0U2l6emxlLmNvbnRhaW5zID0gZnVuY3Rpb24oIGEsIGIgKSB7XG5cdFx0cmV0dXJuICEhKGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYikgJiAxNik7XG5cdH07XG5cbn0gZWxzZSB7XG5cdFNpenpsZS5jb250YWlucyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcbn1cblxuU2l6emxlLmlzWE1MID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdC8vIGRvY3VtZW50RWxlbWVudCBpcyB2ZXJpZmllZCBmb3IgY2FzZXMgd2hlcmUgaXQgZG9lc24ndCB5ZXQgZXhpc3Rcblx0Ly8gKHN1Y2ggYXMgbG9hZGluZyBpZnJhbWVzIGluIElFIC0gIzQ4MzMpXG5cdHZhciBkb2N1bWVudEVsZW1lbnQgPSAoZWxlbSA/IGVsZW0ub3duZXJEb2N1bWVudCB8fCBlbGVtIDogMCkuZG9jdW1lbnRFbGVtZW50O1xuXG5cdHJldHVybiBkb2N1bWVudEVsZW1lbnQgPyBkb2N1bWVudEVsZW1lbnQubm9kZU5hbWUgIT09IFwiSFRNTFwiIDogZmFsc2U7XG59O1xuXG52YXIgcG9zUHJvY2VzcyA9IGZ1bmN0aW9uKCBzZWxlY3RvciwgY29udGV4dCwgc2VlZCApIHtcblx0dmFyIG1hdGNoLFxuXHRcdHRtcFNldCA9IFtdLFxuXHRcdGxhdGVyID0gXCJcIixcblx0XHRyb290ID0gY29udGV4dC5ub2RlVHlwZSA/IFtjb250ZXh0XSA6IGNvbnRleHQ7XG5cblx0Ly8gUG9zaXRpb24gc2VsZWN0b3JzIG11c3QgYmUgZG9uZSBhZnRlciB0aGUgZmlsdGVyXG5cdC8vIEFuZCBzbyBtdXN0IDpub3QocG9zaXRpb25hbCkgc28gd2UgbW92ZSBhbGwgUFNFVURPcyB0byB0aGUgZW5kXG5cdHdoaWxlICggKG1hdGNoID0gRXhwci5tYXRjaC5QU0VVRE8uZXhlYyggc2VsZWN0b3IgKSkgKSB7XG5cdFx0bGF0ZXIgKz0gbWF0Y2hbMF07XG5cdFx0c2VsZWN0b3IgPSBzZWxlY3Rvci5yZXBsYWNlKCBFeHByLm1hdGNoLlBTRVVETywgXCJcIiApO1xuXHR9XG5cblx0c2VsZWN0b3IgPSBFeHByLnJlbGF0aXZlW3NlbGVjdG9yXSA/IHNlbGVjdG9yICsgXCIqXCIgOiBzZWxlY3RvcjtcblxuXHRmb3IgKCB2YXIgaSA9IDAsIGwgPSByb290Lmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRTaXp6bGUoIHNlbGVjdG9yLCByb290W2ldLCB0bXBTZXQsIHNlZWQgKTtcblx0fVxuXG5cdHJldHVybiBTaXp6bGUuZmlsdGVyKCBsYXRlciwgdG1wU2V0ICk7XG59O1xuXG4vLyBFWFBPU0VcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gU2l6emxlO1xufSBlbHNlIHtcbiAgd2luZG93LlNpenpsZSA9IFNpenpsZTtcbn1cblxufSkoKTtcblxufSkoKSIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICByZXR1cm4gbmV3IEV2ZXIoZWxlbSk7XG59O1xuXG5mdW5jdGlvbiBFdmVyIChlbGVtKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbTtcbn1cblxuRXZlci5wcm90b3R5cGUgPSBuZXcgRXZlbnRFbWl0dGVyO1xuXG5FdmVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uIChuYW1lLCBjYiwgdXNlQ2FwdHVyZSkge1xuICAgIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1tuYW1lXSkgdGhpcy5fZXZlbnRzW25hbWVdID0gW107XG4gICAgdGhpcy5fZXZlbnRzW25hbWVdLnB1c2goY2IpO1xuICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGNiLCB1c2VDYXB0dXJlIHx8IGZhbHNlKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcbkV2ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gRXZlci5wcm90b3R5cGUub247XG5cbkV2ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMpIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCB1c2VDYXB0dXJlIHx8IGZhbHNlKTtcbiAgICBcbiAgICB2YXIgeHMgPSB0aGlzLmxpc3RlbmVycyh0eXBlKTtcbiAgICB2YXIgaXggPSB4cy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICBpZiAoaXggPj0gMCkgeHMuc3BsaWNlKGl4LCAxKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuRXZlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgZnVuY3Rpb24gcmVtb3ZlQWxsICh0KSB7XG4gICAgICAgIHZhciB4cyA9IHNlbGYubGlzdGVuZXJzKHQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKHQsIHhzW2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAodHlwZSkge1xuICAgICAgICByZW1vdmVBbGwodHlwZSlcbiAgICB9XG4gICAgZWxzZSBpZiAoc2VsZi5fZXZlbnRzKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzZWxmLl9ldmVudHMpIHtcbiAgICAgICAgICAgIGlmIChrZXkpIHJlbW92ZUFsbChrZXkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycy5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xufVxuXG52YXIgaW5pdFNpZ25hdHVyZXMgPSByZXF1aXJlKCcuL2luaXQuanNvbicpO1xuXG5FdmVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKG5hbWUsIGV2KSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0Jykge1xuICAgICAgICBldiA9IG5hbWU7XG4gICAgICAgIG5hbWUgPSBldi50eXBlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWlzRXZlbnQoZXYpKSB7XG4gICAgICAgIHZhciB0eXBlID0gRXZlci50eXBlT2YobmFtZSk7XG4gICAgICAgIFxuICAgICAgICB2YXIgb3B0cyA9IGV2IHx8IHt9O1xuICAgICAgICBpZiAob3B0cy50eXBlID09PSB1bmRlZmluZWQpIG9wdHMudHlwZSA9IG5hbWU7XG4gICAgICAgIFxuICAgICAgICBldiA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KHR5cGUgKyAncycpO1xuICAgICAgICB2YXIgaW5pdCA9IHR5cGVvZiBldlsnaW5pdCcgKyB0eXBlXSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgPyAnaW5pdCcgKyB0eXBlIDogJ2luaXRFdmVudCdcbiAgICAgICAgO1xuICAgICAgICBcbiAgICAgICAgdmFyIHNpZyA9IGluaXRTaWduYXR1cmVzW2luaXRdO1xuICAgICAgICB2YXIgdXNlZCA9IHt9O1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBzaWdbaV07XG4gICAgICAgICAgICBhcmdzLnB1c2gob3B0c1trZXldKTtcbiAgICAgICAgICAgIHVzZWRba2V5XSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZXZbaW5pdF0uYXBwbHkoZXYsIGFyZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gYXR0YWNoIHJlbWFpbmluZyB1bnVzZWQgb3B0aW9ucyB0byB0aGUgb2JqZWN0XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRzKSB7XG4gICAgICAgICAgICBpZiAoIXVzZWRba2V5XSkgZXZba2V5XSA9IG9wdHNba2V5XTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lbGVtZW50LmRpc3BhdGNoRXZlbnQoZXYpO1xufTtcblxuZnVuY3Rpb24gaXNFdmVudCAoZXYpIHtcbiAgICB2YXIgcyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChldik7XG4gICAgcmV0dXJuIC9cXFtvYmplY3QgXFxTK0V2ZW50XFxdLy50ZXN0KHMpO1xufVxuXG5FdmVyLnR5cGVzID0gcmVxdWlyZSgnLi90eXBlcy5qc29uJyk7XG5FdmVyLnR5cGVPZiA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHR5cGVzID0ge307XG4gICAgZm9yICh2YXIga2V5IGluIEV2ZXIudHlwZXMpIHtcbiAgICAgICAgdmFyIHRzID0gRXZlci50eXBlc1trZXldO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0eXBlc1t0c1tpXV0gPSBrZXk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlc1tuYW1lXSB8fCAnRXZlbnQnO1xuICAgIH07XG59KSgpOztcbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJpbml0RXZlbnRcIiA6IFtcbiAgICBcInR5cGVcIixcbiAgICBcImNhbkJ1YmJsZVwiLCBcbiAgICBcImNhbmNlbGFibGVcIlxuICBdLFxuICBcImluaXRVSUV2ZW50XCIgOiBbXG4gICAgXCJ0eXBlXCIsXG4gICAgXCJjYW5CdWJibGVcIiwgXG4gICAgXCJjYW5jZWxhYmxlXCIsIFxuICAgIFwidmlld1wiLCBcbiAgICBcImRldGFpbFwiXG4gIF0sXG4gIFwiaW5pdE1vdXNlRXZlbnRcIiA6IFtcbiAgICBcInR5cGVcIixcbiAgICBcImNhbkJ1YmJsZVwiLCBcbiAgICBcImNhbmNlbGFibGVcIiwgXG4gICAgXCJ2aWV3XCIsIFxuICAgIFwiZGV0YWlsXCIsIFxuICAgIFwic2NyZWVuWFwiLCBcbiAgICBcInNjcmVlbllcIiwgXG4gICAgXCJjbGllbnRYXCIsIFxuICAgIFwiY2xpZW50WVwiLCBcbiAgICBcImN0cmxLZXlcIiwgXG4gICAgXCJhbHRLZXlcIiwgXG4gICAgXCJzaGlmdEtleVwiLCBcbiAgICBcIm1ldGFLZXlcIiwgXG4gICAgXCJidXR0b25cIixcbiAgICBcInJlbGF0ZWRUYXJnZXRcIlxuICBdLFxuICBcImluaXRNdXRhdGlvbkV2ZW50XCIgOiBbXG4gICAgXCJ0eXBlXCIsXG4gICAgXCJjYW5CdWJibGVcIiwgXG4gICAgXCJjYW5jZWxhYmxlXCIsIFxuICAgIFwicmVsYXRlZE5vZGVcIiwgXG4gICAgXCJwcmV2VmFsdWVcIiwgXG4gICAgXCJuZXdWYWx1ZVwiLCBcbiAgICBcImF0dHJOYW1lXCIsIFxuICAgIFwiYXR0ckNoYW5nZVwiXG4gIF1cbn1cbiIsIm1vZHVsZS5leHBvcnRzPXtcbiAgXCJNb3VzZUV2ZW50XCIgOiBbXG4gICAgXCJjbGlja1wiLFxuICAgIFwibW91c2Vkb3duXCIsXG4gICAgXCJtb3VzZXVwXCIsXG4gICAgXCJtb3VzZW92ZXJcIixcbiAgICBcIm1vdXNlbW92ZVwiLFxuICAgIFwibW91c2VvdXRcIlxuICBdLFxuICBcIktleUJvYXJkRXZlbnRcIiA6IFtcbiAgICBcImtleWRvd25cIixcbiAgICBcImtleXVwXCIsXG4gICAgXCJrZXlwcmVzc1wiXG4gIF0sXG4gIFwiTXV0YXRpb25FdmVudFwiIDogW1xuICAgIFwiRE9NU3VidHJlZU1vZGlmaWVkXCIsXG4gICAgXCJET01Ob2RlSW5zZXJ0ZWRcIixcbiAgICBcIkRPTU5vZGVSZW1vdmVkXCIsXG4gICAgXCJET01Ob2RlUmVtb3ZlZEZyb21Eb2N1bWVudFwiLFxuICAgIFwiRE9NTm9kZUluc2VydGVkSW50b0RvY3VtZW50XCIsXG4gICAgXCJET01BdHRyTW9kaWZpZWRcIixcbiAgICBcIkRPTUNoYXJhY3RlckRhdGFNb2RpZmllZFwiXG4gIF0sXG4gIFwiSFRNTEV2ZW50XCIgOiBbXG4gICAgXCJsb2FkXCIsXG4gICAgXCJ1bmxvYWRcIixcbiAgICBcImFib3J0XCIsXG4gICAgXCJlcnJvclwiLFxuICAgIFwic2VsZWN0XCIsXG4gICAgXCJjaGFuZ2VcIixcbiAgICBcInN1Ym1pdFwiLFxuICAgIFwicmVzZXRcIixcbiAgICBcImZvY3VzXCIsXG4gICAgXCJibHVyXCIsXG4gICAgXCJyZXNpemVcIixcbiAgICBcInNjcm9sbFwiXG4gIF0sXG4gIFwiVUlFdmVudFwiIDogW1xuICAgIFwiRE9NRm9jdXNJblwiLFxuICAgIFwiRE9NRm9jdXNPdXRcIixcbiAgICBcIkRPTUFjdGl2YXRlXCJcbiAgXVxufVxuIl19
;