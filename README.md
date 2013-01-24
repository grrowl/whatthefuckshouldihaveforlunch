# what the fuck should i have for lunch?
solving the age-old question with maps and science

## app layout
- **Lunch**: core app functionality
- **UI**: handles most UI binding, handling
- **onionLayer**: ensures code doesn't execute before dependent services are ready

## todo
- better UI feedback: loading (blocked), done (success), error.
  - Places: <https://developers.google.com/maps/documentation/javascript/places#place_search_responses>
- do both a "nearest" and "most relevant" search, merge results.

- map improvements
  - small tooltip on marker hover

## performance bottlenecks
- we recalculate distance between location and points often
  - every time we re-add a place to locationPlaces (reset every call to setLocation)
- if desperate,
  - more aggressive object caching, `new google.maps.anything` overhead
  - investigate overhead of all the onionLayer calls
- not performance, but will eventually need to rewrite the `for` and `for..in` statements in a friendlier way ($.each)

## known bugs
