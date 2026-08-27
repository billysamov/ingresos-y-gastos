"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertCircle, ArrowDown, ArrowDownLeft, ArrowRight, ArrowUp, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Car, Check, ChevronDown, ChevronRight, Circle, CreditCard, History, Home as HomeIcon, Layers3, LayoutDashboard, Lock, Menu, MoreHorizontal, Package, Pencil, Percent, PiggyBank, Plus, ReceiptText, Scale, Search, Settings, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Unlock, Utensils, WalletCards, X, Zap } from "lucide-react";
import { deleteRelationalRecord, isSupabaseConfigured, loadRelationalFinanceState, saveRelationalFinanceState } from "../lib/supabase-state";

type ExpenseSource = "fixed"|"monthly"|"category";
type Tx = { id:number; dbId?:string; dbUpdatedAt?:string; title:string; category:string; account?:string; date:string; amount:number; quantity?:number; unit?:string; unitPrice?:number; kind:"income"|"expense"; period?:string; expenseSource?:ExpenseSource; sourceId?:number; groupName?:string; savingDestination?:"general"|number; planned?:boolean; requiresConfirmation?:boolean; completed?:boolean; warehouseItemId?:number };
type ExpenseEntry = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; category:string; amount:number; quantity?:number; unit?:string; unitPrice?:number; period?:string; account?:string; transactionId?:number; savingDestination?:"general"|number; requiresConfirmation?:boolean; completed?:boolean; warehouseItemId?:number };
type ExpenseGroup = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; budget:number; items:ExpenseEntry[] };
type ExpenseModal = { kind:"fixed"|"monthly"|"group"|"sub"; groupId?:number } | null;
type ExpenseEdit = { kind:"group"; groupId:number } | { kind:"sub"; groupId:number; itemId:number } | null;
type Profile = { fullName:string; currency:string; monthlySalary?:number; autoRegisterSalary?:boolean };
type Budget = { id:number; name:string; limit:number; color:string };
type MonthAccess = { year:number; month:number };
type SavingsGoal = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; target:number; amount:number };
type DeleteConfirmation = { message:string; onConfirm:()=>void };

type PriceRecord = {
  id: string;
  period: string;
  date: string;
  packageType: string;
  packageFactor: number;
  baseUnit: string;
  totalPrice: number;
  unitPrice: number;
  store?: string;
  notes?: string;
};

type WarehouseItem = {
  id: number;
  dbId?: string;
  name: string;
  category: string;
  baseUnit: "kg" | "g" | "L" | "ml" | "unidad" | "lata" | "pañal" | "rollo" | "paquete" | "litro" | "mano" | string;
  packageType: string;
  quantityUnit: string;
  packageFactor: number;
  estimatedPrice: number;
  store?: string;
  notes?: string;
  lastPurchasedPeriod?: string;
  priceHistory: PriceRecord[];
};

const seed: Tx[] = [];
const fixedSeed: ExpenseEntry[] = [];
const monthlySeed: ExpenseEntry[] = [];
const groupSeed: ExpenseGroup[] = [];
const demoTransactionIds = new Set([1,2,3,4,5]);
const demoFixedExpenseIds = new Set([101,102,103,104]);
const demoMonthlyExpenseIds = new Set([201,202,203]);
const demoGroupIds = new Set([301,302]);
const initialPeriod = "2026-08";
const defaultCategories = ["Hogar","Transporte","Alimentación","Servicios","Suscripciones","Frutas","Abarrotes","Verduras","Otros"];
const defaultIncomeCategories = ["Sueldo","Honorarios","Ventas","Freelance","Transferencia recibida","Reembolso","Otros ingresos"];

const defaultWarehouseItems: WarehouseItem[] = [
  {
    id: 1001,
    name: "Arroz",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "Bolsa 5 kg",
    quantityUnit: "5 kg",
    packageFactor: 5,
    estimatedPrice: 15.00,
    store: "Mercado",
    notes: "Arroz para cocina diaria (S/ 3.00 el kg).",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-1", period: "2026-08", date: "2026-08-02", packageType: "Bolsa 5 kg", packageFactor: 5, baseUnit: "kg", totalPrice: 15.00, unitPrice: 3.00, store: "Mercado" }
    ]
  },
  {
    id: 1002,
    name: "Huevos",
    category: "Alimentación",
    baseUnit: "unidad",
    packageType: "2 Jabas (60 u.)",
    quantityUnit: "60 huevos",
    packageFactor: 60,
    estimatedPrice: 29.00,
    store: "Mercado",
    notes: "2 jabas de huevos para el mes.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-2", period: "2026-08", date: "2026-08-02", packageType: "2 Jabas (60 u.)", packageFactor: 60, baseUnit: "unidad", totalPrice: 29.00, unitPrice: 0.48, store: "Mercado" }
    ]
  },
  {
    id: 1003,
    name: "Latas de Atún",
    category: "Alimentación",
    baseUnit: "lata",
    packageType: "Pack 5 latas",
    quantityUnit: "5 latas",
    packageFactor: 5,
    estimatedPrice: 25.00,
    store: "Mercado",
    notes: "Atún enlatado para despensa.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-3", period: "2026-08", date: "2026-08-02", packageType: "5 latas", packageFactor: 5, baseUnit: "lata", totalPrice: 25.00, unitPrice: 5.00, store: "Mercado" }
    ]
  },
  {
    id: 1004,
    name: "Leche Gloria light",
    category: "Alimentación",
    baseUnit: "litro",
    packageType: "3 Cajas x 1L",
    quantityUnit: "3 Litros",
    packageFactor: 3,
    estimatedPrice: 16.50,
    store: "Mercado",
    notes: "Leche light para desayunos.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-4", period: "2026-08", date: "2026-08-02", packageType: "3 Cajas 1L", packageFactor: 3, baseUnit: "litro", totalPrice: 16.50, unitPrice: 5.50, store: "Mercado" }
    ]
  },
  {
    id: 1005,
    name: "Pollo",
    category: "Alimentación",
    baseUnit: "unidad",
    packageType: "2 Pechugas",
    quantityUnit: "2 pechugas",
    packageFactor: 2,
    estimatedPrice: 15.50,
    store: "Mercado",
    notes: "Pechugas frescas de pollo.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-5", period: "2026-08", date: "2026-08-02", packageType: "2 Pechugas", packageFactor: 2, baseUnit: "unidad", totalPrice: 15.50, unitPrice: 7.75, store: "Mercado" }
    ]
  },
  {
    id: 1006,
    name: "Pañales Babysec",
    category: "Hogar",
    baseUnit: "pañal",
    packageType: "Paquete x 100",
    quantityUnit: "100 unidades",
    packageFactor: 100,
    estimatedPrice: 70.00,
    store: "Distribuidora",
    notes: "Paquete familiar de pañales para bebé.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-6", period: "2026-08", date: "2026-08-02", packageType: "Paquete x 100", packageFactor: 100, baseUnit: "pañal", totalPrice: 70.00, unitPrice: 0.70, store: "Distribuidora" }
    ]
  },
  {
    id: 1007,
    name: "Toallitas Huggies",
    category: "Hogar",
    baseUnit: "paquete",
    packageType: "Pack toallitas",
    quantityUnit: "1 pack",
    packageFactor: 1,
    estimatedPrice: 58.20,
    store: "Distribuidora",
    notes: "Toallitas húmedas para higiene del bebé.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-7", period: "2026-08", date: "2026-08-02", packageType: "Pack toallitas", packageFactor: 1, baseUnit: "paquete", totalPrice: 58.20, unitPrice: 58.20, store: "Distribuidora" }
    ]
  },
  {
    id: 1008,
    name: "Jabón ropa BB Bolívar",
    category: "Hogar",
    baseUnit: "unidad",
    packageType: "Pack x 6",
    quantityUnit: "6 unidades",
    packageFactor: 6,
    estimatedPrice: 18.00,
    store: "Mercado",
    notes: "Jabón Bolívar especial para ropa de bebé.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-8", period: "2026-08", date: "2026-08-02", packageType: "Pack x 6", packageFactor: 6, baseUnit: "unidad", totalPrice: 18.00, unitPrice: 3.00, store: "Mercado" }
    ]
  },
  {
    id: 1009,
    name: "Detergente",
    category: "Hogar",
    baseUnit: "kg",
    packageType: "Bolsa 4 kg",
    quantityUnit: "4 kg",
    packageFactor: 4,
    estimatedPrice: 20.00,
    store: "Mercado",
    notes: "Detergente para lavado de ropa.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-9", period: "2026-08", date: "2026-08-02", packageType: "Bolsa 4 kg", packageFactor: 4, baseUnit: "kg", totalPrice: 20.00, unitPrice: 5.00, store: "Mercado" }
    ]
  },
  {
    id: 1010,
    name: "Shampoo",
    category: "Hogar",
    baseUnit: "litro",
    packageType: "Botella 1L",
    quantityUnit: "1 Litro",
    packageFactor: 1,
    estimatedPrice: 36.00,
    store: "Mercado",
    notes: "Shampoo familiar de 1 litro.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-10", period: "2026-08", date: "2026-08-02", packageType: "Botella 1L", packageFactor: 1, baseUnit: "litro", totalPrice: 36.00, unitPrice: 36.00, store: "Mercado" }
    ]
  },
  {
    id: 1011,
    name: "Pitahaya",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "2 Kilos",
    quantityUnit: "2 kg",
    packageFactor: 2,
    estimatedPrice: 15.00,
    store: "Mercado",
    notes: "Fruta fresca digestiva.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-11", period: "2026-08", date: "2026-08-02", packageType: "2 kg", packageFactor: 2, baseUnit: "kg", totalPrice: 15.00, unitPrice: 7.50, store: "Mercado" }
    ]
  },
  {
    id: 1012,
    name: "Palta Hass",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "2 Kilos",
    quantityUnit: "2 kg",
    packageFactor: 2,
    estimatedPrice: 10.50,
    store: "Mercado",
    notes: "Palta fresca para ensaladas y desayunos.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-12", period: "2026-08", date: "2026-08-02", packageType: "2 kg", packageFactor: 2, baseUnit: "kg", totalPrice: 10.50, unitPrice: 5.25, store: "Mercado" }
    ]
  },
  {
    id: 1013,
    name: "Plátano",
    category: "Alimentación",
    baseUnit: "mano",
    packageType: "Mano / Racimo",
    quantityUnit: "1 racimo",
    packageFactor: 1,
    estimatedPrice: 11.70,
    store: "Mercado",
    notes: "Plátano para desayuno y lonchera.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-13", period: "2026-08", date: "2026-08-02", packageType: "Racimo", packageFactor: 1, baseUnit: "mano", totalPrice: 11.70, unitPrice: 11.70, store: "Mercado" }
    ]
  },
  {
    id: 1014,
    name: "Cebolla Roja",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "1 Kilo",
    quantityUnit: "1 kg",
    packageFactor: 1,
    estimatedPrice: 2.50,
    store: "Mercado",
    notes: "Cebolla roja para aderezos.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-14", period: "2026-08", date: "2026-08-02", packageType: "1 kg", packageFactor: 1, baseUnit: "kg", totalPrice: 2.50, unitPrice: 2.50, store: "Mercado" }
    ]
  },
  {
    id: 1015,
    name: "Papa blanca",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "Bolsa 1.2 kg",
    quantityUnit: "1.2 kg",
    packageFactor: 1.2,
    estimatedPrice: 3.00,
    store: "Mercado",
    notes: "Papa para guisos y almuerzos.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-15", period: "2026-08", date: "2026-08-02", packageType: "1.2 kg", packageFactor: 1.2, baseUnit: "kg", totalPrice: 3.00, unitPrice: 2.50, store: "Mercado" }
    ]
  },
  {
    id: 1016,
    name: "Mandarina",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "1 Kilo",
    quantityUnit: "1 kg",
    packageFactor: 1,
    estimatedPrice: 3.00,
    store: "Mercado",
    notes: "Mandarinas para lonchera.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-16", period: "2026-08", date: "2026-08-02", packageType: "1 kg", packageFactor: 1, baseUnit: "kg", totalPrice: 3.00, unitPrice: 3.00, store: "Mercado" }
    ]
  },
  {
    id: 1017,
    name: "Tomate",
    category: "Alimentación",
    baseUnit: "kg",
    packageType: "0.5 Kilo",
    quantityUnit: "0.5 kg",
    packageFactor: 0.5,
    estimatedPrice: 1.50,
    store: "Mercado",
    notes: "Tomate para ensaladas y salsas.",
    lastPurchasedPeriod: "2026-08",
    priceHistory: [
      { id: "pr-17", period: "2026-08", date: "2026-08-02", packageType: "0.5 kg", packageFactor: 0.5, baseUnit: "kg", totalPrice: 1.50, unitPrice: 3.00, store: "Mercado" }
    ]
  }
];

function cleanProductName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\s*\(\s*\d+(\.\d+)?\s*(kg|kilos?|g|l|litros?|und|u\.|unidades|cajas?|pechugas?|jabas?)\s*\)/gi, "")
    .replace(/\s*\(\s*(bolsa|botella|pack|paquete|mano|racimo)[^)]*\)/gi, "")
    .replace(/\s*\(\s*pack\s*[^)]*\)/gi, "")
    .trim();
}

function getWarehouseUnitCost(item: WarehouseItem): number {
  if (item.priceHistory && item.priceHistory.length > 0 && item.priceHistory[0].unitPrice > 0) {
    return item.priceHistory[0].unitPrice;
  }
  return item.packageFactor > 0 ? (item.estimatedPrice / item.packageFactor) : item.estimatedPrice;
}

const commonUnits = [
  { value: "kg", label: "kg (Kilogramos)" },
  { value: "g", label: "g (Gramos)" },
  { value: "L", label: "L (Litros)" },
  { value: "ml", label: "ml (Mililitros)" },
  { value: "unidad", label: "u. (Unidades)" },
  { value: "lata", label: "latas" },
  { value: "paquete", label: "paquetes" },
  { value: "bolsa", label: "bolsas" },
  { value: "jaba", label: "jabas" },
  { value: "caja", label: "cajas" },
  { value: "mano", label: "manos / racimos" },
  { value: "pañal", label: "pañales" },
  { value: "rollo", label: "rollos" },
];

function formatWarehouseOptionLabel(item: WarehouseItem): string {
  const cleanName = cleanProductName(item.name) || item.name;
  const unitCost = getWarehouseUnitCost(item);
  const pkg = item.packageType?.trim();
  const desc = pkg ? ` (${pkg})` : "";
  return `${cleanName}${desc} · S/ ${unitCost.toFixed(2)} / ${item.baseUnit}`;
}

function getWarehouseSubexpenseTitle(item: WarehouseItem): string {
  const cleanName = cleanProductName(item.name) || item.name;
  return cleanName;
}

function getWarehouseTrend(item: WarehouseItem) {
  const history = item.priceHistory || [];
  if (history.length < 2) {
    const currentUnit = item.packageFactor > 0 ? item.estimatedPrice / item.packageFactor : item.estimatedPrice;
    return { trend: "equal" as const, text: `S/ ${currentUnit.toFixed(2)} / ${item.baseUnit}`, diffText: "Precio base", latestUnit: currentUnit, prevUnit: currentUnit, diff: 0, percent: 0 };
  }
  const latest = history[0];
  const previous = history[1];
  const latestUnit = latest.unitPrice || (latest.packageFactor > 0 ? latest.totalPrice / latest.packageFactor : latest.totalPrice);
  const prevUnit = previous.unitPrice || (previous.packageFactor > 0 ? previous.totalPrice / previous.packageFactor : previous.totalPrice);
  const diff = latestUnit - prevUnit;
  const percent = prevUnit > 0 ? (diff / prevUnit) * 100 : 0;

  if (Math.abs(diff) < 0.01) {
    return { trend: "equal" as const, text: `S/ ${latestUnit.toFixed(2)} / ${item.baseUnit}`, diffText: "= Mismo precio", latestUnit, prevUnit, diff: 0, percent: 0 };
  }
  if (diff < 0) {
    return { trend: "down" as const, text: `S/ ${latestUnit.toFixed(2)} / ${item.baseUnit}`, diffText: `🔻 -S/ ${Math.abs(diff).toFixed(2)} / ${item.baseUnit} (${Math.abs(percent).toFixed(1)}% ahorro)`, latestUnit, prevUnit, percent: Math.abs(percent), diff: Math.abs(diff) };
  }
  return { trend: "up" as const, text: `S/ ${latestUnit.toFixed(2)} / ${item.baseUnit}`, diffText: `🔺 +S/ ${diff.toFixed(2)} / ${item.baseUnit} (+${percent.toFixed(1)}%)`, latestUnit, prevUnit, percent, diff };
}

function legacyTransactionId(item: Partial<Tx>, index:number) {
  const fingerprint=[item.title,item.category,item.amount,item.period,index].join("|");
  let hash=0;
  for(let position=0;position<fingerprint.length;position++) hash=(hash*31+fingerprint.charCodeAt(position))>>>0;
  return 1_000_000_000+hash;
}

const nav = [
  ["Resumen", LayoutDashboard], ["Movimientos", WalletCards], ["Gastos", ReceiptText], ["Almacén", Package], ["Metas de ahorro", Target], ["Reportes", TrendingUp],
] as const;
const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function categoryIcon(category:string,kind:"income"|"expense") {
  if(kind==="income") return <BriefcaseBusiness/>;
  const icons:Record<string,React.ReactNode>={Alimentación:<Utensils/>,Transporte:<Car/>,Servicios:<Zap/>,Compras:<ShoppingBag/>,Hogar:<HomeIcon/>,Suscripciones:<Smartphone/>};
  return icons[category] ?? <CreditCard/>;
}
function expenseSourceLabel(source?:ExpenseSource,groupName?:string) {
  if(source==="fixed") return "Gasto fijo";
  if(source==="monthly") return "Gasto mensual";
  if(source==="category") return "Detalle por categoría";
  return "";
}

