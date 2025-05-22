exports.id = 845;
exports.ids = [845];
exports.modules = {

/***/ 6052:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   z: () => (/* binding */ Button)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);

function Button({ children, onClick, className = "" }) {
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("button", {
        onClick: onClick,
        className: `bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 ${className}`,
        children: children
    });
}


/***/ }),

/***/ 1845:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ MyApp)
});

// EXTERNAL MODULE: ./node_modules/react/jsx-runtime.js
var jsx_runtime = __webpack_require__(5893);
// EXTERNAL MODULE: ./node_modules/next/link.js
var next_link = __webpack_require__(1664);
var link_default = /*#__PURE__*/__webpack_require__.n(next_link);
// EXTERNAL MODULE: external "react"
var external_react_ = __webpack_require__(6689);
// EXTERNAL MODULE: external "next/router"
var router_ = __webpack_require__(1853);
// EXTERNAL MODULE: ./components/ui/button.js
var ui_button = __webpack_require__(6052);
;// CONCATENATED MODULE: ./components/ui/Navbar.js
// components/ui/Navbar.js





function Navbar() {
    const [open, setOpen] = (0,external_react_.useState)(false);
    const sidebarRef = (0,external_react_.useRef)(null);
    const toggleButtonRef = (0,external_react_.useRef)(null);
    const router = (0,router_.useRouter)();
    const user = {
        name: "Sharon Lim",
        email: "sharon@example.com",
        avatar: "https://api.dicebear.com/6.x/thumbs/svg?seed=sharon"
    };
    (0,external_react_.useEffect)(()=>{
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target) && toggleButtonRef.current && !toggleButtonRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return ()=>{
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [
        open
    ]);
    const navItem = (href, label, icon)=>/*#__PURE__*/ jsx_runtime.jsx((link_default()), {
            href: href,
            children: /*#__PURE__*/ (0,jsx_runtime.jsxs)(ui_button/* Button */.z, {
                variant: "ghost",
                className: `justify-start w-full text-left ${router.pathname === href ? "bg-purple-100 font-semibold text-purple-800" : ""}`,
                children: [
                    icon,
                    " ",
                    label
                ]
            })
        });
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)(jsx_runtime.Fragment, {
        children: [
            open && /*#__PURE__*/ jsx_runtime.jsx("div", {
                className: "fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300"
            }),
            /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                className: "fixed top-0 left-0 z-50 h-full",
                children: [
                    /*#__PURE__*/ jsx_runtime.jsx("div", {
                        ref: sidebarRef,
                        className: `fixed top-0 left-0 h-full bg-white shadow-xl w-64 transform transition-transform duration-300 ease-in-out z-50 ${open ? "translate-x-0" : "-translate-x-full"}`,
                        children: /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                            className: "p-4 h-full flex flex-col justify-between",
                            children: [
                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                    children: [
                                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                            className: "flex items-center justify-between mb-6",
                                            children: [
                                                /*#__PURE__*/ jsx_runtime.jsx("span", {
                                                    className: "text-xl font-bold text-purple-700",
                                                    children: "\uD83C\uDF38 Sharon's Garden"
                                                }),
                                                /*#__PURE__*/ jsx_runtime.jsx("button", {
                                                    onClick: ()=>setOpen(false),
                                                    className: "bg-red-100 text-red-600 hover:bg-red-200 rounded-full px-3 py-1 text-sm",
                                                    children: "❌"
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                            className: "mb-6 flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ jsx_runtime.jsx("img", {
                                                    src: user.avatar,
                                                    alt: "avatar",
                                                    className: "w-10 h-10 rounded-full border border-purple-300"
                                                }),
                                                /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                                    className: "flex flex-col",
                                                    children: [
                                                        /*#__PURE__*/ jsx_runtime.jsx("span", {
                                                            className: "text-sm font-medium text-purple-700",
                                                            children: user.name
                                                        }),
                                                        /*#__PURE__*/ jsx_runtime.jsx("span", {
                                                            className: "text-xs text-gray-500",
                                                            children: user.email
                                                        })
                                                    ]
                                                })
                                            ]
                                        }),
                                        /*#__PURE__*/ (0,jsx_runtime.jsxs)("div", {
                                            className: "flex flex-col gap-2",
                                            children: [
                                                navItem("/", "Home", "\uD83C\uDFE1"),
                                                navItem("/garden/my", "My Garden", "\uD83C\uDF3F"),
                                                navItem("/garden/dedications", "Dedications", "\uD83D\uDCAC"),
                                                navItem("/garden/stats", "Stats", "\uD83D\uDCCA"),
                                                navItem("/garden/timeline", "Timeline", "\uD83D\uDDD3️"),
                                                navItem("/garden/profile", "Profile", "\uD83C\uDF3C"),
                                                navItem("/garden/certificate", "Certificate", "\uD83D\uDCDC")
                                            ]
                                        }),
                                        /*#__PURE__*/ jsx_runtime.jsx("div", {
                                            className: "mt-6",
                                            children: /*#__PURE__*/ jsx_runtime.jsx(ui_button/* Button */.z, {
                                                variant: "outline",
                                                className: "w-full justify-center",
                                                children: "Logout"
                                            })
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ jsx_runtime.jsx("div", {
                                    className: "text-xs text-gray-400 text-center mt-8",
                                    children: "\xa9 2025 Sharon's Garden"
                                })
                            ]
                        })
                    }),
                    /*#__PURE__*/ jsx_runtime.jsx("button", {
                        ref: toggleButtonRef,
                        onClick: ()=>setOpen((prev)=>!prev),
                        className: "fixed top-4 left-4 z-50 p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md",
                        children: "☰"
                    })
                ]
            })
        ]
    });
}

// EXTERNAL MODULE: ./styles/globals.css
var globals = __webpack_require__(6764);
;// CONCATENATED MODULE: ./pages/_app.js



function MyApp({ Component, pageProps }) {
    return /*#__PURE__*/ (0,jsx_runtime.jsxs)(jsx_runtime.Fragment, {
        children: [
            /*#__PURE__*/ jsx_runtime.jsx(Navbar, {}),
            /*#__PURE__*/ jsx_runtime.jsx(Component, {
                ...pageProps
            })
        ]
    });
}


/***/ }),

/***/ 6764:
/***/ (() => {



/***/ })

};
;