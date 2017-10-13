(function () {
    angular.module('app', [
      'ngRoute'
    ])
      .config(config);
    function config($routeProvider, $httpProvider, $locationProvider) {
        $routeProvider
                    .when('/web', {
                        templateUrl: '/views/web.html',
                        controller: 'WebController',
                        controllerAs: 'web',
                    })
                    .when('/design', {
                        templateUrl: '/views/design.html',
                        controller: 'MainController',
                        controllerAs: 'main',
                    }).when('/SharePoint', {
                        templateUrl: '/views/sp.html',
                        controller: 'MainController',
                        controllerAs: 'main',
                    });
                    $locationProvider.html5Mode(true).hashPrefix('!');
    };
})();