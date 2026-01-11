// another way
(function (ns, fetch) {
  const pathUrl = window?.location?.pathname || '';
  if (pathUrl.includes('/cart')) {
    ns.fetch = function () {
      const response = fetch.apply(this, arguments);
      if (window?.opusActive) return response;
      response.then((res) => {
        if (res.url.includes(`/cart/`) && res.ok) {
          window?.opusRefreshCart?.();
        }
      });
      return response;
    };
  }

  if (!ns) return;
  if (!fetch) return;
  if (window?.opusFetchCartAdd === false) return;
  ns.fetch = function () {
    const response = fetch.apply(this, arguments);
    if (window?.opusActive) return response;
    response.then((res) => {
      if (res.url.includes(`/cart/add`) && res.ok) {
        window?.opusOpen?.();
      }
    });
    return response;
  };
})(window, window.fetch);
