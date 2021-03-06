angular.module('angularMapbox').directive('featureLayer',
['$mdToast', '$http', 'questionRegion', function($mdToast, $http, questionRegion) {
  return {
    restrict: 'E',
    transclude: true,
    require: '^mapbox',
    scope: true,
    link: function(scope, element, attrs, controller) {
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
            featureLayer.loadURL('/coverages/' + scope.radio.slug + '.geojson');
            featureLayer.on('ready', function() {
              map.fitBounds(featureLayer.getBounds());
            });
            controller.$scope.featureLayers.push(featureLayer);
          });
        });

      } else if (attrs.scope) {
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

          });
        });


      } else if(scope.geojson) {
        scope.$watch('geojson', function() {
          if (!scope.geojson || scope.geojson.length === 0) return false;

          controller.getMap().then(function(map) {
            var featureLayer = {};

            if (controller.$scope.featureLayers.length > 0) {
              featureLayer = controller.$scope.featureLayers[0];
              featureLayer.setGeoJSON(scope.geojson);

            } else {
              featureLayer = L.mapbox.featureLayer(scope.geojson);
              featureLayer.addTo(map);

              if (featureLayer.getBounds().hasOwnProperty('_northEast'))
                map.fitBounds(featureLayer.getBounds());

              controller.$scope.featureLayers.push(featureLayer);

              featureListener(featureLayer, map, controller.$scope,
                              $mdToast, $http, questionRegion);
            }
          });
        });
      }
    }
  };
}]);

var regionDistricts = null;

var featureListener = function(featureLayer, map, scope, $mdToast, $http, questionRegion) {
  var toast = null;

  featureLayer.on({
    mouseover: function(e) {
      if (typeof(e.layer.feature) == 'undefined') return false;

      var feature = e.layer.feature;

      questionRegion.getHTML(feature.properties, function(err, popupContent) {
        e.layer.bindPopup(popupContent,{
          closeButton: false,
          minWidth: 320
        });

        e.layer.openPopup();
      });

    },
    click: function(e) {
      // Force the popup to close
      e.layer.closePopup();

      if (typeof(e.layer.feature) == 'undefined') return false;

      var url = e.layer.feature.properties.url;
      var region = L.mapbox.featureLayer(e.layer.feature);
      var mask = e.layer.feature;

      mask.geometry.coordinates = [
        // the world
        [
          [-180, -90],
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90]
        ],
        // the region
        mask.geometry.coordinates[0]
      ];

      var maskLayer = L.geoJson(mask, {
        fillOpacity: 0.7,
        fillColor: '#fff',
        weight: 0
      }).addTo(map);

      if (regionDistricts) regionDistricts.clearLayers();

      $http.get(url).success(function(data, status, headers, config) {
        regionDistricts = L.mapbox.featureLayer(data.geojson);
        regionDistricts.addTo(map);

        map.fitBounds(region.getBounds());

        if (scope.$parent.hasOwnProperty('region'))
          scope.$parent.$apply(function() {
            scope.$parent.region = e.layer.feature.properties.id;
          });

        if (scope.$parent.hasOwnProperty('regionData'))
          scope.$parent.regionData = data;

        scope.featureLayers.push(maskLayer);
        scope.featureLayers.push(regionDistricts);
        scope.showBack = true;

      }).error(function(data, status, headers, config) {
        console.log('http error');
      });

      return false;
    }
  });
};
