# what the fuck should i have for lunch?
solving the age-old question with maps and science

## app layout
- **Lunch**: core app functionality
- **Templates**: pre-compiles available Handlebars moustaches
- **UI**: handles most UI binding, handling
- **onionLayer**: ensures code doesn't execute before dependent services are ready

## todo
- place the markers nicely (setTimeout 200*index)

- better UI feedback: loading (blocked), done (success), error.
  - Places: <https://developers.google.com/maps/documentation/javascript/places#place_search_responses>
  - contextual error messages: probably dump in `#lunch-suggestion` with a close button, one at a time
- display lunch suggestion, but async in a [PlaceDetails](https://developers.google.com/maps/documentation/javascript/places#place_details_results) request, and update with more info (opening hours, more photos) once it arrives, reusing the same template.
- map improvements
  - Accessing Additional Results <https://developers.google.com/maps/documentation/javascript/places>
  - small tooltip on marker hover (bootstrap?)
  - fetch more results when we zoom or pan. should be careful not smash heaps of requests or we'll get rate limited
  - some algorithm to separate markers which are too close together (some strips of shops end up all over eachother) [like this](http://www.optimit.hr/blog/-/blogs/optimizing-icon-position-with-google-maps-api) but less grid-y

## performance bottlenecks
- we recalculate distance between location and points often
  - every time we re-add a place to locationPlaces (reset every call to setLocation)
- if desperate,
  - more aggressive object caching, `new google.maps.anything` overhead
  - investigate overhead of all the onionLayer calls
- not performance, but will eventually need to rewrite the `for` and `for..in` statements in a friendlier way ($.each)

## known bugs
