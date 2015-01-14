angular.module('angularMapbox').directive('legend', function() {
  return {
    restrict: 'E',
    require: '^mapbox',
    scope: true,
    link: function(scope, element, attrs, controller) {
      controller.getMap().then(function(map) {
        map.legendControl.addLegend(getLegendHTML());
      });
    }
  }
});

var getLegendHTML = function() {
  var responses = [{ color: '#f44336', content: 'yes' },
                   { color: '#3f51b5', content: 'no' }],
  labels = [];

  responses.forEach(function(response) {
    labels.push(
      '<li><span class="swatch" style="background:' + response.color + '"></span> ' +
      response.content + '</li>'
    );
  });

  return '<span>Legend</span><ul>' + labels.join('') + '</ul>';
}
