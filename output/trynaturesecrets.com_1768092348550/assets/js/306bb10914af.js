
    (function() {
      var cdnOrigin = "https://cdn.shopify.com";
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills.BVYsYAdG.js","/cdn/shopifycloud/checkout-web/assets/c1/app.CZ257zjM.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en.DNjfdIgd.js","/cdn/shopifycloud/checkout-web/assets/c1/page-OnePage.BEj7ewVh.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalizationExtensionField.qsBYTQWA.js","/cdn/shopifycloud/checkout-web/assets/c1/RememberMeDescriptionText.DqD_dXka.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayOptInDisclaimer.Bax5aZ3j.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentButtons.BCtS8jSg.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblemsLineItemList.DwRR8Twt.js","/cdn/shopifycloud/checkout-web/assets/c1/LocalPickup.Bwa7oJHR.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayButtonClassName.BNRcvf2M.js","/cdn/shopifycloud/checkout-web/assets/c1/VaultedPayment.FnAziDUL.js","/cdn/shopifycloud/checkout-web/assets/c1/SeparatePaymentsNotice.BQfRTqmU.js","/cdn/shopifycloud/checkout-web/assets/c1/useAddressManager.BLz9AcF4.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayPaymentRequiredMethod.Dvaw9PUP.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButtonSection.4UxovXnp.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown.Duf9FzL6.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal.CFRb6Zdj.js","/cdn/shopifycloud/checkout-web/assets/c1/StackedMerchandisePreview.BinSuiy6.js","/cdn/shopifycloud/checkout-web/assets/c1/component-ShopPayVerificationSwitch.C1OqPFff.js","/cdn/shopifycloud/checkout-web/assets/c1/useSubscribeMessenger.CvFeycnV.js","/cdn/shopifycloud/checkout-web/assets/c1/index.Bko5nrRS.js","/cdn/shopifycloud/checkout-web/assets/c1/component-RuntimeExtension.8z7zuMU5.js","/cdn/shopifycloud/checkout-web/assets/c1/controller.BAecNI4P.js"];
      var styles = ["/cdn/shopifycloud/checkout-web/assets/c1/assets/app.H4lHIwb0.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/OnePage.Bbt-2IKJ.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/LocalizationExtensionField.Ca9titpM.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/LocalPickup.Dm9JB4kF.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/ShopPayVerificationSwitch.WW3cs_z5.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/useShopPayButtonClassName.BrcQzLuH.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/VaultedPayment.OxMVm7u-.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/StackedMerchandisePreview.D6OuIVjc.css","/cdn/shopifycloud/checkout-web/assets/c1/assets/RuntimeExtension.DWkDBM73.css"];
      var fontPreconnectUrls = [];
      var fontPrefetchUrls = [];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0943/5457/1628/files/Seloria_Presentation_9_x320.png?v=1760687177"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = [cdnOrigin].concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  