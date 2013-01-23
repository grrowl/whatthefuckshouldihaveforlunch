# what the fuck should i have for lunch?
solving the age-old question with maps and science

### todo
- better UI feedback: loading (blocked), done (success), error.
  - Places: <https://developers.google.com/maps/documentation/javascript/places#place_search_responses>
  - Geocoder: <https://developers.google.com/maps/documentation/javascript/geocoding#GeocodingStatusCodes>
- there should only ever be one 'your location' marker
- do both a "nearest" and "most relevant" search, add all results.

- map improvements
  - dont do this: <http://joe.kueser.com/2010/03/pan-and-zoom-to-include-all-markers-in-google-maps-v3/>, just chuck em all into a 
  - small tooltip on marker hover
  - `places-list` should only list points visible within viewport
  - better icons: 'your location'