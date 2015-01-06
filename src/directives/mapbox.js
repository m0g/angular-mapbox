angular.module('angularMapbox').directive('mapbox', function($compile, $q) {
  var _mapboxMap;

  return {
    restrict: 'E',
    transclude: true,
    scope: true,
    replace: true,
    link: function(scope, element, attrs) {
      if (attrs.hasOwnProperty('zoomControl'))
        var zoomControl = (attrs.zoomControl === 'true');
      else
        var zoomControl = true;

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
        console.log('hi!');
        scope.map.dragging.disable();
        scope.map.touchZoom.disable();
        scope.map.doubleClickZoom.disable();
        scope.map.scrollWheelZoom.disable();

        if (scope.map.tap) scope.map.tap.disable();
      }
    },
    template: '<div class="angular-mapbox-map" ng-transclude></div>',
    controller: function($scope) {
      $scope.markers = [];
      $scope.featureLayers = [];

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
