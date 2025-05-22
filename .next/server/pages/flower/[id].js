"use strict";
(() => {
var exports = {};
exports.id = 312;
exports.ids = [312,660];
exports.modules = {

/***/ 6819:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fflower_2F_5Bid_5D_preferredRegion_absolutePagePath_private_next_pages_2Fflower_2F_5Bid_5D_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
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

// NAMESPACE OBJECT: ./pages/flower/[id].js
var _id_namespaceObject = {};
__webpack_require__.r(_id_namespaceObject);
__webpack_require__.d(_id_namespaceObject, {
  "default": () => (FlowerDetail)
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
// EXTERNAL MODULE: external "next/router"
var router_ = __webpack_require__(1853);
// EXTERNAL MODULE: external "react"
var external_react_ = __webpack_require__(6689);
// EXTERNAL MODULE: ./components/ui/button.js
var ui_button = __webpack_require__(6052);
// EXTERNAL MODULE: ./components/ui/card.js
var card = __webpack_require__(9821);
// EXTERNAL MODULE: ./components/SurpriseReward.js
var SurpriseReward = __webpack_require__(28);
;// CONCATENATED MODULE: ./pages/flower/[id].js
// pages/flower/[id].js





 // ✅ ensure correct relative path
function FlowerDetail() {
    const router = (0,router_.useRouter)();
    const { id } = router.query;
    const [flower, setFlower] = (0,external_react_.useState)(null);
    const [waterCount, setWaterCount] = (0,external_react_.useState)(0);
    const [bloomed, setBloomed] = (0,external_react_.useState)(false);
    const [rewardShown, setRewardShown] = (0,external_react_.useState)(false);
    const [lastWatered, setLastWatered] = (0,external_react_.useState)(null);
    const [canWater, setCanWater] = (0,external_react_.useState)(true);
    const [showReward, setShowReward] = (0,external_react_.useState)(false); // ✅ for surprise reward
    (0,external_react_.useEffect)(()=>{
        if (id) {
            const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
            const found = cached[id];
            if (found) {
                setFlower(found);
                setWaterCount(found.waterCount || 0);
                setBloomed(found.waterCount >= 7);
            }
            const key = `lastWatered_${id}`;
            const storedTime = localStorage.getItem(key);
            if (storedTime) {
                const last = new Date(storedTime);
                const now = new Date();
                const sameDay = last.toDateString() === now.toDateString();
                setLastWatered(last);
                setCanWater(!sameDay);
            }
        }
    }, [
        id
    ]);
    const handleWater = ()=>{
        if (!canWater) return alert("You've already watered this flower today. Try again tomorrow \uD83C\uDF19");
        const newCount = waterCount + 1;
        setWaterCount(newCount);
        const isBloomed = newCount >= 7;
        setBloomed(isBloomed);
        const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
        if (cached[id]) {
            cached[id].waterCount = newCount;
            cached[id].bloomed = isBloomed;
        }
        localStorage.setItem("flowers", JSON.stringify(cached));
        const now = new Date();
        localStorage.setItem(`lastWatered_${id}`, now.toISOString());
        setCanWater(false);
        // ✅ Show surprise reward on exact bloom
        if (newCount === 7) {
            setShowReward(true);
        }
    };
    if (!flower) return /*#__PURE__*/ jsx_runtime.jsx("p", {
        className: "text-center mt-10",
        children: "\uD83C\uDF3C Loading flower..."
    });
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 p-6",
        children: [
            /*#__PURE__*/ jsx_runtime.jsx(card/* Card */.Z, {
                className: "bg-white max-w-md w-full shadow-xl rounded-2xl p-6 text-center",
                children: /*#__PURE__*/ (0,jsx_runtime.jsxs)(card/* CardContent */.a, {
                    children: [
                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("h2", {
                            className: "text-2xl font-bold text-purple-700 mb-2",
                            children: [
                                bloomed ? "\uD83C\uDF38" : "\uD83C\uDF3C",
                                " ",
                                flower.emotion
                            ]
                        }),
                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                            className: "text-sm italic text-gray-500 mb-1",
                            children: [
                                "— ",
                                flower.name || "Anonymous"
                            ]
                        }),
                        flower.note && /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                            className: "text-sm text-gray-600 mb-2",
                            children: [
                                "“",
                                flower.note,
                                "”"
                            ]
                        }),
                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                            className: "text-gray-600 mb-2",
                            children: [
                                "Watered ",
                                waterCount,
                                " / 7 times"
                            ]
                        }),
                        !bloomed ? /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                            onClick: handleWater,
                            disabled: !canWater,
                            children: canWater ? "\uD83D\uDCA7 Water this flower" : "⏳ Come back tomorrow"
                        }) : /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                            children: [
                                /*#__PURE__*/ jsx_runtime.jsx("p", {
                                    className: "text-green-600 font-medium",
                                    children: "This flower has bloomed! \uD83C\uDF1F"
                                }),
                                !rewardShown && /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                    className: "mt-4",
                                    children: [
                                        /*#__PURE__*/ jsx_runtime.jsx("p", {
                                            className: "mb-2",
                                            children: "\uD83C\uDF81 Reward: Sharon’s exclusive voice note"
                                        }),
                                        /*#__PURE__*/ jsx_runtime.jsx("a", {
                                            href: "https://example.com/sharon-reward",
                                            target: "_blank",
                                            rel: "noopener noreferrer",
                                            className: "text-blue-600 underline",
                                            children: "Claim Reward"
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                })
            }),
            showReward && /*#__PURE__*/ jsx_runtime.jsx(SurpriseReward/* default */.Z, {
                onClose: ()=>setShowReward(false)
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fflower%2F%5Bid%5D&preferredRegion=&absolutePagePath=private-next-pages%2Fflower%2F%5Bid%5D.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fflower_2F_5Bid_5D_preferredRegion_absolutePagePath_private_next_pages_2Fflower_2F_5Bid_5D_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(_id_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(_id_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(_id_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(_id_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(_id_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(_id_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(_id_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(_id_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(_id_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(_id_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(_id_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/flower/[id]","pathname":"/flower/[id]","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: _id_namespaceObject,
        })
        
        
    

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
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845,536], () => (__webpack_exec__(6819)));
module.exports = __webpack_exports__;

})();