/* Love Bookmarks — popup logic.
 *
 * State lives in extension storage under `mena-bookmarks` as an array of
 * `{ id, title, url }`. Pure helpers are exposed on `window.MenaBookmarks`.
 */
(function () {
  "use strict";

  var KEY = "mena-bookmarks";

  var seq = 0;
  function uid() {
    seq += 1;
    return "b" + Date.now().toString(36) + "-" + seq.toString(36);
  }

  function hostname(url) {
    var u = String(url == null ? "" : url);
    var m = u.match(/^[a-z]+:\/\/([^/?#]+)/i);
    var host = m ? m[1] : u.split("/")[0];
    return host.replace(/^www\./i, "");
  }

  function initialOf(title, url) {
    var t = String(title == null ? "" : title).trim();
    if (t) return t.charAt(0).toUpperCase();
    var h = hostname(url);
    return (h.charAt(0) || "?").toUpperCase();
  }

  function hueFor(str) {
    var s = String(str == null ? "" : str);
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) % 360;
    }
    return h;
  }

  function cleanUrl(url) {
    var u = String(url == null ? "" : url).trim();
    if (!u) return "";
    if (!/^[a-z]+:\/\//i.test(u)) u = "https://" + u;
    return u.slice(0, 2048);
  }

  function cleanTitle(title, url) {
    var t = String(title == null ? "" : title).trim();
    if (!t) t = hostname(url) || url;
    return t.slice(0, 80);
  }

  function normalize(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (!item || typeof item !== "object") return;
      var url = cleanUrl(item.url);
      if (!url) return;
      out.push({
        id: typeof item.id === "string" && item.id ? item.id : uid(),
        title: cleanTitle(item.title, url),
        url: url
      });
    });
    return out;
  }

  function addBookmark(list, entry) {
    var url = cleanUrl(entry && entry.url);
    if (!url) return list;
    var existing = list.filter(function (b) {
      return b.url === url;
    });
    if (existing.length) return list; // already saved
    return [{ id: uid(), title: cleanTitle(entry && entry.title, url), url: url }].concat(list);
  }

  function removeBookmark(list, id) {
    return list.filter(function (b) {
      return b.id !== id;
    });
  }

  function renameBookmark(list, id, title) {
    return list.map(function (b) {
      if (b.id !== id) return b;
      return { id: b.id, url: b.url, title: cleanTitle(title, b.url) };
    });
  }

  function hasBookmark(list, url) {
    var u = cleanUrl(url);
    return list.some(function (b) {
      return b.url === u;
    });
  }

  var MenaBookmarks = {
    KEY: KEY,
    uid: uid,
    hostname: hostname,
    initialOf: initialOf,
    hueFor: hueFor,
    cleanUrl: cleanUrl,
    cleanTitle: cleanTitle,
    normalize: normalize,
    addBookmark: addBookmark,
    removeBookmark: removeBookmark,
    renameBookmark: renameBookmark,
    hasBookmark: hasBookmark
  };

  if (typeof window !== "undefined") window.MenaBookmarks = MenaBookmarks;

  /* ------------------------- DOM (browser only) ------------------------- */
  var state = [];

  function persist() {
    return storageSet(KEY, state);
  }

  function tileFor(bookmark) {
    var li = document.createElement("li");
    li.className = "bk-tile";

    var open = document.createElement("button");
    open.type = "button";
    open.className = "bk-open";
    open.title = bookmark.url;

    var avatar = document.createElement("span");
    avatar.className = "bk-avatar";
    avatar.style.setProperty("--bk-hue", String(hueFor(hostname(bookmark.url))));
    avatar.textContent = initialOf(bookmark.title, bookmark.url);

    var title = document.createElement("span");
    title.className = "bk-title";
    title.textContent = bookmark.title;

    open.appendChild(avatar);
    open.appendChild(title);
    open.addEventListener("click", function () {
      openTab(bookmark.url);
    });

    var actions = document.createElement("span");
    actions.className = "bk-actions";

    var edit = document.createElement("button");
    edit.type = "button";
    edit.className = "bk-icon";
    edit.textContent = "\u270e";
    edit.title = "Rename";
    edit.addEventListener("click", function () {
      startRename(li, title, bookmark);
    });

    var del = document.createElement("button");
    del.type = "button";
    del.className = "bk-icon";
    del.textContent = "\u00d7";
    del.title = "Remove";
    del.addEventListener("click", function () {
      state = removeBookmark(state, bookmark.id);
      persist();
      render();
    });

    actions.appendChild(edit);
    actions.appendChild(del);

    li.appendChild(open);
    li.appendChild(actions);
    return li;
  }

  function startRename(li, titleEl, bookmark) {
    var input = document.createElement("input");
    input.type = "text";
    input.className = "bk-rename";
    input.value = bookmark.title;
    input.maxLength = 80;

    function commit() {
      state = renameBookmark(state, bookmark.id, input.value);
      persist();
      render();
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") commit();
      if (event.key === "Escape") render();
    });
    input.addEventListener("blur", commit);

    while (li.firstChild) li.removeChild(li.firstChild);
    li.appendChild(input);
    input.focus();
    input.select();
  }

  function render() {
    var listEl = document.getElementById("bk-list");
    var countEl = document.getElementById("bk-count");
    var emptyEl = document.getElementById("bk-empty");

    if (countEl) countEl.textContent = state.length + (state.length === 1 ? " saved" : " saved");
    if (emptyEl) emptyEl.style.display = state.length ? "none" : "block";
    if (!listEl) return;

    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    state.forEach(function (bookmark) {
      listEl.appendChild(tileFor(bookmark));
    });
  }

  function saveCurrentTab() {
    var titleInput = document.getElementById("bk-title");
    var typed = titleInput ? titleInput.value : "";
    queryActiveTab().then(function (tab) {
      if (!tab || !tab.url) return;
      state = addBookmark(state, { title: typed || tab.title || "", url: tab.url });
      persist();
      if (titleInput) titleInput.value = "";
      render();
    });
  }

  function init() {
    var saveBtn = document.getElementById("bk-save");
    var titleInput = document.getElementById("bk-title");

    if (saveBtn) {
      saveBtn.addEventListener("click", saveCurrentTab);
    }
    if (titleInput) {
      titleInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          saveCurrentTab();
        }
      });
    }

    storageGet(KEY).then(function (saved) {
      state = normalize(saved);
      render();
    });
  }

  if (typeof document !== "undefined" && document && typeof document.getElementById === "function") {
    if (document.readyState === "loading" && typeof document.addEventListener === "function") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
