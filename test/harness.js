/* Love Bookmarks — Node harness (no browser needed).
 *
 * Run:  node test/harness.js
 */
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const store = {};
const mem = {};

const localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => {
    mem[k] = String(v);
  },
  removeItem: (k) => {
    delete mem[k];
  }
};

const tab = { id: 1, title: "Free Fire — download", url: "https://example.com/play" };

const chrome = {
  tabs: {
    query: (q, cb) => {
      if (typeof cb === "function") cb([tab]);
      return Promise.resolve([tab]);
    },
    create: (opts, cb) => {
      const t = { id: 2, url: opts.url };
      if (typeof cb === "function") cb(t);
      return Promise.resolve(t);
    }
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => {
          if (k in store) res[k] = store[k];
        });
        if (typeof cb === "function") cb(res);
        return Promise.resolve(res);
      },
      set: (obj, cb) => {
        Object.assign(store, obj);
        if (typeof cb === "function") cb();
        return Promise.resolve();
      }
    }
  }
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  Promise,
  localStorage,
  chrome,
  document: {
    readyState: "complete",
    getElementById: () => null,
    addEventListener() {},
    createElement: () => ({
      style: { setProperty() {} },
      classList: { add() {}, remove() {} },
      appendChild() {},
      addEventListener() {},
      setAttribute() {},
      removeChild() {},
      focus() {},
      select() {}
    })
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, "..");
vm.runInContext(fs.readFileSync(path.join(root, "src", "common", "api.js"), "utf8"), sandbox, { filename: "api.js" });
vm.runInContext(fs.readFileSync(path.join(root, "src", "popup", "popup.js"), "utf8"), sandbox, { filename: "popup.js" });

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log("ok - " + msg);
  else {
    failures += 1;
    console.error("FAIL - " + msg);
  }
}

const M = sandbox.window.MenaBookmarks;
assert(!!M, "namespace MenaBookmarks is exposed");
assert(M && M.KEY === "mena-bookmarks", "storage key is mena-bookmarks");

assert(M.hostname("https://www.example.com/a?b=1") === "example.com", "hostname strips protocol + www");
assert(M.hostname("example.com/x") === "example.com", "hostname works without protocol");
assert(M.cleanUrl("example.com") === "https://example.com", "cleanUrl adds https");
assert(M.cleanUrl("  ") === "", "cleanUrl rejects blank");
assert(M.initialOf("", "https://pizza.example") === "P", "initialOf falls back to host");
assert(M.initialOf("  us  ", "https://x") === "U", "initialOf uses the title");
assert(typeof M.hueFor("example.com") === "number" && M.hueFor("example.com") < 360, "hueFor is a hue");

let list = [];
list = M.addBookmark(list, { title: "Our song", url: "https://youtube.com/watch?v=1" });
assert(list.length === 1, "addBookmark adds one");
assert(list[0].title === "Our song", "addBookmark keeps the title");
assert(M.addBookmark(list, { url: "https://youtube.com/watch?v=1" }).length === 1, "addBookmark de-duplicates by url");
assert(M.addBookmark(list, { url: "   " }).length === 1, "addBookmark rejects blank urls");
assert(M.hasBookmark(list, "https://youtube.com/watch?v=1") === true, "hasBookmark finds it");
assert(M.hasBookmark(list, "https://other.example") === false, "hasBookmark misses others");

list = M.addBookmark(list, { url: "https://pizza.example" });
assert(list.length === 2, "second bookmark added");
assert(list[0].title === "pizza.example", "title defaults to hostname");

const id = list[0].id;
list = M.renameBookmark(list, id, "  Friday pizza  ");
assert(list[0].title === "Friday pizza", "renameBookmark trims the new title");
assert(M.renameBookmark(list, "nope", "x")[0].title === "Friday pizza", "renameBookmark ignores unknown ids");

list = M.removeBookmark(list, id);
assert(list.length === 1, "removeBookmark removes one");
assert(
  list.every((b) => b.id !== id),
  "removeBookmark removes the right id"
);

assert(M.normalize(null).length === 0, "normalize(null) is empty");
assert(M.normalize([null, 0, {}, { url: "" }]).length === 0, "normalize drops invalid entries");
assert(M.normalize([{ url: "https://a.example" }])[0].id.length > 0, "normalize assigns ids");

(async function () {
  const payload = M.normalize([{ title: "Our song", url: "https://youtube.com/watch?v=1" }]);
  await sandbox.storageSet("mena-bookmarks", payload);
  const back = await sandbox.storageGet("mena-bookmarks");
  assert(Array.isArray(back) && back.length === 1, "storage round-trip keeps the board");
  assert(back[0].title === "Our song", "storage round-trip keeps the title");

  const active = await sandbox.queryActiveTab();
  assert(active && active.url === "https://example.com/play", "queryActiveTab returns the active tab");

  console.log("");
  if (failures) {
    console.error(failures + " assertion(s) failed");
    process.exitCode = 1;
  } else {
    console.log("All assertions passed.");
  }
})();
