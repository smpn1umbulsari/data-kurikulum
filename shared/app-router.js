(function initAppRouter(global) {
  if (global.AppRouter) return;

  const routes = new Map();

  function normalizeRoute(route) {
    return {
      title: route?.title || "",
      beforeEnter: typeof route?.beforeEnter === "function" ? route.beforeEnter : null,
      render: typeof route?.render === "function" ? route.render : null,
      afterEnter: typeof route?.afterEnter === "function" ? route.afterEnter : null
    };
  }

  function register(page, route) {
    if (!page || !route) return;
    routes.set(String(page), normalizeRoute(route));
  }

  function registerMany(routeMap = {}) {
    Object.entries(routeMap).forEach(([page, route]) => register(page, route));
  }

  function navigate(page, context = {}) {
    const route = routes.get(String(page));
    if (!route || !route.render) return false;

    route.beforeEnter?.(context);
    if (context.pageTitle && route.title) {
      context.pageTitle.innerText = route.title;
    }
    if (context.content) {
      context.content.innerHTML = route.render(context);
    }
    route.afterEnter?.(context);
    return true;
  }

  global.AppRouter = {
    register,
    registerMany,
    navigate,
    has(page) {
      return routes.has(String(page));
    }
  };
})(window);
