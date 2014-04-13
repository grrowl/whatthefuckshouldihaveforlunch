var Lunch = {
  place_types: [
    // 'other' is our user-added places... apparently.
    // <http://www.youtube.com/watch?v=JCgTAWXwjOk&feature=youtu.be&t=19m23s>
    // ['other'],
    ['other', 'bakery', 'cafe', ' ', 'restaurant', 'bar', 'meal_delivery', 'food'],
    ['convenience_store', 'grocery_or_supermarket', 'store', 'shopping_mall'],
    ['casino', 'liquor_store', 'night_club']
  ],
  default_location: [-37.80544, 144.98331], // collingwood
  googleKey: 'AIzaSyDoVtyEit3VbYDASovkqGHiNeFxbNQlY3I',

  map: undefined,
  location: undefined,
  places: [],
  markers: [],

  locationPlaces: {}, // object map of placeindex => distance. reset on setLocation
  searchedPlaces: {}, // object map of placeindex => ??. reset on new search query

  locationMarker: undefined,
  infoWindow: undefined,

  pinTimeout: 0,

  // start app
  init: function () {
    UI.init();
    Lunch.geoInit();
    Templates.init();
    Tracking.init();
  },

  // notifies UI and onionLayer that a service is ready
  isReady: function (type) {
    UI.isReady(type);
    onionLayer.isReady(type);
  },

  // google maps api is ready!
  mapInit: function () {
    latLng = Lunch.location || new google.maps.LatLng(Lunch.default_location[0], Lunch.default_location[1]);

    var mapOptions = {
      backgroundColor: 'white',
      panControl: false,
      center: latLng,
      zoom: 15,
      minZoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    Lunch.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    google.maps.event.addListener(Lunch.map, 'bounds_changed', UI.placesListUpdate );
    google.maps.event.addListener(Lunch.map, 'click', Lunch.hideInfo );

    Lunch.geoInit();

    Lunch.isReady('map');
  },

  // reset map location and contents
  mapUpdate: function (location) {
    onionLayer.call('map', function () {
      location = location || Lunch.location; 

      Lunch.map.panTo(location);
      Lunch.loadPlaces();
    });
  },

  // start geolocation services
  geoInit: function () {
    // var $status = $('#locationStatus');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          // $status.text('Located');

          Lunch.geoCallback(pos);
          Lunch.isReady('geo');
        }, 
        function(code, message) {
          switch (code) {
            case 1: // PERMISSION_DENIED
              // $status.text('Not allowed');
              break;

            default:
            case 2: // POSITION_UNAVAILABLE
            case 3: // TIMEOUT
              // $status.text('Geo unavailable');            
          }
        }
      );      
    } else {
      $status.text('');
    }
  },

  // geolocation is set!
  geoCallback: function (pos) {
    onionLayer.call('map', function () {
      var location = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      Lunch.setLocation(location);
      
      $('#locate-me').on('click', function () {
        Lunch.map.panTo(location);
      });
    });
  },

  // set location from string
  // WAITS ON map
  locationFromString: function (locationString) {
    onionLayer.call('map', function () {
      var service = new google.maps.Geocoder();
      service.geocode({
        address: locationString,
        region: 'au' // prefer Australia for now
      }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          Lunch.setLocation(results[0].geometry.location, true);
        }
      });
    });
  },

  // update location and map
  // REQUIRES map
  setLocation: function (latLng, clearExisting) {
    onionLayer.assertReady('map');
    Lunch.isReady('location');

    if (clearExisting) {
      Lunch.locationPlaces = {}; // reset distance map
    }
    Lunch.location = latLng;
    Lunch.mapUpdate();

    if (Lunch.locationMarker === undefined) {
      Lunch.locationMarker = new google.maps.Marker({
        map: Lunch.map,
        title: 'My Location',
        icon: 'http://labs.google.com/ridefinder/images/mm_20_blue.png',
        shadow: {
          anchor: { x: 5, y: 20 },
          url: 'http://labs.google.com/ridefinder/images/mm_20_shadow.png'
        }
      });
    }

    Lunch.locationMarker.setPosition(latLng);
    Lunch.locationMarker.setAnimation(google.maps.Animation.DROP);
  },

  // load 'places' from google
  // REQUIRES map
  loadPlaces: function (query) {
    onionLayer.assertReady('map');

    Lunch.pinTimeout = 0;
    var service = new google.maps.places.PlacesService(Lunch.map);

    service.nearbySearch({
      location: Lunch.location,
      // radius: 750,
      keyword: query,
      rankBy: google.maps.places.RankBy.DISTANCE,
      types: Lunch.place_types[0]
    }, Lunch.placesLoadHandler);

    service.nearbySearch({
      location: Lunch.location,
      radius: 750,
      keyword: query,
      rankBy: google.maps.places.RankBy.PROMINENCE,
      types: Lunch.place_types[0]
    }, Lunch.placesLoadHandler);

    // todo: implement a promise for the above, on complete do zoomTo/placesListUpdate
    
    // service.nearbySearch(a= {
    //   location: Lunch.location,
    //   // radius: 50000,
    //   keyword: query,
    //   rankBy: google.maps.places.RankBy.DISTANCE,
    //   types: Lunch.place_types[0] // ['other']
    // }, Lunch.placesLoadHandler);
    // console.log(a); // returns INVALID_REQUEST
  },

  // handles a google place search reply
  placesLoadHandler: function (results, status) {
    onionLayer.isReady('places'); 
    var marker, exists, place;

    if (status !== google.maps.places.PlacesServiceStatus.OK) {
      console.warn('loadPlaces recieved error', status, results);
      return false;
    }

    for (var i = 0; i < results.length; i++) {
      // search for this point in our local cache
      place = results[i];
      exists = Lunch.placeExists(place);

      if (exists !== false) {
        // add to locationplaces
        Lunch.locationPlaces[exists] = Lunch.distanceTo(place.geometry.location);
        break;

      } else {
        // add to places cache and locationplaces
        place.index = Lunch.places.length;
        Lunch.locationPlaces[Lunch.places.push(place) - 1] = Lunch.distanceTo(place.geometry.location);
      }

      Lunch.markers.push(Lunch.addPlaceToMap(place));
    }

    Lunch.zoomToLocationPlaces();
    setTimeout(UI.placesListUpdate, 450);
  },

  placeExists: function (place) {
    for (var i = 0; i < Lunch.places.length; i++) {
      if (Lunch.places[i].id === place.id) {
        return i; // this place exists, bail
      }
    }
    return false;
  },

  // generic add places to the map
  addPlaceToMap: function (place, color) {
    color = color || 'red';

    var marker = new google.maps.Marker({
      map: Lunch.map,
      animation: google.maps.Animation.DROP,

      position: place.geometry.location,
      title: place.name,
      // icon: { url: place.icon, scaledSize: new google.maps.Size(25, 25) },
      icon: 'http://labs.google.com/ridefinder/images/mm_20_'+ color +'.png',
      shadow: {
        anchor: { x: 5, y: 20 },
        url: 'http://labs.google.com/ridefinder/images/mm_20_shadow.png'
      },
      place: place,
      visible: false
    });

    var pinDrop = setInterval(function (marker) {
      return function () {
        marker.setVisible(true);
      }
    }(marker), Lunch.pinTimeout += 50);

    google.maps.event.addListener(marker, 'click', Lunch.showInfo );

    return marker;
  },

  // calculates distance to current location
  // REQUIRES map -- shouldn't get called from anywhere else
  distanceTo: function(latLng) {
    onionLayer.assertReady('location');

    return google.maps.geometry.spherical.computeDistanceBetween(
      latLng, Lunch.location
    );
  },

  // zooms to this location's places
  zoomToLocationPlaces: function () {
    if (Lunch.locationPlaces.length === 0) return false;

    var bounds = new google.maps.LatLngBounds(),
        placeIndex;

    for (placeIndex in Lunch.locationPlaces) {
      bounds.extend(Lunch.places[placeIndex].geometry.location);
    }
    if (bounds && Lunch.locationPlaces.length > 1)
      Lunch.map.fitBounds(bounds);
  },

  // shows an info bubble for a particlar map
  showPlaceInfo: function (place, infoWindowOptions) {
    Lunch.showInfo.call({ place: place, skipZoom: true }, { latLng: place.geometry.location }, infoWindowOptions);
    Lunch.directionsTo(place);
  },

  // show an info bubble, event handler for marker.click
  // REQUIRES map
  showInfo: function (pos, infoWindowOptions) {
    onionLayer.assertReady('map');

    var place = this.place, html, zoomBounds;
    infoWindowOptions = infoWindowOptions || { disableAutoPan: false }; // will need refactor with >1 option

    if (Lunch.infoWindow === undefined)
      Lunch.infoWindow = new google.maps.InfoWindow({ maxWidth: 500 });
    else
      Lunch.infoWindow.close();

    Lunch.infoWindow.setOptions(infoWindowOptions);

    html = Templates.placeInfo(place);
    zoomBounds = new google.maps.LatLngBounds();
    zoomBounds.extend(place.geometry.location);
    // zoomBounds.extend({ lat: Lunch.location.lat(), lng: Lunch.location.lng() });

    if (!this.skipZoom) {
      Lunch.infoWindow.setContent(html);
      Lunch.infoWindow.setPosition(pos.latLng);
      Lunch.infoWindow.open(Lunch.map);
      // Lunch.map.fitBounds(zoomBounds);
    }
  },

  // hides an existing infobubble
  // self-protected against API map
  hideInfo: function () {
    if (Lunch.infoWindow !== undefined)
      Lunch.infoWindow.close();
  },

  directionsDisplay: undefined,
  directionsTo: function (place) {
    onionLayer.assertReady('map');

    if (Lunch.directionsDisplay !== undefined) {
      Lunch.directionsDisplay.setMap(null);
      Lunch.directionsDisplay = null;
    }

    var directionsOptions = {
      hideRouteList: true,
      map: Lunch.map,
      markerOptions: {
        visible: false
      }
    };
    Lunch.directionsDisplay = new google.maps.DirectionsRenderer(directionsOptions);
    Lunch.directionsDisplay.setMap(Lunch.map);

    var service = new google.maps.DirectionsService(Lunch.map);
    service.route({
      origin: Lunch.location,
      destination: place.geometry.location,
      travelMode: google.maps.TravelMode.WALKING
    }, function (result, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        Lunch.directionsDisplay.setDirections(result);
      }
    });
  },

  // return random place near location
  randomPlace: function () {
    // http://stackoverflow.com/a/2532251/894361
    function pickRandomProperty(obj) {
        var result;
        var count = 0;
        for (var prop in obj)
            if (Math.random() < 1/++count)
               result = prop;
        return result;
    }


    var index = pickRandomProperty(Lunch.locationPlaces);
    if (index !== undefined)
      return Lunch.places[index];
  },

  search: {
    box: undefined,

    init: function () {
      var searchBox = Lunch.search.box = new google.maps.places.SearchBox($('#map-search-input')[0]);

      searchBox.bindTo('bounds', Lunch.map);
      google.maps.event.addListener(searchBox, 'places_changed', Lunch.search.handler);
    },

    handler: function () {
      var places = Lunch.search.box.getPlaces(); // returns all matches, unless user specifically chose one

      Lunch.pinTimeout = 0;
      Lunch.search.reset(); // reset

      var exists, marker,
          bounds = new google.maps.LatLngBounds();
      for (var i = 0, place; place = places[i]; i++) {
        exists = Lunch.placeExists(place);

        if (exists === false) {
          place.index = Lunch.places.length;
          exists = Lunch.places.push(place) - 1;
        }

        marker = Lunch.addPlaceToMap(place, 'green');
        // TODO: if this place already exists, it will already have a marker. but we want green ones
        if (exists === false)
          Lunch.markers.push(marker);

        // add to places cache and searchedPlaces
        Lunch.searchedPlaces[exists] = marker;

        bounds.extend(place.geometry.location);
      }

      Lunch.showPlaceInfo(places[0]);

      Lunch.map.fitBounds(bounds);
    },

    // remove markers and clear search.markers array
    reset: function () {
      for (var i = 0, marker; marker = Lunch.searchedPlaces[i]; i++) {
        marker.setMap(null);
      }
      Lunch.searchedPlaces = {};
    }
  },

  placeBump: {
    // endpoint: 'http://www.chillidonut.com/junk/lunch/places-add.php', // CORS proxy
    endpoint: 'http://www.chillidonut.com/junk/lunch/places-bump.php', // CORS proxy

    init: function() {
      $('#map-area').on('click', '.js-bump-place', function () {
        var $this = $(this),
            $icon = $this.find('i'),
            index = $this.parents('.place-info').data('index'),
            place = Lunch.places[index];

        if (!index) return console.error('No index on placeInfo element');
        $icon.removeClass('btn-warning').addClass('icon-refresh');
        Tracking.track('placeAdd', 'Init', place.reference)

        $.ajax({
          type: 'POST',
          url: Lunch.placeBump.endpoint +'?sensor=false&key='+ Lunch.googleKey,
          processData: false,
          contentType: 'application/json',
          data: JSON.stringify({
            // place/bump fields
            reference: place.reference

            // place/add fields
            // location: { lat: Lunch.location.lat(), lng: Lunch.location.lng() },
            // types: ['other'],
            // name: place.name,
            // accuracy: 20,
            // summary: "reference="+ place.reference +"&uid="
          }),
          dataType: 'json',
          error: function (xhr, status, errorThrown) {
            console.log("error bumping place", Lunch.places[index], status, errorThrown);
            Tracking.track('placeAdd', 'Error', errorThrown);
          },
          success: function (data, status, xhr) {
            $this.removeClass('btn-info');
            $icon.removeClass('icon-refresh');
            // TODO: you can add extra data with a call to /event/new
            // i.e. new event with data stored in summary field

            switch (data.status.toLowerCase()) {
              case 'ok':
                // yay!
                console.log('bump success', data);
                Tracking.track('placeAdd', 'Success', place.reference);
                $this.addClass('btn-success');
                $icon.addClass('icon-ok');
                break;

              case 'proxy_error':
                console.error('bump error', data);
                Tracking.track('placeAdd', 'Error', data.status);
                $icon.addClass('icon-remove');
                break;

              default:
                console.warn('bump unknown error', data);
                Tracking.track('placeAdd', 'Error', data.status);
                $icon.addClass('icon-question-sign');
                break;
            }
          }
        });
      });
    }
  }
}

