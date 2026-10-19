/* Love Bookmarks — background script (MV3 service worker / Firefox event page). */
(function () {
  "use strict";

  var api = globalThis.browser || globalThis.chrome;
  var KEY = "mena-bookmarks";

  function ensureSeed() {
    if (!(api && api.storage && api.storage.local)) return;
    try {
      var payload = {};
      payload[KEY] = [];
      var maybe = api.storage.local.get([KEY], function (res) {
        if (!res || !(KEY in res)) api.storage.local.set(payload);
      });
      if (maybe && typeof maybe.then === "function") {
        maybe.then(function (res) {
          if (!res || !(KEY in res)) api.storage.local.set(payload);
        });
      }
    } catch (err) {
      /* best-effort */
    }
  }

  if (api && api.runtime && api.runtime.onInstalled) {
    api.runtime.onInstalled.addListener(ensureSeed);
  }
})();
