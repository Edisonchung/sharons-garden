"use strict";
(() => {
var exports = {};
exports.id = 502;
exports.ids = [502,660];
exports.modules = {

/***/ 7161:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fgarden_2Fprofile_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fprofile_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
  getServerSideProps: () => (/* binding */ getServerSideProps),
  getStaticPaths: () => (/* binding */ getStaticPaths),
  getStaticProps: () => (/* binding */ getStaticProps),
  reportWebVitals: () => (/* binding */ reportWebVitals),
  routeModule: () => (/* binding */ routeModule),
  unstable_getServerProps: () => (/* binding */ unstable_getServerProps),
  unstable_getServerSideProps: () => (/* binding */ unstable_getServerSideProps),
  unstable_getStaticParams: () => (/* binding */ unstable_getStaticParams),
  unstable_getStaticPaths: () => (/* binding */ unstable_getStaticPaths),
  unstable_getStaticProps: () => (/* binding */ unstable_getStaticProps)
});

// NAMESPACE OBJECT: ./pages/garden/profile.js
var profile_namespaceObject = {};
__webpack_require__.r(profile_namespaceObject);
__webpack_require__.d(profile_namespaceObject, {
  "default": () => (ProfilePage)
});

// EXTERNAL MODULE: ./node_modules/next/dist/server/future/route-modules/pages/module.js
var pages_module = __webpack_require__(3185);
var module_default = /*#__PURE__*/__webpack_require__.n(pages_module);
// EXTERNAL MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/helpers.js
var helpers = __webpack_require__(7182);
// EXTERNAL MODULE: ./node_modules/next/dist/pages/_document.js
var _document = __webpack_require__(2940);
var _document_default = /*#__PURE__*/__webpack_require__.n(_document);
// EXTERNAL MODULE: ./pages/_app.js + 1 modules
var _app = __webpack_require__(1845);
// EXTERNAL MODULE: ./node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(5893);
// EXTERNAL MODULE: external "react"
var external_react_ = __webpack_require__(6689);
;// CONCATENATED MODULE: ./pages/garden/profile.js
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/auth'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
// pages/garden/profile.js




const db = Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();
const auth = Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/auth'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();
function ProfilePage() {
    const [user, setUser] = (0,external_react_.useState)(null);
    const [email, setEmail] = (0,external_react_.useState)("");
    const [notify, setNotify] = (0,external_react_.useState)(true);
    const [loading, setLoading] = (0,external_react_.useState)(true);
    (0,external_react_.useEffect)(()=>{
        const unsubscribe = Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/auth'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(auth, async (currentUser)=>{
            setUser(currentUser);
            if (currentUser) {
                const userRef = Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(db, "users", currentUser.uid);
                const docSnap = await Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(userRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEmail(data.email || currentUser.email);
                    setNotify(data.notify_opt_in ?? true);
                } else {
                    setEmail(currentUser.email);
                }
            }
            setLoading(false);
        });
        return ()=>unsubscribe();
    }, []);
    const savePreferences = async ()=>{
        if (!user) return;
        await Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(Object(function webpackMissingModule() { var e = new Error("Cannot find module 'firebase/firestore'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(db, "users", user.uid), {
            email,
            displayName: user.displayName,
            avatar: user.photoURL,
            notify_opt_in: notify
        }, {
            merge: true
        });
        alert("Preferences saved!");
    };
    if (loading) return /*#__PURE__*/ jsx_runtime.jsx("p", {
        className: "text-center mt-10",
        children: "Loading profile..."
    });
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "p-6 max-w-md mx-auto bg-white shadow rounded",
        children: [
            /*#__PURE__*/ jsx_runtime.jsx("h2", {
                className: "text-2xl font-bold mb-4",
                children: "\uD83D\uDC64 Profile & Email Preferences"
            }),
            /*#__PURE__*/ jsx_runtime.jsx("label", {
                className: "block font-medium mb-1",
                children: "Email:"
            }),
            /*#__PURE__*/ jsx_runtime.jsx("input", {
                className: "border p-2 w-full mb-4",
                type: "email",
                value: email,
                onChange: (e)=>setEmail(e.target.value)
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("label", {
                className: "block font-medium mb-2",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("input", {
                        type: "checkbox",
                        checked: notify,
                        onChange: (e)=>setNotify(e.target.checked),
                        className: "mr-2"
                    }),
                    "Receive daily watering reminders via email"
                ]
            }),
            /*#__PURE__*/ jsx_runtime.jsx("button", {
                onClick: savePreferences,
                className: "mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded",
                children: "Save"
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fgarden%2Fprofile&preferredRegion=&absolutePagePath=private-next-pages%2Fgarden%2Fprofile.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fgarden_2Fprofile_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fprofile_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(profile_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(profile_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(profile_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(profile_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(profile_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(profile_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(profile_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(profile_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(profile_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(profile_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(profile_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/garden/profile","pathname":"/garden/profile","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: profile_namespaceObject,
        })
        
        
    

/***/ }),

/***/ 3076:
/***/ ((module) => {

module.exports = require("next/dist/server/future/route-modules/route-module.js");

/***/ }),

/***/ 4140:
/***/ ((module) => {

module.exports = require("next/dist/server/get-page-files.js");

/***/ }),

/***/ 9716:
/***/ ((module) => {

module.exports = require("next/dist/server/htmlescape.js");

/***/ }),

/***/ 3100:
/***/ ((module) => {

module.exports = require("next/dist/server/render.js");

/***/ }),

/***/ 6368:
/***/ ((module) => {

module.exports = require("next/dist/server/utils.js");

/***/ }),

/***/ 3280:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/app-router-context.js");

/***/ }),

/***/ 6724:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/constants.js");

/***/ }),

/***/ 8743:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/html-context.js");

/***/ }),

/***/ 8524:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/is-plain-object.js");

/***/ }),

/***/ 4964:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router-context.js");

/***/ }),

/***/ 1751:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/add-path-prefix.js");

/***/ }),

/***/ 3938:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/format-url.js");

/***/ }),

/***/ 1109:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/is-local-url.js");

/***/ }),

/***/ 8854:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/parse-path.js");

/***/ }),

/***/ 3297:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/remove-trailing-slash.js");

/***/ }),

/***/ 7782:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/router/utils/resolve-href.js");

/***/ }),

/***/ 9232:
/***/ ((module) => {

module.exports = require("next/dist/shared/lib/utils.js");

/***/ }),

/***/ 1853:
/***/ ((module) => {

module.exports = require("next/router");

/***/ }),

/***/ 6689:
/***/ ((module) => {

module.exports = require("react");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845], () => (__webpack_exec__(7161)));
module.exports = __webpack_exports__;

})();