var WTF = {
  init: function () {
    console.log('app ready');
    WTF.mapsReady();
  },

  isReady: function (type) {

    $('.'+ type +'NotReady').fadeOut(600, function (a) {
      console.log(this, a);
      $('.'+ type +'NotReady').remove();
      $('.'+ type +'Ready').fadeIn();
    });
  },

  mapsReady: function () {
    WTF.isReady('maps');
    WTF.isReady('geo');

    var mapOptions = {
      center: new google.maps.LatLng(-37.80544, 144.98331),
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  },

  geoReady: function () {
    
  }
}

$(WTF.init);
// $(document).on('load', WTF.mapsInit);