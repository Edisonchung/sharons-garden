"use strict";
(() => {
var exports = {};
exports.id = 296;
exports.ids = [296,660];
exports.modules = {

/***/ 2722:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fgarden_2Fachievements_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fachievements_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
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

// NAMESPACE OBJECT: ./pages/garden/achievements.js
var achievements_namespaceObject = {};
__webpack_require__.r(achievements_namespaceObject);
__webpack_require__.d(achievements_namespaceObject, {
  "default": () => (AchievementsPage)
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
// EXTERNAL MODULE: ./components/ui/card.js
var card = __webpack_require__(9821);
// EXTERNAL MODULE: ./components/ui/button.js
var ui_button = __webpack_require__(6052);
// EXTERNAL MODULE: ./node_modules/next/link.js
var next_link = __webpack_require__(1664);
var link_default = /*#__PURE__*/__webpack_require__.n(next_link);
// EXTERNAL MODULE: external "canvas-confetti"
var external_canvas_confetti_ = __webpack_require__(5245);
var external_canvas_confetti_default = /*#__PURE__*/__webpack_require__.n(external_canvas_confetti_);
;// CONCATENATED MODULE: ./pages/garden/achievements.js
// pages/garden/achievements.js






const ALL_ACHIEVEMENTS = [
    {
        name: "First Bloom",
        icon: "\uD83C\uDF38",
        desc: "Bloomed your first flower!",
        condition: (b, t, w)=>b >= 1,
        image: "/badges/first-bloom.png"
    },
    {
        name: "Gardener",
        icon: "\uD83C\uDF3C",
        desc: "Bloomed 3 flowers",
        condition: (b, t, w)=>b >= 3,
        image: "/badges/gardener.png"
    },
    {
        name: "Flower Fanatic",
        icon: "\uD83C\uDF3B",
        desc: "Bloomed 7 flowers",
        condition: (b, t, w)=>b >= 7,
        image: "/badges/fanatic.png"
    },
    {
        name: "Garden Master",
        icon: "\uD83D\uDC51",
        desc: "Collected all flower types",
        condition: (b, t, w)=>t >= 5,
        image: "/badges/master.png"
    },
    {
        name: "Diligent Waterer",
        icon: "\uD83D\uDCA7",
        desc: "Watered 20 times",
        condition: (b, t, w)=>w >= 20,
        image: "/badges/waterer.png"
    }
];
function AchievementsPage() {
    const [achievements, setAchievements] = (0,external_react_.useState)([]);
    const [newlyUnlocked, setNewlyUnlocked] = (0,external_react_.useState)([]);
    const hasMounted = (0,external_react_.useRef)(false);
    (0,external_react_.useEffect)(()=>{
        const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
        const all = Object.values(cached);
        const bloomed = all.filter((f)=>f.bloomed);
        const types = new Set(bloomed.map((f)=>f.type));
        const waterCounts = all.reduce((sum, f)=>sum + (f.waterCount || 0), 0);
        const unlocked = ALL_ACHIEVEMENTS.map((a)=>({
                ...a,
                unlocked: a.condition(bloomed.length, types.size, waterCounts),
                progress: a.name === "Diligent Waterer" ? waterCounts : a.name === "Flower Fanatic" ? bloomed.length : 0
            }));
        const newUnlocks = unlocked.filter((u)=>u.unlocked && !localStorage.getItem(`badge_${u.name}`));
        newUnlocks.forEach((u)=>localStorage.setItem(`badge_${u.name}`, "true"));
        if (hasMounted.current && newUnlocks.length > 0) external_canvas_confetti_default()();
        setAchievements(unlocked);
        setNewlyUnlocked(newUnlocks);
        hasMounted.current = true;
    }, []);
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "min-h-screen bg-gradient-to-br from-green-100 to-purple-100 p-6",
        children: [
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "flex justify-between items-center mb-6",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("h1", {
                        className: "text-3xl font-bold text-purple-800",
                        children: "\uD83C\uDFC5 My Achievements"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx((link_default()), {
                        href: "/",
                        children: /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                            variant: "outline",
                            children: "\uD83C\uDFE1 Back to Garden"
                        })
                    })
                ]
            }),
            /*#__PURE__*/ jsx_runtime.jsx("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6",
                children: achievements.map((a, index)=>/*#__PURE__*/ jsx_runtime.jsx(card/* Card */.Z, {
                        className: `rounded-xl p-4 shadow-lg border-l-4 ${a.unlocked ? "border-yellow-400 bg-white" : "border-gray-300 bg-gray-100 opacity-70"}`,
                        children: /*#__PURE__*/ (0,jsx_runtime.jsxs)(card/* CardContent */.a, {
                            children: [
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("h3", {
                                    className: `text-xl font-semibold ${a.unlocked ? "text-yellow-600" : "text-gray-400"}`,
                                    children: [
                                        a.icon,
                                        " ",
                                        a.name
                                    ]
                                }),
                                /*#__PURE__*/ jsx_runtime.jsx("p", {
                                    className: "text-sm text-gray-600 mt-1",
                                    children: a.desc
                                }),
                                !a.unlocked && /*#__PURE__*/ jsx_runtime.jsx("p", {
                                    className: "text-xs text-gray-500 mt-2 italic",
                                    children: "Not yet unlocked"
                                }),
                                a.name === "Diligent Waterer" && /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                    className: "text-xs mt-1 text-gray-500",
                                    children: [
                                        "Progress: ",
                                        a.progress,
                                        "/20"
                                    ]
                                }),
                                a.name === "Flower Fanatic" && /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                    className: "text-xs mt-1 text-gray-500",
                                    children: [
                                        "Progress: ",
                                        a.progress,
                                        "/7"
                                    ]
                                }),
                                a.unlocked && /*#__PURE__*/ jsx_runtime.jsx("a", {
                                    href: a.image,
                                    download: true,
                                    className: "text-xs mt-3 inline-block text-blue-600 underline hover:text-blue-800",
                                    children: "Download Badge"
                                })
                            ]
                        })
                    }, index))
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fgarden%2Fachievements&preferredRegion=&absolutePagePath=private-next-pages%2Fgarden%2Fachievements.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fgarden_2Fachievements_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fachievements_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(achievements_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(achievements_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(achievements_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(achievements_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(achievements_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(achievements_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(achievements_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(achievements_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(achievements_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(achievements_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(achievements_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/garden/achievements","pathname":"/garden/achievements","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: achievements_namespaceObject,
        })
        
        
    

/***/ }),

/***/ 9821:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ Card),
/* harmony export */   a: () => (/* binding */ CardContent)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);

function Card({ children, className = "" }) {
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
        className: `border rounded-xl shadow-md p-4 bg-white ${className}`,
        children: children
    });
}
function CardContent({ children }) {
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
        children: children
    });
}


/***/ }),

/***/ 5245:
/***/ ((module) => {

module.exports = require("canvas-confetti");

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
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845], () => (__webpack_exec__(2722)));
module.exports = __webpack_exports__;

})();