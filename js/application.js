var Lunch = {
  place_types: [
    ['bakery', 'cafe', 'meal_takeaway', 'restaurant', 'meal_delivery'],
    ['bar', 'food', 'convenience_store', 'grocery_or_supermarket', 'store', 'shopping_mall'],
    ['casino', 'liquor_store', 'night_club']
  ],
  default_location: [-37.80544, 144.98331], // collingwood

  map: undefined,
  location: undefined,
  places: [],
  markers: [],

  locationMarker: undefined,
  infoWindow: undefined,

  // start app
  init: function () {
    UI.init();
    Lunch.geoInit();
    Templates.init();
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
      center: latLng,
      zoom: 15,
      minZoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    Lunch.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

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
    var $status = $('#locationStatus');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          $status.text('Located');

          Lunch.geoCallback(pos);
          Lunch.isReady('geo');
        }, 
        function(code, message) {
          switch (code) {
            case 1: // PERMISSION_DENIED
              $status.text('Not allowed');
              break;

            default:
            case 2: // POSITION_UNAVAILABLE
            case 3: // TIMEOUT
              $status.text('Geo unavailable');            
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
      Lunch.setLocation(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
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
          Lunch.setLocation(results[0].geometry.location);
        }
      });
    });
  },

  // update location and map
  // REQUIRES map
  setLocation: function (latLng) {
    onionLayer.assertReady('map');
    Lunch.isReady('location');

    Lunch.location = latLng;
    Lunch.mapUpdate();

    if (Lunch.locationMarker === undefined) {
      Lunch.locationMarker = new google.maps.Marker({ 
        map: Lunch.map,
        title: 'My Location',
        icon: 'http://labs.google.com/ridefinder/images/mm_20_blue.png'
      });
    }

    Lunch.locationMarker.setPosition(latLng);
    Lunch.locationMarker.setAnimation(google.maps.Animation.DROP);
  },

  // load 'places' from google
  // REQUIRES map
  loadPlaces: function (query) {
    onionLayer.assertReady('map');

    service = new google.maps.places.PlacesService(Lunch.map);
    service.nearbySearch({
      location: Lunch.location,
      // radius: 500,
      keyword: query,
      rankBy: google.maps.places.RankBy.DISTANCE,
      types: Lunch.place_types[0]
    }, 
    function (results, status) {
      var marker, exists, place;

      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
          // search for this point in our local cache
          place = results[i];
          exists = false;

          for (var j = 0; j < Lunch.places.length; j++) {
            if (Lunch.places[j].id === place.id) {
              exists = true;
              break; // this place exists, bail
            }
          }
          if (exists) break;
          Lunch.places.push(place);

          marker = new google.maps.Marker({
            map: Lunch.map,
            animation: google.maps.Animation.DROP,

            position: place.geometry.location,
            title: place.name,
            icon: { url: place.icon, scaledSize: new google.maps.Size(25, 25) },
            place: place
          });

          Lunch.markers.push(marker);

          google.maps.event.addListener(marker, 'click', Lunch.showInfo );
        }
      }

      setTimeout(UI.placesListUpdate, 450);
    });
  },

  // show an info bubble
  // REQUIRES map
  showInfo: function (pos) {
    onionLayer.assertReady('map');

    var place = this.place;

    if (Lunch.infoWindow === undefined) 
      Lunch.infoWindow = new google.maps.InfoWindow();
    else
      Lunch.infoWindow.close();

    var html = Templates.placeInfo(place);

    Lunch.infoWindow.setContent(html);
    Lunch.infoWindow.setPosition(pos.latLng);
    Lunch.infoWindow.open(Lunch.map);
  },

  // hides an existing infobubble
  // self-protected against API map
  hideInfo: function () {
    if (Lunch.infoWindow !== undefined)
      Lunch.infoWindow.close();
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

    $('#manual-location input').on('keypress', function (ev) {
      if (ev.which == 13) UI.handleLocationSubmit(ev);
    });
    $('#manual-location a').on('click', UI.handleLocationSubmit);
  },

  // show and hide front-end elements as services become available
  isReady: function (type) {
    $('.'+ type +'NotReady').fadeOut(600, function (a) {
      if (type == 'geo')
        $('#manual-location').insertBefore($('#places-list'));

      $('.'+ type +'NotReady').remove();
      $('.'+ type +'Ready').fadeIn();
    });
  },

  // 
  placesListInit: function () {
    onionLayer.call('map', function () {
      $('#places-list').on('click', 'tbody tr', function (ev) {
        var $this = $(this), latLng;

        latLng = Lunch.places[$this.data('index')].geometry.location;
        Lunch.mapUpdate(latLng);
      });
    });
  },

  // 
  placesListUpdate: function () {
    $('#places-list tbody')
      .html(Templates.placeList({ places: Lunch.places }));
  },

  handleLocationSubmit: function (ev) {
    var location = $('#manual-location input').val();
    if (location.length)
      Lunch.locationFromString(location);
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
    if (onionLayer.readyAPIs.indexOf(type) === -1)
      console.error('API assertion for "'+ type +'" failed!');
  }
}

Handlebars.registerHelper('distanceTo', function (latLng) {
  if (!Lunch.location)
    return '';

  var distance = google.maps.geometry.spherical.computeDistanceBetween(
    latLng, Lunch.location
  );
  distance = ~~(distance * 0.1) * 0.01;
  return distance + ' km away';
});

$(Lunch.init);
