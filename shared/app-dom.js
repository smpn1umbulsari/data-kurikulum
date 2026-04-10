(function initAppDom(global) {
  const AppDom = global.AppDom || {};

  AppDom.byId = function byId(id) {
    return global.document.getElementById(id);
  };

  AppDom.setText = function setText(idOrElement, value) {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    element.innerText = value;
    return element;
  };

  AppDom.setHtml = function setHtml(idOrElement, value) {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    element.innerHTML = value;
    return element;
  };

  AppDom.toggleDisplay = function toggleDisplay(idOrElement, shouldShow, displayValue = "") {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    element.style.display = shouldShow ? displayValue : "none";
    return element;
  };

  AppDom.toggleBodyClass = function toggleBodyClass(className, force) {
    global.document.body?.classList.toggle(className, force);
  };

  global.AppDom = AppDom;
})(window);