function Metric({label,value,delta,icon,tone,progress}:{label:string,value:number,delta:string,icon:React.ReactNode,tone:string,progress?:number}) { return <article className="metric card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><small className={tone}>{delta}</small>{progress&&<div className="mini-progress"><i style={{width:`${progress}%`}}/></div>}</div></article> }

export default function Home() {
  function ModuleHeading({eyebrow,title,text,action}:{eyebrow:string,title:string,text:string,action?:React.ReactNode}) { return <div className="page-heading module-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div> }
  function MiniStat({label,value,tone="blue",plain=false}:{label:string,value:number,tone?:string,plain?:boolean}) { return <article className="card mini-stat"><span>{label}</span><strong>{plain?value:`S/ ${value.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</strong><i className={tone}/></article> }
  function TransactionList({items,onDelete,onToggle,onEdit}:{items:Tx[],onDelete:(id:number)=>void;onToggle:(item:Tx)=>void;onEdit:(item:Tx)=>void}) { return <div className="tx-list">{items.map(t=><div className="tx" key={`${t.expenseSource??"transaction"}-${t.id}`}><div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div><div className="tx-main"><div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><strong>{t.title}</strong>{t.quantity&&t.quantity>0&&<span style={{fontSize:"11px",padding:"1px 6px",borderRadius:"4px",background:"#f1f5f9",color:"#475569",fontWeight:600}}>{t.quantity} {t.unit||"u."}{t.unitPrice?` · S/ ${t.unitPrice.toFixed(2)}/${t.unit||"u."}`:""}</span>}{t.warehouseItemId&&<span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"4px",background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",fontWeight:600}} title="Vinculado al historial de precios del Almacén">📦 Almacén</span>}</div>{t.expenseSource&&<small className="transaction-origin">{expenseSourceLabel(t.expenseSource,t.groupName)}</small>}<span>{t.category}</span></div><div className="tx-date">{t.requiresConfirmation?(t.completed?"Realizado":"Pendiente"):t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div>{t.requiresConfirmation&&<button className={`completion-toggle ${t.completed?"done":""}`} aria-label={`${t.completed?"Marcar pendiente":"Marcar realizado"} ${t.title}`} title={t.completed?"Realizado: volver a pendiente":"Marcar como realizado"} onClick={()=>onToggle(t)}>{t.completed?<Check size={15}/>:<Circle size={15}/>}</button>}{t.id>=0&&<button className="edit-tx" aria-label={`Editar ${t.title}`} title="Editar movimiento" onClick={()=>onEdit(t)}><Pencil size={14}/></button>}<button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>onDelete(t.id)}><Trash2 size={14}/></button></div>)}{items.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>No hay coincidencias en {monthNames[selectedMonth]} {selectedYear}.</span></div>}</div> }

  const [active, setActive] = useState("Resumen");
  const [editingMovement, setEditingMovement] = useState<Tx|null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation|null>(null);
  const [transactions, setTransactions] = useState(seed);
  const [showModal, setShowModal] = useState(false);
  const [movementKind, setMovementKind] = useState<"income"|"expense">("expense");
  const [expenseType, setExpenseType] = useState<"fixed"|"monthly"|"group">("monthly");
  const [movementCategory, setMovementCategory] = useState(defaultCategories[0]);
  const [savingDestination, setSavingDestination] = useState<"general"|number>("general");
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [savings, setSavings] = useState(0);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [showSavingGoalModal, setShowSavingGoalModal] = useState(false);
  const [savingContributionTarget, setSavingContributionTarget] = useState<"general"|number|null>(null);
  const [expenseTab, setExpenseTab] = useState<"fixed"|"monthly"|"groups">("fixed");
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseEntry[]>(fixedSeed);
  const [periodFixedStatus, setPeriodFixedStatus] = useState<Record<string, Record<number, boolean>>>({});
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseEntry[]>(monthlySeed);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>(groupSeed);
  const [expenseModal, setExpenseModal] = useState<ExpenseModal>(null);
  const [expenseModalWarehouseId, setExpenseModalWarehouseId] = useState<number | null>(null);
  const [expenseModalTitle, setExpenseModalTitle] = useState("");
  const [expenseModalQuantity, setExpenseModalQuantity] = useState("1");
  const [expenseModalUnit, setExpenseModalUnit] = useState("unidad");
  const [expenseModalUnitPrice, setExpenseModalUnitPrice] = useState("");
  const [expenseModalAmount, setExpenseModalAmount] = useState("");
  const [expenseModalCategory, setExpenseModalCategory] = useState("");
  const [selectedMovementWarehouseId, setSelectedMovementWarehouseId] = useState<number | null>(null);
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementUnit, setMovementUnit] = useState("unidad");
  const [movementUnitPrice, setMovementUnitPrice] = useState("");
  const [subRows, setSubRows] = useState<number[]>([1]);
  const [subNames, setSubNames] = useState<Record<number,string>>({});
  const [subQuantities, setSubQuantities] = useState<Record<number,string>>({});
  const [subUnits, setSubUnits] = useState<Record<number,string>>({});
  const [subUnitPrices, setSubUnitPrices] = useState<Record<number,string>>({});
  const [subWarehouseIds, setSubWarehouseIds] = useState<Record<number,number>>({});
  const [subCategories, setSubCategories] = useState<Record<number,string>>({});
  const [subSavingDestinations, setSubSavingDestinations] = useState<Record<number,"general"|number>>({});
  const [subAmounts, setSubAmounts] = useState<Record<number,string>>({});
  const [expenseEdit, setExpenseEdit] = useState<ExpenseEdit>(null);
  const [detailedEdit, setDetailedEdit] = useState<{section:"fixed"|"monthly";id:number}|null>(null);
  const [openGroups, setOpenGroups] = useState<number[]>([301]);
  const [profile, setProfile] = useState<Profile>({fullName:"Mi perfil",currency:"PEN"});
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthAccess, setMonthAccess] = useState<MonthAccess>({year:2026,month:7});
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(defaultIncomeCategories);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [incomeCategoryDraft, setIncomeCategoryDraft] = useState("");
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>(defaultWarehouseItems);
  const [warehouseModal, setWarehouseModal] = useState<{ open: boolean; item?: WarehouseItem | null }>({ open: false, item: null });
  const [warehouseBuyModal, setWarehouseBuyModal] = useState<{
    open: boolean;
    item: WarehouseItem | null;
    packageType: string;
    packageFactor: number;
    quantity: number;
    totalPrice: number;
    destination: "movement" | number;
    store: string;
    notes: string;
  }>({
    open: false,
    item: null,
    packageType: "",
    packageFactor: 1,
    quantity: 1,
    totalPrice: 0,
    destination: "movement",
    store: "",
    notes: ""
  });
  const [priceHistoryModal, setPriceHistoryModal] = useState<{ open: boolean; item: WarehouseItem | null }>({ open: false, item: null });
  const [groupNatureFilter, setGroupNatureFilter] = useState<Record<number, string>>({});
  const [closedPeriods, setClosedPeriods] = useState<string[]>([]);
  const [closeMonthModal, setCloseMonthModal] = useState<{
    open: boolean;
    period: string;
    year: number;
    month: number;
    income: number;
    expense: number;
    balance: number;
    savingsRate: number;
    remanenteAction: "saving" | "carryover" | "none";
  } | null>(null);
  const [monthTransitionModal, setMonthTransitionModal] = useState<{
    open: boolean;
    fromPeriod: string;
    toPeriod: string;
    fromYear: number;
    fromMonth: number;
    toYear: number;
    toMonth: number;
    includeSalary: boolean;
    salaryAmount: number;
    selectedFixedIds: number[];
    selectedWarehouseItemIds: number[];
    remanenteAmount: number;
    remanenteAction: "saving" | "carryover" | "none";
  } | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [warehouseCategoryFilter, setWarehouseCategoryFilter] = useState("Todas");
  const [movementTitle, setMovementTitle] = useState("");
  const [movementAmount, setMovementAmount] = useState<string>("");
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading"|"saving"|"synced"|"setup">("loading");
  const skipInitialPersistence = useRef(true);
  const moduleFromHash=()=>{
    const value=decodeURIComponent(window.location.hash.replace(/^#/,""));
    return [...nav.map(([label])=>label),"Configuración"].find(label=>label.toLowerCase()===value.toLowerCase())??"Resumen";
  };
  function activateModule(module:string) {
    setActive(module);
    window.location.hash=encodeURIComponent(module);
  }
  useEffect(()=>{
    const updateFromHash=()=>setActive(moduleFromHash());
    updateFromHash();
    window.addEventListener("hashchange",updateFromHash);
    return ()=>window.removeEventListener("hashchange",updateFromHash);
  },[]);
  useEffect(()=>{
    async function hydrate() {
      let local:{transactions:Tx[];savings:number;savingsGoals:SavingsGoal[];fixedExpenses:ExpenseEntry[];monthlyExpenses:ExpenseEntry[];expenseGroups:ExpenseGroup[];profile:Profile;budgets:Budget[];monthAccess:MonthAccess;categories:string[];incomeCategories:string[]}={transactions:seed,savings:0,savingsGoals:[],fixedExpenses:fixedSeed,monthlyExpenses:monthlySeed,expenseGroups:groupSeed,profile:{fullName:"Mi perfil",currency:"PEN"},budgets:[],monthAccess:{year:2026,month:7},categories:defaultCategories,incomeCategories:defaultIncomeCategories};
      let source=local;
      if (typeof window !== "undefined") {
        const savedWarehouse = localStorage.getItem("finanza_warehouse_items");
        if (savedWarehouse) {
          try {
            const parsed = JSON.parse(savedWarehouse);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.map((item: WarehouseItem) => ({
                ...item,
                name: cleanProductName(item.name) || item.name
              }));
              setWarehouseItems(cleaned);
            } else {
              setWarehouseItems(defaultWarehouseItems);
            }
          } catch {
            setWarehouseItems(defaultWarehouseItems);
          }
        } else {
          setWarehouseItems(defaultWarehouseItems);
        }
        const savedClosed = localStorage.getItem("finanza_closed_periods");
        if (savedClosed) {
          try {
            const parsed = JSON.parse(savedClosed);
            if (Array.isArray(parsed)) setClosedPeriods(parsed);
          } catch {}
        }
        const savedMonthAccess = localStorage.getItem("finanza_month_access");
        if (savedMonthAccess) {
          try {
            const parsed = JSON.parse(savedMonthAccess);
            if (parsed && typeof parsed.year === "number" && typeof parsed.month === "number") {
              local.monthAccess = parsed;
            }
          } catch {}
        }
        const savedFixedStatus = localStorage.getItem("finanza_fixed_status");
        if (savedFixedStatus) {
          try {
            const parsed = JSON.parse(savedFixedStatus);
            if (parsed && typeof parsed === "object") setPeriodFixedStatus(parsed);
          } catch {}
        }
      }
      if(isSupabaseConfigured) {
        try {
          const remote=await loadRelationalFinanceState();
          if(remote) {
            const remoteTx = Array.isArray(remote.transactions) ? (remote.transactions as Tx[]).filter(item=>!demoTransactionIds.has(Number(item.id))).map((item,index)=>({...item,id:Number.isFinite(Number(item.id))?Number(item.id):legacyTransactionId(item,index),period:item.period??initialPeriod})) : [];
            const remoteFixed = Array.isArray(remote.fixedExpenses) ? (remote.fixedExpenses as ExpenseEntry[]).filter(item=>!demoFixedExpenseIds.has(Number(item.id))) : [];
            const remoteMonthly = Array.isArray(remote.monthlyExpenses) ? (remote.monthlyExpenses as ExpenseEntry[]).filter(item=>!demoMonthlyExpenseIds.has(Number(item.id))).map(item=>({...item,period:item.period??initialPeriod})) : [];
            const remoteGroups = Array.isArray(remote.expenseGroups) ? (remote.expenseGroups as ExpenseGroup[]).filter(item=>!demoGroupIds.has(Number(item.id))) : [];

            // Con Supabase conectado, la nube es la fuente única de datos.
            // Supabase es la fuente única de datos: cada módulo llega desde su tabla.
            source={
              transactions: remoteTx,
              savings: typeof remote.savings === "number" ? remote.savings : 0,
              savingsGoals: Array.isArray(remote.savingsGoals) ? (remote.savingsGoals as SavingsGoal[]) : [],
              fixedExpenses: remoteFixed,
              monthlyExpenses: remoteMonthly,
              expenseGroups: remoteGroups,
              profile: typeof remote.profile === "object" && remote.profile ? { ...{ fullName: "Mi perfil", currency: "PEN" }, ...(remote.profile as Profile) } : { fullName: "Mi perfil", currency: "PEN" },
              budgets: Array.isArray(remote.budgets) ? (remote.budgets as Budget[]) : [],
              monthAccess: typeof remote.monthAccess === "object" && remote.monthAccess ? (remote.monthAccess as MonthAccess) : local.monthAccess,
              categories: Array.from(new Set([...defaultCategories, ...(Array.isArray(remote.categories) ? (remote.categories as string[]) : [])])).filter(c => c !== "Ahorro"),
              incomeCategories: Array.from(new Set([...defaultIncomeCategories, ...(Array.isArray(remote.incomeCategories) ? (remote.incomeCategories as string[]) : [])])),
            };
          }
          setSyncStatus("synced");
        } catch { setSyncStatus("setup"); }
      } else setSyncStatus("setup");
      // Los elementos del módulo Gastos representan el plan del mes. Si venían de
      // versiones anteriores, se habilita su confirmación sin tocar movimientos ya realizados.
      const plannedFixed=source.fixedExpenses.map(item=>({...item,requiresConfirmation:item.requiresConfirmation??true}));
      const plannedMonthly=source.monthlyExpenses.map(item=>({...item,requiresConfirmation:item.requiresConfirmation??true}));
      const plannedGroups=source.expenseGroups.map(group=>({...group,items:group.items.map(item=>({...item,requiresConfirmation:item.requiresConfirmation??true}))}));
      setTransactions(source.transactions);setSavings(source.savings);setSavingsGoals(source.savingsGoals);setFixedExpenses(plannedFixed);setMonthlyExpenses(plannedMonthly);setExpenseGroups(plannedGroups);setProfile(source.profile);setBudgets(source.budgets);setMonthAccess(source.monthAccess);setSelectedYear(source.monthAccess.year);setSelectedMonth(source.monthAccess.month);setCategories(source.categories);setIncomeCategories(source.incomeCategories);
      setReady(true);
    }
    void hydrate();
  },[]);
  useEffect(()=>{
    if(!ready||!isSupabaseConfigured) return;
    // La primera carga solo hidrata la interfaz desde Supabase; no debe volver a
    // escribir nada ni mostrar "Guardando". A partir del siguiente cambio real,
    // el efecto sí persiste la fila modificada.
    if(skipInitialPersistence.current) { skipInitialPersistence.current=false; return; }
    const timer=window.setTimeout(()=>{
      setSyncStatus("saving");
      const data={transactions,savings,savingsGoals,fixedExpenses,monthlyExpenses,expenseGroups,profile,budgets,monthAccess,categories,incomeCategories};
      void saveRelationalFinanceState(data)
        .then(()=>setSyncStatus("synced"))
        .catch(error=>{
          console.error("Error de sincronización con Supabase",error);
          setSyncStatus("setup");
          setNotice(`⚠️ Error de guardado: ${error instanceof Error ? error.message : "No se pudo sincronizar con Supabase"}`);
        });
    },500);
    return ()=>window.clearTimeout(timer);
  },[transactions,savings,savingsGoals,fixedExpenses,monthlyExpenses,expenseGroups,profile,budgets,monthAccess,categories,incomeCategories,ready]);
  useEffect(()=>{
    if(typeof window !== "undefined" && ready) {
      localStorage.setItem("finanza_warehouse_items", JSON.stringify(warehouseItems));
    }
  },[warehouseItems,ready]);
  useEffect(()=>{
    if(typeof window !== "undefined" && ready) {
      localStorage.setItem("finanza_closed_periods", JSON.stringify(closedPeriods));
    }
  },[closedPeriods,ready]);
  useEffect(()=>{
    if(typeof window !== "undefined" && ready) {
      localStorage.setItem("finanza_fixed_status", JSON.stringify(periodFixedStatus));
    }
  },[periodFixedStatus,ready]);
  const activePeriod=`${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}`;
  const activeSubGroup=expenseModal?.kind==="sub"?expenseGroups.find(group=>group.id===expenseModal.groupId):undefined;
  const activeSubGroupPeriodItems=activeSubGroup?.items.filter(item=>(item.period??initialPeriod)===activePeriod)??[];
  const currentSubTotal=activeSubGroupPeriodItems.reduce((sum,item)=>sum+item.amount,0);
  const draftSubTotal=subRows.reduce((sum,row)=>sum+(Number(subAmounts[row])||0),0);
  const subAmountLimitExceeded=Boolean(activeSubGroup&&currentSubTotal+draftSubTotal>activeSubGroup.budget);
  const isTrackingPeriod = activePeriod >= initialPeriod;
  const periodTransactions = useMemo(() => transactions.filter(t => (t.period ?? initialPeriod) === activePeriod), [transactions, activePeriod]);
  const expenseEntriesForPeriod = useMemo(() => [
    ...(isTrackingPeriod ? fixedExpenses.map(item => ({
      item: {
        ...item,
        completed: periodFixedStatus[activePeriod]?.[item.id] ?? false
      },
      source: "fixed" as const
    })) : []),
    ...monthlyExpenses.filter(item => (item.period ?? initialPeriod) === activePeriod).map(item => ({ item, source: "monthly" as const })),
    ...expenseGroups.flatMap(group =>
      group.items
        .filter(item => (item.period ?? initialPeriod) === activePeriod)
        .map(item => ({ item: { ...item, category: item.category || group.name }, source: "category" as const }))
    ),
  ].filter(({ item }) => !periodTransactions.some(transaction => transaction.kind === "expense" && (transaction.id === item.transactionId || transaction.id === item.id))),
  [fixedExpenses, monthlyExpenses, expenseGroups, periodTransactions, activePeriod, isTrackingPeriod, periodFixedStatus, initialPeriod]);
  const extraExpenseForPeriod = expenseEntriesForPeriod.reduce((sum, { item }) => sum + item.amount, 0);
  // Los gastos creados desde "Gastos" no siempre nacen como una transacción.
  // Los representamos en el historial sin duplicar los que ya tienen movimiento.
  const detailedExpenseTransactions = useMemo<Tx[]>(() => expenseEntriesForPeriod.map(entry => ({
    id: -Math.abs(entry.item.id), title: entry.item.name, category: entry.item.category,
    date: "Gasto registrado", amount: entry.item.amount,
    kind: "expense", period: activePeriod, expenseSource: entry.source, sourceId: entry.item.id,
    planned: true, requiresConfirmation: entry.item.requiresConfirmation, completed: entry.item.completed,
    warehouseItemId: entry.item.warehouseItemId
  })), [expenseEntriesForPeriod, activePeriod]);
  const allPeriodTransactions = useMemo(() => [...periodTransactions, ...detailedExpenseTransactions], [periodTransactions, detailedExpenseTransactions]);
  const extraExpenseAccumulated = useMemo(() => [
    ...fixedExpenses.filter(item => Object.values(periodFixedStatus).some(m => m[item.id])),
    ...monthlyExpenses.filter(item => item.completed),
    ...expenseGroups.flatMap(group => group.items).filter(item => item.completed),
  ].filter(item => !transactions.some(transaction => transaction.kind === "expense" && (transaction.id === item.transactionId || transaction.id === item.id))).reduce((sum, item) => sum + item.amount, 0),
  [fixedExpenses, monthlyExpenses, expenseGroups, transactions, periodFixedStatus]);
  const totals = useMemo(() => ({
    income: periodTransactions.filter(t => t.kind === "income").reduce((a, b) => a + b.amount, 0),
    expense: periodTransactions.filter(t => t.kind === "expense").reduce((a, b) => a + b.amount, 0) + extraExpenseForPeriod,
  }), [periodTransactions, extraExpenseForPeriod]);
  const actualTotals = useMemo(() => ({
    income: periodTransactions.filter(t => t.kind === "income").reduce((a, b) => a + b.amount, 0),
    expense: periodTransactions.filter(t => t.kind === "expense" && (!t.planned || t.completed)).reduce((a, b) => a + b.amount, 0) + detailedExpenseTransactions.filter(t => t.completed).reduce((a, b) => a + b.amount, 0),
  }), [periodTransactions, detailedExpenseTransactions]);

  const sueldoTx = useMemo(() => transactions.find(t => t.kind === "income" && (t.category === "Sueldo" || t.title.toLowerCase().includes("sueldo"))), [transactions]);
  const monthlySalary = (profile.monthlySalary && profile.monthlySalary > 0) ? profile.monthlySalary : (sueldoTx?.amount || 0);
  const periodSalaryTx = useMemo(() => periodTransactions.find(t => t.kind === "income" && (t.category === "Sueldo" || t.title.toLowerCase().includes("sueldo"))), [periodTransactions]);
  const hasSalaryInPeriod = Boolean(periodSalaryTx);
  const accumulatedTotals = useMemo(() => ({
    income: transactions.filter(t => t.kind === "income").reduce((a, b) => a + b.amount, 0),
    expense: transactions.filter(t => t.kind === "expense" && (!t.planned || t.completed)).reduce((a, b) => a + b.amount, 0) + extraExpenseAccumulated,
  }), [transactions, extraExpenseAccumulated]);
  const balance = accumulatedTotals.income - accumulatedTotals.expense;
  const projectedBalance = totals.income - totals.expense;
  const chartMax = Math.max(totals.income, totals.expense, 1000);
  const visibleTransactions = allPeriodTransactions.filter(t => `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  function openNewMovementModal() {
    setMovementTitle("");
    setMovementAmount("");
    setMovementQuantity("1");
    setMovementUnit("unidad");
    setMovementUnitPrice("");
    setSelectedMovementWarehouseId(null);
    setShowModal(true);
  }

  function closeMovementModal() {
    setShowModal(false);
    setMovementTitle("");
    setMovementAmount("");
    setMovementQuantity("1");
    setMovementUnit("unidad");
    setMovementUnitPrice("");
    setSelectedMovementWarehouseId(null);
  }

  function handleMovementQuantityChange(newQtyStr: string) {
    setMovementQuantity(newQtyStr);
    const qty = parseFloat(newQtyStr);
    const unitPrice = parseFloat(movementUnitPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice > 0) {
      setMovementAmount((qty * unitPrice).toFixed(2));
    }
  }

  function handleMovementUnitPriceChange(newPriceStr: string) {
    setMovementUnitPrice(newPriceStr);
    const unitPrice = parseFloat(newPriceStr);
    const qty = parseFloat(movementQuantity) || 1;
    if (Number.isFinite(unitPrice) && unitPrice > 0 && Number.isFinite(qty) && qty > 0) {
      setMovementAmount((qty * unitPrice).toFixed(2));
    }
  }

  function handleMovementAmountChange(newAmountStr: string) {
    setMovementAmount(newAmountStr);
    const amount = parseFloat(newAmountStr);
    const qty = parseFloat(movementQuantity) || 1;
    if (Number.isFinite(amount) && amount > 0 && Number.isFinite(qty) && qty > 0) {
      setMovementUnitPrice((amount / qty).toFixed(2));
    }
  }

  function handleExpenseModalQuantityChange(newQtyStr: string) {
    setExpenseModalQuantity(newQtyStr);
    const qty = parseFloat(newQtyStr);
    const unitPrice = parseFloat(expenseModalUnitPrice);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice > 0) {
      setExpenseModalAmount((qty * unitPrice).toFixed(2));
    }
  }

  function handleExpenseModalUnitPriceChange(newPriceStr: string) {
    setExpenseModalUnitPrice(newPriceStr);
    const unitPrice = parseFloat(newPriceStr);
    const qty = parseFloat(expenseModalQuantity) || 1;
    if (Number.isFinite(unitPrice) && unitPrice > 0 && Number.isFinite(qty) && qty > 0) {
      setExpenseModalAmount((qty * unitPrice).toFixed(2));
    }
  }

  function handleExpenseModalAmountChange(newAmountStr: string) {
    setExpenseModalAmount(newAmountStr);
    const amount = parseFloat(newAmountStr);
    const qty = parseFloat(expenseModalQuantity) || 1;
    if (Number.isFinite(amount) && amount > 0 && Number.isFinite(qty) && qty > 0) {
      setExpenseModalUnitPrice((amount / qty).toFixed(2));
    }
  }

  function handleSubQuantityChange(rowId: number, newQtyStr: string) {
    setSubQuantities(prev => ({ ...prev, [rowId]: newQtyStr }));
    const qty = parseFloat(newQtyStr);
    const unitPrice = parseFloat(subUnitPrices[rowId]);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice > 0) {
      setSubAmounts(prev => ({ ...prev, [rowId]: (qty * unitPrice).toFixed(2) }));
    }
  }

  function handleSubUnitPriceChange(rowId: number, newPriceStr: string) {
    setSubUnitPrices(prev => ({ ...prev, [rowId]: newPriceStr }));
    const unitPrice = parseFloat(newPriceStr);
    const qty = parseFloat(subQuantities[rowId]) || 1;
    if (Number.isFinite(unitPrice) && unitPrice > 0 && Number.isFinite(qty) && qty > 0) {
      setSubAmounts(prev => ({ ...prev, [rowId]: (qty * unitPrice).toFixed(2) }));
    }
  }

  function handleSubAmountChange(rowId: number, newAmountStr: string) {
    setSubAmounts(prev => ({ ...prev, [rowId]: newAmountStr }));
    const amount = parseFloat(newAmountStr);
    const qty = parseFloat(subQuantities[rowId]) || 1;
    if (Number.isFinite(amount) && amount > 0 && Number.isFinite(qty) && qty > 0) {
      setSubUnitPrices(prev => ({ ...prev, [rowId]: (amount / qty).toFixed(2) }));
    }
  }

  function recordWarehousePurchaseHistory(warehouseId: number, totalPrice: number, period: string, options?: { store?: string; notes?: string; packageType?: string; packageFactor?: number; unitPrice?: number }) {
    const item = warehouseItems.find(w => w.id === warehouseId);
    if (!item) return null;

    const factor = options?.packageFactor && options.packageFactor > 0 ? options.packageFactor : (item.packageFactor > 0 ? item.packageFactor : 1);
    const unitPrice = options?.unitPrice && options.unitPrice > 0 ? Number(options.unitPrice.toFixed(2)) : Number((totalPrice / factor).toFixed(2));
    const dateStr = new Date().toISOString().slice(0, 10);
    const pkgType = options?.packageType || item.packageType;

    const lastRecord = item.priceHistory && item.priceHistory.length > 0 ? item.priceHistory[0] : null;
    const prevUnit = lastRecord ? (lastRecord.unitPrice || (lastRecord.packageFactor > 0 ? lastRecord.totalPrice / lastRecord.packageFactor : lastRecord.totalPrice)) : (item.packageFactor > 0 ? item.estimatedPrice / item.packageFactor : item.estimatedPrice);
    const diff = unitPrice - prevUnit;
    const percent = prevUnit > 0 ? Math.abs((diff / prevUnit) * 100).toFixed(1) : "0";

    let trendMsg = "";
    if (Math.abs(diff) < 0.01) {
      trendMsg = `Mismo precio (S/ ${unitPrice.toFixed(2)}/${item.baseUnit})`;
    } else if (diff < 0) {
      trendMsg = `🔻 Ahorro de S/ ${Math.abs(diff).toFixed(2)}/${item.baseUnit} (-${percent}%)`;
    } else {
      trendMsg = `🔺 Subió +S/ ${diff.toFixed(2)}/${item.baseUnit} (+${percent}%)`;
    }

    const newPriceRecord: PriceRecord = {
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      period,
      date: dateStr,
      packageType: pkgType,
      packageFactor: factor,
      baseUnit: item.baseUnit,
      totalPrice,
      unitPrice,
      store: options?.store || item.store,
      notes: options?.notes || undefined
    };

    setWarehouseItems(items => items.map(w => w.id === warehouseId ? {
      ...w,
      packageType: pkgType,
      packageFactor: factor,
      estimatedPrice: Number((unitPrice * (w.packageFactor || 1)).toFixed(2)),
      store: options?.store || w.store,
      lastPurchasedPeriod: period,
      priceHistory: [newPriceRecord, ...(w.priceHistory || [])]
    } : w));

    return { item, unitPrice, diff, trendMsg };
  }

  function openBuyWarehouseModal(item: WarehouseItem) {
    const matchingGroup = expenseGroups.find(g => g.name.toLowerCase() === item.category.toLowerCase() || g.name.toLowerCase().includes("mercado") || g.name.toLowerCase().includes("abarrotes"));
    setWarehouseBuyModal({
      open: true,
      item,
      packageType: item.packageType,
      packageFactor: item.packageFactor || 1,
      quantity: 1,
      totalPrice: item.estimatedPrice,
      destination: matchingGroup ? matchingGroup.id : "movement",
      store: item.store || "",
      notes: ""
    });
  }

  function confirmWarehouseBuy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!warehouseBuyModal.item) return;
    const item = warehouseBuyModal.item;
    const { packageType, packageFactor, quantity, totalPrice, destination, store, notes } = warehouseBuyModal;
    
    const effectiveFactor = (packageFactor > 0 ? packageFactor : 1) * (quantity > 0 ? quantity : 1);
    const calculatedUnitPrice = effectiveFactor > 0 ? Number((totalPrice / effectiveFactor).toFixed(2)) : totalPrice;
    const title = `${item.name} (${packageType}${quantity > 1 ? ` x ${quantity}` : ""})`;
    const id = Date.now();

    // 1. Update warehouse price history with shared function
    const res = recordWarehousePurchaseHistory(item.id, totalPrice, activePeriod, {
      store,
      notes,
      packageType: `${packageType}${quantity > 1 ? ` x ${quantity}` : ""}`,
      packageFactor: effectiveFactor,
      unitPrice: calculatedUnitPrice
    });

    const trendMsg = res?.trendMsg || "";

    // 2. Add as transaction or sub-expense with warehouseItemId link
    if (typeof destination === "number") {
      setExpenseGroups(groups => groups.map(g => g.id === destination ? {
        ...g,
        items: [{ id, name: title, category: item.category, amount: totalPrice, quantity: effectiveFactor, unit: item.baseUnit, unitPrice: calculatedUnitPrice, period: activePeriod, completed: true, requiresConfirmation: true, warehouseItemId: item.id }, ...g.items]
      } : g));
    } else {
      setTransactions(prev => [{
        id,
        title,
        category: item.category,
        date: "Ahora",
        amount: totalPrice,
        quantity: effectiveFactor,
        unit: item.baseUnit,
        unitPrice: calculatedUnitPrice,
        kind: "expense",
        period: activePeriod,
        expenseSource: "monthly",
        completed: true,
        requiresConfirmation: false,
        warehouseItemId: item.id
      }, ...prev]);
    }

    setWarehouseBuyModal({ open: false, item: null, packageType: "", packageFactor: 1, quantity: 1, totalPrice: 0, destination: "movement", store: "", notes: "" });
    setNotice(`✓ Compra registrada de "${item.name}" — ${trendMsg}`);
    setTimeout(() => setNotice(""), 3500);
  }

  function saveWarehouseItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "Abarrotes").trim();
    const baseUnit = (String(fd.get("baseUnit") || "kg") as WarehouseItem["baseUnit"]);
    const packageType = String(fd.get("packageType") || "Unidad").trim();
    const quantityUnit = String(fd.get("quantityUnit") || "").trim();
    const packageFactor = Number(fd.get("packageFactor") || 1);
    const estimatedPrice = Number(fd.get("estimatedPrice") || 0);
    const store = String(fd.get("store") || "").trim();
    const notes = String(fd.get("notes") || "").trim();

    if (!name) {
      setNotice("Ingresa el nombre del producto");
      return;
    }

    const calculatedUnit = packageFactor > 0 ? Number((estimatedPrice / packageFactor).toFixed(2)) : estimatedPrice;

    if (warehouseModal.item) {
      const editingId = warehouseModal.item.id;
      setWarehouseItems(items => items.map(item => item.id === editingId ? {
        ...item,
        name,
        category,
        baseUnit,
        packageType,
        quantityUnit: quantityUnit || `${packageFactor} ${baseUnit}`,
        packageFactor: packageFactor > 0 ? packageFactor : 1,
        estimatedPrice,
        store,
        notes
      } : item));
      setNotice(`Producto "${name}" actualizado en el almacén`);
    } else {
      const initialRecord: PriceRecord = {
        id: `pr-${Date.now()}`,
        period: activePeriod,
        date: new Date().toISOString().slice(0, 10),
        packageType,
        packageFactor: packageFactor > 0 ? packageFactor : 1,
        baseUnit,
        totalPrice: estimatedPrice,
        unitPrice: calculatedUnit,
        store: store || undefined,
        notes: notes || undefined
      };

      const newItem: WarehouseItem = {
        id: Date.now(),
        name,
        category,
        baseUnit,
        packageType,
        quantityUnit: quantityUnit || `${packageFactor} ${baseUnit}`,
        packageFactor: packageFactor > 0 ? packageFactor : 1,
        estimatedPrice,
        store,
        notes,
        lastPurchasedPeriod: activePeriod,
        priceHistory: [initialRecord]
      };
      setWarehouseItems(items => [newItem, ...items]);
      setNotice(`Producto "${name}" agregado al almacén (S/ ${calculatedUnit.toFixed(2)} / ${baseUnit})`);
    }
    setWarehouseModal({ open: false, item: null });
  }

  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = fd.get("kind") as "income"|"expense";
    const id=Date.now();
    const title=String(fd.get("title")||movementTitle).trim();
    const category=String(fd.get("category")||movementCategory);
    const amount=Number(fd.get("amount")||movementAmount);
    const qty = kind === "expense" ? (Number(fd.get("quantity") || movementQuantity) || 1) : undefined;
    const unit = kind === "expense" ? String(fd.get("unit") || movementUnit || "unidad") : undefined;
    const uPrice = kind === "expense" ? (Number(fd.get("unitPrice") || movementUnitPrice) || (amount && qty ? amount / qty : undefined)) : undefined;
    const source=kind==="expense"&&expenseType!=="group"?expenseType:undefined;
    const planned=kind==="expense"&&fd.get("planned")==="on";
    const requiresConfirmation=planned&&fd.get("requiresConfirmation")==="on";

    let trendMsg = "";
    if (kind === "expense" && selectedMovementWarehouseId && amount > 0) {
      const res = recordWarehousePurchaseHistory(selectedMovementWarehouseId, amount, activePeriod, {
        packageFactor: qty,
        packageType: `${qty} ${unit}`,
        unitPrice: uPrice
      });
      if (res) trendMsg = ` (${res.trendMsg})`;
    }

    setTransactions(prev => {
      const next: Tx[] = [{ id, title, category, date:"Ahora", amount, quantity: qty, unit, unitPrice: uPrice ? Number(uPrice.toFixed(2)) : undefined, kind, period:activePeriod, expenseSource:source, sourceId:source?id:undefined, savingDestination:kind==="expense"&&category==="Ahorro"?savingDestination:undefined, planned, requiresConfirmation, completed:planned?false:true, warehouseItemId:selectedMovementWarehouseId||undefined }, ...prev];
      return next;
    });
    if(kind==="expense"&&expenseType==="fixed") setFixedExpenses(items=>[{id,name:title,category,amount,quantity:qty,unit,unitPrice: uPrice ? Number(uPrice.toFixed(2)) : undefined,transactionId:id,requiresConfirmation,completed:planned?false:true,warehouseItemId:selectedMovementWarehouseId||undefined},...items]);
    if(kind==="expense"&&expenseType==="monthly") setMonthlyExpenses(items=>[{id,name:title,category,amount,quantity:qty,unit,unitPrice: uPrice ? Number(uPrice.toFixed(2)) : undefined,period:activePeriod,transactionId:id,requiresConfirmation,completed:planned?false:true,warehouseItemId:selectedMovementWarehouseId||undefined},...items]);
    if(kind==="expense"&&category==="Ahorro") {
      if(savingDestination==="general") setSavings(value=>value+amount);
      else setSavingsGoals(items=>items.map(goal=>goal.id===savingDestination?{...goal,amount:Math.min(goal.target,goal.amount+amount)}:goal));
    }
    closeMovementModal();
    setNotice(planned?"Pronóstico guardado como pendiente":`Movimiento registrado correctamente${trendMsg}`);
    setTimeout(()=>setNotice(""), 3500);
  }

  function saveMovementEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!editingMovement) return;
    const form=new FormData(e.currentTarget);
    const title=String(form.get("title")||"").trim();
    const category=String(form.get("category")||"Otros");
    const amount=Number(form.get("amount")||0);
    const quantity=Number(form.get("quantity")) || undefined;
    const unit=String(form.get("unit")||"") || undefined;
    const unitPrice=Number(form.get("unitPrice")) || (amount && quantity ? amount / quantity : undefined);

    if(!title||!Number.isFinite(amount)||amount<=0) { setNotice("Completa los datos correctamente"); return; }
    const id=editingMovement.id;
    setTransactions(items=>items.map(item=>item.id===id?{...item,title,category,amount,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item));
    if(editingMovement.expenseSource==="fixed"&&editingMovement.sourceId) setFixedExpenses(items=>items.map(item=>item.id===editingMovement.sourceId?{...item,name:title,category,amount,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item));
    if(editingMovement.expenseSource==="monthly"&&editingMovement.sourceId) setMonthlyExpenses(items=>items.map(item=>item.id===editingMovement.sourceId?{...item,name:title,category,amount,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item));
    setEditingMovement(null);
    setNotice("Movimiento actualizado correctamente");
  }

  function changeSavings(amount:number) {
    setSavings(value => {
      const next = Math.max(0, value + amount);
      return next;
    });
    setNotice(amount > 0 ? `Se agregaron S/ ${amount} a tu ahorro general` : `Se retiraron S/ ${Math.abs(amount)} del ahorro general`);
  }

  function createSavingsGoal(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd=new FormData(e.currentTarget); const name=String(fd.get("name")||"").trim(); const target=Number(fd.get("target")||0); const amount=Number(fd.get("amount")||0);
    if(!name||!Number.isFinite(target)||target<=0||!Number.isFinite(amount)||amount<0) { setNotice("Completa la meta correctamente"); return; }
    setSavingsGoals(items=>[...items,{id:Date.now(),name,target,amount:Math.min(amount,target)}]);setShowSavingGoalModal(false);setNotice("Meta de ahorro creada");
  }

  function contributeToSaving(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(savingContributionTarget===null) return; const fd=new FormData(e.currentTarget); const amount=Number(fd.get("amount")||0); const operation=String(fd.get("operation")||"add");
    if(!Number.isFinite(amount)||amount<=0) { setNotice("Ingresa un monto válido"); return; }
    const delta=operation==="withdraw"?-amount:amount;
    const goalObj = typeof savingContributionTarget === "number" ? savingsGoals.find(g => g.id === savingContributionTarget) : null;
    const targetName = savingContributionTarget === "general" ? "Reserva General" : (goalObj?.name || "Meta de Ahorro");
    
    if(savingContributionTarget==="general") changeSavings(delta);
    else setSavingsGoals(items=>items.map(goal=>goal.id===savingContributionTarget?{...goal,amount:Math.max(0,Math.min(goal.target,goal.amount+delta))}:goal));

    const id = Date.now();
    const tx: Tx = {
      id,
      title: operation === "withdraw" ? `Retiro de ${targetName}` : `Aporte a ${targetName}`,
      category: "Reserva de Ahorro",
      date: "Ahora",
      amount,
      kind: operation === "withdraw" ? "income" : "expense",
      period: activePeriod,
    };
    setTransactions(prev => [tx, ...prev]);

    setSavingContributionTarget(null);
    setNotice(operation === "withdraw" ? `Retiro de S/ ${amount} registrado` : `Aporte de S/ ${amount} registrado`);
  }

  function removeTransaction(id:number, confirmed=false) {
    if(!confirmed) { setDeleteConfirmation({message:"Eliminarás este movimiento. Esta acción se sincronizará con Supabase.",onConfirm:()=>removeTransaction(id,true)}); return; }
    setTransactions(previous => {
      const next = previous.filter(item => item.id !== id);
      return next;
    });
    setNotice("Movimiento eliminado");
  }

  function removeMovement(id:number, confirmed=false) {
    if(!confirmed) { setDeleteConfirmation({message:"Eliminarás este movimiento. Esta acción se sincronizará con Supabase.",onConfirm:()=>removeMovement(id,true)}); return; }
    const transaction=transactions.find(item=>item.id===id);
    const virtualExpense=detailedExpenseTransactions.find(item=>item.id===id);
    const inferredSource=transaction&&fixedExpenses.some(item=>item.id===transaction.id)?"fixed":transaction&&monthlyExpenses.some(item=>item.id===transaction.id)?"monthly":undefined;
    const source=transaction?.expenseSource??virtualExpense?.expenseSource??inferredSource;
    const expenseId=transaction?.sourceId??virtualExpense?.sourceId??(inferredSource?transaction?.id:undefined);
    if(source&&expenseId) {
      if(source==="fixed") { const expense=fixedExpenses.find(item=>item.id===expenseId); void deleteRelationalRecord("fixed_expenses",expense?.dbId);setFixedExpenses(items=>items.filter(item=>item.id!==expenseId)); }
      if(source==="monthly") { const expense=monthlyExpenses.find(item=>item.id===expenseId); void deleteRelationalRecord("monthly_expenses",expense?.dbId);setMonthlyExpenses(items=>items.filter(item=>item.id!==expenseId)); }
      if(source==="category") { const group=expenseGroups.find(item=>item.id===expenseId); void deleteRelationalRecord("expense_groups",group?.dbId);setExpenseGroups(groups=>groups.filter(group=>group.id!==expenseId)); }
    }
    if(transaction?.category==="Reserva de Ahorro") {
      const isGeneral = transaction.title.includes("Reserva General") || transaction.savingDestination === "general" || transaction.savingDestination === undefined;
      if (transaction.kind === "expense") {
        // Fue un aporte: al eliminar por error, se descuenta de la reserva para revertir el error
        if (isGeneral) setSavings(value => Math.max(0, value - transaction.amount));
        else if (typeof transaction.savingDestination === "number") {
          setSavingsGoals(goals => goals.map(goal => goal.id === transaction.savingDestination ? { ...goal, amount: Math.max(0, goal.amount - transaction.amount) } : goal));
        }
      } else if (transaction.kind === "income") {
        // Fue un retiro: al eliminar por error, se devuelve el dinero a la reserva para revertir el error
        if (isGeneral) setSavings(value => value + transaction.amount);
        else if (typeof transaction.savingDestination === "number") {
          setSavingsGoals(goals => goals.map(goal => goal.id === transaction.savingDestination ? { ...goal, amount: goal.amount + transaction.amount } : goal));
        }
      }
    }
    if(transaction?.dbId) void deleteRelationalRecord("transactions",transaction.dbId);
    if(id>=0) setTransactions(previous=>previous.filter(item=>item.id!==id));
    setNotice(source?`${expenseSourceLabel(source)} eliminado`:"Movimiento eliminado y saldo de ahorro revertido");
  }

  function toggleExpenseCompletion(item:Tx) {
    if (isPeriodClosed(activePeriod)) {
      setNotice("⚠️ Período cerrado: no se pueden modificar estados. Reabre el mes si necesitas hacer ajustes.");
      return;
    }
    const completed=!item.completed;
    if(item.expenseSource&&item.sourceId) {
      if(item.expenseSource==="fixed") {
        setPeriodFixedStatus(prev => ({
          ...prev,
          [activePeriod]: {
            ...(prev[activePeriod] || {}),
            [item.sourceId!]: completed
          }
        }));
      }
      if(item.expenseSource==="monthly") setMonthlyExpenses(items=>items.map(entry=>entry.id===item.sourceId?{...entry,completed}:entry));
      if(item.expenseSource==="category") {
        setExpenseGroups(groups=>groups.map(group=>({
          ...group,
          items: group.items.map(entry=>entry.id===item.sourceId?{...entry,completed}:entry)
        })));
      }
    }
    setTransactions(items=>items.map(entry=>((entry.id===item.id||entry.sourceId===item.sourceId) && (entry.period??initialPeriod)===activePeriod)?{...entry,completed}:entry));
    setNotice(completed?`✓ ${item.title} marcado como realizado`:`↩ ${item.title} volvió a pendiente`);
  }

  function toggleDetailedCompletion(section:"fixed"|"monthly",id:number) {
    if (isPeriodClosed(activePeriod)) {
      setNotice("⚠️ Período cerrado: no se pueden modificar estados. Reabre el mes si necesitas hacer ajustes.");
      return;
    }
    if (section === "fixed") {
      const isCompleted = periodFixedStatus[activePeriod]?.[id] ?? false;
      const nextCompleted = !isCompleted;
      setPeriodFixedStatus(prev => ({
        ...prev,
        [activePeriod]: {
          ...(prev[activePeriod] || {}),
          [id]: nextCompleted
        }
      }));
      setTransactions(items=>items.map(entry=>(entry.expenseSource==="fixed"&&entry.sourceId===id&&(entry.period??initialPeriod)===activePeriod)?{...entry,completed:nextCompleted}:entry));
      const item = fixedExpenses.find(f => f.id === id);
      setNotice(nextCompleted ? `✓ ${item?.name || "Gasto fijo"} marcado como pagado en ${monthNames[selectedMonth]}` : `↩ ${item?.name || "Gasto fijo"} volvió a pendiente en ${monthNames[selectedMonth]}`);
    } else {
      const current=monthlyExpenses.find(item=>item.id===id);
      if(!current) return;
      const completed=!current.completed;
      setMonthlyExpenses(items=>items.map(item=>item.id===id?{...item,completed}:item));
      setTransactions(items=>items.map(entry=>(entry.expenseSource==="monthly"&&entry.sourceId===id&&(entry.period??initialPeriod)===activePeriod)?{...entry,completed}:entry));
      setNotice(completed?`✓ ${current.name} marcado como pagado`:`↩ ${current.name} volvió a pendiente`);
    }
  }

  function toggleSubExpenseCompletion(groupId:number,itemId:number) {
    if (isPeriodClosed(activePeriod)) {
      setNotice("⚠️ Período cerrado: no se pueden modificar estados. Reabre el mes si necesitas hacer ajustes.");
      return;
    }
    const item=expenseGroups.find(group=>group.id===groupId)?.items.find(entry=>entry.id===itemId);
    if(!item) return;
    const completed=!item.completed;
    setExpenseGroups(groups=>groups.map(group=>group.id===groupId?{...group,items:group.items.map(entry=>entry.id===itemId?{...entry,completed}:entry)}:group));
    setNotice(completed?`✓ ${item.name} marcado como realizado`:`↩ ${item.name} volvió a pendiente`);
  }

  function addDetailedExpense(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPeriodClosed(activePeriod)) {
      setNotice("⚠️ Período cerrado: no se pueden agregar gastos a un mes archivado.");
      return;
    }
    if(!expenseModal) return;
    const fd=new FormData(e.currentTarget);
    const name=String(fd.get("name")||expenseModalTitle).trim();
    const amount=Number(fd.get("amount")||expenseModalAmount||0);
    const category=String(fd.get("category")||expenseModalCategory||"Otros");
    const id=Date.now();
    if(expenseModal.kind==="group"&&!categories.some(item=>item.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Primero crea esta categoría en Configuración"); return; }
    if(expenseModal.kind==="group"&&expenseGroups.some(group=>group.name.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Esta categoría ya tiene un detalle creado"); return; }
    
    const requiresConfirmation=expenseModal.kind!=="group";
    let trendMsg = "";

    const singleQty = Number(expenseModalQuantity) || 1;
    const singleUnit = expenseModalUnit || (expenseModalWarehouseId ? warehouseItems.find(w => w.id === expenseModalWarehouseId)?.baseUnit : "unidad") || "unidad";
    const singleUPrice = Number(expenseModalUnitPrice) || (amount > 0 && singleQty > 0 ? amount / singleQty : amount);

    if(expenseModal.kind==="fixed") {
      if (expenseModalWarehouseId && amount > 0) {
        const res = recordWarehousePurchaseHistory(expenseModalWarehouseId, amount, activePeriod, {
          packageFactor: singleQty,
          packageType: `${singleQty} ${singleUnit}`,
          unitPrice: singleUPrice
        });
        if (res) trendMsg = ` (${res.trendMsg})`;
      }
      setFixedExpenses(items=>[{id,name,category,amount,quantity:singleQty,unit:singleUnit,unitPrice:Number(singleUPrice.toFixed(2)),requiresConfirmation,completed:false,warehouseItemId:expenseModalWarehouseId||undefined},...items]);
    }
    if(expenseModal.kind==="monthly") {
      if (expenseModalWarehouseId && amount > 0) {
        const res = recordWarehousePurchaseHistory(expenseModalWarehouseId, amount, activePeriod, {
          packageFactor: singleQty,
          packageType: `${singleQty} ${singleUnit}`,
          unitPrice: singleUPrice
        });
        if (res) trendMsg = ` (${res.trendMsg})`;
      }
      setMonthlyExpenses(items=>[{id,name,category,amount,quantity:singleQty,unit:singleUnit,unitPrice:Number(singleUPrice.toFixed(2)),period:activePeriod,requiresConfirmation,completed:false,warehouseItemId:expenseModalWarehouseId||undefined},...items]);
    }
    if(expenseModal.kind==="group") {
      setExpenseGroups(groups=>[{id,name,budget:amount,items:[]},...groups]);
      setOpenGroups(groups=>[id,...groups]);
    }
    if(expenseModal.kind==="sub"&&expenseModal.groupId) {
      const names=fd.getAll("name").map(value=>String(value).trim());
      const amounts=fd.getAll("amount").map(value=>Number(value));
      const rowCategories=fd.getAll("category").map(value=>String(value));
      const quantities=fd.getAll("quantity").map(value=>Number(value));
      const units=fd.getAll("unit").map(value=>String(value));
      const unitPrices=fd.getAll("unitPrice").map(value=>Number(value));

      const entries=names.map((entry,index)=>{
        const rowId = subRows[index];
        const wId = subWarehouseIds[rowId];
        const qty = Number(subQuantities[rowId] ?? quantities[index]) || 1;
        const unit = subUnits[rowId] ?? units[index] ?? (wId ? warehouseItems.find(w => w.id === wId)?.baseUnit : "unidad") ?? "unidad";
        const amt = amounts[index] || 0;
        const uPrice = Number(subUnitPrices[rowId] ?? unitPrices[index]) || (amt > 0 && qty > 0 ? amt / qty : amt);

        if (wId && amt > 0) {
          const res = recordWarehousePurchaseHistory(wId, amt, activePeriod, {
            packageFactor: qty,
            packageType: `${qty} ${unit}`,
            unitPrice: uPrice
          });
          if (res) trendMsg = ` (${res.trendMsg})`;
        }
        return {
          id: id + index,
          name: entry,
          category: rowCategories[index] || "Otros",
          amount: amt,
          quantity: qty,
          unit,
          unitPrice: Number(uPrice.toFixed(2)),
          period: activePeriod,
          requiresConfirmation,
          warehouseItemId: wId || undefined,
          savingDestination: rowCategories[index]==="Ahorro" ? (subSavingDestinations[rowId]??"general") : undefined
        };
      }).filter(entry=>entry.name&&Number.isFinite(entry.amount)&&entry.amount>0);

      const group=expenseGroups.find(item=>item.id===expenseModal.groupId);
      const groupPeriodItems=group?.items.filter(item=>(item.period??initialPeriod)===activePeriod)??[];
      const used=groupPeriodItems.reduce((sum,item)=>sum+item.amount,0);
      if(group&&used+entries.reduce((sum,item)=>sum+item.amount,0)>group.budget) { setNotice(`Excedes el monto definido del mes por S/ ${(used+entries.reduce((sum,item)=>sum+item.amount,0)-group.budget).toLocaleString("es-PE",{minimumFractionDigits:2})}`); return; }
      setExpenseGroups(groups=>groups.map(group=>group.id===expenseModal.groupId?{...group,items:[...group.items,...entries]}:group));
      setOpenGroups(groups=>groups.includes(expenseModal.groupId!)?groups:[...groups,expenseModal.groupId!]);
      const generalContribution=entries.filter(entry=>entry.category==="Ahorro"&&entry.savingDestination==="general").reduce((sum,entry)=>sum+entry.amount,0);
      if(generalContribution) setSavings(value=>value+generalContribution);
      for(const entry of entries.filter(entry=>entry.category==="Ahorro"&&typeof entry.savingDestination==="number")) setSavingsGoals(goals=>goals.map(goal=>goal.id===entry.savingDestination?{...goal,amount:Math.min(goal.target,goal.amount+entry.amount)}:goal));
    }

    setExpenseModal(null);
    setExpenseModalWarehouseId(null);
    setExpenseModalTitle("");
    setExpenseModalQuantity("1");
    setExpenseModalUnit("unidad");
    setExpenseModalUnitPrice("");
    setExpenseModalAmount("");
    setExpenseModalCategory("");
    setSubRows([1]);
    setSubCategories({});
    setSubSavingDestinations({});
    setSubAmounts({});
    setSubNames({});
    setSubQuantities({});
    setSubUnits({});
    setSubUnitPrices({});
    setSubWarehouseIds({});
    setNotice(expenseModal.kind==="group"?"Detalle de categoría creado correctamente":`Gasto registrado correctamente${trendMsg}`);
    setTimeout(()=>setNotice(""), 3500);
  }

  function selectWarehouseForSubRow(rowId: number, warehouseId: number) {
    const item = warehouseItems.find(w => w.id === warehouseId);
    if (!item) return;
    const title = cleanProductName(item.name) || item.name;
    const unitCost = getWarehouseUnitCost(item);
    const currentQty = parseFloat(subQuantities[rowId]) || 1;
    const totalAmount = (currentQty * unitCost).toFixed(2);

    setSubWarehouseIds(prev => ({ ...prev, [rowId]: warehouseId }));
    setSubNames(prev => ({ ...prev, [rowId]: title }));
    setSubQuantities(prev => ({ ...prev, [rowId]: String(currentQty) }));
    setSubUnits(prev => ({ ...prev, [rowId]: item.baseUnit || "unidad" }));
    setSubUnitPrices(prev => ({ ...prev, [rowId]: unitCost.toFixed(2) }));
    setSubAmounts(prev => ({ ...prev, [rowId]: totalAmount }));

    if (categories.includes(item.category)) {
      setSubCategories(prev => ({ ...prev, [rowId]: item.category }));
    }
    setNotice(`✓ "${title}": S/ ${unitCost.toFixed(2)} por ${item.baseUnit} (${currentQty} ${item.baseUnit} = S/ ${totalAmount})`);
  }

  function addSubExpenseFromWarehouse(item: WarehouseItem) {
    const title = cleanProductName(item.name) || item.name;
    const unitCost = getWarehouseUnitCost(item);
    const defaultQty = 1;
    const totalAmount = (defaultQty * unitCost).toFixed(2);

    const firstRowId = subRows[0];
    const isFirstRowEmpty = subRows.length === 1 && !subNames[firstRowId] && !subAmounts[firstRowId];
    const targetRowId = isFirstRowEmpty ? firstRowId : Date.now() + Math.floor(Math.random() * 1000);

    if (!isFirstRowEmpty) {
      setSubRows(rows => [...rows, targetRowId]);
    }

    setSubWarehouseIds(prev => ({ ...prev, [targetRowId]: item.id }));
    setSubNames(prev => ({ ...prev, [targetRowId]: title }));
    setSubQuantities(prev => ({ ...prev, [targetRowId]: String(defaultQty) }));
    setSubUnits(prev => ({ ...prev, [targetRowId]: item.baseUnit || "unidad" }));
    setSubUnitPrices(prev => ({ ...prev, [targetRowId]: unitCost.toFixed(2) }));
    setSubAmounts(prev => ({ ...prev, [targetRowId]: totalAmount }));

    if (categories.includes(item.category)) {
      setSubCategories(prev => ({ ...prev, [targetRowId]: item.category }));
    }
    setNotice(`✓ "${title}": 1 ${item.baseUnit} a S/ ${unitCost.toFixed(2)} (Puedes cambiar la cantidad)`);
  }

  function duplicateFixedExpense(item:ExpenseEntry) {
    setFixedExpenses(items=>[{...item,id:Date.now(),name:`${item.name} (copia)`},...items]);
    setNotice("Pago fijo duplicado; puedes editarlo antes de usarlo");
  }

  function openSubExpenseForm(groupId:number) {
    const initialRow = Date.now();
    setSubRows([initialRow]);
    setSubNames({ [initialRow]: "" });
    setSubQuantities({ [initialRow]: "1" });
    setSubUnits({ [initialRow]: "unidad" });
    setSubUnitPrices({ [initialRow]: "" });
    setSubAmounts({ [initialRow]: "" });
    setSubCategories({});
    setSubWarehouseIds({});
    setSubSavingDestinations({});
    setExpenseModal({kind:"sub",groupId});
  }

  function removeDetailedExpense(section:"fixed"|"monthly",id:number, confirmed=false) {
    if(!confirmed) { setDeleteConfirmation({message:"Eliminarás este gasto planificado del período.",onConfirm:()=>removeDetailedExpense(section,id,true)}); return; }
    const entry=(section==="fixed"?fixedExpenses:monthlyExpenses).find(item=>item.id===id);
    void deleteRelationalRecord(section==="fixed"?"fixed_expenses":"monthly_expenses",entry?.dbId,id);
    if(section==="fixed") setFixedExpenses(items=>items.filter(item=>item.id!==id));
    else setMonthlyExpenses(items=>items.filter(item=>item.id!==id));
    setTransactions(items=>items.filter(item=>item.id!==id&&item.sourceId!==id));
    setNotice("Gasto eliminado");
  }

  function saveDetailedEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!detailedEdit) return; const fd=new FormData(e.currentTarget);const name=String(fd.get("name")||"").trim();const category=String(fd.get("category")||"Otros");const amount=Number(fd.get("amount"));
    const quantity = Number(fd.get("quantity")) || undefined;
    const unit = String(fd.get("unit") || "") || undefined;
    const unitPrice = Number(fd.get("unitPrice")) || (amount && quantity ? amount / quantity : undefined);
    if(!name||!Number.isFinite(amount)||amount<0) { setNotice("Completa los datos correctamente"); return; }
    const update=(items:ExpenseEntry[])=>items.map(item=>item.id===detailedEdit.id?{...item,name,category,amount,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item);
    if(detailedEdit.section==="fixed") setFixedExpenses(update); else setMonthlyExpenses(update);
    setTransactions(items=>items.map(item=>item.id===detailedEdit.id?{...item,title:name,category,amount,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item));
    setDetailedEdit(null);setNotice("Gasto actualizado correctamente");
  }

  function removeSubExpense(groupId:number,itemId:number, confirmed=false) {
    if(!confirmed) { setDeleteConfirmation({message:"Eliminarás este subgasto del detalle planificado.",onConfirm:()=>removeSubExpense(groupId,itemId,true)}); return; }
    const item=expenseGroups.find(group=>group.id===groupId)?.items.find(entry=>entry.id===itemId);
    void deleteRelationalRecord("expense_items",item?.dbId,itemId);
    if(item?.category==="Ahorro"&&item.savingDestination!==undefined) {
      if(item.savingDestination==="general") setSavings(value=>Math.max(0,value-item.amount));
      else setSavingsGoals(items=>items.map(goal=>goal.id===item.savingDestination?{...goal,amount:Math.max(0,goal.amount-item.amount)}:goal));
    }
    setExpenseGroups(groups=>groups.map(group=>group.id===groupId?{...group,items:group.items.filter(item=>item.id!==itemId)}:group));
    setNotice("Subgasto eliminado");
  }

  function editExpenseGroup(groupId:number) {
    setExpenseEdit({kind:"group",groupId});
  }

  function editSubExpense(groupId:number,itemId:number) {
    setExpenseEdit({kind:"sub",groupId,itemId});
  }

  function saveExpenseEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!expenseEdit) return;
    const fd=new FormData(e.currentTarget); const name=String(fd.get("name")||"").trim(); const amount=Number(fd.get("amount"));
    if(!name||!Number.isFinite(amount)||amount<0) { setNotice("Completa los datos correctamente"); return; }
    if(expenseEdit.kind==="group") setExpenseGroups(groups=>groups.map(group=>group.id===expenseEdit.groupId?{...group,name,budget:amount}:group));
    else {
      const category=String(fd.get("category")||"Otros");
      const quantity=Number(fd.get("quantity")) || undefined;
      const unit=String(fd.get("unit")||"") || undefined;
      const unitPrice=Number(fd.get("unitPrice")) || (amount && quantity ? amount / quantity : undefined);
      setExpenseGroups(groups=>groups.map(group=>group.id===expenseEdit.groupId?{
        ...group,
        items:group.items.map(item=>item.id===expenseEdit.itemId?{...item,name,amount,category,quantity,unit,unitPrice: unitPrice ? Number(unitPrice.toFixed(2)) : undefined}:item)
      }:group));
    }
    setExpenseEdit(null);setNotice("Cambios guardados correctamente");
  }

  function registerMonthlySalary() {
    const salary = profile.monthlySalary || 0;
    if (salary <= 0) {
      activateModule("Configuración");
      setNotice("Configura primero tu sueldo mensual base en tu perfil");
      return;
    }
    const id = Date.now();
    const salaryTitle = `Sueldo ${monthNames[selectedMonth]} ${selectedYear}`;
    const salaryTx: Tx = {
      id,
      title: salaryTitle,
      category: "Sueldo",
      date: "Ahora",
      amount: salary,
      kind: "income",
      period: activePeriod,
    };
    setTransactions(prev => {
      const next = [salaryTx, ...prev];
      return next;
    });
    setNotice(`Sueldo de ${monthNames[selectedMonth]} (${profile.currency === "PEN" ? "S/" : profile.currency} ${salary.toLocaleString("es-PE", {minimumFractionDigits: 2})}) registrado`);
  }

  function saveProfile(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const fullName=String(fd.get("fullName")||"Mi perfil").trim()||"Mi perfil";
    const currency=String(fd.get("currency")||"PEN");
    const monthlySalary=Number(fd.get("monthlySalary")||0);
    const autoRegisterSalary=fd.get("autoRegisterSalary")==="on";
    setProfile({fullName,currency,monthlySalary,autoRegisterSalary});
    setNotice("Perfil y sueldo mensual actualizados correctamente");
  }

  function addBudget(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    setBudgets(items=>[...items,{id:Date.now(),name:String(fd.get("name")),limit:Number(fd.get("limit")),color:String(fd.get("color"))}]);
    setShowBudgetModal(false); setNotice("Presupuesto creado correctamente");
  }

  function downloadBackup() {
    const backup={exportedAt:new Date().toISOString(),transactions,savings,savingsGoals,fixedExpenses,monthlyExpenses,expenseGroups,profile,budgets,monthAccess,categories,incomeCategories};
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));
    const link=document.createElement("a"); link.href=url; link.download=`finanza-respaldo-${activePeriod}.json`; link.click(); URL.revokeObjectURL(url);
    setNotice("Copia de respaldo descargada");
  }

  function isPeriodClosed(period: string) {
    return closedPeriods.includes(period);
  }

  function isPeriodEnabled(year:number,month:number) {
    // Permitir navegación libre y fluida a cualquier mes del calendario
    return year >= 2020 && year <= 2035 && month >= 0 && month < 12;
  }

  function reopenMonth(period: string) {
    setClosedPeriods(prev => prev.filter(p => p !== period));
    const [yStr, mStr] = period.split("-");
    const y = Number(yStr) || selectedYear;
    const m = (Number(mStr) || (selectedMonth + 1)) - 1;
    setSelectedYear(y);
    setSelectedMonth(m);
    setNotice(`🔓 Período ${monthNames[m]} ${y} reabierto para edición y ajustes.`);
  }

  function addToWarehouseFromExpense(name: string, category: string, amount: number) {
    const existing = warehouseItems.find(w => w.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing) {
      setNotice(`"${name}" ya existe en el Almacén.`);
      return;
    }
    const newItem: WarehouseItem = {
      id: Date.now(),
      name,
      category: category || "Alimentación",
      baseUnit: "unidad",
      packageType: "1 unidad",
      quantityUnit: "1 u.",
      packageFactor: 1,
      estimatedPrice: amount,
      store: "Mercado",
      notes: `Registrado desde compra real de ${monthNames[selectedMonth]}`,
      lastPurchasedPeriod: activePeriod,
      priceHistory: [
        {
          id: `pr-${Date.now()}`,
          period: activePeriod,
          date: `${activePeriod}-01`,
          packageType: "1 unidad",
          packageFactor: 1,
          baseUnit: "unidad",
          totalPrice: amount,
          unitPrice: amount,
          store: "Mercado"
        }
      ]
    };
    setWarehouseItems(prev => [newItem, ...prev]);
    if (typeof window !== "undefined") {
      localStorage.setItem("finanza_warehouse_items", JSON.stringify([newItem, ...warehouseItems]));
    }
    setNotice(`✓ "${name}" (S/ ${amount.toFixed(2)}) agregado a tu Almacén.`);
  }

  function importFromRealPurchases() {
    setWarehouseItems(defaultWarehouseItems);
    if (typeof window !== "undefined") {
      localStorage.setItem("finanza_warehouse_items", JSON.stringify(defaultWarehouseItems));
    }
    setNotice(`✓ ${defaultWarehouseItems.length} compras reales importadas a tu Almacén.`);
  }

  function resetToAugust() {
    setClosedPeriods([]);
    setSelectedYear(2026);
    setSelectedMonth(7);
    setMonthAccess({ year: 2026, month: 7 });
    setTransactions(prev => prev.filter(t => (t.period ?? initialPeriod) !== "2026-09"));
    setWarehouseItems(defaultWarehouseItems);
    if (typeof window !== "undefined") {
      localStorage.removeItem("finanza_closed_periods");
      localStorage.removeItem("finanza_month_access");
      localStorage.setItem("finanza_warehouse_items", JSON.stringify(defaultWarehouseItems));
    }
    setNotice("🔄 Período restablecido a Agosto 2026 (Mes en Curso).");
  }

  function openCloseMonthModal() {
    const income = totals.income;
    const expense = totals.expense;
    const balance = netMonthBalance; // totals.income - totals.expense
    const savingsRate = income > 0 && balance > 0 ? Math.round((balance / income) * 100) : 0;
    setCloseMonthModal({
      open: true,
      period: activePeriod,
      year: selectedYear,
      month: selectedMonth,
      income,
      expense,
      balance,
      savingsRate,
      remanenteAction: balance > 0 ? "saving" : "none"
    });
  }

  function proceedToMonthTransition() {
    if (!closeMonthModal) return;
    const { period, year, month, balance, remanenteAction } = closeMonthModal;
    
    // 1. Marcar el mes cerrado
    setClosedPeriods(prev => Array.from(new Set([...prev, period])));

    // 2. Si eligió transferir a ahorro, incrementar la reserva de ahorro patrimonial
    if (remanenteAction === "saving" && balance > 0) {
      setSavings(s => s + balance);
    }

    const next = month === 11 ? { year: year + 1, month: 0 } : { year: year, month: month + 1 };
    const nextPeriod = `${next.year}-${String(next.month + 1).padStart(2, "0")}`;

    setCloseMonthModal(null);
    setMonthTransitionModal({
      open: true,
      fromPeriod: period,
      toPeriod: nextPeriod,
      fromYear: year,
      fromMonth: month,
      toYear: next.year,
      toMonth: next.month,
      includeSalary: Boolean(profile.monthlySalary && profile.monthlySalary > 0),
      salaryAmount: profile.monthlySalary || 0,
      selectedFixedIds: fixedExpenses.map(f => f.id),
      selectedWarehouseItemIds: [],
      remanenteAmount: balance,
      remanenteAction
    });
  }

  function confirmMonthTransition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!monthTransitionModal) return;
    const { toPeriod, toYear, toMonth, includeSalary, salaryAmount, selectedWarehouseItemIds, remanenteAmount, remanenteAction, fromMonth, fromYear } = monthTransitionModal;

    // Desbloquear nuevo período
    const nextIsLater = toYear > monthAccess.year || (toYear === monthAccess.year && toMonth > monthAccess.month);
    const newMonthAccess = nextIsLater ? { year: toYear, month: toMonth } : monthAccess;
    if (nextIsLater) {
      setMonthAccess(newMonthAccess);
    }
    setSelectedYear(toYear);
    setSelectedMonth(toMonth);
    if (typeof window !== "undefined") {
      localStorage.setItem("finanza_month_access", JSON.stringify(newMonthAccess));
    }

    // Inicializar estado de pagos fijos en pendiente para el nuevo mes
    setPeriodFixedStatus(prev => ({
      ...prev,
      [toPeriod]: {}
    }));

    const newTxs: Tx[] = [];

    // Registrar sueldo si se marcó
    if (includeSalary && salaryAmount > 0) {
      newTxs.push({
        id: Date.now(),
        title: `Sueldo ${monthNames[toMonth]} ${toYear}`,
        category: "Sueldo",
        date: "01 " + monthNames[toMonth].slice(0, 3),
        amount: salaryAmount,
        kind: "income",
        period: toPeriod,
        completed: true,
        requiresConfirmation: false
      });
    }

    // Registrar remanente trasladado como saldo inicial si se seleccionó
    if (remanenteAction === "carryover" && remanenteAmount > 0) {
      newTxs.push({
        id: Date.now() + 1,
        title: `Saldo inicial remanente de ${monthNames[fromMonth]} ${fromYear}`,
        category: "Otros ingresos",
        date: "01 " + monthNames[toMonth].slice(0, 3),
        amount: remanenteAmount,
        kind: "income",
        period: toPeriod,
        completed: true,
        requiresConfirmation: false
      });
    }

    // Registrar insumos seleccionados de almacén como planificados
    if (selectedWarehouseItemIds.length > 0) {
      const selectedItems = warehouseItems.filter(item => selectedWarehouseItemIds.includes(item.id));
      selectedItems.forEach((wItem, idx) => {
        newTxs.push({
          id: Date.now() + 10 + idx,
          title: `${wItem.name} (${wItem.packageType} - ${wItem.quantityUnit})`,
          category: wItem.category,
          date: "Planificado",
          amount: wItem.estimatedPrice,
          kind: "expense",
          period: toPeriod,
          expenseSource: "monthly",
          planned: true,
          requiresConfirmation: true,
          completed: false,
          warehouseItemId: wItem.id
        });
      });
    }

    if (newTxs.length > 0) {
      setTransactions(prev => [...newTxs, ...prev]);
    }

    setMonthTransitionModal(null);
    setNotice(`✓ ${monthNames[fromMonth]} cerrado. ¡${monthNames[toMonth]} ${toYear} iniciado exitosamente!`);
  }

  function addCategory(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const name=categoryDraft.trim();
    if(!name) return;
    if(categories.some(category=>category.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Ese rubro ya existe"); return; }
    setCategories(items=>[...items,name]);setCategoryDraft("");setNotice("Rubro agregado correctamente");
  }

  function addIncomeCategory(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const name=incomeCategoryDraft.trim();
    if(!name) return;
    if(incomeCategories.some(category=>category.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Ese rubro ya existe"); return; }
    setIncomeCategories(items=>[...items,name]);setIncomeCategoryDraft("");setNotice("Rubro de ingreso agregado correctamente");
  }

  const categoryExpenseItems = useMemo(() => [
    ...periodTransactions.filter(t => t.kind === "expense"),
    ...expenseEntriesForPeriod.map(({ item }) => item),
  ], [periodTransactions, expenseEntriesForPeriod]);
  const expenseByCategory = categoryExpenseItems.reduce<Record<string,number>>((result,item)=>{
    result[item.category]=(result[item.category]||0)+item.amount;
    return result;
  },Object.fromEntries(categories.map(category=>[category,0])) as Record<string,number>);
  const dashboardCategories=Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]);
  const dashboardPalette=["#8957da","#1767e8","#ff9148","#35bdb4","#ed5d92","#d3a336","#6476d9","#8492a6"];
  const dashboardCategoryTotal=dashboardCategories.reduce((sum,[,value])=>sum+value,0);
  const dashboardDonut=dashboardCategoryTotal?`conic-gradient(${dashboardCategories.filter(([,value])=>value>0).map(([name,value],index)=>`${dashboardPalette[index%dashboardPalette.length]} ${dashboardCategories.filter(([,amount])=>amount>0).slice(0,index).reduce((sum,[,amount])=>sum+amount/dashboardCategoryTotal*100,0)}% ${dashboardCategories.filter(([,amount])=>amount>0).slice(0,index+1).reduce((sum,[,amount])=>sum+amount/dashboardCategoryTotal*100,0)}%`).join(",")})`:"conic-gradient(#edf0f5 0 100%)";
  function inspectCategory(category:string) { setSearch(category); activateModule("Movimientos"); }
  const fixedTotal = isTrackingPeriod ? fixedExpenses.reduce((sum, item) => sum + item.amount, 0) : 0;
  const monthlyForPeriod=monthlyExpenses.filter(item=>(item.period??initialPeriod)===activePeriod);
  const monthlyTotal=monthlyForPeriod.reduce((sum,item)=>sum+item.amount,0);
  const groupedTotal=expenseGroups.reduce((sum,group)=>sum+group.budget,0);

  const netMonthBalance = totals.income - totals.expense;
  const extraIncome = Math.max(0, totals.income - (hasSalaryInPeriod ? (periodSalaryTx?.amount ?? monthlySalary) : 0));

  // Métricas avanzadas para el Resumen Ejecutivo
  const totalSavingsGeneral = savings;
  const totalSavingsInGoals = savingsGoals.reduce((sum, goal) => sum + goal.amount, 0);
  const totalSavingsAll = totalSavingsGeneral + totalSavingsInGoals;

  const savingsRate = totals.income > 0 ? Math.max(0, Math.round(((totals.income - totals.expense) / totals.income) * 100)) : 0;
  const spendRate = totals.income > 0 ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : 0;
  const executedExpensePct = totals.expense > 0 ? Math.min(100, Math.round((actualTotals.expense / totals.expense) * 100)) : 0;

  const now = new Date();
  const isViewingCurrentCalendarMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const currentDay = isViewingCurrentCalendarMonth
    ? now.getDate()
    : (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth()) ? daysInMonth : 1);
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const dailyBudgetRemaining = netMonthBalance > 0 && isTrackingPeriod ? (netMonthBalance / remainingDays) : 0;
  const dailySpendAverage = currentDay > 0 && actualTotals.expense > 0 ? (actualTotals.expense / currentDay) : 0;

  // 6 Meses de Flujo Histórico
  const last6MonthsData = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      let targetMonth = selectedMonth - i;
      let targetYear = selectedYear;
      while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const pKey = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;
      const isSelected = pKey === activePeriod;
      const pIsTracking = pKey >= initialPeriod;

      // 1. Ingresos registrados en ese período
      const pIncome = transactions
        .filter(t => (t.period ?? initialPeriod) === pKey && t.kind === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      // 2. Gastos registrados en ese período
      const txExp = transactions
        .filter(t => (t.period ?? initialPeriod) === pKey && t.kind === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExp = monthlyExpenses
        .filter(item => (item.period ?? initialPeriod) === pKey && !transactions.some(t => t.kind === "expense" && (t.id === item.transactionId || t.id === item.id)))
        .reduce((sum, item) => sum + item.amount, 0);

      const subExp = expenseGroups
        .flatMap(group => group.items)
        .filter(item => (item.period ?? initialPeriod) === pKey && !transactions.some(t => t.kind === "expense" && (t.id === item.transactionId || t.id === item.id)))
        .reduce((sum, item) => sum + item.amount, 0);

      const fixedExp = pIsTracking
        ? fixedExpenses
            .filter(item => !transactions.some(t => t.kind === "expense" && (t.id === item.transactionId || t.id === item.id)))
            .reduce((sum, item) => sum + item.amount, 0)
        : 0;

      const pExpense = txExp + monthlyExp + subExp + fixedExp;

      list.push({
        year: targetYear,
        month: targetMonth,
        period: pKey,
        label: monthNames[targetMonth].slice(0, 3),
        fullLabel: `${monthNames[targetMonth]} ${targetYear}`,
        income: pIncome,
        expense: pExpense,
        balance: pIncome - pExpense,
        isSelected
      });
    }
    return list;
  }, [selectedYear, selectedMonth, activePeriod, transactions, monthlyExpenses, expenseGroups, fixedExpenses, initialPeriod]);

  const chart6MonthsMax = Math.max(
    ...last6MonthsData.map(m => Math.max(m.income, m.expense)),
    1000
  );

  // Resumen del Módulo Almacén
  const warehouseMonthPurchases = useMemo(() => {
    return periodTransactions.filter(t => t.warehouseItemId || t.title.includes("("));
  }, [periodTransactions]);

  const warehouseMonthSpend = useMemo(() => {
    return warehouseMonthPurchases.reduce((sum, t) => sum + t.amount, 0);
  }, [warehouseMonthPurchases]);

  const warehousePriceChanges = useMemo(() => {
    return warehouseItems.map(item => {
      const history = item.priceHistory || [];
      if (history.length < 2) return null;
      const latest = history[0];
      const previous = history[1];
      const latestUnit = latest.unitPrice ?? (latest.packageFactor > 0 ? latest.totalPrice / latest.packageFactor : latest.totalPrice);
      const prevUnit = previous.unitPrice ?? (previous.packageFactor > 0 ? previous.totalPrice / previous.packageFactor : previous.totalPrice);
      const diff = latestUnit - prevUnit;
      const pct = prevUnit > 0 ? (diff / prevUnit) * 100 : 0;
      return { item, diff, pct, latest, previous };
    }).filter(Boolean) as { item: WarehouseItem; diff: number; pct: number; latest: PriceRecord; previous: PriceRecord }[];
  }, [warehouseItems]);

  const warehouseSavingsCount = warehousePriceChanges.filter(c => c.diff < 0).length;
  const warehouseInflationCount = warehousePriceChanges.filter(c => c.diff > 0).length;

  function selectHistoricalMonth(year: number, month: number) {
    setSelectedYear(year);
    setSelectedMonth(month);
    setNotice(`📅 Viendo período ${monthNames[month]} ${year}`);
  }

  function moduleContent() {
    if(active==="Movimientos") return <>
      <ModuleHeading eyebrow="REGISTROS" title="Movimientos" text="Consulta, busca y administra todos tus ingresos y gastos." action={<button className="primary" onClick={openNewMovementModal}><Plus size={18}/>Nuevo movimiento</button>}/>
      <div className="module-callout movement-callout"><ReceiptText/><div><strong>Historial unificado de gastos</strong><span>Incluye gastos fijos, gastos mensuales y subgastos del período, además de tus movimientos registrados directamente.</span></div></div>
      <section className="module-stats"><MiniStat label="Ingresos registrados" value={totals.income} tone="green"/><MiniStat label="Gastos registrados" value={totals.expense} tone="orange"/><MiniStat label="Total de registros" value={allPeriodTransactions.length} plain/></section>
      <article className="card module-card"><div className="card-title"><div><h2>Historial de {monthNames[selectedMonth]} {selectedYear}</h2><p>{visibleTransactions.length} movimientos encontrados</p></div></div><TransactionList items={visibleTransactions} onDelete={removeMovement} onToggle={toggleExpenseCompletion} onEdit={setEditingMovement}/></article>
    </>;
    if(active==="Gastos") return <>
      <ModuleHeading eyebrow="CONTROL DE GASTOS" title="Gastos" text="Organiza tus pagos fijos, consumos mensuales y el detalle de cada categoría." action={<button className="primary" onClick={()=>setExpenseModal({kind:expenseTab==="fixed"?"fixed":expenseTab==="monthly"?"monthly":"group"})}><Plus size={18}/>{expenseTab==="groups"?"Agregar detalle":"Agregar gasto"}</button>}/>
      <section className="module-stats"><MiniStat label="Gastos fijos" value={fixedTotal} tone="orange"/><MiniStat label="Gastos mensuales" value={monthlyTotal} tone="blue"/><MiniStat label="Categorías definidas" value={groupedTotal} tone="green"/></section>
      <div className="expense-tabs" role="tablist" aria-label="Tipos de gasto">
        <button role="tab" aria-selected={expenseTab==="fixed"} className={expenseTab==="fixed"?"active":""} onClick={()=>setExpenseTab("fixed")}><ReceiptText size={17}/>Gastos fijos</button>
        <button role="tab" aria-selected={expenseTab==="monthly"} className={expenseTab==="monthly"?"active":""} onClick={()=>setExpenseTab("monthly")}><CalendarDays size={17}/>Gastos mensuales</button>
        <button role="tab" aria-selected={expenseTab==="groups"} className={expenseTab==="groups"?"active":""} onClick={()=>setExpenseTab("groups")}><Layers3 size={17}/>Detalle por categoría</button>
      </div>
      {expenseTab!=="groups"&&<article className="card module-card expense-list-card"><div className="card-title"><div><h2>{expenseTab==="fixed"?"Pagos que se repiten cada mes":`Gastos variables de ${monthNames[selectedMonth]}`}</h2><p>{expenseTab==="fixed"?"Alquiler, ahorro, pasajes y servicios recurrentes.":"Solo se muestran los consumos del período seleccionado."}</p></div></div><div className="expense-rows">{(expenseTab==="fixed"?fixedExpenses:monthlyForPeriod).map(item=>{
        const isCompleted = expenseTab==="fixed" ? (periodFixedStatus[activePeriod]?.[item.id] ?? false) : item.completed;
        return <div className="expense-row" key={item.id}><div className={`expense-kind-icon ${item.category==="Ahorro"?"saving":""}`}>{categoryIcon(item.category,"expense")}</div><div><div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}><strong>{item.name}</strong>{item.quantity&&item.quantity>0&&<span style={{fontSize:"11px",padding:"1px 6px",borderRadius:"4px",background:"#f1f5f9",color:"#475569",fontWeight:600}}>{item.quantity} {item.unit||"u."}{item.unitPrice?` · S/ ${item.unitPrice.toFixed(2)}/${item.unit||"u."}`:""}</span>}{item.warehouseItemId&&<span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"4px",background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",fontWeight:600}} title="Vinculado al historial de precios del Almacén">📦 Almacén</span>}</div><span>{item.category} · {item.requiresConfirmation?(isCompleted?"Realizado":"Pendiente de pago"):"Pronóstico"}</span></div><strong className="expense-value">S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>{item.requiresConfirmation&&<button className={`completion-toggle ${isCompleted?"done":""}`} onClick={()=>toggleDetailedCompletion(expenseTab,item.id)} title={isCompleted?"Realizado: volver a pendiente":"Marcar como realizado"}>{isCompleted?<Check size={15}/>:<Circle size={15}/>}</button>}{expenseTab==="fixed"&&<button className="add-subexpense" onClick={()=>duplicateFixedExpense(item)}>Duplicar</button>}<button className="add-subexpense" onClick={()=>setDetailedEdit({section:expenseTab,id:item.id})}>Editar</button><button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeDetailedExpense(expenseTab,item.id)}><Trash2 size={15}/></button></div>;
      })}{(expenseTab==="fixed"?fixedExpenses:monthlyForPeriod).length===0&&<div className="empty-state"><ReceiptText/><strong>Aún no tienes gastos en este período</strong><span>Usa “Agregar gasto” para registrarlo en {monthNames[selectedMonth]}.</span></div>}</div></article>}
      {expenseTab==="groups"&&<section className="expense-groups">{expenseGroups.map(group=>{
        const groupPeriodItems = group.items.filter(item => (item.period ?? initialPeriod) === activePeriod);
        const total = groupPeriodItems.reduce((sum,item)=>sum+item.amount,0);
        const open = openGroups.includes(group.id);
        const currentFilter = groupNatureFilter[group.id] || "Todos";
        const distinctCategories = Array.from(new Set(groupPeriodItems.map(i => i.category || "General")));
        const filteredItems = currentFilter === "Todos" ? groupPeriodItems : groupPeriodItems.filter(i => (i.category || "General") === currentFilter);

        return <article className="card expense-group" key={group.id}>
          <div className="expense-group-head">
            <button className="expense-group-toggle" onClick={()=>setOpenGroups(items=>items.includes(group.id)?items.filter(id=>id!==group.id):[...items,group.id])}>
              <ChevronRight className={open?"open":""} size={18}/>
              <div>
                <strong>{group.name}</strong>
                <span>{groupPeriodItems.length} subgastos en {monthNames[selectedMonth]} · Monto definido S/ {group.budget.toLocaleString("es-PE")}</span>
              </div>
            </button>
            <div className="expense-group-total">
              <span>Detalle registrado</span>
              <strong>S/ {total.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
            </div>
            <button className="add-subexpense" onClick={()=>editExpenseGroup(group.id)}>Editar</button>
            <button className="add-subexpense" onClick={()=>openSubExpenseForm(group.id)}><Plus size={16}/>Subgasto</button>
            <button className="expense-delete" aria-label={`Eliminar categoría ${group.name}`} onClick={()=>{setExpenseGroups(groups=>groups.filter(item=>item.id!==group.id));setNotice("Detalle de categoría eliminado")}}><Trash2 size={15}/></button>
          </div>
          <div className="progress group-progress"><i className={total>group.budget?"danger":""} style={{width:`${Math.min(100,total/group.budget*100)}%`}}/></div>
          {open&&<div className="subexpense-list">
            {distinctCategories.length > 1 && (
              <div className="nature-filter-bar">
                <button
                  type="button"
                  className={`nature-filter-btn ${currentFilter==="Todos"?"active":""}`}
                  onClick={()=>setGroupNatureFilter(prev=>({...prev, [group.id]: "Todos"}))}
                >
                  Todos ({groupPeriodItems.length})
                </button>
                {distinctCategories.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`nature-filter-btn ${currentFilter===c?"active":""}`}
                    onClick={()=>setGroupNatureFilter(prev=>({...prev, [group.id]: c}))}
                  >
                    {c} ({groupPeriodItems.filter(i=>(i.category||"General")===c).length})
                  </button>
                ))}
              </div>
            )}
            {filteredItems.map(item=><div className="subexpense-row" key={item.id}>
              <span className="subexpense-dot"/>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                  <strong>{item.name}</strong>
                  {item.quantity&&item.quantity>0&&<span style={{fontSize:"11px",padding:"1px 6px",borderRadius:"4px",background:"#f1f5f9",color:"#475569",fontWeight:600}}>{item.quantity} {item.unit||"u."}{item.unitPrice?` · S/ ${item.unitPrice.toFixed(2)}/${item.unit||"u."}`:""}</span>}
                  {item.warehouseItemId&&<span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"4px",background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",fontWeight:600}} title="Vinculado al historial de precios del Almacén">📦 Almacén</span>}
                </div>
                <span>{item.category} · {item.requiresConfirmation?(item.completed?"Realizado":"Pendiente"):"Pronóstico"}</span>
              </div>
              <strong>S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
              {item.requiresConfirmation&&<button className={`completion-toggle ${item.completed?"done":""}`} onClick={()=>toggleSubExpenseCompletion(group.id,item.id)} title={item.completed?"Realizado: volver a pendiente":"Marcar como realizado"}>{item.completed?<Check size={15}/>:<Circle size={15}/>}</button>}
              {!item.warehouseItemId&&<button className="add-subexpense" title="Guardar este producto en tu Almacén para futuras compras" onClick={()=>addToWarehouseFromExpense(item.name, item.category || group.name, item.amount)}><Package size={13}/> Almacén</button>}
              <button className="add-subexpense" onClick={()=>editSubExpense(group.id,item.id)}>Editar</button>
              <button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeSubExpense(group.id,item.id)}><Trash2 size={14}/></button>
            </div>)}
            {filteredItems.length===0&&<div className="empty-subexpenses">No hay subgastos registrados para {monthNames[selectedMonth]}. Usa "+ Subgasto" para registrar tus compras de este mes.</div>}
          </div>}
        </article>;
      })}{expenseGroups.length===0&&<article className="card empty-state group-empty"><Layers3/><strong>Activa el detalle de tu primera categoría</strong><span>Las categorías se crean desde Configuración.</span></article>}</section>}
    </>;
    if(active==="Almacén") {
      const filteredWarehouseItems = warehouseItems.filter(item => {
        const matchesSearch = `${item.name} ${item.category} ${item.packageType} ${item.store || ""} ${item.notes || ""}`.toLowerCase().includes(warehouseSearch.toLowerCase());
        const matchesCategory = warehouseCategoryFilter === "Todas" || item.category === warehouseCategoryFilter;
        return matchesSearch && matchesCategory;
      });
      const warehouseCategories = Array.from(new Set(warehouseItems.map(item => item.category)));
      const totalEstimatedBudget = warehouseItems.reduce((sum, item) => sum + item.estimatedPrice, 0);

      return <>
        <ModuleHeading
          eyebrow="CATÁLOGO Y DESPENSA"
          title="Almacén de Compras Habituales"
          text="Catálogo de productos habituales, historial de precios y proyecciones de compra para tus meses."
          action={
            <button className="primary" type="button" onClick={()=>setWarehouseModal({open:true,item:null})}>
              <Plus size={18}/> Nuevo producto en almacén
            </button>
          }
        />

        <div className="module-callout movement-callout">
          <Package/>
          <div>
            <strong>📦 Historial y Control Inteligente de Precios</strong>
            <span>
              Aquí puedes saber si el precio de un producto <strong>subió 🔺 o bajó 🔻</strong> entre meses (ej. Agosto vs Setiembre), y calcular el <strong>costo real por kilo/unidad</strong> cuando compras en saco de 5kg, saco de 50kg o unidades sueltas.
            </span>
          </div>
        </div>

        <section className="module-stats">
          <MiniStat label="Artículos en almacén" value={warehouseItems.length} plain/>
          <MiniStat label="Categorías" value={warehouseCategories.length} plain/>
          <MiniStat label="Presupuesto referencial total" value={totalEstimatedBudget} tone="blue"/>
        </section>

        <div className="warehouse-toolbar">
          <div className="search warehouse-search">
            <Search size={18}/>
            <input
              placeholder="Buscar por producto, tienda, notas o presentación..."
              value={warehouseSearch}
              onChange={e=>setWarehouseSearch(e.target.value)}
            />
            {warehouseSearch&&<button onClick={()=>setWarehouseSearch("")}><X size={15}/></button>}
          </div>

          <div className="warehouse-filters">
            <button
              type="button"
              className={warehouseCategoryFilter==="Todas"?"active":""}
              onClick={()=>setWarehouseCategoryFilter("Todas")}
            >
              Todas ({warehouseItems.length})
            </button>
            {warehouseCategories.map(cat => (
              <button
                key={cat}
                type="button"
                className={warehouseCategoryFilter===cat?"active":""}
                onClick={()=>setWarehouseCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <section className="warehouse-grid">
          {filteredWarehouseItems.map(item => {
            const trendInfo = getWarehouseTrend(item);
            const unitPrice = item.packageFactor > 0 ? item.estimatedPrice / item.packageFactor : item.estimatedPrice;

            return (
              <article className="card warehouse-card" key={item.id}>
                <div className="warehouse-card-header">
                  <div className="warehouse-badges">
                    <span className="warehouse-badge category">{item.category}</span>
                    <span className="warehouse-badge package">{item.packageType}</span>
                  </div>
                  <div className="warehouse-price">
                    <span>Precio ref.</span>
                    <strong>S/ {item.estimatedPrice.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                  </div>
                </div>

                <h3 className="warehouse-title">{cleanProductName(item.name)}</h3>

                <div className="warehouse-specs">
                  <div className="spec-row">
                    <span className="spec-label">⚖️ Peso / Presentación:</span>
                    <strong className="spec-val">{item.quantityUnit}</strong>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">💰 Costo por {item.baseUnit}:</span>
                    <span className="unit-price-tag highlight">
                      S/ {unitPrice.toFixed(2)} / {item.baseUnit}
                    </span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-label">📈 Variación de precio:</span>
                    <span className={`price-trend-badge ${trendInfo.trend}`}>
                      {trendInfo.diffText}
                    </span>
                  </div>
                  {item.store && (
                    <div className="spec-row">
                      <span className="spec-label">🏪 Lugar habitual:</span>
                      <strong className="spec-val">{item.store}</strong>
                    </div>
                  )}
                  {item.lastPurchasedPeriod && (
                    <div className="spec-row">
                      <span className="spec-label">📅 Última compra:</span>
                      <span className="spec-val">{item.lastPurchasedPeriod}</span>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <div className="warehouse-notes">
                    <p>💡 {item.notes}</p>
                  </div>
                )}

                <div className="warehouse-card-actions">
                  <button
                    type="button"
                    className="primary warehouse-buy-btn"
                    onClick={()=>openBuyWarehouseModal(item)}
                  >
                    <Plus size={16}/> Registrar compra en {monthNames[selectedMonth]}
                  </button>
                  <div className="warehouse-mini-actions">
                    <button
                      type="button"
                      className="outline"
                      title="Ver historial y evolución de precios"
                      onClick={()=>setPriceHistoryModal({open:true,item})}
                    >
                      <History size={14}/> Historial ({item.priceHistory?.length || 0})
                    </button>
                    <div style={{display:"flex",gap:"6px"}}>
                      <button
                        type="button"
                        className="outline"
                        onClick={()=>setWarehouseModal({open:true,item})}
                      >
                        <Pencil size={14}/> Editar
                      </button>
                      <button
                        type="button"
                        className="expense-delete"
                        title={`Eliminar ${item.name} del almacén`}
                        aria-label={`Eliminar ${item.name}`}
                        onClick={()=>{
                          setWarehouseItems(items=>items.filter(i=>i.id!==item.id));
                          setNotice(`Producto "${item.name}" eliminado del almacén`);
                        }}
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {filteredWarehouseItems.length === 0 && (
          <article className="card module-card empty-state" style={{padding:"45px 20px"}}>
            <Package size={36}/>
            <strong>No encontramos productos en el almacén</strong>
            <span>{warehouseSearch ? "Prueba con otra búsqueda o limpia los filtros." : "Agrega tus productos de compras habituales para hacer seguimiento a sus precios."}</span>
            <button
              type="button"
              className="primary"
              style={{marginTop:"14px"}}
              onClick={()=>setWarehouseModal({open:true,item:null})}
            >
              <Plus size={16}/> Agregar nuevo producto
            </button>
          </article>
        )}
      </>;
    }
    if(active==="Metas de ahorro") return <>
      <ModuleHeading eyebrow="PLAN DE AHORRO" title="Ahorros y Reservas" text="Administra tu fondo general de tranquilidad (sin límite) y tus metas con objetivo definido." action={<button className="primary" onClick={()=>setShowSavingGoalModal(true)}><Plus size={18}/>Nueva meta con objetivo</button>}/>
      <section className="savings-layout">
        <article className="card savings-main">
          <div className="savings-hero">
            <div className="metric-icon purple"><PiggyBank/></div>
            <div>
              <span>Reserva General (Sin Límite)</span>
              <strong>S/ {savings.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
              <small>Fondo libre acumulativo para imprevistos o tranquilidad.</small>
            </div>
          </div>
          <div className="goal-tip">
            <Target size={20}/>
            <div>
              <strong>Ahorro acumulativo de libre disposición</strong>
              <span>Sin fecha límite ni tope. Aporta cuando tengas un excedente o retira ante cualquier imprevisto.</span>
            </div>
          </div>
          <div className="saving-actions">
            <button className="primary" onClick={()=>setSavingContributionTarget("general")}>Aportar a Reserva General</button>
            <button className="outline" onClick={()=>changeSavings(-50)} style={{marginLeft:"8px"}}>Retirar S/ 50</button>
          </div>
        </article>
        <article className="card saving-tip">
          <PiggyBank/>
          <h2>Metas con Motivo</h2>
          <strong>{savingsGoals.length}</strong>
          <p>Objetivos con límite definido (Ej: Laptop, Viaje, Emergencias o Salud).</p>
        </article>
      </section>
      <section className="savings-goal-grid">{savingsGoals.map(goal=>{const percent=Math.min(100,Math.round(goal.amount/goal.target*100));return <article className="card savings-goal" key={goal.id}><div className="card-title"><div><span>Meta con motivo u objetivo</span><h2>{goal.name}</h2></div><button className="expense-delete" aria-label={`Eliminar ${goal.name}`} onClick={()=>setSavingsGoals(items=>items.filter(item=>item.id!==goal.id))}><Trash2 size={14}/></button></div><div className="goal-amount"><strong>S/ {goal.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><span>de S/ {goal.target.toLocaleString("es-PE",{minimumFractionDigits:2})} (Límite)</span></div><div className="progress"><i style={{width:`${percent}%`}}/></div><div className="goal-row"><span>{percent}% completado</span><strong>Faltan S/ {Math.max(0,goal.target-goal.amount).toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div><button className="outline" onClick={()=>setSavingContributionTarget(goal.id)}>Aportar o retirar de la meta</button></article>})}{savingsGoals.length===0&&<article className="card empty-state group-empty"><Target/><strong>Aún no tienes metas con objetivo específico</strong><span>Crea una para definir su nombre y monto límite (Ej. Laptop, Viaje, Estudios).</span></article>}</section>

      <article className="card module-card" style={{marginTop:"24px"}}>
        <div className="card-title">
          <div>
            <h2>Historial de Movimientos de Ahorro ({monthNames[selectedMonth]} {selectedYear})</h2>
            <p>Si cometiste un error al registrar un aporte o retiro, elimínalo aquí para revertir el saldo automáticamente.</p>
          </div>
        </div>
        <div className="tx-list">
          {transactions.filter(t => t.category === "Reserva de Ahorro").map(t => (
            <div className="tx" key={t.id}>
              <div className={`tx-icon ${t.kind}`}><PiggyBank size={18}/></div>
              <div className="tx-main">
                <strong>{t.title}</strong>
                <span>{t.date}</span>
              </div>
              <div className={`tx-amount ${t.kind}`}>
                {t.kind === "income" ? "+" : "−"} S/ {t.amount.toLocaleString("es-PE", {minimumFractionDigits: 2})}
              </div>
              <button className="delete-tx" aria-label={`Eliminar movimiento de ahorro ${t.title}`} title="Eliminar registro por error" onClick={() => removeMovement(t.id)}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
          {transactions.filter(t => t.category === "Reserva de Ahorro").length === 0 && (
            <div className="empty-state">
              <PiggyBank size={22}/>
              <strong>No hay movimientos de ahorro registrados en este mes</strong>
              <span>Tus aportes y retiros de ahorro aparecerán listados aquí.</span>
            </div>
          )}
        </div>
      </article>
    </>;
    if(active==="Reportes") return <>
      <ModuleHeading eyebrow="ANÁLISIS" title="Reportes" text="Revisa el comportamiento de tus finanzas con datos actualizados." action={<button onClick={()=>setNotice("Reporte preparado con los datos actuales")}><TrendingUp size={18}/>Generar reporte</button>}/>
      <section className="module-stats"><MiniStat label="Ingresos" value={totals.income} tone="green"/><MiniStat label="Gastos" value={totals.expense} tone="orange"/><MiniStat label="Balance neto" value={totals.income-totals.expense} tone="blue"/></section>
      <section className="report-grid"><article className="card module-card"><div className="card-title"><div><h2>Gastos por rubro</h2><p>Distribución de los registros actuales</p></div></div><div className="report-list">{Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]).map(([name,value])=><div key={name}><span className="report-name">{categoryIcon(name,"expense")}{name}</span><div className="report-bar"><i style={{width:`${totals.expense?value/totals.expense*100:0}%`}}/></div><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div>)}</div></article><article className="card report-summary"><TrendingUp/><span>Tasa de ahorro</span><strong>{totals.income?Math.max(0,Math.round((totals.income-totals.expense)/totals.income*100)):0}%</strong><p>Porcentaje disponible después de descontar tus gastos.</p></article></section>
    </>;
    if(active==="Configuración") return <>
      <ModuleHeading eyebrow="PREFERENCIAS" title="Configuración de perfil" text="Actualiza tu perfil, tus rubros y el avance de cada período." action={<button onClick={downloadBackup}><TrendingUp size={17}/>Descargar respaldo</button>}/>
      <article className="card module-card profile-settings"><form onSubmit={saveProfile}><div className="card-title"><div><h2>Datos personales y sueldo base</h2><p>Define tu sueldo base para conectar automáticamente tus gastos del mes.</p></div></div><div className="form-row"><label>Nombre visible<input name="fullName" required value={profile.fullName} onChange={e=>setProfile(value=>({...value,fullName:e.target.value}))}/></label><label>Moneda principal<select name="currency" value={profile.currency} onChange={e=>setProfile(value=>({...value,currency:e.target.value}))}><option value="PEN">Soles peruanos (PEN)</option><option value="USD">Dólares (USD)</option><option value="EUR">Euros (EUR)</option></select></label></div><div className="form-row" style={{marginTop:"12px"}}><label>Sueldo mensual base (S/)<input name="monthlySalary" type="number" min="0" step="50" placeholder="Ej. 3500" value={profile.monthlySalary ?? ""} onChange={e=>setProfile(value=>({...value,monthlySalary:Number(e.target.value)}))}/></label><label style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"24px",cursor:"pointer"}}><input type="checkbox" name="autoRegisterSalary" checked={profile.autoRegisterSalary ?? false} onChange={e=>setProfile(value=>({...value,autoRegisterSalary:e.target.checked}))} style={{width:"auto"}}/>Registrar sueldo automáticamente al cerrar mes</label></div><div className="modal-actions"><button className="primary" type="submit">Guardar perfil</button></div></form></article>
      <article className="card module-card profile-settings"><div className="card-title"><div><h2>Categorías personales</h2><p>Se crean y administran aquí; se usan para clasificar todos tus gastos.</p></div></div><form onSubmit={addCategory} className="form-row"><label>Nueva categoría<input value={categoryDraft} onChange={e=>setCategoryDraft(e.target.value)} placeholder="Ej. Mascotas"/></label><div className="modal-actions"><button className="primary" type="submit">Agregar categoría</button></div></form><div className="report-list">{categories.map(category=><div key={category}><span className="report-name">{category}</span><button className="expense-delete" type="button" onClick={()=>setCategories(items=>items.filter(item=>item!==category))} aria-label={`Eliminar ${category}`}><Trash2 size={14}/></button></div>)}</div></article>
      <article className="card module-card profile-settings"><div className="card-title"><div><h2>Rubros de ingreso</h2><p>Estos nombres aparecen solamente cuando registras un ingreso.</p></div></div><form onSubmit={addIncomeCategory} className="form-row"><label>Nuevo rubro de ingreso<input value={incomeCategoryDraft} onChange={e=>setIncomeCategoryDraft(e.target.value)} placeholder="Ej. Comisión"/></label><div className="modal-actions"><button className="primary" type="submit">Agregar rubro</button></div></form><div className="report-list">{incomeCategories.map(category=><div key={category}><span className="report-name">{category}</span><button className="expense-delete" type="button" onClick={()=>setIncomeCategories(items=>items.filter(item=>item!==category))} aria-label={`Eliminar ${category}`}><Trash2 size={14}/></button></div>)}</div></article>
      <article className="card module-card profile-settings" style={{borderLeft:"4px solid var(--blue)"}}><div className="card-title"><div><h2>Control de Períodos y Cierres</h2><p>Administra los meses cerrados o restablece a Agosto 2026 para repetir pruebas del asistente.</p></div></div><div style={{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap",marginTop:"12px"}}><button className="primary" type="button" onClick={resetToAugust}>🔄 Restablecer a Agosto 2026 (Reabrir mes y reiniciar prueba)</button><span style={{fontSize:"12px",color:"var(--muted)"}}>Meses cerrados actualmente: {closedPeriods.length > 0 ? closedPeriods.join(", ") : "Ninguno"}</span></div></article>
    </>;
    return null;
  }

  return <div className="app-shell">
    <aside className={mobile ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><TrendingUp size={19}/></div><span>Finanza</span><button className="close-mobile" onClick={()=>setMobile(false)}><X/></button></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>{activateModule(label);setMobile(false)}}><Icon size={19}/>{label}</button>)}</nav>
      <div className="sidebar-bottom">
        <button className={active==="Configuración"?"active":""} onClick={()=>{activateModule("Configuración");setMobile(false)}}><Settings size={19}/>Configuración</button>
        <div className="profile"><div className="avatar">{profile.fullName.split(" ").map(word=>word[0]).join("").slice(0,2).toUpperCase()}</div><div><strong>{profile.fullName}</strong><span>Plan personal</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>
    {mobile && <div className="sidebar-backdrop" onClick={()=>setMobile(false)} aria-hidden="true"/>}

    <main>
      <header>
        <button className="menu" onClick={()=>setMobile(true)}><Menu/></button>
        <div className="search"><Search size={18}/><input aria-label="Buscar movimientos" value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim()) activateModule("Movimientos")}} placeholder="Buscar movimientos..." />{search&&<button aria-label="Limpiar búsqueda" onClick={()=>setSearch("")}><X size={15}/></button>}</div>
        <div className="header-actions">
          <span className={`sync-status ${syncStatus}`}>{syncStatus==="synced"?"Guardado en Supabase":syncStatus==="saving"?"Guardando en Supabase…":syncStatus==="setup"?"Supabase: revisar conexión":"Conectando a Supabase…"}</span>
          <button className="icon-button"><Bell size={19}/><i/></button>
          
          {isPeriodClosed(activePeriod) ? (
            <button
              className="month-status-pill closed"
              type="button"
              style={{cursor:"pointer", border:"1px solid #fde68a"}}
              title="Período archivado. Haz clic para ir al Mes en Curso"
              onClick={() => {
                setSelectedYear(monthAccess.year);
                setSelectedMonth(monthAccess.month);
                setNotice(`⚡ Saltaste a ${monthNames[monthAccess.month]} ${monthAccess.year} (Mes en Curso)`);
              }}
            >
              <Lock size={12}/> Mes Cerrado · Ir a Mes en Curso ⚡
            </button>
          ) : (selectedYear === monthAccess.year && selectedMonth === monthAccess.month) ? (
            <span className="month-status-pill active" title="Período en curso actual">
              <Check size={12}/> Mes en Curso
            </span>
          ) : (
            <button
              className="month-status-pill future"
              type="button"
              style={{cursor:"pointer", border:"1px solid #cbd5e1"}}
              title="Haz clic para volver al Mes en Curso"
              onClick={() => {
                setSelectedYear(monthAccess.year);
                setSelectedMonth(monthAccess.month);
                setNotice(`⚡ Regresaste a ${monthNames[monthAccess.month]} ${monthAccess.year} (Mes en Curso)`);
              }}
            >
              📅 Ir a Mes en Curso ({monthNames[monthAccess.month].slice(0,3)}) ⚡
            </button>
          )}

          <div className="month-picker">
            <button className="month" onClick={()=>setShowMonthPicker(open=>!open)}>
              {monthNames[selectedMonth]} {selectedYear} <ChevronDown size={16}/>
            </button>
            {showMonthPicker&&<div className="month-menu">
              <div className="month-menu-head">
                <button type="button" disabled={selectedYear<=2020} onClick={()=>setSelectedYear(year=>Math.max(2020, year-1))}>‹</button>
                <strong>{selectedYear}</strong>
                <button type="button" disabled={selectedYear>=2035} onClick={()=>setSelectedYear(year=>Math.min(2035, year+1))}>›</button>
              </div>
              <div className="month-options">
                {monthNames.map((name,index)=>{
                  const enabled=isPeriodEnabled(selectedYear,index);
                  const pStr=`${selectedYear}-${String(index+1).padStart(2,"0")}`;
                  const isClosed=closedPeriods.includes(pStr);
                  const isCurrent=selectedYear===monthAccess.year && index===monthAccess.month;
                  return <button
                    type="button"
                    disabled={!enabled}
                    className={`${index===selectedMonth?"selected":""} ${isCurrent?"current-month-option":""}`}
                    key={name}
                    title={isCurrent ? "Mes en Curso actual" : isClosed ? "Mes archivado/cerrado" : undefined}
                    onClick={()=>{
                      if(!enabled) return;
                      setSelectedMonth(index);
                      if (selectedYear > monthAccess.year || (selectedYear === monthAccess.year && index > monthAccess.month)) {
                        setMonthAccess({ year: selectedYear, month: index });
                        if (typeof window !== "undefined") {
                          localStorage.setItem("finanza_month_access", JSON.stringify({ year: selectedYear, month: index }));
                        }
                      }
                      setShowMonthPicker(false);
                      setNotice(`📅 Período seleccionado: ${name} ${selectedYear}`);
                    }}
                  >
                    {name.slice(0,3)} {isClosed ? "🔒" : isCurrent ? "🟢" : ""}
                  </button>;
                })}
              </div>
              <div style={{marginTop:"8px",paddingTop:"8px",borderTop:"1px solid #f1f5f9"}}>
                <button
                  type="button"
                  style={{width:"100%",border:0,background:"#eff6ff",color:"var(--blue)",borderRadius:"8px",padding:"6px 8px",fontSize:"11px",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}
                  onClick={()=>{
                    setSelectedYear(monthAccess.year);
                    setSelectedMonth(monthAccess.month);
                    setShowMonthPicker(false);
                    setNotice(`⚡ Regresaste a ${monthNames[monthAccess.month]} ${monthAccess.year} (Mes en Curso)`);
                  }}
                >
                  ⚡ Ir a Mes en Curso ({monthNames[monthAccess.month].slice(0,3)} {monthAccess.year})
                </button>
              </div>
            </div>}
          </div>

          {isPeriodClosed(activePeriod) ? (
            <button className="outline" type="button" onClick={()=>reopenMonth(activePeriod)}>
              <Unlock size={14}/> Reabrir mes
            </button>
          ) : (
            <button className="outline" type="button" onClick={openCloseMonthModal}>
              <Lock size={14}/> Cerrar {monthNames[selectedMonth]}
            </button>
          )}

          <button className="primary" onClick={openNewMovementModal}><Plus size={18}/>Nuevo movimiento</button>
        </div>
      </header>

      <div className="content">
        {isPeriodClosed(activePeriod) && (
          <div className="closed-month-banner">
            <div className="closed-month-banner-left">
              <Lock size={18}/>
              <span>Este período (<strong>{monthNames[selectedMonth]} {selectedYear}</strong>) se encuentra <strong>cerrado y archivado</strong> como histórico contable.</span>
            </div>
            <button className="reopen-btn" type="button" onClick={()=>reopenMonth(activePeriod)}>
              <Unlock size={14}/> Reabrir período para edición
            </button>
          </div>
        )}
        {active!=="Resumen" ? moduleContent() : <>
        <div className="page-heading">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
              <p className="eyebrow" style={{margin:0}}>PERÍODO: {monthNames[selectedMonth].toUpperCase()} {selectedYear}</p>
              <span className={`month-status-pill ${isPeriodClosed(activePeriod)?"closed":selectedYear>2026||(selectedYear===2026&&selectedMonth>7)?"future":"active"}`}>
                {isPeriodClosed(activePeriod) ? "🟡 Período Cerrado" : selectedYear>2026||(selectedYear===2026&&selectedMonth>7) ? "⚪ Mes Planificado" : "🟢 Período Activo"}
              </span>
            </div>
            <h1>Buenos días, {profile.fullName} <span>👋</span></h1>
            <p>Panel de control y resumen ejecutivo de tus finanzas para {monthNames[selectedMonth].toLowerCase()} {selectedYear}.</p>
          </div>
          <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
            {!isPeriodClosed(activePeriod) && (
              <button className="outline" style={{height:"42px",marginTop:0,width:"auto",padding:"0 16px",fontSize:"13px",display:"inline-flex",alignItems:"center",gap:"6px"}} onClick={openCloseMonthModal}>
                <Lock size={15}/> Cerrar mes contable
              </button>
            )}
            <button className="mobile-add primary" onClick={openNewMovementModal}>
              <Plus size={18}/>Registrar
            </button>
          </div>
        </div>

        {/* 1. Resumen de Salud Financiera Global */}
        <section className="summary-health-banner">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <Sparkles size={18} color="#1767e8"/>
                <h2 style={{fontSize:"16px",fontWeight:800,margin:0,color:"var(--ink)"}}>
                  Diagnóstico de Salud Financiera ({monthNames[selectedMonth]} {selectedYear})
                </h2>
              </div>
              <p style={{fontSize:"12px",color:"var(--muted)",margin:"4px 0 0 0"}}>
                {totals.income === 0 && totals.expense === 0
                  ? "No hay ingresos ni gastos registrados para este período."
                  : netMonthBalance > 0 
                  ? `Tienes un superávit proyectado del ${savingsRate}% de tus ingresos para libre ahorro o contingencias.`
                  : netMonthBalance === 0
                  ? "Tus ingresos cubren exactamente tus gastos presupuestados (equilibrio justo)."
                  : `Tus gastos proyectados superan tus ingresos por S/ ${Math.abs(netMonthBalance).toLocaleString("es-PE",{minimumFractionDigits:2})}.`}
              </p>
            </div>
            <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
              <span className={`summary-header-badge ${totals.income === 0 && totals.expense === 0 ? "month-status-pill future" : netMonthBalance >= 0 ? "month-status-pill active" : "month-status-pill closed"}`} style={{fontSize:"12px",padding:"6px 14px"}}>
                {totals.income === 0 && totals.expense === 0 ? "⚪ Sin movimientos" : netMonthBalance >= 0 ? "🟢 Superávit Saludable" : "🔴 Déficit de Presupuesto"}
              </span>
            </div>
          </div>

          <div style={{marginTop:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"11px",fontWeight:700,color:"#475569",marginBottom:"4px"}}>
              <span>{totals.income === 0 && totals.expense === 0 ? "Sin presupuesto ejecutado en este período" : `Ejecución del Presupuesto: ${spendRate}% del ingreso comprometido`}</span>
              <span>S/ {totals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})} de S/ {totals.income.toLocaleString("es-PE",{minimumFractionDigits:2})}</span>
            </div>
            <div className="budget-bar-container">
              <div
                className={`budget-bar-fill ${totals.income === 0 && totals.expense === 0 ? "safe" : spendRate <= 70 ? "safe" : spendRate <= 90 ? "warning" : "danger"}`}
                style={{width: `${totals.income === 0 && totals.expense === 0 ? 0 : Math.min(100, spendRate)}%`}}
              />
            </div>
          </div>

          <div className="health-kpi-grid">
            <div className="health-kpi-item">
              <div className="health-kpi-header">
                <span className="health-kpi-title">Ingreso Total</span>
                <ArrowDownLeft size={16} color="var(--green)"/>
              </div>
              <div className="health-kpi-value" style={{color:"var(--green)"}}>
                S/ {totals.income.toLocaleString("es-PE",{minimumFractionDigits:2})}
              </div>
              <span className="health-kpi-subtext">
                {totals.income === 0 ? "Sin ingresos en este mes" : (hasSalaryInPeriod ? "✓ Sueldo incluido" : "Sin sueldo registrado") + (extraIncome > 0 ? ` (+S/ ${extraIncome.toLocaleString("es-PE")} extra)` : "")}
              </span>
            </div>

            <div className="health-kpi-item">
              <div className="health-kpi-header">
                <span className="health-kpi-title">Gastos del Período</span>
                <ArrowUpRight size={16} color="var(--orange)"/>
              </div>
              <div className="health-kpi-value" style={{color:"var(--orange)"}}>
                S/ {totals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}
              </div>
              <span className="health-kpi-subtext">
                {totals.expense === 0 ? "Sin gastos en este mes" : `Pagado: S/ ${actualTotals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})} (${executedExpensePct}%)`}
              </span>
            </div>

            <div className="health-kpi-item">
              <div className="health-kpi-header">
                <span className="health-kpi-title">Margen Neto Libre</span>
                <Scale size={16} color={totals.income === 0 && totals.expense === 0 ? "var(--muted)" : netMonthBalance >= 0 ? "var(--green)" : "#dc2626"}/>
              </div>
              <div className="health-kpi-value" style={{color: totals.income === 0 && totals.expense === 0 ? "var(--muted)" : netMonthBalance >= 0 ? "var(--green)" : "#dc2626"}}>
                {netMonthBalance < 0 ? `-S/ ${Math.abs(netMonthBalance).toLocaleString("es-PE",{minimumFractionDigits:2})}` : `S/ ${netMonthBalance.toLocaleString("es-PE",{minimumFractionDigits:2})}`}
              </div>
              <span className="health-kpi-subtext">
                {totals.income === 0 && totals.expense === 0 ? "Sin actividad contable" : netMonthBalance >= 0 ? `Equivale al ${savingsRate}% de tus ingresos` : "Requiere ajuste en gastos"}
              </span>
            </div>

            <div className="health-kpi-item">
              <div className="health-kpi-header">
                <span className="health-kpi-title">Ritmo de Gasto Disponible</span>
                <Activity size={16} color="var(--blue)"/>
              </div>
              <div className="health-kpi-value" style={{color:"var(--blue)"}}>
                S/ {dailyBudgetRemaining.toFixed(2)}<small style={{fontSize:"12px",fontWeight:600}}>/día</small>
              </div>
              <span className="health-kpi-subtext">
                {totals.expense === 0 && totals.income === 0 ? "Sin consumo de presupuesto" : `Para los ${remainingDays} días restantes de ${monthNames[selectedMonth]}`}
              </span>
            </div>
          </div>
        </section>

        {/* 2. Métricas Clave de Saldo y Ahorro */}
        <section className="metrics">
          <Metric label="Saldo Real Disponible" value={balance} delta="Dinero confirmado disponible hoy" icon={<WalletCards/>} tone="blue" />
          <Metric label="Saldo Proyectado al Cierre" value={projectedBalance} delta="Tras cubrir todos los pendientes" icon={<TrendingUp/>} tone="purple" />
          <Metric label="Gastos Pagados" value={actualTotals.expense} delta={`Faltan S/ ${Math.max(0, totals.expense - actualTotals.expense).toLocaleString("es-PE",{minimumFractionDigits:2})} por confirmar`} icon={<ArrowUpRight/>} tone="orange" />
          <Metric label="Patrimonio de Ahorro" value={totalSavingsAll} delta={`S/ ${totalSavingsGeneral.toLocaleString("es-PE")} libre + S/ ${totalSavingsInGoals.toLocaleString("es-PE")} en metas`} icon={<PiggyBank/>} tone="purple"/>
        </section>

        {/* 3. Grid Principal: Flujo 6 Meses + Categorías + Movimientos + Ahorro */}
        <section className="dashboard-grid">
          {/* Tarjeta: Flujo Histórico 6 Meses */}
          <article className="card chart-card">
            <div className="card-title">
              <div>
                <h2>Flujo de dinero comparativo (Últimos 6 meses)</h2>
                <p>Ingresos (verde) vs. Gastos (naranja). Haz clic en una columna para saltar de período.</p>
              </div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <span style={{fontSize:"11px",color:"var(--muted)"}}>Mes activo: <strong>{monthNames[selectedMonth]} {selectedYear}</strong></span>
              </div>
            </div>

            <div className="chart-wrap">
              <div className="y-axis">
                <span>S/ {chart6MonthsMax.toLocaleString("es-PE")}</span>
                <span>S/ {Math.round(chart6MonthsMax * 0.75).toLocaleString("es-PE")}</span>
                <span>S/ {Math.round(chart6MonthsMax * 0.50).toLocaleString("es-PE")}</span>
                <span>S/ {Math.round(chart6MonthsMax * 0.25).toLocaleString("es-PE")}</span>
                <span>S/ 0</span>
              </div>
              <div className="chart-6m-bars">
                {last6MonthsData.map(m => {
                  const incHeight = chart6MonthsMax > 0 && m.income > 0 ? (m.income / chart6MonthsMax) * 100 : 0;
                  const expHeight = chart6MonthsMax > 0 && m.expense > 0 ? (m.expense / chart6MonthsMax) * 100 : 0;
                  return (
                    <div
                      key={m.period}
                      className={`chart-6m-col ${m.isSelected ? "selected" : ""}`}
                      onClick={() => selectHistoricalMonth(m.year, m.month)}
                      title={`${m.fullLabel}\nIngresos: S/ ${m.income.toLocaleString("es-PE",{minimumFractionDigits:2})}\nGastos: S/ ${m.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}\nBalance: S/ ${m.balance.toLocaleString("es-PE",{minimumFractionDigits:2})}`}
                    >
                      <div className="chart-bars-duo">
                        <div
                          className="chart-bar-v income"
                          style={{
                            height: m.income > 0 ? `${Math.max(6, incHeight)}%` : "3px",
                            opacity: m.income > 0 ? 1 : 0.25
                          }}
                        />
                        <div
                          className="chart-bar-v expense"
                          style={{
                            height: m.expense > 0 ? `${Math.max(6, expHeight)}%` : "3px",
                            opacity: m.expense > 0 ? 1 : 0.25
                          }}
                        />
                      </div>
                      <span className={`chart-col-label ${m.isSelected ? "selected" : ""}`}>
                        {m.label}
                        {m.isSelected && <span style={{display:"block",fontSize:"9px",color:"#2563eb",fontWeight:800}}>• Activo</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="legend">
              <span><i className="dot green"/>Ingresos</span>
              <span><i className="dot orange"/>Gastos</span>
              <span style={{color:"#64748b"}}><i className="dot blue"/>Período seleccionado</span>
            </div>
          </article>

          {/* Tarjeta: Gastos por Categoría */}
          <article className="card spending-card">
            <div className="card-title">
              <div>
                <h2>Gastos por categoría</h2>
                <p>Presupuesto y consumos de {monthNames[selectedMonth]}</p>
              </div>
              <button className="category-details" onClick={()=>activateModule("Gastos")}>Gestionar gastos</button>
            </div>
            <div className="donut-area">
              <div className="donut" style={{background:dashboardDonut}}>
                <div>
                  <strong>S/ {dashboardCategoryTotal.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                  <span>Total previsto</span>
                </div>
              </div>
              <div className="category-list">
                {dashboardCategories.map(([name,value],index)=>{
                  const pct = dashboardCategoryTotal > 0 ? (value / dashboardCategoryTotal) * 100 : 0;
                  const color = dashboardPalette[index % dashboardPalette.length];
                  return (
                    <button type="button" className="category-row" key={name} onClick={()=>inspectCategory(name)} title={`Ver movimientos de ${name}`}>
                      <i className="dot" style={{background:color}}/>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"4px"}}>
                          <span>{name}</span>
                          <strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                        </div>
                        <div className="category-row-bar">
                          <div className="category-row-bar-fill" style={{width:`${pct}%`,background:color}}/>
                        </div>
                      </div>
                      <small>{dashboardCategoryTotal?`${Math.round(pct)}%`:"0%"}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          {/* Tarjeta: Últimos Movimientos */}
          <article className="card transactions-card">
            <div className="card-title">
              <div>
                <h2>Últimos movimientos del período</h2>
                <p>Tus transacciones recientes en {monthNames[selectedMonth]} {selectedYear}</p>
              </div>
              <button onClick={()=>activateModule("Movimientos")}>Ver todos <span>→</span></button>
            </div>
            <div className="tx-list">
              {visibleTransactions.slice(0,6).map(t=>(
                <div className="tx" key={t.id}>
                  <div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div>
                  <div className="tx-main">
                    <div style={{display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
                      <strong>{t.title}</strong>
                      {t.warehouseItemId && <span style={{fontSize:"10px",padding:"1px 6px",borderRadius:"4px",background:"#eff6ff",color:"#2563eb",border:"1px solid #bfdbfe",fontWeight:600}}>📦 Almacén</span>}
                    </div>
                    <span>{t.category} · {t.planned ? (t.completed ? "Realizado" : "Pendiente") : "Confirmado"}</span>
                  </div>
                  <div className="tx-date">{t.date}</div>
                  <div className={`tx-amount ${t.kind}`}>
                    {t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}
                  </div>
                  {t.requiresConfirmation && (
                    <button className={`completion-toggle ${t.completed?"done":""}`} onClick={()=>toggleExpenseCompletion(t)} title={t.completed?"Realizado: volver a pendiente":"Marcar como realizado"}>
                      {t.completed?<Check size={15}/>:<Circle size={15}/>}
                    </button>
                  )}
                  <button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>removeMovement(t.id)}>
                    <Trash2 size={14}/></button>
                </div>
              ))}
              {visibleTransactions.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>Prueba con otra palabra.</span></div>}
            </div>
          </article>

          {/* Tarjeta: Metas de Ahorro y Colchón */}
          <article className="card goal-card">
            <div className="card-title">
              <div>
                <h2>Ahorro y Metas Financieras</h2>
                <p>Reserva disponible y objetivos específicos</p>
              </div>
              <button onClick={()=>setShowSavingGoalModal(true)}><Plus size={14}/> Nueva meta</button>
            </div>
            
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"16px",marginTop:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <div>
                  <span style={{fontSize:"11px",color:"var(--muted)",fontWeight:600}}>Ahorro General Disponible</span>
                  <div style={{fontSize:"24px",fontWeight:800,color:"var(--purple)",margin:"4px 0"}}>
                    S/ {savings.toLocaleString("es-PE",{minimumFractionDigits:2})}
                  </div>
                </div>
                <button className="outline" style={{width:"auto",margin:0,padding:"6px 14px",fontSize:"12px"}} onClick={()=>setSavingContributionTarget("general")}>
                  Aportar / Retirar
                </button>
              </div>
              <small style={{fontSize:"10px",color:"var(--muted)",display:"block",marginTop:"4px"}}>Fondo de reserva sin comprometer con ninguna meta.</small>
            </div>

            {savingsGoals.length > 0 ? (
              <div style={{display:"grid",gap:"10px",marginTop:"14px"}}>
                {savingsGoals.map(goal => {
                  const pct = Math.min(100, Math.round((goal.amount / goal.target) * 100));
                  return (
                    <div className="goal-item-box" key={goal.id}>
                      <div className="goal-item-header">
                        <strong>{goal.name}</strong>
                        <span>{pct}% alcanzado</span>
                      </div>
                      <div className="goal-item-bar">
                        <div className="goal-item-bar-fill" style={{width:`${pct}%`}}/>
                      </div>
                      <div className="goal-item-footer">
                        <span>S/ {goal.amount.toLocaleString("es-PE")} de S/ {goal.target.toLocaleString("es-PE")}</span>
                        <button className="add-subexpense" style={{padding:"3px 8px",fontSize:"10px"}} onClick={()=>setSavingContributionTarget(goal.id)}>
                          + Aporte
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="goal-tip" style={{marginTop:"14px"}}>
                <Target size={20}/>
                <div>
                  <strong>¿Tienes un objetivo en mente?</strong>
                  <span>Crea metas (ej. Viaje, Computadora, Emergencia) para automatizar tu ahorro mes a mes.</span>
                </div>
              </div>
            )}
          </article>
        </section>

        {/* 4. Nuevo Widget de Almacén y Control de Precios */}
        <section className="warehouse-widget-card">
          <div className="warehouse-widget-head">
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"38px",height:"38px",borderRadius:"10px",background:"#0284c7",color:"#fff",display:"grid",placeItems:"center"}}>
                <Package size={20}/>
              </div>
              <div>
                <h3 style={{fontSize:"16px",fontWeight:800,margin:0,color:"#0c4a6e"}}>
                  Almacén, Despensa e Insumos ({warehouseItems.length} productos en catálogo)
                </h3>
                <p style={{fontSize:"12px",color:"#0369a1",margin:"2px 0 0 0"}}>
                  Control de compras por volumen, unidades de medida y variaciones de precio en tiempo real.
                </p>
              </div>
            </div>
            <button className="primary" style={{background:"#0284c7",borderColor:"#0284c7",height:"38px",padding:"0 16px",fontSize:"12px"}} onClick={()=>activateModule("Almacén")}>
              Ir al Almacén <ArrowRight size={14}/>
            </button>
          </div>

          <div className="warehouse-widget-stats">
            <div className="warehouse-widget-stat">
              <span>Compras en {monthNames[selectedMonth]}</span>
              <strong>{warehouseMonthPurchases.length} registros (S/ {warehouseMonthSpend.toLocaleString("es-PE",{minimumFractionDigits:2})})</strong>
            </div>
            <div className="warehouse-widget-stat">
              <span>Variación de Precios Detectada</span>
              <strong style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"14px"}}>
                {warehouseSavingsCount > 0 && <span style={{color:"#15803d"}}>🔻 {warehouseSavingsCount} bajaron</span>}
                {warehouseInflationCount > 0 && <span style={{color:"#b91c1c"}}>🔺 {warehouseInflationCount} subieron</span>}
                {warehouseSavingsCount === 0 && warehouseInflationCount === 0 && <span style={{color:"#0369a1"}}>Precios estables</span>}
              </strong>
            </div>
            <div className="warehouse-widget-stat">
              <span>Acción Rápida</span>
              <div style={{display:"flex",gap:"6px",marginTop:"4px"}}>
                <button className="outline" style={{width:"auto",margin:0,padding:"4px 10px",fontSize:"11px",borderColor:"#bae6fd",color:"#0369a1"}} onClick={()=>warehouseItems.length > 0 ? openBuyWarehouseModal(warehouseItems[0]) : setWarehouseModal({open:true,item:null})}>
                  + Registrar Compra
                </button>
                <button className="outline" style={{width:"auto",margin:0,padding:"4px 10px",fontSize:"11px",borderColor:"#bae6fd",color:"#0369a1"}} onClick={()=>setWarehouseModal({open:true,item:null})}>
                  + Nuevo Producto
                </button>
              </div>
            </div>
          </div>
        </section>
        </>}
      </div>
    </main>

    {showModal&&<div className="modal-backdrop" onMouseDown={closeMovementModal}><form className="modal" onSubmit={addTransaction} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo movimiento</h2><p>Registra un ingreso o gasto en {monthNames[selectedMonth]} {selectedYear}.</p></div><button type="button" onClick={closeMovementModal}><X/></button></div><label>Tipo<select name="kind" value={movementKind} onChange={e=>setMovementKind(e.target.value as "income"|"expense")}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>{movementKind==="expense"&&<label>Tipo de gasto<select value={expenseType} onChange={e=>setExpenseType(e.target.value as "fixed"|"monthly"|"group")}><option value="fixed">Gasto fijo — se repite cada mes</option><option value="monthly">Gasto mensual — solo este mes</option><option value="group">Detalle por categoría</option></select></label>}{warehouseItems.length>0&&movementKind==="expense"&&<div className="warehouse-quick-pick"><span className="warehouse-quick-pick-label"><Package size={15}/> 📦 ¿Jalar producto habitual del Almacén?</span><select value={selectedMovementWarehouseId||""} onChange={e=>{const val=Number(e.target.value);if(!val){setSelectedMovementWarehouseId(null);return;}const found=warehouseItems.find(item=>item.id===val);if(found){setSelectedMovementWarehouseId(val);const title=cleanProductName(found.name)||found.name;const unitCost=getWarehouseUnitCost(found);const qty=parseFloat(movementQuantity)||1;const total=(qty*unitCost).toFixed(2);setMovementTitle(title);setMovementUnit(found.baseUnit||"unidad");setMovementUnitPrice(unitCost.toFixed(2));setMovementAmount(total);if(categories.includes(found.category)){setMovementCategory(found.category);}setNotice(`✓ "${title}": S/ ${unitCost.toFixed(2)} por ${found.baseUnit} (${qty} ${found.baseUnit} = S/ ${total})`);}}}><option value="">-- Selecciona para autocompletar nombre, categoría y precio --</option>{Array.from(new Set(warehouseItems.map(w=>w.category))).map(cat=><optgroup key={cat} label={`📁 ${cat}`}>{warehouseItems.filter(w=>w.category===cat).map(item=><option key={item.id} value={item.id}>{formatWarehouseOptionLabel(item)}</option>)}</optgroup>)}</select></div>}<label>Descripción<input name="title" required value={movementTitle} onChange={e=>setMovementTitle(e.target.value)} placeholder={movementKind==="income"?"Ej. Sueldo mensual":expenseType==="fixed"?"Ej. Alquiler":"Ej. Almuerzo"}/></label>{movementKind==="expense"?<><label>Categoría<select name="category" value={movementCategory} onChange={e=>setMovementCategory(e.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr",gap:"8px",alignItems:"flex-end",margin:"10px 0"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" value={movementQuantity} onChange={e=>handleMovementQuantityChange(e.target.value)} placeholder="1"/></label><label style={{margin:0}}>Unidad<select name="unit" value={movementUnit} onChange={e=>setMovementUnit(e.target.value)}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" value={movementUnitPrice} onChange={e=>handleMovementUnitPriceChange(e.target.value)} placeholder="0.00"/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={movementAmount} onChange={e=>handleMovementAmountChange(e.target.value)} placeholder="0.00" style={{fontWeight:700}}/></label></div></>:<div className="form-row"><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={movementAmount} onChange={e=>setMovementAmount(e.target.value)} placeholder="0.00"/></label><label>Categoría<select name="category" value={incomeCategories.includes(movementCategory)?movementCategory:incomeCategories[0]} onChange={e=>setMovementCategory(e.target.value)}>{incomeCategories.map(category=><option key={category}>{category}</option>)}</select></label></div>}{movementKind==="expense"&&movementCategory==="Ahorro"&&<label>Destino del ahorro<select name="savingDestination" value={String(savingDestination)} onChange={e=>setSavingDestination(e.target.value==="general"?"general":Number(e.target.value))}><option value="general">Ahorro general / indefinido</option>{savingsGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}{movementKind==="expense"&&movementCategory==="Ahorro"&&<p className="eyebrow">Este egreso se registrará también como aporte al destino que elegiste.</p>}{movementKind==="expense"&&expenseType==="group"&&movementCategory!=="Ahorro"&&<p className="eyebrow">Este movimiento se verá en el historial. Los subgastos se agregan desde Detalle por categoría.</p>}<div className="modal-actions"><button type="button" onClick={closeMovementModal}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {warehouseModal.open&&<div className="modal-backdrop" onMouseDown={()=>setWarehouseModal({open:false,item:null})}><form className="modal" onSubmit={saveWarehouseItem} onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-title">
        <div>
          <h2>{warehouseModal.item?"Editar producto en almacén":"Nuevo producto en almacén"}</h2>
          <p>Define la presentación, unidad base y precio habitual para seguimiento histórico.</p>
        </div>
        <button type="button" onClick={()=>setWarehouseModal({open:false,item:null})}><X/></button>
      </div>
      <label>Nombre del producto / Marca
        <input name="name" required autoFocus defaultValue={warehouseModal.item?.name??""} placeholder="Ej. Arroz Extra Costeño, Aceite Primor, Cebolla Roja..."/>
      </label>
      <div className="form-row">
        <label>Categoría
          <select name="category" defaultValue={warehouseModal.item?.category??"Abarrotes"}>
            {categories.map(cat=><option key={cat} value={cat}>{cat}</option>)}
          </select>
        </label>
        <label>Unidad Base de Medida
          <select name="baseUnit" defaultValue={warehouseModal.item?.baseUnit??"kg"}>
            <option value="kg">Kilogramo (kg)</option>
            <option value="g">Gramo (g)</option>
            <option value="L">Litro (L)</option>
            <option value="ml">Mililitro (ml)</option>
            <option value="unidad">Unidad (u.)</option>
            <option value="lata">Lata</option>
            <option value="pañal">Pañal</option>
            <option value="rollo">Rollo</option>
            <option value="paquete">Paquete</option>
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Tipo de presentación habitual
          <input name="packageType" required defaultValue={warehouseModal.item?.packageType??"Saco 50 kg"} placeholder="Ej. Saco 50 kg, Caja x 12, Kilo, Jaba x 30"/>
        </label>
        <label>Factor a Unidad Base (Kilos/Litros/Unidades)
          <input name="packageFactor" type="number" step="0.1" min="0.1" required defaultValue={warehouseModal.item?.packageFactor??1} placeholder="Ej. 50 (para saco de 50kg), 12 (para caja de 12L)"/>
        </label>
      </div>
      <div className="form-row">
        <label>Texto de peso / volumen (opcional)
          <input name="quantityUnit" defaultValue={warehouseModal.item?.quantityUnit??""} placeholder="Ej. 50 kg, 12 L (1L c/u), 40 rollos"/>
        </label>
        <label>Precio referencial habitual (S/)
          <input name="estimatedPrice" type="number" step="0.01" min="0" required defaultValue={warehouseModal.item?.estimatedPrice??""} placeholder="Ej. 165.00"/>
        </label>
      </div>
      <label>Tienda / Lugar habitual de compra
        <input name="store" defaultValue={warehouseModal.item?.store??""} placeholder="Ej. Mercado Mayorista, Makro, Metro, Bodega..."/>
      </label>
      <label>Notas / Rendimiento
        <input name="notes" defaultValue={warehouseModal.item?.notes??""} placeholder="Ej. Rinde 2 meses, comprar saco azul de grano largo..."/>
      </label>
      <div className="modal-actions">
        <button type="button" onClick={()=>setWarehouseModal({open:false,item:null})}>Cancelar</button>
        <button className="primary" type="submit">{warehouseModal.item?"Guardar cambios":"Agregar a almacén"}</button>
      </div>
    </form></div>}

    {warehouseBuyModal.open&&warehouseBuyModal.item&&(()=>{
      const item = warehouseBuyModal.item;
      const factor = warehouseBuyModal.packageFactor > 0 ? warehouseBuyModal.packageFactor : 1;
      const qty = warehouseBuyModal.quantity > 0 ? warehouseBuyModal.quantity : 1;
      const total = warehouseBuyModal.totalPrice >= 0 ? warehouseBuyModal.totalPrice : 0;
      const currentUnit = total / (factor * qty);
      
      const lastRecord = item.priceHistory && item.priceHistory.length > 0 ? item.priceHistory[0] : null;
      const prevUnit = lastRecord ? (lastRecord.unitPrice || (lastRecord.packageFactor > 0 ? lastRecord.totalPrice / lastRecord.packageFactor : lastRecord.totalPrice)) : (item.estimatedPrice / (item.packageFactor || 1));
      const diff = currentUnit - prevUnit;
      const percent = prevUnit > 0 ? ((diff / prevUnit) * 100) : 0;
      const isSaving = diff < -0.01;
      const isWarning = diff > 0.01;

      return <div className="modal-backdrop" onMouseDown={()=>setWarehouseBuyModal(prev=>({...prev, open: false, item: null}))}>
        <form className="modal" onSubmit={confirmWarehouseBuy} onMouseDown={e=>e.stopPropagation()}>
          <div className="modal-title">
            <div>
              <p className="eyebrow">COMPRA EN {monthNames[selectedMonth].toUpperCase()} {selectedYear}</p>
              <h2>Registrar compra de {item.name}</h2>
              <p>Ajusta la presentación y el monto que pagaste hoy para calcular el costo por {item.baseUnit} y registrar la evolución.</p>
            </div>
            <button type="button" onClick={()=>setWarehouseBuyModal(prev=>({...prev, open: false, item: null}))}><X/></button>
          </div>

          <div className="form-row">
            <label>Presentación que compraste
              <input
                value={warehouseBuyModal.packageType}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, packageType: e.target.value}))}
                placeholder="Ej. Saco 50 kg, Saco 5 kg, Bolsa 1 kg"
                required
              />
            </label>
            <label>Contenido por empaque (en {item.baseUnit})
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={warehouseBuyModal.packageFactor}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, packageFactor: Number(e.target.value)}))}
                placeholder="Ej. 50 para saco 50kg, 5 para saco 5kg, 1 para 1kg"
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label>Cantidad de empaques
              <input
                type="number"
                min="1"
                step="1"
                value={warehouseBuyModal.quantity}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, quantity: Number(e.target.value)}))}
                required
              />
            </label>
            <label>Total pagado hoy (S/)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={warehouseBuyModal.totalPrice || ""}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, totalPrice: Number(e.target.value)}))}
                placeholder="0.00"
                required
              />
            </label>
          </div>

          {/* LIVE CALCULATION & COMPARISON BOX */}
          <div className={`price-calc-box ${isSaving ? "saving" : isWarning ? "warning" : ""}`}>
            <div className="price-calc-header">
              <span className="price-calc-title">⚡ Análisis inteligente de costo</span>
              <span className={`price-trend-badge ${isSaving ? "down" : isWarning ? "up" : "equal"}`}>
                {isSaving ? `🔻 Ahorro de S/ ${Math.abs(diff).toFixed(2)}/${item.baseUnit}` : isWarning ? `🔺 +S/ ${diff.toFixed(2)}/${item.baseUnit}` : "= Mismo precio"}
              </span>
            </div>
            <div className="price-calc-grid">
              <div className="price-calc-item">
                <span>Costo calculado por {item.baseUnit}</span>
                <strong>S/ {Number.isFinite(currentUnit) ? currentUnit.toFixed(2) : "0.00"} / {item.baseUnit}</strong>
              </div>
              <div className="price-calc-item">
                <span>Precio anterior ({lastRecord?.period || "Referencia"})</span>
                <strong>S/ {prevUnit.toFixed(2)} / {item.baseUnit}</strong>
              </div>
            </div>
            <div className={`price-calc-comparison ${isSaving ? "saving" : isWarning ? "warning" : "neutral"}`}>
              {isSaving && <div>🎉 <strong>¡Excelente compra!</strong> Estás pagando un <strong>{Math.abs(percent).toFixed(1)}% menos</strong> por cada {item.baseUnit} comparado con la última compra.</div>}
              {isWarning && <div>⚠️ <strong>Atención:</strong> El precio subió un <strong>+{percent.toFixed(1)}%</strong> (+S/ {diff.toFixed(2)} por {item.baseUnit}) respecto a {lastRecord?.period || "la referencia"}.</div>}
              {!isSaving && !isWarning && <div>ℹ️ <strong>Precio estable:</strong> Estás pagando exactamente el mismo costo por {item.baseUnit}.</div>}
            </div>
          </div>

          <label>Registrar en
            <select
              value={String(warehouseBuyModal.destination)}
              onChange={e=>setWarehouseBuyModal(prev=>({...prev, destination: e.target.value === "movement" ? "movement" : Number(e.target.value)}))}
            >
              <option value="movement">Movimiento directo del mes ({monthNames[selectedMonth]})</option>
              {expenseGroups.map(g=><option key={g.id} value={g.id}>Subgasto de {g.name}</option>)}
            </select>
          </label>

          <div className="form-row">
            <label>Lugar / Tienda de compra
              <input
                value={warehouseBuyModal.store}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, store: e.target.value}))}
                placeholder="Ej. Mercado Mayorista, Makro, Metro..."
              />
            </label>
            <label>Notas de la compra (opcional)
              <input
                value={warehouseBuyModal.notes}
                onChange={e=>setWarehouseBuyModal(prev=>({...prev, notes: e.target.value}))}
                placeholder="Ej. Oferta 2x1, saco grande..."
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={()=>setWarehouseBuyModal(prev=>({...prev, open: false, item: null}))}>Cancelar</button>
            <button className="primary" type="submit">Confirmar y registrar compra</button>
          </div>
        </form>
      </div>;
    })()}

    {priceHistoryModal.open&&priceHistoryModal.item&&(()=>{
      const item = priceHistoryModal.item;
      const history = item.priceHistory || [];
      const unitPrices = history.map(h => h.unitPrice || (h.packageFactor > 0 ? h.totalPrice / h.packageFactor : h.totalPrice)).filter(p => p > 0);
      const minPrice = unitPrices.length > 0 ? Math.min(...unitPrices) : (item.estimatedPrice / (item.packageFactor || 1));
      const maxPrice = unitPrices.length > 0 ? Math.max(...unitPrices) : (item.estimatedPrice / (item.packageFactor || 1));
      const avgPrice = unitPrices.length > 0 ? (unitPrices.reduce((a,b)=>a+b,0) / unitPrices.length) : (item.estimatedPrice / (item.packageFactor || 1));

      return <div className="modal-backdrop" onMouseDown={()=>setPriceHistoryModal({open:false,item:null})}>
        <div className="modal" style={{maxWidth:"600px"}} onMouseDown={e=>e.stopPropagation()}>
          <div className="modal-title">
            <div>
              <p className="eyebrow">HISTORIAL Y TENDENCIA DE PRECIOS</p>
              <h2>{item.name}</h2>
              <p>Evolución mensual de precios, presentaciones compradas y costos unitarios.</p>
            </div>
            <button type="button" onClick={()=>setPriceHistoryModal({open:false,item:null})}><X/></button>
          </div>

          <div className="history-stats-grid">
            <div className="history-stat-card best">
              <span>Mejor precio histórico</span>
              <strong>S/ {minPrice.toFixed(2)} / {item.baseUnit}</strong>
            </div>
            <div className="history-stat-card">
              <span>Precio promedio</span>
              <strong>S/ {avgPrice.toFixed(2)} / {item.baseUnit}</strong>
            </div>
            <div className="history-stat-card high">
              <span>Precio más alto</span>
              <strong>S/ {maxPrice.toFixed(2)} / {item.baseUnit}</strong>
            </div>
          </div>

          <div className="card-title" style={{marginBottom:"8px"}}>
            <div>
              <h3 style={{fontSize:"13px",fontWeight:700,margin:0}}>Compras registradas ({history.length})</h3>
            </div>
          </div>

          <div className="history-timeline">
            {history.map((record, index) => {
              const prev = history[index + 1];
              const currentUnit = record.unitPrice || (record.packageFactor > 0 ? record.totalPrice / record.packageFactor : record.totalPrice);
              const prevUnit = prev ? (prev.unitPrice || (prev.packageFactor > 0 ? prev.totalPrice / prev.packageFactor : prev.totalPrice)) : null;
              const diff = prevUnit !== null ? currentUnit - prevUnit : null;
              const isSaving = diff !== null && diff < -0.01;
              const isUp = diff !== null && diff > 0.01;

              return (
                <div className="history-entry" key={record.id || index}>
                  <div className="history-entry-left">
                    <div className="history-entry-period">
                      <span>📅 {record.period || record.date}</span>
                      {record.store && <small style={{color:"var(--muted)",fontWeight:500}}>· {record.store}</small>}
                    </div>
                    <span className="history-entry-pkg">📦 {record.packageType}</span>
                  </div>
                  <div className="history-entry-right">
                    <span className="history-entry-total">S/ {record.totalPrice.toFixed(2)}</span>
                    <span className="history-entry-unit">S/ {currentUnit.toFixed(2)} / {record.baseUnit}</span>
                    {diff !== null && (
                      <span className={`price-trend-badge ${isSaving ? "down" : isUp ? "up" : "equal"}`} style={{marginTop:"2px"}}>
                        {isSaving ? `🔻 -S/ ${Math.abs(diff).toFixed(2)}` : isUp ? `🔺 +S/ ${diff.toFixed(2)}` : "= Mismo"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {history.length === 0 && (
              <div className="empty-state">
                <span>Aún no hay compras registradas para este producto.</span>
              </div>
            )}
          </div>

          <div className="modal-actions" style={{marginTop:"18px"}}>
            <button type="button" onClick={()=>setPriceHistoryModal({open:false,item:null})}>Cerrar</button>
            <button
              className="primary"
              type="button"
              onClick={()=>{
                setPriceHistoryModal({open:false,item:null});
                openBuyWarehouseModal(item);
              }}
            >
              <Plus size={16}/> Registrar nueva compra
            </button>
          </div>
        </div>
      </div>;
    })()}
    {expenseModal&&<div className="modal-backdrop" onMouseDown={()=>setExpenseModal(null)}><form className="modal" onSubmit={addDetailedExpense} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{expenseModal.kind==="group"?"Activar detalle por categoría":expenseModal.kind==="sub"?"Agregar subgastos":expenseModal.kind==="fixed"?"Nuevo gasto fijo":"Nuevo gasto mensual"}</h2><p>{expenseModal.kind==="group"?"Escribe una categoría existente. Las categorías se administran únicamente en Configuración.":expenseModal.kind==="sub"?"Añade varias compras a esta categoría o jálalas directamente de tu almacén con 1 clic.":"Registra el concepto y su monto."}</p></div><button type="button" onClick={()=>setExpenseModal(null)}><X/></button></div>{expenseModal.kind==="sub"?<><div className="card-title"><div><h2>Detalle de subgastos</h2><p>{subRows.length} fila{subRows.length===1?"":"s"} lista{subRows.length===1?"":"s"} para registrar.</p></div><button type="button" className="add-subexpense" onClick={()=>setSubRows(rows=>[...rows,Date.now()+rows.length])}><Plus size={16}/>Agregar fila</button></div>{warehouseItems.length>0&&<div style={{marginBottom:"14px",padding:"10px 12px",background:"#f8fafc",borderRadius:"8px",border:"1px solid #e2e8f0"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}><span style={{fontSize:"11px",fontWeight:700,color:"#334155",display:"flex",alignItems:"center",gap:"5px"}}><Package size={13} color="#2563eb"/> INSUMOS FRECUENTES DE ALMACÉN (1 CLIC)</span><span style={{fontSize:"10px",color:"var(--muted)"}}>Haz clic para autocompletar</span></div><div style={{display:"flex",flexWrap:"wrap",gap:"6px",maxHeight:"85px",overflowY:"auto"}}>{warehouseItems.slice(0,10).map(w=><button key={w.id} type="button" onClick={()=>addSubExpenseFromWarehouse(w)} style={{fontSize:"11px",padding:"3px 8px",borderRadius:"14px",background:"#ffffff",border:"1px solid #cbd5e1",color:"#0f172a",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"4px",fontWeight:500}} title={`Agregar ${cleanProductName(w.name)} (S/ ${getWarehouseUnitCost(w).toFixed(2)}/${w.baseUnit})`}><Plus size={11} color="#2563eb"/><span>{cleanProductName(w.name)}</span><strong style={{color:"#2563eb",fontSize:"10px"}}>S/ {getWarehouseUnitCost(w).toFixed(2)}/{w.baseUnit}</strong></button>)}</div></div>}{subRows.map((row,index)=>{const category=subCategories[row]??categories.find(item=>item!=="Ahorro")??categories[0];const currentName=subNames[row]??"";const currentAmount=subAmounts[row]??"";const currentQty=subQuantities[row]??"1";const currentUnit=subUnits[row]??"unidad";const currentUnitPrice=subUnitPrices[row]??"";const linkedWId=subWarehouseIds[row];const linkedItem=linkedWId?warehouseItems.find(w=>w.id===linkedWId):null;const warehouseCats=Array.from(new Set(warehouseItems.map(w=>w.category)));return <div className="subexpense-form-row" key={row} style={{display:"flex",flexDirection:"column",gap:"8px",padding:"12px",background:linkedItem?"#f0fdf4":"#f8fafc",borderRadius:"8px",border:linkedItem?"1px solid #86efac":"1px solid #e2e8f0",marginBottom:"12px",transition:"all 0.2s ease"}}>{warehouseItems.length>0&&<div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:"6px",flex:1,minWidth:"220px"}}><span style={{fontSize:"11px",fontWeight:600,color:linkedItem?"#15803d":"var(--muted)",display:"flex",alignItems:"center",gap:"4px",whiteSpace:"nowrap"}}><Package size={13} color={linkedItem?"#16a34a":"currentColor"}/> {linkedItem?"Producto de Almacén:":"¿Jalar de Almacén?"}</span><select style={{fontSize:"12px",padding:"4px 8px",flex:1,borderRadius:"6px",border:linkedItem?"1px solid #86efac":"1px solid #cbd5e1",background:"#ffffff"}} value={linkedWId||""} onChange={e=>{const val=Number(e.target.value);if(val) selectWarehouseForSubRow(row,val); else setSubWarehouseIds(prev=>{const n={...prev};delete n[row];return n;});}}><option value="">-- Selecciona producto para autocompletar --</option>{warehouseCats.map(cat=><optgroup key={cat} label={`📁 ${cat}`}>{warehouseItems.filter(w=>w.category===cat).map(wItem=><option key={wItem.id} value={wItem.id}>{formatWarehouseOptionLabel(wItem)}</option>)}</optgroup>)}</select></div>{linkedItem&&<span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"4px",background:"#dcfce7",color:"#15803d",fontWeight:600}}>✓ Vinculado con Almacén</span>}</div>}<div style={{display:"grid",gridTemplateColumns:"minmax(140px, 1.8fr) minmax(110px, 1fr)",gap:"8px"}}><label style={{margin:0}}>Descripción<input name="name" required autoFocus={index===0} value={currentName} onChange={e=>setSubNames(prev=>({...prev,[row]:e.target.value}))} placeholder="Ej. Mandarina, Arroz..."/></label><label style={{margin:0}}>Categoría<select name="category" value={category} onChange={e=>setSubCategories(items=>({...items,[row]:e.target.value}))}>{categories.map(item=><option key={item}>{item}</option>)}</select></label></div><div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr auto",gap:"8px",alignItems:"flex-end"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" value={currentQty} onChange={e=>handleSubQuantityChange(row,e.target.value)} placeholder="1"/></label><label style={{margin:0}}>Unidad<select name="unit" value={currentUnit} onChange={e=>setSubUnits(prev=>({...prev,[row]:e.target.value}))}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" value={currentUnitPrice} onChange={e=>handleSubUnitPriceChange(row,e.target.value)} placeholder="0.00"/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={currentAmount} onChange={e=>handleSubAmountChange(row,e.target.value)} placeholder="0.00" style={{fontWeight:700}}/></label>{subRows.length>1?<button type="button" className="expense-delete" style={{marginBottom:"4px"}} onClick={()=>setSubRows(rows=>rows.filter(item=>item!==row))} title="Eliminar fila"><Trash2 size={15}/></button>:<div style={{width:28}}/>}</div>{category==="Ahorro"&&<label style={{margin:0}}>Destino<select value={String(subSavingDestinations[row]??"general")} onChange={e=>setSubSavingDestinations(items=>({...items,[row]:e.target.value==="general"?"general":Number(e.target.value)}))}><option value="general">Ahorro general</option>{savingsGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}</div>})}</>:<>{expenseModal.kind!=="group"&&warehouseItems.length>0&&<div className="warehouse-quick-pick" style={{marginBottom:"10px"}}><span className="warehouse-quick-pick-label"><Package size={14}/> 📦 ¿Jalar producto habitual del Almacén?</span><select value={expenseModalWarehouseId||""} onChange={e=>{const val=Number(e.target.value);if(!val){setExpenseModalWarehouseId(null);return;}const found=warehouseItems.find(item=>item.id===val);if(found){const title=cleanProductName(found.name)||found.name;const unitCost=getWarehouseUnitCost(found);const qty=parseFloat(expenseModalQuantity)||1;const total=(qty*unitCost).toFixed(2);setExpenseModalWarehouseId(val);setExpenseModalTitle(title);setExpenseModalUnit(found.baseUnit||"unidad");setExpenseModalUnitPrice(unitCost.toFixed(2));setExpenseModalAmount(total);if(categories.includes(found.category)){setExpenseModalCategory(found.category);}setNotice(`✓ "${title}": S/ ${unitCost.toFixed(2)} por ${found.baseUnit} (${qty} ${found.baseUnit} = S/ ${total})`);}}}><option value="">-- Selecciona para autocompletar --</option>{Array.from(new Set(warehouseItems.map(w=>w.category))).map(cat=><optgroup key={cat} label={`📁 ${cat}`}>{warehouseItems.filter(w=>w.category===cat).map(item=><option key={item.id} value={item.id}>{formatWarehouseOptionLabel(item)}</option>)}</optgroup>)}</select></div>}<label>{expenseModal.kind==="group"?"Categoría existente":"Descripción"}<input name="name" required autoFocus value={expenseModal.kind==="group"?undefined:(expenseModalTitle||undefined)} onChange={e=>setExpenseModalTitle(e.target.value)} placeholder={expenseModal.kind==="group"?"Ej. Alimentación":expenseModal.kind==="fixed"?"Ej. Alquiler":"Ej. Almuerzo"}/></label>{expenseModal.kind!=="group"?<><label>Categoría<select name="category" value={expenseModalCategory||undefined} onChange={e=>setExpenseModalCategory(e.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr",gap:"8px",alignItems:"flex-end",margin:"10px 0"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" value={expenseModalQuantity} onChange={e=>handleExpenseModalQuantityChange(e.target.value)} placeholder="1"/></label><label style={{margin:0}}>Unidad<select name="unit" value={expenseModalUnit} onChange={e=>setExpenseModalUnit(e.target.value)}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" value={expenseModalUnitPrice} onChange={e=>handleExpenseModalUnitPriceChange(e.target.value)} placeholder="0.00"/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={expenseModalAmount} onChange={e=>handleExpenseModalAmountChange(e.target.value)} placeholder="0.00" style={{fontWeight:700}}/></label></div></>:<label>Presupuesto mensual (S/)<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label>}</>}<div className="modal-actions"><button type="button" onClick={()=>setExpenseModal(null)}>Cancelar</button><button className="primary" type="submit">{expenseModal.kind==="group"?"Activar detalle":expenseModal.kind==="sub"?`Guardar ${subRows.length} subgasto${subRows.length===1?"":"s"}`:"Guardar gasto"}</button></div></form></div>}
    {expenseEdit&&(()=>{const group=expenseGroups.find(item=>item.id===expenseEdit.groupId);const item=expenseEdit.kind==="sub"?group?.items.find(entry=>entry.id===expenseEdit.itemId):undefined;if(!group||(expenseEdit.kind==="sub"&&!item))return null;const isGroup=expenseEdit.kind==="group";const groupPeriodItems=group.items.filter(entry=>(entry.period??initialPeriod)===activePeriod);const groupPeriodUsed=groupPeriodItems.reduce((sum,entry)=>sum+entry.amount,0);return <div className="modal-backdrop" onMouseDown={()=>setExpenseEdit(null)}><form className="modal" onSubmit={saveExpenseEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{isGroup?"Editar rubro":"Editar subgasto"}</h2><p>{isGroup?"Actualiza el nombre y el presupuesto. Los subgastos se conservan.":`Dentro del rubro ${group.name}.`}</p></div><button type="button" onClick={()=>setExpenseEdit(null)}><X/></button></div><label>{isGroup?"Nombre del rubro":"Descripción"}<input name="name" required autoFocus defaultValue={isGroup?group.name:item!.name}/></label>{!isGroup&&<><label>Categoría<select name="category" defaultValue={item!.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr",gap:"8px",alignItems:"flex-end",margin:"10px 0"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" defaultValue={item!.quantity||1}/></label><label style={{margin:0}}>Unidad<select name="unit" defaultValue={item!.unit||"unidad"}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" defaultValue={item!.unitPrice||(item!.amount/(item!.quantity||1))}/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0" step="0.01" defaultValue={item!.amount} style={{fontWeight:700}}/></label></div></>}{isGroup&&<label>Presupuesto mensual (S/)<input name="amount" required type="number" min="0" step="0.01" defaultValue={group.budget}/></label>}<div className="module-callout"><ReceiptText/><div><strong>{isGroup?`${groupPeriodItems.length} subgastos en ${monthNames[selectedMonth]}`:`Periodo: ${monthNames[selectedMonth]} ${selectedYear}`}</strong><span>{isGroup?`Total usado en ${monthNames[selectedMonth]}: S/ ${groupPeriodUsed.toLocaleString("es-PE",{minimumFractionDigits:2})}`:`Valor actual: S/ ${item!.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</span></div></div><div className="modal-actions"><button type="button" onClick={()=>setExpenseEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {detailedEdit&&(()=>{const item=(detailedEdit.section==="fixed"?fixedExpenses:monthlyExpenses).find(entry=>entry.id===detailedEdit.id);if(!item)return null;return <div className="modal-backdrop" onMouseDown={()=>setDetailedEdit(null)}><form className="modal" onSubmit={saveDetailedEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Editar {detailedEdit.section==="fixed"?"gasto fijo":"gasto mensual"}</h2><p>Actualiza los datos sin perder el registro.</p></div><button type="button" onClick={()=>setDetailedEdit(null)}><X/></button></div><label>Descripción<input name="name" required autoFocus defaultValue={item.name}/></label><label>Categoría<select name="category" defaultValue={item.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr",gap:"8px",alignItems:"flex-end",margin:"10px 0"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" defaultValue={item.quantity||1}/></label><label style={{margin:0}}>Unidad<select name="unit" defaultValue={item.unit||"unidad"}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" defaultValue={item.unitPrice||(item.amount/(item.quantity||1))}/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0" step="0.01" defaultValue={item.amount} style={{fontWeight:700}}/></label></div><div className="modal-actions"><button type="button" onClick={()=>setDetailedEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {showSavingGoalModal&&<div className="modal-backdrop" onMouseDown={()=>setShowSavingGoalModal(false)}><form className="modal" onSubmit={createSavingsGoal} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nueva meta de ahorro</h2><p>Define para qué ahorrarás y cuánto necesitas reunir.</p></div><button type="button" onClick={()=>setShowSavingGoalModal(false)}><X/></button></div><label>Nombre de la meta<input name="name" required autoFocus placeholder="Ej. Laptop"/></label><div className="form-row"><label>Monto objetivo (S/)<input name="target" required type="number" min="0.01" step="0.01" placeholder="3000"/></label><label>Aporte inicial (S/)<input name="amount" type="number" min="0" step="0.01" defaultValue="0"/></label></div><div className="modal-actions"><button type="button" onClick={()=>setShowSavingGoalModal(false)}>Cancelar</button><button className="primary" type="submit">Crear meta</button></div></form></div>}
    {savingContributionTarget!==null&&<div className="modal-backdrop" onMouseDown={()=>setSavingContributionTarget(null)}><form className="modal" onSubmit={contributeToSaving} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Movimiento de ahorro</h2><p>{savingContributionTarget==="general"?"Ahorro general sin destino específico.":`Meta: ${savingsGoals.find(goal=>goal.id===savingContributionTarget)?.name??""}`}</p></div><button type="button" onClick={()=>setSavingContributionTarget(null)}><X/></button></div><label>Operación<select name="operation"><option value="add">Agregar aporte</option><option value="withdraw">Retirar dinero</option></select></label><label>Monto (S/)<input name="amount" required autoFocus type="number" min="0.01" step="0.01" placeholder="0.00"/></label><div className="modal-actions"><button type="button" onClick={()=>setSavingContributionTarget(null)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {showBudgetModal&&<div className="modal-backdrop" onMouseDown={()=>setShowBudgetModal(false)}><form className="modal" onSubmit={addBudget} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo presupuesto</h2><p>Define el límite mensual de un rubro.</p></div><button type="button" onClick={()=>setShowBudgetModal(false)}><X/></button></div><label>Rubro<input name="name" required autoFocus placeholder="Ej. Alimentación"/></label><label>Límite mensual (S/)<input name="limit" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Color<select name="color"><option value="purple">Morado</option><option value="blue">Azul</option><option value="orange">Naranja</option><option value="teal">Verde</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setShowBudgetModal(false)}>Cancelar</button><button className="primary" type="submit">Crear presupuesto</button></div></form></div>}
    {editingMovement&&<div className="modal-backdrop" onMouseDown={()=>setEditingMovement(null)}><form className="modal" onSubmit={saveMovementEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Editar movimiento</h2><p>Actualiza este registro sin crear uno nuevo.</p></div><button type="button" onClick={()=>setEditingMovement(null)}><X/></button></div><label>Descripción<input name="title" required autoFocus defaultValue={editingMovement.title}/></label><div className="form-row"><label>Categoría<select name="category" defaultValue={editingMovement.category}>{(editingMovement.kind==="income"?incomeCategories:categories).map(category=><option key={category}>{category}</option>)}</select></label></div>{editingMovement.kind==="expense"?<div style={{display:"grid",gridTemplateColumns:"75px 105px 1fr 1fr",gap:"8px",alignItems:"flex-end",margin:"10px 0"}}><label style={{margin:0}}>Cantidad<input name="quantity" type="number" step="any" min="0.01" defaultValue={editingMovement.quantity||1}/></label><label style={{margin:0}}>Unidad<select name="unit" defaultValue={editingMovement.unit||"unidad"}>{commonUnits.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></label><label style={{margin:0}}>P. Unitario (S/)<input name="unitPrice" type="number" step="0.01" min="0.01" defaultValue={editingMovement.unitPrice||(editingMovement.amount/(editingMovement.quantity||1))}/></label><label style={{margin:0}}>Monto Total (S/)<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editingMovement.amount} style={{fontWeight:700}}/></label></div>:<label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editingMovement.amount}/></label>}<div className="modal-actions"><button type="button" onClick={()=>setEditingMovement(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>}
    {deleteConfirmation&&<div className="modal-backdrop" onMouseDown={()=>setDeleteConfirmation(null)}><section className="modal delete-confirmation" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">CONFIRMACIÓN</p><h2 id="delete-title">¿Eliminar registro?</h2><p>{deleteConfirmation.message}</p></div><button type="button" aria-label="Cerrar" onClick={()=>setDeleteConfirmation(null)}><X/></button></div><div className="modal-actions"><button type="button" onClick={()=>setDeleteConfirmation(null)}>Cancelar</button><button className="danger-action" type="button" onClick={()=>{const action=deleteConfirmation.onConfirm;setDeleteConfirmation(null);action();}}>Eliminar</button></div></section></div>}

    {closeMonthModal&&closeMonthModal.open&&<div className="modal-backdrop" onMouseDown={()=>setCloseMonthModal(null)}>
      <div className="modal" style={{maxWidth:"550px"}} onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">CIERRE CONTABLE</p>
            <h2>Cerrar {monthNames[closeMonthModal.month]} {closeMonthModal.year}</h2>
            <p>Revisa el balance contable final antes de archivar este período y pasar al siguiente mes.</p>
          </div>
          <button type="button" onClick={()=>setCloseMonthModal(null)}><X/></button>
        </div>

        <div className="transition-kpi-grid">
          <div className="transition-kpi-card">
            <span>Ingresos Totales</span>
            <strong style={{color:"var(--green)"}}>S/ {closeMonthModal.income.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
          </div>
          <div className="transition-kpi-card">
            <span>Gastos Totales</span>
            <strong style={{color:"var(--orange)"}}>S/ {closeMonthModal.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
          </div>
          <div className={`transition-kpi-card ${closeMonthModal.balance >= 0 ? "positive" : "negative"}`}>
            <span>Balance Neto</span>
            <strong style={{color:closeMonthModal.balance >= 0 ? "var(--green)" : "#dc2626"}}>{closeMonthModal.balance < 0 ? `-S/ ${Math.abs(closeMonthModal.balance).toLocaleString("es-PE",{minimumFractionDigits:2})}` : `S/ ${closeMonthModal.balance.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</strong>
          </div>
          <div className="transition-kpi-card savings">
            <span>Tasa de Ahorro</span>
            <strong>{closeMonthModal.savingsRate}%</strong>
          </div>
        </div>

        {closeMonthModal.balance > 0 ? (
          <div className="transition-section">
            <div className="transition-section-title">
              <span>💡 ¿Qué deseas hacer con el remanente disponible (S/ {closeMonthModal.balance.toLocaleString("es-PE",{minimumFractionDigits:2})})?</span>
            </div>
            <div className="remanente-options">
              <label className="remanente-option">
                <input
                  type="radio"
                  name="remanenteAction"
                  checked={closeMonthModal.remanenteAction === "saving"}
                  onChange={()=>setCloseMonthModal(prev=>prev?{...prev, remanenteAction: "saving"}:null)}
                />
                <div className="remanente-option-content">
                  <strong>🏦 Guardar en Reserva de Ahorro General (Recomendado)</strong>
                  <span>Suma los S/ {closeMonthModal.balance.toFixed(2)} a tu colchón financiero y lo aparta del consumo.</span>
                </div>
              </label>

              <label className="remanente-option">
                <input
                  type="radio"
                  name="remanenteAction"
                  checked={closeMonthModal.remanenteAction === "carryover"}
                  onChange={()=>setCloseMonthModal(prev=>prev?{...prev, remanenteAction: "carryover"}:null)}
                />
                <div className="remanente-option-content">
                  <strong>➡️ Trasladar como saldo inicial disponible en {monthNames[closeMonthModal.month === 11 ? 0 : closeMonthModal.month + 1]}</strong>
                  <span>Inicia el siguiente mes con este excedente listo para gastar.</span>
                </div>
              </label>

              <label className="remanente-option">
                <input
                  type="radio"
                  name="remanenteAction"
                  checked={closeMonthModal.remanenteAction === "none"}
                  onChange={()=>setCloseMonthModal(prev=>prev?{...prev, remanenteAction: "none"}:null)}
                />
                <div className="remanente-option-content">
                  <strong>🔒 Solo archivar mes</strong>
                  <span>No traslada saldos; cierra el período tal como está.</span>
                </div>
              </label>
            </div>
          </div>
        ) : (
          <div className="module-callout" style={{marginTop:"12px", borderColor:"#fecaca", background:"#fef2f2"}}>
            <ReceiptText/>
            <div>
              <strong style={{color:"#dc2626"}}>Mes con balance en déficit (-S/ {Math.abs(closeMonthModal.balance).toLocaleString("es-PE",{minimumFractionDigits:2})})</strong>
              <span style={{color:"#7f1d1d"}}>Tus gastos totales del mes superaron los ingresos registrados. No hay remanente excedente para transferir a ahorro. Al cerrar, el período quedará archivado como histórico contable.</span>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{marginTop:"20px"}}>
          <button type="button" onClick={()=>setCloseMonthModal(null)}>Cancelar</button>
          <button className="primary" type="button" onClick={proceedToMonthTransition}>
            Confirmar Cierre y Configurar {monthNames[closeMonthModal.month === 11 ? 0 : closeMonthModal.month + 1]} <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </div>}

    {monthTransitionModal&&monthTransitionModal.open&&<div className="modal-backdrop" onMouseDown={()=>setMonthTransitionModal(null)}>
      <form className="modal" style={{maxWidth:"600px"}} onSubmit={confirmMonthTransition} onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">ASISTENTE DE TRANSICIÓN</p>
            <h2>Configurar {monthNames[monthTransitionModal.toMonth]} {monthTransitionModal.toYear}</h2>
            <p>Selecciona exactamente qué elementos y previsiones deseas activar en tu nuevo mes.</p>
          </div>
          <button type="button" onClick={()=>setMonthTransitionModal(null)}><X/></button>
        </div>

        {/* 1. Sueldo base */}
        {monthTransitionModal.salaryAmount > 0 && (
          <div className="transition-section">
            <div className="transition-section-title">
              <span>💼 Ingreso de Sueldo Base</span>
            </div>
            <label className="transition-item">
              <div className="transition-item-left">
                <input
                  type="checkbox"
                  checked={monthTransitionModal.includeSalary}
                  onChange={e=>setMonthTransitionModal(prev=>prev?{...prev, includeSalary: e.target.checked}:null)}
                />
                <span>Registrar Sueldo de {monthNames[monthTransitionModal.toMonth]} automáticamente</span>
              </div>
              <strong className="transition-item-right">S/ {monthTransitionModal.salaryAmount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
            </label>
          </div>
        )}

        {/* 2. Gastos fijos */}
        {fixedExpenses.length > 0 && (
          <div className="transition-section">
            <div className="transition-section-title">
              <span>⚡ Gastos Fijos Recurrentes ({monthTransitionModal.selectedFixedIds.length}/{fixedExpenses.length})</span>
              <button
                type="button"
                style={{background:"none",border:"none",color:"var(--blue)",cursor:"pointer",fontSize:"11px",fontWeight:700}}
                onClick={()=>{
                  setMonthTransitionModal(prev => {
                    if (!prev) return null;
                    const allSelected = prev.selectedFixedIds.length === fixedExpenses.length;
                    return { ...prev, selectedFixedIds: allSelected ? [] : fixedExpenses.map(f => f.id) };
                  });
                }}
              >
                {monthTransitionModal.selectedFixedIds.length === fixedExpenses.length ? "Desmarcar todos" : "Seleccionar todos"}
              </button>
            </div>
            <div className="transition-checklist">
              {fixedExpenses.map(item => {
                const isChecked = monthTransitionModal.selectedFixedIds.includes(item.id);
                return (
                  <label className="transition-item" key={item.id}>
                    <div className="transition-item-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={()=>{
                          setMonthTransitionModal(prev => {
                            if (!prev) return null;
                            const ids = isChecked ? prev.selectedFixedIds.filter(id => id !== item.id) : [...prev.selectedFixedIds, item.id];
                            return { ...prev, selectedFixedIds: ids };
                          });
                        }}
                      />
                      <span>{item.name} <small style={{color:"var(--muted)"}}>({item.category})</small></span>
                    </div>
                    <strong className="transition-item-right">S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Reabastecimiento de Almacén sugerido */}
        {warehouseItems.length > 0 && (
          <div className="transition-section">
            <div className="transition-section-title">
              <span>📦 Reabastecimiento de Almacén Sugerido ({monthTransitionModal.selectedWarehouseItemIds.length})</span>
            </div>
            <div className="transition-checklist">
              {warehouseItems.slice(0, 6).map(item => {
                const isChecked = monthTransitionModal.selectedWarehouseItemIds.includes(item.id);
                return (
                  <label className="transition-item" key={item.id}>
                    <div className="transition-item-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={()=>{
                          setMonthTransitionModal(prev => {
                            if (!prev) return null;
                            const ids = isChecked ? prev.selectedWarehouseItemIds.filter(id => id !== item.id) : [...prev.selectedWarehouseItemIds, item.id];
                            return { ...prev, selectedWarehouseItemIds: ids };
                          });
                        }}
                      />
                      <span>{cleanProductName(item.name)} <small style={{color:"var(--muted)"}}>({item.packageType})</small></span>
                    </div>
                    <strong className="transition-item-right">S/ {item.estimatedPrice.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="module-callout" style={{marginTop:"14px"}}>
          <Layers3/>
          <div>
            <strong>Tus categorías de gasto comenzarán limpias</strong>
            <span>Categorías como <em>Mercado</em> o <em>Alimentación</em> mantendrán su presupuesto asignado y empezarán listas para registrar las compras de {monthNames[monthTransitionModal.toMonth]}.</span>
          </div>
        </div>

        <div className="modal-actions" style={{marginTop:"18px"}}>
          <button type="button" onClick={()=>setMonthTransitionModal(null)}>Cancelar</button>
          <button className="primary" type="submit">
            Comenzar {monthNames[monthTransitionModal.toMonth]} {monthTransitionModal.toYear} ✓
          </button>
        </div>
      </form>
    </div>}
    {notice&&<div className="toast">✓ {notice}</div>}
  </div>
}
