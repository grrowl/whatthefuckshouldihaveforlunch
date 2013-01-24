# what the fuck should i have for lunch?
solving the age-old question with maps and science

## app layout
- **Lunch**: core app functionality
- **Templates**: pre-compiles available Handlebars moustaches
- **UI**: handles most UI binding, handling
- **onionLayer**: ensures code doesn't execute before dependent services are ready

## todo
- lol: actually suggesting what the fuck you should have for lunch
- better UI feedback: loading (blocked), done (success), error.
  - Places: <https://developers.google.com/maps/documentation/javascript/places#place_search_responses>
  - need to figure out how to display contextual error messages
- do both a "nearest" and "most relevant" search, merge results.

- map improvements
  - Accessing Additional Results <https://developers.google.com/maps/documentation/javascript/places>
  - small tooltip on marker hover (bootstrap?)
  - fetch more results when we zoom or pan. should be careful not smash heaps of requests or we'll get rate limited

## performance bottlenecks
- we recalculate distance between location and points often
  - every time we re-add a place to locationPlaces (reset every call to setLocation)
- if desperate,
  - more aggressive object caching, `new google.maps.anything` overhead
  - investigate overhead of all the onionLayer calls
- not performance, but will eventually need to rewrite the `for` and `for..in` statements in a friendlier way ($.each)

## known bugs
