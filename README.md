# Ping Pong #
For ping pong!

Challenge other people, see who else is looking in real time.

Runnnnnnnit:

node server/

Bundle it!

chmod +x ./run
./run

# strange decisions

You pick a user name and an email when you land on the page. This is then
encoded in your window.location.hash. If you go to the page, and include the
right hash in the url, it will try to log you in!

As soon as you leave the page (close the socket connection), it will log you
out. It's like IRC except.

Client side templates-- templates are rendered with mustache. Then somehow they
get turned into DOM nodes in a safe manner. I've heard innerHTML is an xss
vector, but I haven't had a chance to actually look into how. I'd like to avoid
exposing whatever this is running on to the horrors of the ops people.