var Templates = {
  init: function () {
    var self = this;
    console.time('Compiling templates');

    $('script[type="text/x-handlebars-template"]').each(function (i) {
      var $this = $(this),
          id = $this.attr('id').split('-').shift();

      self[id] = Handlebars.compile($this.html());
    });

    console.timeEnd('Compiling templates');
  }
}

var UI = {
  init: function () {
    UI.placesListInit();

    // lunch suggestion button
    onionLayer.call('places', function () {
      $('h1').on('click', UI.suggestLunch)
        .html('<a class="btn btn-large">'+ $('h1').text() +'</a>');
        
      $('#lunch-suggestion').on('click', '.close', function () {
        $(this).parents('#lunch-suggestion').empty();
      });
    });

    // search by name functionality
    onionLayer.call('places', Lunch.search.init);

    onionLayer.call('map', Lunch.placeBump.init);
    $('#map-area').on('click', '.js-inspect-place', UI.inspectPlace);

    // manual-location
    $('#manual-location input').on('keypress', function (ev) {
      if (ev.which == 13) UI.handleLocationSubmit(ev);
    });
    $('#manual-location a').on('click', UI.handleLocationSubmit);
  },

  // show and hide front-end elements as services become available
  isReady: function (type) {
    $('.'+ type +'NotReady').fadeOut(600, function (a) {
      if (type == 'location')
        $('#manual-location').insertAfter($('#map-area'));

      $('.'+ type +'NotReady').remove();
      $('.'+ type +'Ready').fadeIn();
    });
  },

  // inspection report
  inspectPlace: function () {
    var $this = $(this),
        $icon = $this.find('i'),
        index = $this.parents('.place-info').data('index'),
        place = Lunch.places[index];

    console.log('place #'+ index, place);
  },

  // 
  placesListInit: function () {
    onionLayer.call('map', function () {
      $('#places-list').on('click', 'tbody tr', function (ev) {
        var $this = $(this), latLng;

        // latLng = Lunch.places[$this.data('index')].geometry.location;

        Lunch.showPlaceInfo(Lunch.places[$this.data('index')]);
        // Lunch.mapUpdate(latLng);
      });
    });
  },

  // updates the #places-list with relevant points
  placesListUpdate: function () {
    onionLayer.assertReady('map');

    // get map bounds, populate new array of places that are inside bounds, then sort by distance.
    var mapBounds = Lunch.map.getBounds(),
        places = [], placeIndexes = [], i;
    for (i = 0; i < Lunch.places.length; i++ ) {
      if (mapBounds.contains(Lunch.places[i].geometry.location)) {
        // places.push(Lunch.places[i]);
        placeIndexes.push(i);
      }
    }
    placeIndexes.sort(function (a, b){
      return (Lunch.locationPlaces[a] > Lunch.locationPlaces[b]) ? 1 : -1;
    });
    for (i = 0; i < placeIndexes.length; i++) {
      places.push(Lunch.places[placeIndexes[i]]);
    }

    $('#places-list tbody')
      .html(Templates.placeList({ places: places }));
  },

  handleLocationSubmit: function (ev) {
    var location = $('#manual-location input').val();
    if (location.length)
      Lunch.locationFromString(location);
  },

  suggestLunch: function () {
    var suggestion = $('#lunch-suggestion');
    
    // pick random lunch
    var place = Lunch.randomPlace();

    suggestion.html(Templates.lunchSuggestion(place));
    if (place) {
      Lunch.showPlaceInfo(place);
    }
  }
}


