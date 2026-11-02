/**
 * Shared auth guard for all procurement pages.
 * Located at: PROCUREMENT/supplier/auth-guard.js
 * Include as the FIRST script on every page in PROCUREMENT/supplier/.
 */
(function () {
  "use strict";

  // From PROCUREMENT/supplier/:
  //   ../../           -> app root (where index.php and HR/ live)
  const LOGIN_PAGE       = "../../index.php";
  const SESSION_ENDPOINT = "../../HR/api.php?action=session";

  window.procurementSession = null;

  window.procurementAuthReady = (async function () {
    try {
      const res = await fetch(
        SESSION_ENDPOINT + "&_t=" + Date.now(),
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        }
      );

      if (!res.ok) throw new Error("Session request failed (" + res.status + ")");

      const data = await res.json();

      if (!data || !data.ok || !data.user) {
        window.location.replace(LOGIN_PAGE);
        return null;
      }

      window.procurementSession = data.user;
      return data.user;
    } catch (err) {
      console.warn("Auth check failed:", err);
      window.location.replace(LOGIN_PAGE);
      return null;
    }
  })();

  window.addEventListener("pageshow", function (event) {
    if (event.persisted && !window.procurementSession) {
      window.location.reload();
    }
  });
})();