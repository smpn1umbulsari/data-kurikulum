(function initAppDom(global) {
  const AppDom = global.AppDom || {};

  AppDom.byId = function byId(id) {
    return global.document.getElementById(id);
  };

  AppDom.setText = function setText(idOrElement, value) {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    const nextValue = String(value ?? "");
    if (element.innerText === nextValue) return element;
    element.innerText = nextValue;
    return element;
  };

  AppDom.setHtml = function setHtml(idOrElement, value) {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    const nextValue = String(value ?? "");
    if (element.innerHTML === nextValue) return element;
    element.innerHTML = nextValue;
    return element;
  };

  AppDom.toggleDisplay = function toggleDisplay(idOrElement, shouldShow, displayValue = "") {
    const element = typeof idOrElement === "string" ? AppDom.byId(idOrElement) : idOrElement;
    if (!element) return null;
    const nextValue = shouldShow ? displayValue : "none";
    if (element.style.display === nextValue) return element;
    element.style.display = nextValue;
    return element;
  };

  AppDom.toggleBodyClass = function toggleBodyClass(className, force) {
    global.document.body?.classList.toggle(className, force);
  };

  global.AppDom = AppDom;
})(window);
