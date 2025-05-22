"use strict";
(() => {
var exports = {};
exports.id = 746;
exports.ids = [746,660];
exports.modules = {

/***/ 5116:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fgarden_2Fcollection_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fcollection_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
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

// NAMESPACE OBJECT: ./pages/garden/collection.js
var collection_namespaceObject = {};
__webpack_require__.r(collection_namespaceObject);
__webpack_require__.d(collection_namespaceObject, {
  "default": () => (FlowerCollection)
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
;// CONCATENATED MODULE: ./pages/garden/collection.js
// pages/garden/collection.js





function FlowerCollection() {
    const [collection, setCollection] = (0,external_react_.useState)([]);
    const [filter, setFilter] = (0,external_react_.useState)("all");
    (0,external_react_.useEffect)(()=>{
        const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
        const bloomed = Object.values(cached).filter((f)=>f.bloomed);
        setCollection(bloomed);
    }, []);
    const filtered = collection.filter((flower)=>{
        if (filter === "rare") return flower.rarity === "rare";
        if (filter === "rainbow") return flower.rarity === "rainbow";
        return true;
    });
    const progress = collection.length;
    const max = 20;
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6",
        children: [
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "flex justify-between items-center mb-6",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("h1", {
                        className: "text-3xl font-bold text-purple-700",
                        children: "\uD83C\uDF3C My Flower Collection"
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
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                className: "text-sm text-gray-700 mb-4",
                children: [
                    "You’ve collected ",
                    /*#__PURE__*/ jsx_runtime.jsx("strong", {
                        children: progress
                    }),
                    " of ",
                    /*#__PURE__*/ jsx_runtime.jsx("strong", {
                        children: max
                    }),
                    " flowers."
                ]
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "flex gap-4 mb-6",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                        variant: filter === "all" ? "default" : "outline",
                        onClick: ()=>setFilter("all"),
                        children: "All"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                        variant: filter === "rare" ? "default" : "outline",
                        onClick: ()=>setFilter("rare"),
                        children: "\uD83D\uDC8E Rare"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                        variant: filter === "rainbow" ? "default" : "outline",
                        onClick: ()=>setFilter("rainbow"),
                        children: "\uD83C\uDF08 Rainbow"
                    })
                ]
            }),
            filtered.length === 0 ? /*#__PURE__*/ jsx_runtime.jsx("p", {
                className: "text-center text-gray-500",
                children: "No flowers yet — keep watering!"
            }) : /*#__PURE__*/ jsx_runtime.jsx("div", {
                className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6",
                children: filtered.map((flower)=>/*#__PURE__*/ jsx_runtime.jsx(card/* Card */.Z, {
                        className: "bg-white border-l-4 border-purple-300 shadow-md rounded-xl p-4",
                        children: /*#__PURE__*/ (0,jsx_runtime.jsxs)(card/* CardContent */.a, {
                            children: [
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("h3", {
                                    className: "text-xl font-semibold text-purple-700",
                                    children: [
                                        flower.bloomedFlower,
                                        " ",
                                        flower.type
                                    ]
                                }),
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                    className: "text-sm text-gray-500",
                                    children: [
                                        "Color: ",
                                        flower.color
                                    ]
                                }),
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                    className: "text-sm text-gray-500",
                                    children: [
                                        "Note: ",
                                        flower.note || "—"
                                    ]
                                }),
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                    className: "text-sm text-gray-400 mt-1",
                                    children: [
                                        "Watered ",
                                        flower.waterCount,
                                        "/7"
                                    ]
                                }),
                                flower.rarity && /*#__PURE__*/ jsx_runtime.jsx("p", {
                                    className: "text-xs mt-2 text-yellow-600",
                                    children: flower.rarity === "rainbow" ? "\uD83C\uDF08 Rainbow Grade" : "\uD83D\uDC8E Rare Flower"
                                })
                            ]
                        })
                    }, flower.id))
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fgarden%2Fcollection&preferredRegion=&absolutePagePath=private-next-pages%2Fgarden%2Fcollection.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fgarden_2Fcollection_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fcollection_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(collection_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(collection_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(collection_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(collection_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(collection_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(collection_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(collection_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(collection_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(collection_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(collection_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(collection_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/garden/collection","pathname":"/garden/collection","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: collection_namespaceObject,
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
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845], () => (__webpack_exec__(5116)));
module.exports = __webpack_exports__;

})();