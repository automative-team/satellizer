angular.module('satellizer')
  .factory('satellizer.Oauth2', [
    '$q',
    '$http',
    'satellizer.popup',
    'satellizer.utils',
    'satellizer.config',
    function($q, $http, popup, utils, config) {
      return function() {

        var defaults = {
          url: null,
          name: null,
          scope: null,
          scopeDelimiter: null,
          clientId: null,
          redirectUri: null,
          popupOptions: null,
          authorizationEndpoint: null,
          requiredUrlParams: null,
          optionalUrlParams: null,
          defaultUrlParams: ['response_type', 'client_id', 'redirect_uri'],
          responseType: 'code'
        };

        var oauth2 = {};

        oauth2.open = function(options, userData) {
          angular.extend(defaults, options);
          var url = oauth2.buildUrl();

          return popup.open(url, defaults.popupOptions, defaults.redirectUri)
            .then(function(oauthData) {
              if (defaults.responseType === 'token') {
                return oauthData;
              } else {
                return oauth2.exchangeForToken(oauthData, userData)
              }
            });

        };

        oauth2.exchangeForToken = function(oauthData, userData) {
          var data = angular.extend({}, userData, {
            code: oauthData.code,
            clientId: defaults.clientId,
            redirectUri: defaults.redirectUri
          });

          return $http.post(defaults.url, data);
        };

        oauth2.buildUrl = function() {
          var baseUrl = defaults.authorizationEndpoint;
          var qs = oauth2.buildQueryString();
          return [baseUrl, qs].join('?');
        };

        oauth2.buildQueryString = function() {
          var keyValuePairs = [];
          var urlParams = ['defaultUrlParams', 'requiredUrlParams', 'optionalUrlParams'];

          angular.forEach(urlParams, function(params) {
            angular.forEach(defaults[params], function(paramName) {
              var camelizedName = utils.camelCase(paramName);
              var paramValue = defaults[camelizedName];

              if (paramName === 'scope' && Array.isArray(paramValue)) {
                paramValue = paramValue.join(defaults.scopeDelimiter);

                if (defaults.scopePrefix) {
                  paramValue = [defaults.scopePrefix, paramValue].join(defaults.scopeDelimiter);
                }
              }

              keyValuePairs.push([paramName, paramValue]);
            });
          });

          return keyValuePairs.map(function(pair) {
            return pair.join('=');
          }).join('&');
        };

        return oauth2;
      };
    }]);
