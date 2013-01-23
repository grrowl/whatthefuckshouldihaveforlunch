var wtfl = {
  place_types: [
    ['bakery', 'cafe', 'food', 'meal_takeaway', 'restaurant', 'meal_delivery'],
    ['bar', 'convenience_store', 'grocery_or_supermarket', 'store', 'shopping_mall'],
    ['casino', 'liquor_store', 'night_club']
  ],

  map: undefined,
  location: undefined,
  places: [],

  infoWindow: undefined,

  // start app
  init: function () {
    console.log('app ready');
    wtfl.mapsReady();
    Templates.init();
  },

  // show and hide front-end elements as services become available
  isReady: function (type) {
    $('.'+ type +'NotReady').fadeOut(600, function (a) {
      $('.'+ type +'NotReady').remove();
      $('.'+ type +'Ready').fadeIn();
    });
  },

  // google maps api is ready!
  mapsReady: function () {
    wtfl.isReady('maps');

    var mapOptions = {
      center: new google.maps.LatLng(-37.80544, 144.98331),
      zoom: 15,
      minZoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    wtfl.map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    // google.maps.event.addListener(wtfl.map, 'bounds_changed', wtfl.hideInfo );
    // google.maps.event.addListener(wtfl.map, 'center_changed', wtfl.hideInfo );
    google.maps.event.addListener(wtfl.map, 'click', wtfl.hideInfo );

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        wtfl.geoCallback, 
        function() {
          $('#geoStatus').text('Not found');
        }
      );      
    } else {
      $('#geoStatus').text('No geoservices');
    }
  },

  // geolocation is set!
  geoCallback: function (pos) {
    wtfl.isReady('geo');
    $('#geoStatus').text('Located');

    wtfl.location = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);

    var infowindow = new google.maps.Marker({
      map: wtfl.map,
      position: wtfl.location,
      title: 'My position'
    });

    wtfl.map.setCenter(wtfl.location);
    wtfl.map.setZoom(16);

    wtfl.loadPlaces();
  },

  // load 'places' from google
  loadPlaces: function (query) {
    service = new google.maps.places.PlacesService(wtfl.map);
    service.nearbySearch({
      location: wtfl.location,
      radius: 500,
      keyword: query,
      rankBy: google.maps.places.RankBy.PROMINENCE,
      types: wtfl.place_types[0]
    }, 
    function (results, status) {
      console.log('places callback:', results, status);

      wtfl.places = $.extend(wtfl.places, results);

      console.log(wtfl.places, results);

      var marker;

      if (status == google.maps.places.PlacesServiceStatus.OK) {
        for (var i = 0; i < results.length; i++) {
          marker = new google.maps.Marker({
            map: wtfl.map,
            animation: google.maps.Animation.DROP,

            position: results[i].geometry.location,
            title: results[i].name,
            place: results[i]
          });

          google.maps.event.addListener(marker, 'click', wtfl.showInfo );
        }
      }      

      setTimeout(wtfl.listPlaces, 450);
    });
  },

  listPlaces: function () {
    $('#places-list tbody').html(Templates.placeList({ places: wtfl.places }));
  },

  showInfo: function (pos) {
    console.log('showInfo', this, pos);
    var place = this.place;

    if (wtfl.infoWindow === undefined) 
      wtfl.infoWindow = new google.maps.InfoWindow();

    var html = Templates.placeInfo(place);

    wtfl.infoWindow.setContent(html);
    wtfl.infoWindow.setPosition(pos.latLng);
    wtfl.infoWindow.open(wtfl.map);
  },

  hideInfo: function () {
    if (wtfl.infoWindow !== undefined)
      wtfl.infoWindow.close();
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


$(wtfl.init);
// $(document).on('load', wtfl.mapsInit);
