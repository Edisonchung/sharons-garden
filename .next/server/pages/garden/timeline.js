"use strict";
(() => {
var exports = {};
exports.id = 525;
exports.ids = [525,660];
exports.modules = {

/***/ 8679:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  config: () => (/* binding */ config),
  "default": () => (/* binding */ next_route_loaderpage_2Fgarden_2Ftimeline_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Ftimeline_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_),
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

// NAMESPACE OBJECT: ./pages/garden/timeline.js
var timeline_namespaceObject = {};
__webpack_require__.r(timeline_namespaceObject);
__webpack_require__.d(timeline_namespaceObject, {
  "default": () => (TimelinePage)
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
;// CONCATENATED MODULE: ./pages/garden/timeline.js
// pages/garden/timeline.js




function TimelinePage() {
    const [blooms, setBlooms] = (0,external_react_.useState)([]);
    const [filter, setFilter] = (0,external_react_.useState)("All");
    const [editingId, setEditingId] = (0,external_react_.useState)(null);
    const [reflectionText, setReflectionText] = (0,external_react_.useState)("");
    const [photoData, setPhotoData] = (0,external_react_.useState)(null);
    (0,external_react_.useEffect)(()=>{
        const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
        const list = Object.values(cached).filter((f)=>f.bloomed && f.bloomTime).sort((a, b)=>new Date(b.bloomTime) - new Date(a.bloomTime));
        setBlooms(list);
    }, []);
    const handleShare = (id)=>{
        const url = `${window.location.origin}/flower/${id}`;
        navigator.clipboard.writeText(url);
        alert("\uD83D\uDCCB Link copied to clipboard!");
    };
    const startEditing = (id, currentText, currentPhoto)=>{
        setEditingId(id);
        setReflectionText(currentText || "");
        setPhotoData(currentPhoto || null);
    };
    const saveReflection = (id)=>{
        const cached = JSON.parse(localStorage.getItem("flowers") || "{}");
        if (cached[id]) {
            cached[id].reflection = reflectionText;
            if (photoData) {
                cached[id].photo = photoData;
            }
            localStorage.setItem("flowers", JSON.stringify(cached));
        }
        const updated = blooms.map((f)=>f.id === id ? {
                ...f,
                reflection: reflectionText,
                photo: photoData
            } : f);
        setBlooms(updated);
        setEditingId(null);
        setReflectionText("");
        setPhotoData(null);
    };
    const handlePhotoUpload = (e)=>{
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = ()=>{
            setPhotoData(reader.result);
        };
        if (file) {
            reader.readAsDataURL(file);
        }
    };
    const flowerTypes = Array.from(new Set(blooms.map((f)=>f.type)));
    const filtered = filter === "All" ? blooms : blooms.filter((f)=>f.type === filter);
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
        className: "min-h-screen bg-gradient-to-b from-white to-purple-50 p-6",
        children: [
            /*#__PURE__*/ jsx_runtime.jsx("h1", {
                className: "text-3xl font-bold text-center text-purple-800 mb-4",
                children: "\uD83D\uDDD3️ Bloom Timeline"
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "text-center mb-6",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("label", {
                        className: "mr-2 font-medium text-gray-700",
                        children: "Filter by type:"
                    }),
                    /*#__PURE__*/ (0,jsx_runtime.jsxs)("select", {
                        value: filter,
                        onChange: (e)=>setFilter(e.target.value),
                        className: "p-2 rounded border",
                        children: [
                            /*#__PURE__*/ jsx_runtime.jsx("option", {
                                value: "All",
                                children: "All"
                            }),
                            flowerTypes.map((type, i)=>/*#__PURE__*/ jsx_runtime.jsx("option", {
                                    value: type,
                                    children: type
                                }, i))
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "max-w-3xl mx-auto flex flex-col gap-6",
                children: [
                    filtered.map((bloom, index)=>/*#__PURE__*/ jsx_runtime.jsx(card/* Card */.Z, {
                            className: "p-4 shadow-md border-l-4 border-purple-300",
                            children: /*#__PURE__*/ (0,jsx_runtime.jsxs)(card/* CardContent */.a, {
                                children: [
                                    /*#__PURE__*/ (0,jsx_runtime.jsxs)("h2", {
                                        className: "text-lg font-bold text-purple-700",
                                        children: [
                                            bloom.bloomedFlower,
                                            " ",
                                            bloom.type
                                        ]
                                    }),
                                    /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                        className: "text-sm italic text-gray-600",
                                        children: [
                                            "by ",
                                            bloom.name || "Anonymous"
                                        ]
                                    }),
                                    bloom.note && /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                        className: "text-sm text-gray-700 mt-1",
                                        children: [
                                            "“",
                                            bloom.note,
                                            "”"
                                        ]
                                    }),
                                    /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                        className: "text-xs text-gray-500 mt-2",
                                        children: [
                                            "\uD83C\uDF38 Bloomed on ",
                                            new Date(bloom.bloomTime).toLocaleDateString()
                                        ]
                                    }),
                                    bloom.photo && /*#__PURE__*/ jsx_runtime.jsx("img", {
                                        src: bloom.photo,
                                        alt: "Uploaded",
                                        className: "mt-3 rounded shadow-md max-h-48 object-contain"
                                    }),
                                    /*#__PURE__*/ jsx_runtime.jsx("div", {
                                        className: "mt-3",
                                        children: editingId === bloom.id ? /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                            children: [
                                                /*#__PURE__*/ jsx_runtime.jsx("textarea", {
                                                    value: reflectionText,
                                                    onChange: (e)=>setReflectionText(e.target.value),
                                                    className: "w-full p-2 border rounded mb-2",
                                                    rows: 3,
                                                    placeholder: "Write your reflection..."
                                                }),
                                                /*#__PURE__*/ jsx_runtime.jsx("input", {
                                                    type: "file",
                                                    accept: "image/*",
                                                    onChange: handlePhotoUpload,
                                                    className: "block w-full text-sm mb-2"
                                                }),
                                                /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                                                    onClick: ()=>saveReflection(bloom.id),
                                                    className: "mr-2",
                                                    children: "\uD83D\uDCBE Save"
                                                }),
                                                /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                                                    variant: "outline",
                                                    onClick: ()=>setEditingId(null),
                                                    children: "Cancel"
                                                })
                                            ]
                                        }) : /*#__PURE__*/ (0,jsx_runtime.jsxs)(jsx_runtime.Fragment, {
                                            children: [
                                                bloom.reflection ? /*#__PURE__*/ (0,jsx_runtime.jsxs)("p", {
                                                    className: "text-sm mt-2 text-gray-600",
                                                    children: [
                                                        "\uD83D\uDCDD ",
                                                        bloom.reflection
                                                    ]
                                                }) : /*#__PURE__*/ jsx_runtime.jsx("p", {
                                                    className: "text-sm mt-2 text-gray-400 italic",
                                                    children: "No reflection yet"
                                                }),
                                                /*#__PURE__*/ (0,jsx_runtime.jsxs)(ui_button/* Button */.z, {
                                                    onClick: ()=>startEditing(bloom.id, bloom.reflection, bloom.photo),
                                                    className: "mt-2",
                                                    variant: "outline",
                                                    children: [
                                                        "✏️ ",
                                                        bloom.reflection ? "Edit" : "Add",
                                                        " Reflection & Photo"
                                                    ]
                                                })
                                            ]
                                        })
                                    }),
                                    /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                                        onClick: ()=>handleShare(bloom.id),
                                        className: "mt-4",
                                        variant: "outline",
                                        children: "\uD83D\uDD17 Share This Bloom"
                                    })
                                ]
                            })
                        }, index)),
                    filtered.length === 0 && /*#__PURE__*/ jsx_runtime.jsx("p", {
                        className: "text-center text-gray-500 italic",
                        children: "No blooms to show for this type \uD83C\uDF31"
                    })
                ]
            })
        ]
    });
}

