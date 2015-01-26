angular.module('angularMapbox').directive('legend', function() {
  return {
    restrict: 'E',
    require: '^mapbox',
    scope: true,
    link: function(scope, element, attrs, controller) {
      console.log('Legendi');
      scope.$watch('legend', function() {
        controller.getMap().then(function(map) {
          console.log(scope.legend);
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
