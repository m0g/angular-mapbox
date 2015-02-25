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
