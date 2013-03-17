# what the fuck should i have for lunch?
solving the age-old question with maps and science

## app layout
- **Lunch**: core app functionality
  - **search**: Places search
  - **placeBump**: "I like this" functionality for higher relevance in radar searches
- **Templates**: pre-compiles available Handlebars moustaches
- **UI**: handles most UI binding, handling
- **onionLayer**: ensures code doesn't execute before dependent services are ready

## places API proxy
- Bumping places requires a POST to googleapis.com, which we can't do with plain javascript XHRs. Instead, we proxy the requests through my server at chillidonut.com. I've whitelisted a number of domains (including `grrowl.github.com` and `localhost`), but feel free to add your local domain to the list.
  - http://stackoverflow.com/questions/12878669/is-the-places-api-not-able-to-retrieve-specific-places - switching from bump to add
  - http://www.youtube.com/watch?v=JCgTAWXwjOk&feature=youtu.be&t=19m23s - google devs building pretty much exactly this
  - we can store extra data by adding an event to our custom-added place and storing stuff in event.summary. note events have a specific duration, after which they dont show up in our `nearbySearch` calls (attached to events) but we can retrieve all added events (by place.reference) with an extra placesData call

## todo
- better UI feedback: loading (blocked), done (success), error.
  - Places: <https://developers.google.com/maps/documentation/javascript/places#place_search_responses>
  - contextual error messages: probably dump in `#lunch-suggestion` with a close button, one at a time
  - itErrored(elem): looks for icons to turn to X's, `btn`'s to turn to `btn-error`s, bubble until the top (then show error)
- display lunch suggestion, but async in a [PlaceDetails](https://developers.google.com/maps/documentation/javascript/places#place_details_results) request, and update with more info (opening hours, more photos) once it arrives, reusing the same template.
- map improvements
  - Accessing Additional Results <https://developers.google.com/maps/documentation/javascript/places>
  - small tooltip on marker hover ([tooltips for gmaps](https://github.com/medelbou/Tooltip-for-Google-Maps) is a good starting point)
  - fetch more results when we zoom or pan. should be careful not smash heaps of requests or we'll get rate limited
  - some algorithm to separate markers which are too close together (some strips of shops end up all over eachother) [like this](http://www.optimit.hr/blog/-/blogs/optimizing-icon-position-with-google-maps-api) but less grid-y
- [more in github issues](https://github.com/grrowl/whatthefuckshouldihaveforlunch/issues?labels=enhancement)

## performance bottlenecks
- we recalculate distance between location and points often
  - every time we re-add a place to locationPlaces (reset every call to setLocation)
- if desperate,
  - more aggressive object caching, `new google.maps.anything` overhead
  - investigate overhead of all the onionLayer calls
- not performance, but will eventually need to rewrite the `for` and `for..in` statements in a friendlier way ($.each)

## known bugs
- <https://github.com/grrowl/whatthefuckshouldihaveforlunch/issues?labels=bug>
- places-add paradox
  - you can add places to type:other, but we can't search for them?
- places-bump problem
  - it doesn't "encourage" results to the top enough.
  - unless our .PROMINENCE searches arent working?

## references
- google map icons: <https://sites.google.com/site/gmapicons/home>
- tooltips for gmaps: <https://github.com/medelbou/Tooltip-for-Google-Maps>

- google places api SO links
  - http://stackoverflow.com/questions/12878669/is-the-places-api-not-able-to-retrieve-specific-places
  - http://stackoverflow.com/questions/10173078/google-places-api-how-to-retrieve-only-places-added-through-my-app
  - jsfiddle: http://jsfiddle.net/Gqcqe/2/


## half-finished SO post
  As described in the accepted answer for [Is the places API not able to retrieve specific places?](http://stackoverflow.com/a/12907945/894361), you can use the Places API to add places of type 'other'. When searching for nearby places using `PlacesService.nearbySearch` by distance and type 'other', it returns INVALID_REQUEST. When searching by relevance, it returns NO_RESULTS, and if any additional or other types are defined it acts normally.

  http://jsfiddle.net/Gqcqe/2/

