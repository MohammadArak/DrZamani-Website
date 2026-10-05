/* Reserve dialog for server-rendered pages (articles, services). The homepage uses the React dialog. */
(function () {
  var root = document.getElementById("root");
  var overlay = document.querySelector("[data-reserve-dialog]");
  if (!root || !overlay || root.getAttribute("data-booking") === "1") return;
  var dialog = overlay.querySelector(".drz-dialog");
  var last = null;
  function open(event) {
    event.preventDefault();
    last = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    dialog.focus();
  }
  function close() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (last && last.focus) last.focus();
  }
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (target.closest && target.closest("[data-reserve]")) return open(event);
    if (overlay.hidden) return;
    if (target === overlay || (target.closest && target.closest("[data-reserve-close]"))) close();
  });
  document.addEventListener("keydown", function (event) {
    if (overlay.hidden) return;
    if (event.key === "Escape") return close();
    if (event.key === "Tab") {
      var items = overlay.querySelectorAll("button");
      var first = items[0];
      var lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); first.focus(); }
    }
  });
})();
