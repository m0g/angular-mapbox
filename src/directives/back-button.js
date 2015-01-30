angular.module('angularMapbox').directive('backButton', function() {
  return {
    restrict: 'E',
    require: '^mapbox',
    scope: true,
    template: '<a class="back md-fab md-primary md-default-theme md-cyan-theme md-button" ng-click="back()" ng-show="show"><i class="fa fa-times"></i></a>',
    controller: function($scope) {
      var parent = $scope.$parent.$parent;

      $scope.show = false;

      parent.$watch('showBack', function() {
        $scope.show = parent.showBack;
      });

      $scope.back = function() {
        parent.showBack = false;

        parent.getMap().then(function(map) {
          var region = parent.featureLayers[0];

          parent.featureLayers.forEach(function(layer, index) {
            if (index > 0) layer.clearLayers();
          });

          console.log(parent);
          if (parent.$parent.hasOwnProperty('region'))
            //parent.$parent.$apply(function() {
              parent.$parent.region = null;
            //});

          map.fitBounds(region.getBounds());
        });
      };

      this.$scope = $scope;
    }
  }
});