// google analytics
var Tracking = {
  queue: [],

  init: function () {
    Tracking.insertScript();
  },
  insertScript: function () {
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', 'UA-602554-4']);
    _gaq.push(['_trackPageview']);

    (function() {
      var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
      ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
      var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
  },
  track: function (category, action, label) {
    _gaq.push(['_trackEvent', category, action, label]);
  }
}



// wraps deferred APIs
var onionLayer = {
  deferredCalls: {},
  readyAPIs: [],

  // services only ever go READY, never UNREADY
  isReady: function (type) {
    onionLayer.readyAPIs.push(type);

    if (onionLayer.deferredCalls[type] !== undefined) {
      while (onionLayer.deferredCalls[type].length > 0) {
        (onionLayer.deferredCalls[type].shift()).call();
      }
    }
  },

  call: function (type, callback) {
    if (onionLayer.readyAPIs.indexOf(type) > -1) {
      // it's ready, immediately fire callback
      callback.call();

    } else {
      if (onionLayer.deferredCalls[type] === undefined)
        onionLayer.deferredCalls[type] = [];

      onionLayer.deferredCalls[type].push(callback);
    }
  },

  assertReady: function (type) {
    if (onionLayer.readyAPIs.indexOf(type) === -1) {
      console.error('API assertion for "'+ type +'" failed!');
      return false;
    }

    return true; // A-OK
  }
}


// handlebars helpers

Handlebars.registerHelper('distanceTo', function (latLng) {
  if (!Lunch.location) return '';

  var distance = Lunch.distanceTo(latLng);
  distance = ~~(distance * 0.1) * 0.01;
  return distance + ' km away';
});

Handlebars.registerHelper('encode', function (unescaped) {
  return encodeURIComponent(unescaped);
});

Handlebars.registerHelper('ifEq', function(v1, v2, options) {
  if(v1 == v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});
Handlebars.registerHelper('ifNotEq', function(v1, v2, options) {
  if(v1 != v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});

$(Lunch.init);
