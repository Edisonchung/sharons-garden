"use strict";
(() => {
var exports = {};
exports.id = 143;
exports.ids = [143,660];
exports.modules = {

/***/ 6034:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fgarden_2Fcertificate_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fcertificate_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
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

// NAMESPACE OBJECT: ./pages/garden/certificate.js
var certificate_namespaceObject = {};
__webpack_require__.r(certificate_namespaceObject);
__webpack_require__.d(certificate_namespaceObject, {
  "default": () => (CertificatePage)
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
;// CONCATENATED MODULE: external "html2canvas"
const external_html2canvas_namespaceObject = require("html2canvas");
var external_html2canvas_default = /*#__PURE__*/__webpack_require__.n(external_html2canvas_namespaceObject);
// EXTERNAL MODULE: ./components/ui/button.js
var ui_button = __webpack_require__(6052);
;// CONCATENATED MODULE: external "use-sound"
const external_use_sound_namespaceObject = require("use-sound");
var external_use_sound_default = /*#__PURE__*/__webpack_require__.n(external_use_sound_namespaceObject);
;// CONCATENATED MODULE: ./pages/garden/certificate.js
// pages/garden/certificate.js





function CertificatePage() {
    const [badges, setBadges] = (0,external_react_.useState)([]);
    const ref = (0,external_react_.useRef)(null);
    const [play] = external_use_sound_default()("/sounds/cheer.mp3", {
        volume: 0.5
    });
    (0,external_react_.useEffect)(()=>{
        const unlocked = [];
        const types = [
            "first-bloom",
            "gardener",
            "fanatic",
            "master",
            "waterer"
        ];
        types.forEach((type)=>{
            if (localStorage.getItem(`badge_${type.replace("-", " ")}`)) {
                unlocked.push(`/badges/${type}.png`);
            }
        });
        setBadges(unlocked);
        play();
    }, [
        play
    ]);
    const handleDownload = async ()=>{
        const canvas = await external_html2canvas_default()(ref.current);
        const link = document.createElement("a");
        link.download = "sharon-garden-certificate.png";
        link.href = canvas.toDataURL();
        link.click();
    };
    const handleInstagramShare = async ()=>{
        const canvas = await external_html2canvas_default()(ref.current);
        const link = document.createElement("a");
        link.download = "sharon-story.png";
        link.href = canvas.toDataURL();
        link.click();
        alert("\uD83D\uDCF2 Image downloaded! Now share it as a story on Instagram.");
    };
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6 flex flex-col items-center justify-center",
        children: [
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                ref: ref,
                className: "bg-white border-4 border-purple-300 shadow-xl rounded-2xl px-10 py-8 w-[700px] text-center",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("h1", {
                        className: "text-3xl font-bold text-purple-700 mb-2",
                        children: "\uD83C\uDF38 Sharon's Garden Certificate"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx("p", {
                        className: "text-gray-600 mb-6",
                        children: "In recognition of the emotions nurtured and flowers bloomed \uD83C\uDF3C"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx("div", {
                        className: "flex flex-wrap justify-center gap-4",
                        children: badges.map((src, i)=>/*#__PURE__*/ jsx_runtime.jsx("img", {
                                src: src,
                                alt: "badge",
                                className: "w-24 h-24 object-contain border rounded shadow"
                            }, i))
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx("p", {
                        className: "text-sm text-gray-500 mt-6",
                        children: "sharons-garden.vercel.app"
                    })
                ]
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "flex gap-4 mt-6",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                        onClick: handleDownload,
                        children: "\uD83D\uDCE5 Download Certificate"
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                        onClick: handleInstagramShare,
                        variant: "outline",
                        children: "\uD83D\uDCF8 Share to IG Story"
                    })
                ]
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fgarden%2Fcertificate&preferredRegion=&absolutePagePath=private-next-pages%2Fgarden%2Fcertificate.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fgarden_2Fcertificate_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Fcertificate_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(certificate_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(certificate_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(certificate_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(certificate_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(certificate_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(certificate_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(certificate_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(certificate_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(certificate_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(certificate_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(certificate_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/garden/certificate","pathname":"/garden/certificate","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: certificate_namespaceObject,
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
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845], () => (__webpack_exec__(6034)));
module.exports = __webpack_exports__;

})();