;// CONCATENATED MODULE: ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?page=%2Fgarden%2Ftimeline&preferredRegion=&absolutePagePath=private-next-pages%2Fgarden%2Ftimeline.js&absoluteAppPath=private-next-pages%2F_app.js&absoluteDocumentPath=next%2Fdist%2Fpages%2F_document&middlewareConfigBase64=e30%3D!

        // Next.js Route Loader
        
        

        // Import the app and document modules.
        
        

        // Import the userland code.
        

        // Re-export the component (should be the default export).
        /* harmony default export */ const next_route_loaderpage_2Fgarden_2Ftimeline_preferredRegion_absolutePagePath_private_next_pages_2Fgarden_2Ftimeline_js_absoluteAppPath_private_next_pages_2F_app_js_absoluteDocumentPath_next_2Fdist_2Fpages_2F_document_middlewareConfigBase64_e30_3D_ = ((0,helpers/* hoist */.l)(timeline_namespaceObject, "default"));

        // Re-export methods.
        const getStaticProps = (0,helpers/* hoist */.l)(timeline_namespaceObject, "getStaticProps")
        const getStaticPaths = (0,helpers/* hoist */.l)(timeline_namespaceObject, "getStaticPaths")
        const getServerSideProps = (0,helpers/* hoist */.l)(timeline_namespaceObject, "getServerSideProps")
        const config = (0,helpers/* hoist */.l)(timeline_namespaceObject, "config")
        const reportWebVitals = (0,helpers/* hoist */.l)(timeline_namespaceObject, "reportWebVitals")
        

        // Re-export legacy methods.
        const unstable_getStaticProps = (0,helpers/* hoist */.l)(timeline_namespaceObject, "unstable_getStaticProps")
        const unstable_getStaticPaths = (0,helpers/* hoist */.l)(timeline_namespaceObject, "unstable_getStaticPaths")
        const unstable_getStaticParams = (0,helpers/* hoist */.l)(timeline_namespaceObject, "unstable_getStaticParams")
        const unstable_getServerProps = (0,helpers/* hoist */.l)(timeline_namespaceObject, "unstable_getServerProps")
        const unstable_getServerSideProps = (0,helpers/* hoist */.l)(timeline_namespaceObject, "unstable_getServerSideProps")

        // Create and export the route module that will be consumed.
        const options = {"definition":{"kind":"PAGES","page":"/garden/timeline","pathname":"/garden/timeline","bundlePath":"","filename":""}}
        const routeModule = new (module_default())({
          ...options,
          components: {
            App: _app["default"],
            Document: (_document_default()),
          },
          userland: timeline_namespaceObject,
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
var __webpack_exports__ = __webpack_require__.X(0, [940,869,845], () => (__webpack_exec__(8679)));
module.exports = __webpack_exports__;

})();