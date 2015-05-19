angular.module('angularMapbox', []);


angular.module('angularMapbox').directive('backButton', function() {
  return {
    restrict: 'E',
    require: '^mapbox',
    scope: true,
    template: '<a class="back md-fab md-primary md-default-theme md-cyan-theme md-button"' +
                 'ng-click="back()" ng-show="show"><i class="fa fa-times"></i></a>' +
              '<a class="back md-fab md-primary md-default-theme md-cyan-theme md-button"' +
                 'ng-click="zoomIn()" ng-show="show"><i class="fa fa-plus"></i></a>' +
              '<a class="back md-fab md-primary md-default-theme md-cyan-theme md-button"' +
                 'ng-click="zoomOut()" ng-show="show"><i class="fa fa-minus"></i></a>',

    controller: function($scope) {
      var parent = $scope.$parent.$parent;

      $scope.show = false;
      $scope.zoomMin = 0;

      parent.getMap().then(function(map) {
        $scope.zoomMin = Math.round(map.getZoom());
        console.log('zoom min init', $scope.zoomMin);
      });

      parent.$watch('showBack', function() {
        $scope.show = parent.showBack;
      });

      $scope.zoomIn = function() {
        parent.getMap().then(function(map) {
          var z = Math.round(map.getZoom());
          map.setZoom(z + 1);
          map.dragging.enable();
        });
      };

      $scope.zoomOut = function() {
        parent.getMap().then(function(map) {
          var z = Math.round(map.getZoom());
          if (z - 1 > 6) map.setZoom(z - 1);
        });
      };

      $scope.back = function() {
        parent.showBack = false;

        parent.getMap().then(function(map) {
          var region = parent.featureLayers[0];
          map.dragging.disable();

          parent.featureLayers.forEach(function(layer, index) {
            if (index > 0) layer.clearLayers();
          });

          if (parent.$parent.hasOwnProperty('region'))
            parent.$parent.region = null;

          if (parent.$parent.hasOwnProperty('regionData'))
            parent.$parent.regionData = {};

          map.fitBounds(region.getBounds());
        });
      };

      this.$scope = $scope;
    }
  }
});

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

angular.module('angularMapbox').directive('legend', function() {
  return {
    restrict: 'E',
    require: '^mapbox',
    scope: true,
    link: function(scope, element, attrs, controller) {
      scope.$watch('legend', function() {
        controller.getMap().then(function(map) {
          if (typeof(scope.legend) != 'undefined')
            map.legendControl.addLegend(getLegendHTML(scope.legend));
        });
      });
    }
  }
});

var getLegendHTML = function(responses) {
  labels = [];

  responses.forEach(function(response) {
    labels.push(
      '<li><span class="swatch" style="background:' + response.color + '"></span> ' +
      response.content + '</li>'
    );
  });

  return '<span>Legend</span><ul>' + labels.join('') + '</ul>';
}

angular.module('angularMapbox').directive('mapbox', function($compile, $q) {
  var _mapboxMap;

  return {
    restrict: 'E',
    transclude: true,
    scope: true,
    replace: true,
    link: function(scope, element, attrs) {
      var zoomControl = true;

      if (attrs.hasOwnProperty('zoomControl'))
        zoomControl = (attrs.zoomControl === 'true');

      scope.map = L.mapbox.map(element[0], attrs.mapId, {
        zoomControl: zoomControl
      });

      _mapboxMap.resolve(scope.map);

      var mapWidth = attrs.width || 500;
      var mapHeight = attrs.height || 500;
      element.css('width', mapWidth + 'px');
      element.css('height', mapHeight + 'px');

      var zoom = attrs.zoom || 12;
      if(attrs.lat && attrs.lng) {
        scope.map.setView([attrs.lat, attrs.lng], zoom);
      }

      scope.isClusteringMarkers = attrs.clusterMarkers !== undefined;

      var shouldRefitMap = attrs.scaleToFit !== undefined;
      scope.fitMapToMarkers = function() {
        if(!shouldRefitMap) return;
        // TODO: only call this after all markers have been added, instead of per marker add

        var group = new L.featureGroup(scope.markers);
        scope.map.fitBounds(group.getBounds());
      };

      if(attrs.onReposition) {
        scope.map.on('dragend', function() {
          scope[attrs.onReposition](scope.map.getBounds());
        });
      }

      if(attrs.onZoom) {
        scope.map.on('zoomend', function() {
          scope[attrs.onZoom](scope.map.getBounds());
        });
      }

      if (!zoomControl) {
        scope.map.dragging.disable();
        scope.map.touchZoom.disable();
        scope.map.doubleClickZoom.disable();
        scope.map.scrollWheelZoom.disable();

        if (scope.map.tap) scope.map.tap.disable();
      }

      scope.$on('$destroy', function() {
        scope.map.remove();
      });
    },
    template: '<div class="angular-mapbox-map" ng-transclude></div>',
    controller: function($scope) {

      $scope.markers = [];
      $scope.featureLayers = [];
      $scope.showBack = false;

      _mapboxMap = $q.defer();
      $scope.getMap = this.getMap = function() {
        return _mapboxMap.promise;
      };

      if(L.MarkerClusterGroup) {
        $scope.clusterGroup = new L.MarkerClusterGroup();
        this.getMap().then(function(map) {
          map.addLayer($scope.clusterGroup);
        });
      }

      this.$scope = $scope;
    }
  };
});

