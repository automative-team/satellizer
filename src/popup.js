angular.module('satellizer')
  .factory('satellizer.popup', [
    '$q',
    '$interval',
    '$window',
    '$location',
    'satellizer.utils',
    function($q, $interval, $window, $location, utils) {
      var popupWindow = null;
      var polling = null;

      var popup = {};

      popup.popupWindow = popupWindow;

      var processReply = function(deferred, source) {
        var queryParams = source.search.substring(1).replace(/\/$/, '');
        var hashParams = source.hash.substring(1).replace(/\/$/, '');
        var hash = utils.parseQueryString(hashParams);
        var qs = utils.parseQueryString(queryParams);

        angular.extend(qs, hash);

        if (qs.error) {
          deferred.reject({ error: qs.error });
        } else {
          deferred.resolve(qs);
        }
      };

      var parseUrl = function(url) {
        var parser = document.createElement('a');
        parser.href = url;
        return parser;
      };

      popup.open = function(url, options, redirectUri) {
        var optionsString = popup.stringifyOptions(popup.prepareOptions(options || {}));

        popupWindow = window.open(url, '_blank', optionsString);

        // Mobile support
        // based on hello.js code, if inAppBrowser is been used then the
        // addEventListener method is added to the webview
        if (window.cordova || window.PhoneGap) {
          var deferred = $q.defer();

          // Get the origin of the redirect URI
          var a = parseUrl(redirectUri);
          var redirect_uri = a.origin || (a.protocol + "//" + a.hostname);

          // Listen to changes in the InAppBrowser window
          var onLoadStart = function(e){
            var url = e.url;

            if(url.indexOf(redirect_uri)!==0){
              return;
            }

            // Split appart the URL
            var a = parseUrl(url);

            // process any received response
            processReply(deferred, a);

            // make sure the popup is closed
            popupWindow.close();

            // make sure we don't leak any windows
            popupWindow.removeEventListener('loadstart', onLoadStart);
          };

          popupWindow.addEventListener('loadstart', onLoadStart);

          if (popupWindow.focus){
            popupWindow.focus();
          }

          return deferred.promise;
        }

        if (popupWindow && popupWindow.focus) {
          popupWindow.focus();
        }

        return popup.pollPopup();
      };

      popup.pollPopup = function() {
        var deferred = $q.defer();
        polling = $interval(function() {
          try {
            if (popupWindow.document.domain === document.domain && (popupWindow.location.search || popupWindow.location.hash)) {

              processReply(deferred, popupWindow.location);
              popupWindow.close();
              $interval.cancel(polling);
            }
          } catch (error) {
          }

          if (popupWindow.closed) {
            $interval.cancel(polling);
            deferred.reject({ data: 'Authorization Failed' });
          }
        }, 35);
        return deferred.promise;
      };

      popup.prepareOptions = function(options) {
        var width = options.width || 500;
        var height = options.height || 500;
        return angular.extend({
          width: width,
          height: height,
          left: $window.screenX + (($window.outerWidth - width) / 2),
          top: $window.screenY + (($window.outerHeight - height) / 2.5)
        }, options);
      };

      popup.stringifyOptions = function(options) {
        var parts = [];
        angular.forEach(options, function(value, key) {
          parts.push(key + '=' + value);
        });
        return parts.join(',');
      };

      return popup;
    }]);
