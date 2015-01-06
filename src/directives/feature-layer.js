angular.module('angularMapbox').directive('featureLayer', function() {
  return {
    restrict: 'E',
    transclude: true,
    require: '^mapbox',
    scope: true,
    link: function(scope, element, attrs, controller) {
      console.log(attrs);
      if(attrs.data) {
        controller.getMap().then(function(map) {
          var geojsonObject = scope.$eval(attrs.data);
          var featureLayer = L.mapbox.featureLayer(geojsonObject).addTo(map);
          controller.$scope.featureLayers.push(featureLayer);
        });

      } else if(attrs.url) {
        scope.$watch('radio', function() {
          controller.getMap().then(function(map) {
            var featureLayer = L.mapbox.featureLayer().addTo(map);
            featureLayer.loadURL(attrs.url);
            featureLayer.on('ready', function() {
              map.fitBounds(featureLayer.getBounds());
            });
            controller.$scope.featureLayers.push(featureLayer);
          });
        });

      } else if(attrs.hasOwnProperty('radio')) {
        scope.$watch('radio', function() {
          controller.getMap().then(function(map) {
            var featureLayer = L.mapbox.featureLayer().addTo(map);
            console.log(scope.radio.slug);
            featureLayer.loadURL('/coverages/' + scope.radio.slug + '.geojson');
            featureLayer.on('ready', function() {
              map.fitBounds(featureLayer.getBounds());
            });
            controller.$scope.featureLayers.push(featureLayer);
          });
        });

      } else if (attrs.scope) {
        console.log('passing a scope');
        scope.$watch(attrs.scope, function(geojson) {
          controller.getMap().then(function(map) {
            if (!controller.$scope.hasOwnProperty('geojsonLayer')) {
              controller.$scope.geojsonLayer = L.geoJson(geojson);
              controller.$scope.geojsonLayer.addTo(map);
            } else
              controller.$scope.geojsonLayer.addData(geojson);

            controller.$scope.geojsonLayer.setStyle({
              "color": "#ff7800",
              "weight": 5,
              "opacity": 0.2
            });

            map.fitBounds(controller.$scope.geojsonLayer.getBounds());

            console.log(controller.$scope.geojsonLayer);
          });
        });


      } else if(scope.geojson) {
        scope.$watch('geojson', function() {
          console.log('geojson has been updated');
          console.log(scope.geojson);
          controller.getMap().then(function(map) {
            var featureLayer = L.mapbox.featureLayer(scope.geojson);

            featureLayer.addTo(map);

            try {
              map.fitBounds(featureLayer.getBounds());
            } catch(e) {
              return false;
            }

            controller.$scope.featureLayers.push(featureLayer);

            featureClickListener(featureLayer, map, controller.$scope);
          });
        });
      }
    }
  };
});

var regionWards = null;
var featureClickListener = function(featureLayer, map, scope) {
  featureLayer.on({
    click: function(e) {
      var url = e.layer.feature.properties.url;
      var region = L.mapbox.featureLayer(e.layer.feature);
      if (regionWards) regionWards.clearLayers();
      regionWards = L.mapbox.featureLayer(url);

      regionWards.addTo(map);
      map.fitBounds(region.getBounds());
    }
  });
};