angular.module('angularMapbox').directive('marker', function($compile) {
  var _colors = {
    navy: '#001f3f',
    blue: '#0074d9',
    aqua: '#7fdbff',
    teal: '#39cccc',
    olive: '#3d9970',
    green: '#2ecc40',
    lime: '#01ff70',
    yellow: '#ffdc00',
    orange: '#ff851b',
    red: '#ff4136',
    fuchsia: '#f012be',
    purple: '#b10dc9',
    maroon: '#85144b',
    white: 'white',
    silver: '#dddddd',
    gray: '#aaaaaa',
    black: '#111111'
  };

  return {
    restrict: 'E',
    require: '^mapbox',
    transclude: true,
    scope: true,
    link: function(scope, element, attrs, controller, transclude) {
      var opts = { draggable: attrs.draggable !== undefined };
      var style = setStyleOptions(attrs);
      var marker;

      function setStyleOptions(attrs, default_opts) {
        var opts = default_opts || {};
        if(attrs.size) {
          opts['marker-size'] = attrs.size;
        }
        if(attrs.color) {
          if(attrs.color[0] === '#') {
            opts['marker-color'] = attrs.color;
          } else {
            opts['marker-color'] = _colors[attrs.color] || attrs.color;
          }
        }
        if(attrs.icon) {
          opts['marker-symbol'] = attrs.icon;
        }
        return opts;
      }

      var addMarker = function(map, latlng, popupContent, opts, style) {
        opts = opts || {};

        var marker = L.mapbox.marker.style({ properties: style }, latlng);
        if(popupContent && popupContent.length > 0) marker.bindPopup(popupContent);

        if(controller.$scope.isClusteringMarkers && opts.excludeFromClustering !== true) {
          controller.$scope.clusterGroup.addLayer(marker);
        } else {
          marker.addTo(map);
        }

        // this needs to come after being added to map because the L.mapbox.marker.style() factory
        // does not let us pass other opts (eg, draggable) in
        if(opts.draggable) marker.dragging.enable();

        controller.$scope.markers.push(marker);
        controller.$scope.fitMapToMarkers();

        return marker;
      };

      var addCurrentLocation = function(map, popupContent, opts, style) {
        style = setStyleOptions(style, { 'marker-color': '#000', 'marker-symbol': 'star' });
        opts.excludeFromClustering = true;

        map.on('locationfound', function(e) {
          marker = addMarker(map, [e.latlng.lat, e.latlng.lng], null, opts, style);
        });

        map.locate();
      };

      controller.getMap().then(function(map) {
        map.on('popupopen', function(e) {
          // ensure that popups are compiled
          var popup = angular.element(document.getElementsByClassName('leaflet-popup-content'));
          $compile(popup)(scope);
          if(!scope.$$phase) scope.$digest();
        });

        setTimeout(function() {
          // there's got to be a better way to programmatically access transcluded content
          var popupHTML = '';
          var transcluded = transclude(scope, function() {});
          for(var i = 0; i < transcluded.length; i++) {
            if(transcluded[i].outerHTML !== undefined) popupHTML += transcluded[i].outerHTML;
          }

          if(attrs.currentLocation !== undefined) {
            addCurrentLocation(map, null, opts, style);
          } else {
            if(popupHTML) {
              var popup = angular.element(popupHTML);
              $compile(popup)(scope);
              if(!scope.$$phase) scope.$digest();

              var newPopupHTML = '';
              for(i = 0; i < popup.length; i++) {
                newPopupHTML += popup[i].outerHTML;
              }

              marker = addMarker(map, [attrs.lat, attrs.lng], newPopupHTML, opts, style);
            } else {
              marker = addMarker(map, [attrs.lat, attrs.lng], null, opts, style);
            }

            element.bind('$destroy', function() {
              if(controller.$scope.isClusteringMarkers) {
                controller.$scope.clusterGroup.removeLayer(marker);
              } else {
                map.removeLayer(marker);
              }
            });
          }
        }, 0);
      });
    }
  };
});

