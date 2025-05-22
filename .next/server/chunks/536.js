"use strict";
exports.id = 536;
exports.ids = [536];
exports.modules = {

/***/ 28:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ SurpriseReward)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5893);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6689);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var canvas_confetti__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5245);
/* harmony import */ var canvas_confetti__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(canvas_confetti__WEBPACK_IMPORTED_MODULE_2__);
// components/SurpriseReward.js



const rewardPool = [
    {
        type: "quote",
        content: "“Every emotion you plant grows into a flower of strength.”"
    },
    {
        type: "sticker",
        content: "/rewards/blessing-sticker.png"
    },
    {
        type: "audio",
        content: "/rewards/sharon-message.mp3"
    },
    {
        type: "gift",
        content: "\uD83C\uDF81 You’ve unlocked a mystery reward! Check your email!"
    }
];
function SurpriseReward({ onClose }) {
    const [reward, setReward] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{
        canvas_confetti__WEBPACK_IMPORTED_MODULE_2___default()();
        const chosen = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        setReward(chosen);
    }, []);
    return /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
        className: "fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center",
        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
            className: "bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center relative",
            children: [
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("h2", {
                    className: "text-2xl font-bold text-purple-700 mb-4",
                    children: "\uD83C\uDF1F Surprise Reward!"
                }),
                reward?.type === "quote" && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("p", {
                    className: "text-md italic text-gray-600",
                    children: reward.content
                }),
                reward?.type === "sticker" && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("img", {
                    src: reward.content,
                    alt: "sticker",
                    className: "w-40 h-40 mx-auto"
                }),
                reward?.type === "audio" && /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("audio", {
                    controls: true,
                    className: "mx-auto",
                    children: [
                        /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("source", {
                            src: reward.content,
                            type: "audio/mp3"
                        }),
                        "Your browser does not support the audio element."
                    ]
                }),
                reward?.type === "gift" && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("p", {
                    className: "text-lg text-green-600 font-medium",
                    children: reward.content
                }),
                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("button", {
                    onClick: onClose,
                    className: "mt-6 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600",
                    children: "Close"
                })
            ]
        })
    });
}


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


/***/ })

};
;