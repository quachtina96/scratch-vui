/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/modules/scratch-storage/src/FetchWorkerTool.worker.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/modules/scratch-storage/src/FetchWorkerTool.worker.js":
/*!*******************************************************************!*\
  !*** ./src/modules/scratch-storage/src/FetchWorkerTool.worker.js ***!
  \*******************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("/* eslint-env worker */\n\nlet jobsActive = 0;\nconst complete = [];\n\nlet intervalId = null;\n\n/**\n * Register a step function.\n *\n * Step checks if there are completed jobs and if there are sends them to the\n * parent. Then it checks the jobs count. If there are no further jobs, clear\n * the step.\n */\nconst registerStep = function () {\n    intervalId = setInterval(() => {\n        if (complete.length) {\n            // Send our chunk of completed requests and instruct postMessage to\n            // transfer the buffers instead of copying them.\n            postMessage(\n                complete.slice(),\n                // Instruct postMessage that these buffers in the sent message\n                // should use their Transferable trait. After the postMessage\n                // call the \"buffers\" will still be in complete if you looked,\n                // but they will all be length 0 as the data they reference has\n                // been sent to the window. This lets us send a lot of data\n                // without the normal postMessage behaviour of making a copy of\n                // all of the data for the window.\n                complete.map(response => response.buffer).filter(Boolean)\n            );\n            complete.length = 0;\n        }\n        if (jobsActive === 0) {\n            clearInterval(intervalId);\n            intervalId = null;\n        }\n    }, 1);\n};\n\n/**\n * Receive a job from the parent and fetch the requested data.\n * @param {object} options.job A job id, url, and options descriptor to perform.\n */\nconst onMessage = ({data: job}) => {\n    if (jobsActive === 0 && !intervalId) {\n        registerStep();\n    }\n\n    jobsActive++;\n\n    fetch(job.url, job.options)\n        .then(response => response.arrayBuffer())\n        .then(buffer => complete.push({id: job.id, buffer}))\n        .catch(error => complete.push({id: job.id, error}))\n        .then(() => jobsActive--);\n};\n\nif (self.fetch) {\n    postMessage({support: {fetch: true}});\n    self.addEventListener('message', onMessage);\n} else {\n    postMessage({support: {fetch: false}});\n    self.addEventListener('message', ({data: job}) => {\n        postMessage([{id: job.id, error: new Error('fetch is unavailable')}]);\n    });\n}\n\n\n//# sourceURL=webpack:///./src/modules/scratch-storage/src/FetchWorkerTool.worker.js?");

/***/ })

/******/ });