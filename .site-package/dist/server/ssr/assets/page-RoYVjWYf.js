import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
//#endregion
//#region node_modules/lucide-react/dist/esm/defaultAttributes.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round"
};
//#endregion
//#region node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/lucide-react/dist/esm/context.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = (0, import_react.createContext)({});
var useLucideContext = () => (0, import_react.useContext)(LucideContext);
//#endregion
//#region node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = (0, import_react.forwardRef)(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
	return (0, import_react.createElement)("svg", {
		ref,
		...defaultAttributes,
		width: size ?? contextSize ?? defaultAttributes.width,
		height: size ?? contextSize ?? defaultAttributes.height,
		stroke: color ?? contextColor,
		strokeWidth: calculatedStrokeWidth,
		className: mergeClasses("lucide", contextClass, className),
		...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
		...rest
	}, [...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
//#endregion
//#region node_modules/lucide-react/dist/esm/createLucideIcon.mjs
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var createLucideIcon = (iconName, iconNode) => {
	const Component = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_react.createElement)(Icon, {
		ref,
		iconNode,
		className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
		...props
	}));
	Component.displayName = toPascalCase(iconName);
	return Component;
};
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ArrowDownLeft = createLucideIcon("arrow-down-left", [["path", {
	d: "M17 7 7 17",
	key: "15tmo1"
}], ["path", {
	d: "M17 17H7V7",
	key: "1org7z"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ArrowUpRight = createLucideIcon("arrow-up-right", [["path", {
	d: "M7 7h10v10",
	key: "1tivn9"
}], ["path", {
	d: "M7 17 17 7",
	key: "1vkiza"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Bell = createLucideIcon("bell", [["path", {
	d: "M10.268 21a2 2 0 0 0 3.464 0",
	key: "vwvbt9"
}], ["path", {
	d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
	key: "11g9vi"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ChevronDown = createLucideIcon("chevron-down", [["path", {
	d: "m6 9 6 6 6-6",
	key: "qrunsl"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CircleDollarSign = createLucideIcon("circle-dollar-sign", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["path", {
		d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8",
		key: "1h4pet"
	}],
	["path", {
		d: "M12 18V6",
		key: "zqpxq5"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CreditCard = createLucideIcon("credit-card", [["rect", {
	width: "20",
	height: "14",
	x: "2",
	y: "5",
	rx: "2",
	key: "ynyp8z"
}], ["line", {
	x1: "2",
	x2: "22",
	y1: "10",
	y2: "10",
	key: "1b3vmo"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LayoutDashboard = createLucideIcon("layout-dashboard", [
	["rect", {
		width: "7",
		height: "9",
		x: "3",
		y: "3",
		rx: "1",
		key: "10lvy0"
	}],
	["rect", {
		width: "7",
		height: "5",
		x: "14",
		y: "3",
		rx: "1",
		key: "16une8"
	}],
	["rect", {
		width: "7",
		height: "9",
		x: "14",
		y: "12",
		rx: "1",
		key: "1hutg5"
	}],
	["rect", {
		width: "7",
		height: "5",
		x: "3",
		y: "16",
		rx: "1",
		key: "ldoo1y"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Landmark = createLucideIcon("landmark", [
	["path", {
		d: "M10 18v-7",
		key: "wt116b"
	}],
	["path", {
		d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
		key: "yxxwt6"
	}],
	["path", {
		d: "M14 18v-7",
		key: "vav6t3"
	}],
	["path", {
		d: "M18 18v-7",
		key: "aexdmj"
	}],
	["path", {
		d: "M3 22h18",
		key: "8prr45"
	}],
	["path", {
		d: "M6 18v-7",
		key: "1ivflk"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Menu = createLucideIcon("menu", [
	["path", {
		d: "M4 5h16",
		key: "1tepv9"
	}],
	["path", {
		d: "M4 12h16",
		key: "1lakjw"
	}],
	["path", {
		d: "M4 19h16",
		key: "1djgab"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Ellipsis = createLucideIcon("ellipsis", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "1",
		key: "41hilf"
	}],
	["circle", {
		cx: "19",
		cy: "12",
		r: "1",
		key: "1wjl8i"
	}],
	["circle", {
		cx: "5",
		cy: "12",
		r: "1",
		key: "1pcz8c"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var PiggyBank = createLucideIcon("piggy-bank", [
	["path", {
		d: "M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z",
		key: "1piglc"
	}],
	["path", {
		d: "M16 10h.01",
		key: "1m94wz"
	}],
	["path", {
		d: "M2 8v1a2 2 0 0 0 2 2h1",
		key: "1env43"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Plus = createLucideIcon("plus", [["path", {
	d: "M5 12h14",
	key: "1ays0h"
}], ["path", {
	d: "M12 5v14",
	key: "s699le"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Search = createLucideIcon("search", [["path", {
	d: "m21 21-4.34-4.34",
	key: "14j7rj"
}], ["circle", {
	cx: "11",
	cy: "11",
	r: "8",
	key: "4ej97u"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Settings = createLucideIcon("settings", [["path", {
	d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
	key: "1i5ecw"
}], ["circle", {
	cx: "12",
	cy: "12",
	r: "3",
	key: "1v7zrd"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Target = createLucideIcon("target", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["circle", {
		cx: "12",
		cy: "12",
		r: "6",
		key: "1vlfrh"
	}],
	["circle", {
		cx: "12",
		cy: "12",
		r: "2",
		key: "1c9p78"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var TrendingUp = createLucideIcon("trending-up", [["path", {
	d: "M16 7h6v6",
	key: "box55l"
}], ["path", {
	d: "m22 7-8.5 8.5-5-5L2 17",
	key: "1t1m79"
}]]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var WalletCards = createLucideIcon("wallet-cards", [
	["path", {
		d: "M3 11h3.75a2 2 0 0 1 1.6.8l.45.6a4 4 0 0 0 6.4 0l.45-.6a2 2 0 0 1 1.6-.8H21",
		key: "1vwh6y"
	}],
	["path", {
		d: "M3 7h18",
		key: "1uiuf2"
	}],
	["rect", {
		x: "3",
		y: "3",
		width: "18",
		height: "18",
		rx: "2",
		key: "h1oib"
	}]
]);
/**
* @license lucide-react v1.25.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var X = createLucideIcon("x", [["path", {
	d: "M18 6 6 18",
	key: "1bl5f8"
}], ["path", {
	d: "m6 6 12 12",
	key: "d8bk6v"
}]]);
//#endregion
//#region app/page.tsx
var import_jsx_runtime = require_jsx_runtime();
var seed = [
	{
		id: 1,
		title: "Salario mensual",
		category: "Ingresos",
		account: "BCP •• 2847",
		date: "Hoy, 09:30",
		amount: 5400,
		kind: "income"
	},
	{
		id: 2,
		title: "Supermercado Wong",
		category: "Alimentación",
		account: "Yape",
		date: "Ayer, 18:42",
		amount: 186.5,
		kind: "expense"
	},
	{
		id: 3,
		title: "Netflix",
		category: "Suscripciones",
		account: "Interbank •• 9041",
		date: "18 Jul, 10:15",
		amount: 44.9,
		kind: "expense"
	},
	{
		id: 4,
		title: "Freelance — diseño",
		category: "Ingresos extra",
		account: "BBVA •• 6210",
		date: "17 Jul, 16:20",
		amount: 850,
		kind: "income"
	},
	{
		id: 5,
		title: "Grifo Primax",
		category: "Transporte",
		account: "Yape",
		date: "16 Jul, 20:08",
		amount: 120,
		kind: "expense"
	}
];
var nav = [
	["Resumen", LayoutDashboard],
	["Movimientos", WalletCards],
	["Presupuestos", CircleDollarSign],
	["Metas de ahorro", Target],
	["Reportes", TrendingUp],
	["Cuentas", Landmark]
];
function Home() {
	const [active, setActive] = (0, import_react.useState)("Resumen");
	const [transactions, setTransactions] = (0, import_react.useState)(seed);
	const [showModal, setShowModal] = (0, import_react.useState)(false);
	const [mobile, setMobile] = (0, import_react.useState)(false);
	const [notice, setNotice] = (0, import_react.useState)("");
	const totals = (0, import_react.useMemo)(() => ({
		income: transactions.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0),
		expense: transactions.filter((t) => t.kind === "expense").reduce((a, b) => a + b.amount, 0)
	}), [transactions]);
	const balance = 4230.5 + totals.income - 6250 - totals.expense;
	function addTransaction(e) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget);
		const kind = fd.get("kind");
		setTransactions((prev) => [{
			id: Date.now(),
			title: String(fd.get("title")),
			category: String(fd.get("category")),
			account: String(fd.get("account")),
			date: "Ahora",
			amount: Number(fd.get("amount")),
			kind
		}, ...prev]);
		setShowModal(false);
		setNotice("Movimiento registrado correctamente");
		setTimeout(() => setNotice(""), 2600);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: mobile ? "sidebar open" : "sidebar",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "brand",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "brand-mark",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { size: 19 })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Finanza" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "close-mobile",
								onClick: () => setMobile(false),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { children: nav.map(([label, Icon]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: active === label ? "active" : "",
						onClick: () => {
							setActive(label);
							setMobile(false);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 19 }), label]
					}, label)) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sidebar-bottom",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setNotice("Configuración disponible próximamente"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { size: 19 }), "Configuración"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "profile",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "avatar",
									children: "CM"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Carlos Mendoza" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Plan personal" })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { size: 18 })
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "menu",
					onClick: () => setMobile(true),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "search",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { size: 18 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						"aria-label": "Buscar",
						placeholder: "Buscar movimientos..."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "header-actions",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "icon-button",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { size: 19 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "month",
							children: ["Julio 2026 ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 16 })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "primary",
							onClick: () => setShowModal(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 18 }), "Nuevo movimiento"]
						})
					]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "content",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "page-heading",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "LUNES, 20 DE JULIO"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: ["Buenos días, Carlos ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "👋" })] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Aquí tienes el resumen de tus finanzas este mes." })
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "mobile-add primary",
							onClick: () => setShowModal(true),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 18 }), "Registrar"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "metrics",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Balance total",
								value: balance,
								delta: "+8.4%",
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WalletCards, {}),
								tone: "blue"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Ingresos",
								value: totals.income,
								delta: "+12.5%",
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownLeft, {}),
								tone: "green"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Gastos",
								value: totals.expense,
								delta: "−3.2%",
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, {}),
								tone: "orange"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Metric, {
								label: "Ahorro del mes",
								value: 3200,
								delta: "59% de tu meta",
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PiggyBank, {}),
								tone: "purple",
								progress: 59
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "dashboard-grid",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "card chart-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "card-title",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Flujo de dinero" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Ingresos vs. gastos mensuales" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { children: ["Últimos 6 meses ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { size: 15 })] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "chart-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "y-axis",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S/ 8k" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S/ 6k" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S/ 4k" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S/ 2k" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "S/ 0" })
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "bars",
											children: [
												[55, 38],
												[61, 42],
												[48, 36],
												[70, 47],
												[62, 40],
												[82, 51]
											].map((x, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "bar-group",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "bar income",
														style: { height: `${x[0]}%` }
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "bar expense",
														style: { height: `${x[1]}%` }
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: [
														"Feb",
														"Mar",
														"Abr",
														"May",
														"Jun",
														"Jul"
													][i] })
												]
											}, i))
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "legend",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "dot green" }), "Ingresos"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: "dot orange" }), "Gastos"] })]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "card spending-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "card-title",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Gastos por categoría" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Distribución este mes" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "dots",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {})
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "donut-area",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "donut",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "S/ 1,014" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total gastos" })] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "category-list",
										children: [
											[
												"Alimentación",
												"S/ 354",
												"35%",
												"purple"
											],
											[
												"Transporte",
												"S/ 220",
												"22%",
												"blue"
											],
											[
												"Servicios",
												"S/ 176",
												"17%",
												"orange"
											],
											[
												"Otros",
												"S/ 264",
												"26%",
												"teal"
											]
										].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { className: `dot ${x[3]}` }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: x[0] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: x[1] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: x[2] })
										] }, x[0]))
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "card transactions-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "card-title",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Últimos movimientos" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Tus transacciones más recientes" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setActive("Movimientos"),
										children: ["Ver todos ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "tx-list",
									children: transactions.slice(0, 5).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "tx",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `tx-icon ${t.kind}`,
												children: t.kind === "income" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownLeft, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, {})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "tx-main",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t.title }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													t.category,
													" · ",
													t.account
												] })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "tx-date",
												children: t.date
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `tx-amount ${t.kind}`,
												children: [
													t.kind === "income" ? "+" : "−",
													" S/ ",
													t.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })
												]
											})
										]
									}, t.id))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "card goal-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "card-title",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Meta de ahorro" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Fondo de emergencia" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											className: "dots",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "goal-amount",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "S/ 3,200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "de S/ 5,400" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "progress",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: "59%" } })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "goal-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "59% completado" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Faltan S/ 2,200" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "goal-tip",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { size: 20 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "¡Vas por buen camino!" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ahorrando S/ 550 al mes, llegarás a tu meta en noviembre." })] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "outline",
										onClick: () => setNotice("Aporte de S/ 100 simulado"),
										children: "+ Agregar ahorro"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "accounts",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "section-heading",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Mis cuentas" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Conecta y controla todo desde un solo lugar." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setNotice("Conexión bancaria lista para configurar con APIs oficiales"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { size: 17 }), "Conectar cuenta"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "account-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Account, {
									logo: "Y",
									color: "#7427c5",
									name: "Yape",
									type: "Billetera digital",
									amount: "S/ 842.50"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Account, {
									logo: "B",
									color: "#0753a5",
									name: "Banco de Crédito BCP",
									type: "Cuenta de ahorros •• 2847",
									amount: "S/ 4,680.00"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Account, {
									logo: "I",
									color: "#009b84",
									name: "Interbank",
									type: "Tarjeta de crédito •• 9041",
									amount: "− S/ 720.40"
								})
							]
						})]
					})
				]
			})] }),
			showModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "modal-backdrop",
				onMouseDown: () => setShowModal(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "modal",
					onSubmit: addTransaction,
					onMouseDown: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "modal-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Nuevo movimiento" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Registra un ingreso o gasto." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowModal(false),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Tipo", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							name: "kind",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "expense",
								children: "Gasto"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "income",
								children: "Ingreso"
							})]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Descripción", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							name: "title",
							required: true,
							placeholder: "Ej. Almuerzo"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Monto (S/)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								name: "amount",
								required: true,
								type: "number",
								min: "0.01",
								step: "0.01",
								placeholder: "0.00"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Categoría", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								name: "category",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Alimentación" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Transporte" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Servicios" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Ingresos extra" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Otros" })
								]
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["Cuenta", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							name: "account",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Yape" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "BCP •• 2847" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Interbank •• 9041" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Efectivo" })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "modal-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowModal(false),
								children: "Cancelar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "primary",
								type: "submit",
								children: "Guardar movimiento"
							})]
						})
					]
				})
			}),
			notice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "toast",
				children: ["✓ ", notice]
			})
		]
	});
}
function Metric({ label, value, delta, icon, tone, progress }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "metric card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `metric-icon ${tone}`,
			children: icon
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["S/ ", value.toLocaleString("es-PE", { minimumFractionDigits: 2 })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
				className: tone,
				children: delta
			}),
			progress && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mini-progress",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { width: `${progress}%` } })
			})
		] })]
	});
}
function Account({ logo, color, name, type, amount }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "account-card card",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "account-logo",
				style: { background: color },
				children: logo
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: type })] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "account-balance",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: amount }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Saldo disponible" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, {}) })
		]
	});
}
//#endregion
export { Home as default };
