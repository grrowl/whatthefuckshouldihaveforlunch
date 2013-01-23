var Lunch = {
  place_types: [
    ['bakery', 'cafe', 'meal_takeaway', 'restaurant', 'meal_delivery'],
    ['bar', 'food', 'convenience_store', 'grocery_or_supermarket', 'store', 'shopping_mall'],
    ['casino', 'liquor_store', 'night_club']
  ],

  map: undefined,
  location: undefined,
  places: [],
  markers: [],

  infoWindow: undefined,

  // start app
  init: function () {
    UI.init();
    Lunch.geoInit();
    Templates.init();
  },

  // google maps api is ready!
  mapInit: function () {
    UI.isReady('map');

    latLng = Lunch.location || new google.maps.LatLng(-37.80544, 144.98331);

    var mapOptions = {
      center: latLng,
      zoom: 15,
      minZoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    Lunch.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    google.maps.event.addListener(Lunch.map, 'click', Lunch.hideInfo );

    Lunch.geoInit();
  },

  // reset map location and contents
  mapUpdate: function (location) {
    var firstMap = (Lunch.map === undefined);
    if (firstMap)
      Lunch.mapInit();

    location = location || Lunch.location; 

    if (firstMap)
      Lunch.map.setCenter(location);
    else
      Lunch.map.panTo(location);
    // Lunch.map.setZoom(16);

    Lunch.loadPlaces();
  },

  // start geolocation services
  geoInit: function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
          UI.isReady('geo');
          $('#geoStatus').text('Located');

          Lunch.geoCallback(pos);
        }, 
        function() {
          $('#geoStatus').text('Not found');
        }
      );      
    } else {
      $('#geoStatus').text('');
    }
  },

  // geolocation is set!
  geoCallback: function (pos) {
    Lunch.location = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    Lunch.mapUpdate();

    var infowindow = new google.maps.Marker({
      map: Lunch.map,
      position: Lunch.location,
      title: 'My position'
    });
  },

  // set location from string
  locationFromString: function (locationString) {
    var service = new google.maps.Geocoder();
    service.geocode({
      address: locationString,
      region: 'au' // prefer Australia for now
    }, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        Lunch.location = results[0].geometry.location;
        Lunch.mapUpdate();
      }
    });
  },

  // load 'places' from google
  loadPlaces: function (query) {
    service = new google.maps.places.PlacesService(Lunch.map);
    service.nearbySearch({
      location: Lunch.location,
      // radius: 500,
      keyword: query,
      rankBy: google.maps.places.RankBy.DISTANCE,
      types: Lunch.place_types[0]
    }, 
    function (results, status) {
      var marker, exists;

      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
          // search for this point in our local cache
          exists = false;
          for (var j = 0; j < Lunch.places.length; j++) {
            if (Lunch.places[j].id === results[i].id) {
              exists = true;
              break; // this place exists, bail
            }
          }
          if (exists) break;

          // console.log('New place:', results[i]);
          Lunch.places.push(results[i]);

          marker = new google.maps.Marker({
            map: Lunch.map,
            animation: google.maps.Animation.DROP,

            position: results[i].geometry.location,
            title: results[i].name,
            place: results[i]
          });

          Lunch.markers.push(marker);

          google.maps.event.addListener(marker, 'click', Lunch.showInfo );
        }
      }

      setTimeout(UI.placesListUpdate, 450);
    });
  },

  showInfo: function (pos) {
    console.log('showInfo', this, pos);
    var place = this.place;

    if (Lunch.infoWindow === undefined) 
      Lunch.infoWindow = new google.maps.InfoWindow();

    var html = Templates.placeInfo(place);

    Lunch.infoWindow.setContent(html);
    Lunch.infoWindow.setPosition(pos.latLng);
    Lunch.infoWindow.open(Lunch.map);
  },

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
        $('#manual-location').insertAfter($('#places-list'));

      $('.'+ type +'NotReady').remove();
      $('.'+ type +'Ready').fadeIn();
    });

    // special handling for specific types
    switch (type) {
      case 'geo': break;
      case 'map': break;
    }
  },

  // 
  placesListInit: function () {
    // focus 
    $('#places-list').on('click', 'tbody tr', function (ev) {
      var $this = $(this), latLng;

      latLng = Lunch.places[$this.data('index')].geometry.location;
      Lunch.mapUpdate(latLng);
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
// $(document).on('load', Lunch.mapsInit);
