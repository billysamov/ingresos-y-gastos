"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Car, Check, ChevronDown, ChevronRight, Circle, CreditCard, Home as HomeIcon, Layers3, LayoutDashboard, Landmark, Menu, MoreHorizontal, Package, Pencil, PiggyBank, Plus, ReceiptText, Search, Settings, ShoppingBag, Smartphone, Target, Trash2, TrendingUp, Utensils, WalletCards, X, Zap } from "lucide-react";
import { deleteRelationalRecord, isSupabaseConfigured, loadRelationalFinanceState, saveRelationalFinanceState } from "../lib/supabase-state";

type ExpenseSource = "fixed"|"monthly"|"category";
type Tx = { id:number; dbId?:string; dbUpdatedAt?:string; title:string; category:string; account:string; date:string; amount:number; quantity?:number; unit?:string; unitPrice?:number; kind:"income"|"expense"; period?:string; expenseSource?:ExpenseSource; sourceId?:number; groupName?:string; savingDestination?:"general"|number; planned?:boolean; requiresConfirmation?:boolean; completed?:boolean };
type ExpenseEntry = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; category:string; amount:number; quantity?:number; unit?:string; unitPrice?:number; period?:string; account?:string; transactionId?:number; savingDestination?:"general"|number; requiresConfirmation?:boolean; completed?:boolean };
type ExpenseGroup = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; budget:number; items:ExpenseEntry[] };
type ExpenseModal = { kind:"fixed"|"monthly"|"group"|"sub"; groupId?:number } | null;
type ExpenseEdit = { kind:"group"; groupId:number } | { kind:"sub"; groupId:number; itemId:number } | null;
type Profile = { fullName:string; currency:string; monthlySalary?:number; autoRegisterSalary?:boolean };
type Budget = { id:number; name:string; limit:number; color:string };
type MonthAccess = { year:number; month:number };
type SavingsGoal = { id:number; dbId?:string; dbUpdatedAt?:string; name:string; target:number; amount:number };
type DeleteConfirmation = { message:string; onConfirm:()=>void };
type PantryItem = { id:number; dbId?:string; name:string; category:string; unit:string; defaultPrice:number };

const seed: Tx[] = [];
const fixedSeed: ExpenseEntry[] = [];
const monthlySeed: ExpenseEntry[] = [];
const groupSeed: ExpenseGroup[] = [];
const demoTransactionIds = new Set([1,2,3,4,5]);
const demoFixedExpenseIds = new Set([101,102,103,104]);
const demoMonthlyExpenseIds = new Set([201,202,203]);
const demoGroupIds = new Set([301,302]);
const initialPeriod = "2026-08";
const defaultCategories = ["Hogar","Transporte","Alimentación","Servicios","Suscripciones","Frutas","Abarrotes","Otros"];
const defaultIncomeCategories = ["Sueldo","Honorarios","Ventas","Freelance","Transferencia recibida","Reembolso","Otros ingresos"];
const defaultUnits = ["unid", "paq", "kg", "g", "litro", "bolsa", "caja", "bandeja", "lata", "botella", "docena"];
const defaultPantry: PantryItem[] = [
  { id: 1, name: "Pañales Babysec G 64", category: "Hogar", unit: "paq", defaultPrice: 54.00 },
  { id: 2, name: "Leche Gloria Azul (Pack 6)", category: "Alimentación", unit: "paq", defaultPrice: 22.50 },
  { id: 3, name: "Arroz Costeño 5kg", category: "Alimentación", unit: "bolsa", defaultPrice: 24.00 },
  { id: 4, name: "Aceite Primor 1L", category: "Alimentación", unit: "botella", defaultPrice: 9.50 },
  { id: 5, name: "Pechuga de Pollo 1kg", category: "Alimentación", unit: "kg", defaultPrice: 16.00 },
  { id: 6, name: "Huevos de Granja (Bandeja 30)", category: "Alimentación", unit: "bandeja", defaultPrice: 18.00 },
  { id: 7, name: "Detergente Bolívar 4.5kg", category: "Hogar", unit: "bolsa", defaultPrice: 38.00 },
  { id: 8, name: "Papel Higiénico Suave (Pack 12)", category: "Hogar", unit: "paq", defaultPrice: 19.50 },
  { id: 9, name: "Mandarinas / Frutas 1kg", category: "Frutas", unit: "kg", defaultPrice: 5.00 },
];

function legacyTransactionId(item: Partial<Tx>, index:number) {
  const fingerprint=[item.title,item.category,item.account,item.amount,item.period,index].join("|");
  let hash=0;
  for(let position=0;position<fingerprint.length;position++) hash=(hash*31+fingerprint.charCodeAt(position))>>>0;
  return 1_000_000_000+hash;
}

const nav = [
  ["Resumen", LayoutDashboard], ["Movimientos", WalletCards], ["Gastos", ReceiptText], ["Almacén", Package], ["Metas de ahorro", Target], ["Reportes", TrendingUp], ["Cuentas", Landmark],
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
function Account({logo,color,name,type,amount}:{logo:string,color:string,name:string,type:string,amount:string}) { return <article className="account-card card"><div className="account-logo" style={{background:color}}>{logo}</div><div><strong>{name}</strong><span>{type}</span></div><div className="account-balance"><strong>{amount}</strong><span>Saldo disponible</span></div><button><MoreHorizontal/></button></article> }
export default function Home() {
  function ModuleHeading({eyebrow,title,text,action}:{eyebrow:string,title:string,text:string,action?:React.ReactNode}) { return <div className="page-heading module-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div> }
  function MiniStat({label,value,tone="blue",plain=false}:{label:string,value:number,tone?:string,plain?:boolean}) { return <article className="card mini-stat"><span>{label}</span><strong>{plain?value:`S/ ${value.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</strong><i className={tone}/></article> }
  function TransactionList({items,onDelete,onToggle,onEdit}:{items:Tx[],onDelete:(id:number)=>void;onToggle:(item:Tx)=>void;onEdit:(item:Tx)=>void}) { return <div className="tx-list">{items.map(t=><div className="tx" key={`${t.expenseSource??"transaction"}-${t.id}`}><div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div><div className="tx-main"><strong>{t.title}</strong>{t.expenseSource&&<small className="transaction-origin">{expenseSourceLabel(t.expenseSource,t.groupName)}</small>}<span>{t.category} · {t.account}{t.quantity ? ` · ${t.quantity} ${t.unit || "unid"}` : ""}</span></div><div className="tx-date">{t.requiresConfirmation?(t.completed?"Realizado":"Pendiente"):t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div><div className="tx-actions">{t.requiresConfirmation&&<button className={`completion-toggle ${t.completed?"done":""}`} aria-label={`${t.completed?"Marcar pendiente":"Marcar realizado"} ${t.title}`} title={t.completed?"Realizado: volver a pendiente":"Marcar como realizado"} onClick={()=>onToggle(t)}>{t.completed?<Check size={15}/>:<Circle size={15}/>}</button>}{t.id>=0&&<button className="edit-tx" aria-label={`Editar ${t.title}`} title="Editar movimiento" onClick={()=>onEdit(t)}><Pencil size={14}/></button>}<button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>onDelete(t.id)}><Trash2 size={14}/></button></div></div>)}{items.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>No hay coincidencias en {monthNames[selectedMonth]} {selectedYear}.</span></div>}</div> }

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
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseEntry[]>(monthlySeed);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>(groupSeed);
  const [expenseModal, setExpenseModal] = useState<ExpenseModal>(null);
  const [subRows, setSubRows] = useState<number[]>([1]);
  const [subNames, setSubNames] = useState<Record<number,string>>({});
  const [subCategories, setSubCategories] = useState<Record<number,string>>({});
  const [subQuantities, setSubQuantities] = useState<Record<number,number>>({});
  const [subUnits, setSubUnits] = useState<Record<number,string>>({});
  const [subUnitPrices, setSubUnitPrices] = useState<Record<number,number>>({});
  const [subAmounts, setSubAmounts] = useState<Record<number,string>>({});
  const [subSavingDestinations, setSubSavingDestinations] = useState<Record<number,"general"|number>>({});
  const [pantry, setPantry] = useState<PantryItem[]>(defaultPantry);
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [editingPantryItem, setEditingPantryItem] = useState<PantryItem|null>(null);
  const [pantrySearch, setPantrySearch] = useState("");
  const [movementTitle, setMovementTitle] = useState("");
  const [movementQuantity, setMovementQuantity] = useState(1);
  const [movementUnit, setMovementUnit] = useState("unid");
  const [movementUnitPrice, setMovementUnitPrice] = useState<number|string>("");
  const [movementAmount, setMovementAmount] = useState<number|string>("");
  const [expenseEdit, setExpenseEdit] = useState<ExpenseEdit>(null);
  const [detailedEdit, setDetailedEdit] = useState<{section:"fixed"|"monthly";id:number}|null>(null);
  const [openGroups, setOpenGroups] = useState<number[]>([301]);
  const [profile, setProfile] = useState<Profile>({fullName:"Mi perfil",currency:"PEN"});
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryFormAmount, setSalaryFormAmount] = useState<number | string>("");
  const [salaryFormAccount, setSalaryFormAccount] = useState("BCP •• 2847");
  const [salaryFormUpdateBase, setSalaryFormUpdateBase] = useState(false);
  const [editingSalaryTxId, setEditingSalaryTxId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthAccess, setMonthAccess] = useState<MonthAccess>({year:2026,month:7});
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [incomeCategories, setIncomeCategories] = useState<string[]>(defaultIncomeCategories);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [incomeCategoryDraft, setIncomeCategoryDraft] = useState("");
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
              monthAccess: typeof remote.monthAccess === "object" && remote.monthAccess ? (remote.monthAccess as MonthAccess) : {year:2026,month:7},
              categories: Array.from(new Set([...defaultCategories, ...(Array.isArray(remote.categories) ? (remote.categories as string[]) : [])])).filter(c => c !== "Ahorro"),
              incomeCategories: Array.from(new Set([...defaultIncomeCategories, ...(Array.isArray(remote.incomeCategories) ? (remote.incomeCategories as string[]) : [])])),
            };
          }
          setSyncStatus("synced");
        } catch {
          setSyncStatus("setup");
        }
      } else {
        setSyncStatus("setup");
      }
      const plannedFixed = (source.fixedExpenses || []).map(item => ({ ...item, requiresConfirmation: item.requiresConfirmation ?? true }));
      const plannedMonthly = (source.monthlyExpenses || []).map(item => ({ ...item, requiresConfirmation: item.requiresConfirmation ?? true }));
      const plannedGroups = (source.expenseGroups || []).map(group => ({ ...group, items: (group.items || []).map(item => ({ ...item, requiresConfirmation: item.requiresConfirmation ?? true })) }));
      setTransactions(source.transactions || []);
      setSavings(source.savings || 0);
      setSavingsGoals(source.savingsGoals || []);
      setFixedExpenses(plannedFixed);
      setMonthlyExpenses(plannedMonthly);
      setExpenseGroups(plannedGroups);
      setProfile(source.profile);
      setBudgets(source.budgets || []);
      setMonthAccess(source.monthAccess);
      setCategories(source.categories || []);
      setIncomeCategories(source.incomeCategories || []);
      if (typeof source.monthAccess?.month === "number") {
        setSelectedMonth(source.monthAccess.month);
        setSelectedYear(source.monthAccess.year);
      }
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
  const activePeriod=`${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}`;
  const activeSubGroup=expenseModal?.kind==="sub"?expenseGroups.find(group=>group.id===expenseModal.groupId):undefined;
  const currentSubTotal=activeSubGroup?.items.reduce((sum,item)=>sum+item.amount,0)??0;
  const draftSubTotal=subRows.reduce((sum,row)=>sum+(Number(subAmounts[row])||0),0);
  const subAmountLimitExceeded=Boolean(activeSubGroup&&currentSubTotal+draftSubTotal>activeSubGroup.budget);
  const periodTransactions = useMemo(() => transactions.filter(t=>(t.period??initialPeriod)===activePeriod),[transactions,activePeriod]);
  const expenseEntriesForPeriod=useMemo(()=>[
    ...fixedExpenses.map(item=>({item,source:"fixed" as const})),
    ...monthlyExpenses.filter(item=>(item.period??initialPeriod)===activePeriod).map(item=>({item,source:"monthly" as const})),
    ...expenseGroups.map(group=>({item:{id:group.id,name:group.name,category:group.name,amount:group.budget,period:activePeriod} as ExpenseEntry,source:"category" as const})),
  ].filter(({item})=>!transactions.some(transaction=>transaction.kind==="expense"&&(transaction.id===item.transactionId||transaction.id===item.id))),[fixedExpenses,monthlyExpenses,expenseGroups,transactions,activePeriod]);
  const extraExpenseForPeriod=expenseEntriesForPeriod.reduce((sum,{item})=>sum+item.amount,0);
  // Los gastos creados desde "Gastos" no siempre nacen como una transacción.
  // Los representamos en el historial sin duplicar los que ya tienen movimiento.
  const detailedExpenseTransactions=useMemo<Tx[]>(()=>expenseEntriesForPeriod.map(entry=>({
    id:-Math.abs(entry.item.id), title:entry.item.name, category:entry.item.category,
    account:entry.item.account??"Efectivo", date:"Gasto registrado", amount:entry.item.amount,
    kind:"expense", period:activePeriod, expenseSource:entry.source, sourceId:entry.item.id,
    planned:true, requiresConfirmation:entry.item.requiresConfirmation, completed:entry.item.completed,
  })),[expenseEntriesForPeriod,activePeriod]);
  const allPeriodTransactions=useMemo(()=>[...periodTransactions,...detailedExpenseTransactions],[periodTransactions,detailedExpenseTransactions]);
  const extraExpenseAccumulated=useMemo(()=>[
    ...fixedExpenses,...monthlyExpenses,...expenseGroups.map(group=>({id:group.id,name:group.name,category:group.name,amount:group.budget,period:initialPeriod} as ExpenseEntry)),
  ].filter(item=>!transactions.some(transaction=>transaction.kind==="expense"&&(transaction.id===item.transactionId||transaction.id===item.id))).reduce((sum,item)=>sum+item.amount,0),[fixedExpenses,monthlyExpenses,expenseGroups,transactions]);
  const totals = useMemo(() => ({
    income: periodTransactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: periodTransactions.filter(t=>t.kind==="expense").reduce((a,b)=>a+b.amount,0)+extraExpenseForPeriod,
  }), [periodTransactions,extraExpenseForPeriod]);
  const actualTotals = useMemo(() => ({
    income: periodTransactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: periodTransactions.filter(t=>t.kind==="expense"&&(!t.planned||t.completed)).reduce((a,b)=>a+b.amount,0)+detailedExpenseTransactions.filter(t=>t.completed).reduce((a,b)=>a+b.amount,0),
  }), [periodTransactions,detailedExpenseTransactions]);

  const periodSalaryTx = useMemo(() => periodTransactions.find(t => t.kind === "income" && (t.category === "Sueldo" || t.title.toLowerCase().includes("sueldo"))), [periodTransactions]);
  const sueldoTx = useMemo(() => transactions.find(t => t.kind === "income" && (t.category === "Sueldo" || t.title.toLowerCase().includes("sueldo"))), [transactions]);
  const monthlySalary = (profile.monthlySalary && profile.monthlySalary > 0) ? profile.monthlySalary : (sueldoTx?.amount || 0);
  const hasSalaryInPeriod = Boolean(periodSalaryTx);
  const accumulatedTotals = useMemo(() => ({
    income: transactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: transactions.filter(t=>t.kind==="expense"&&(!t.planned||t.completed)).reduce((a,b)=>a+b.amount,0)+[...fixedExpenses,...monthlyExpenses,...expenseGroups.flatMap(group=>group.items)].filter(item=>item.completed&&!transactions.some(transaction=>transaction.kind==="expense"&&(transaction.id===item.transactionId||transaction.id===item.id))).reduce((sum,item)=>sum+item.amount,0),
  }), [transactions,fixedExpenses,monthlyExpenses,expenseGroups]);
  const balance = accumulatedTotals.income - accumulatedTotals.expense;
  const projectedBalance = totals.income - totals.expense;
  const chartMax = Math.max(totals.income, totals.expense, 1000);
  const visibleTransactions = allPeriodTransactions.filter(t => `${t.title} ${t.category} ${t.account}`.toLowerCase().includes(search.toLowerCase()));

  function selectPantryForSubRow(rowId: number, productId: number) {
    const product = pantry.find(p => p.id === productId);
    if (!product) return;
    const qty = subQuantities[rowId] || 1;
    const total = (qty * product.defaultPrice).toFixed(2);
    setSubNames(prev => ({ ...prev, [rowId]: product.name }));
    setSubCategories(prev => ({ ...prev, [rowId]: product.category }));
    setSubUnits(prev => ({ ...prev, [rowId]: product.unit }));
    setSubUnitPrices(prev => ({ ...prev, [rowId]: product.defaultPrice }));
    setSubQuantities(prev => ({ ...prev, [rowId]: qty }));
    setSubAmounts(prev => ({ ...prev, [rowId]: total }));
  }

  function handleSubQuantityChange(rowId: number, qty: number) {
    setSubQuantities(prev => ({ ...prev, [rowId]: qty }));
    const price = subUnitPrices[rowId];
    if (price && price > 0) {
      const total = (qty * price).toFixed(2);
      setSubAmounts(prev => ({ ...prev, [rowId]: total }));
    }
  }

  function handleSubUnitPriceChange(rowId: number, price: number) {
    setSubUnitPrices(prev => ({ ...prev, [rowId]: price }));
    const qty = subQuantities[rowId] || 1;
    if (qty > 0) {
      const total = (qty * price).toFixed(2);
      setSubAmounts(prev => ({ ...prev, [rowId]: total }));
    }
  }

  function handleSubAmountChange(rowId: number, amountStr: string) {
    setSubAmounts(prev => ({ ...prev, [rowId]: amountStr }));
    const amount = Number(amountStr) || 0;
    const qty = subQuantities[rowId] || 1;
    if (qty > 0 && amount > 0) {
      setSubUnitPrices(prev => ({ ...prev, [rowId]: +(amount / qty).toFixed(2) }));
    }
  }

  function savePantryItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const category = String(fd.get("category") || "Otros");
    const unit = String(fd.get("unit") || "unid");
    const defaultPrice = Number(fd.get("defaultPrice") || 0);
    if (!name || defaultPrice <= 0) {
      setNotice("Ingresa un nombre y precio válido");
      return;
    }
    if (editingPantryItem) {
      setPantry(prev => prev.map(item => item.id === editingPantryItem.id ? { ...item, name, category, unit, defaultPrice } : item));
      setNotice("Producto actualizado en Almacén");
    } else {
      const newItem: PantryItem = { id: Date.now(), name, category, unit, defaultPrice };
      setPantry(prev => [newItem, ...prev]);
      setNotice("Producto agregado al Almacén");
    }
    setShowPantryModal(false);
    setEditingPantryItem(null);
  }

  function deletePantryItem(id: number) {
    setPantry(prev => prev.filter(item => item.id !== id));
    setNotice("Producto eliminado del Almacén");
  }

  function quickExpenseFromPantry(product: PantryItem) {
    setMovementKind("expense");
    setExpenseType("monthly");
    setMovementTitle(product.name);
    setMovementCategory(product.category);
    setMovementQuantity(1);
    setMovementUnit(product.unit);
    setMovementUnitPrice(product.defaultPrice);
    setMovementAmount(product.defaultPrice);
    setShowModal(true);
  }

  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = fd.get("kind") as "income"|"expense";
    const id = Date.now();
    const title = String(fd.get("title") || movementTitle).trim();
    const category = String(fd.get("category") || movementCategory);
    const amount = Number(fd.get("amount") || movementAmount);
    const quantity = kind === "expense" ? (Number(fd.get("quantity")) || movementQuantity || 1) : undefined;
    const unit = kind === "expense" ? (String(fd.get("unit") || movementUnit || "unid")) : undefined;
    const unitPrice = kind === "expense" ? (Number(fd.get("unitPrice") || movementUnitPrice) || (quantity ? amount / quantity : undefined)) : undefined;
    const account = String(fd.get("account"));
    const source = kind === "expense" && expenseType !== "group" ? expenseType : undefined;
    const planned = kind === "expense" && fd.get("planned") === "on";
    const requiresConfirmation = planned && fd.get("requiresConfirmation") === "on";
    setTransactions(prev => {
      const next: Tx[] = [{ id, title, category, account, date:"Ahora", amount, quantity, unit, unitPrice, kind, period:activePeriod, expenseSource:source, sourceId:source?id:undefined, savingDestination:kind==="expense"&&category==="Ahorro"?savingDestination:undefined, planned, requiresConfirmation, completed:planned?false:true }, ...prev];
      return next;
    });
    if(kind==="expense"&&expenseType==="fixed") setFixedExpenses(items=>[{id,name:title,category,amount,quantity,unit,unitPrice,account,transactionId:id,requiresConfirmation,completed:planned?false:true},...items]);
    if(kind==="expense"&&expenseType==="monthly") setMonthlyExpenses(items=>[{id,name:title,category,amount,quantity,unit,unitPrice,account,period:activePeriod,transactionId:id,requiresConfirmation,completed:planned?false:true},...items]);
    if(kind==="expense"&&category==="Ahorro") {
      if(savingDestination==="general") setSavings(value=>value+amount);
      else setSavingsGoals(items=>items.map(goal=>goal.id===savingDestination?{...goal,amount:Math.min(goal.target,goal.amount+amount)}:goal));
    }
    setShowModal(false);
    setMovementTitle("");
    setMovementAmount("");
    setMovementUnitPrice("");
    setMovementQuantity(1);
    setMovementUnit("unid");
    setNotice(planned?"Pronóstico guardado como pendiente":"Movimiento registrado correctamente");
    setTimeout(()=>setNotice(""), 2600);
  }

  function saveMovementEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!editingMovement) return;
    const form=new FormData(e.currentTarget);
    const title=String(form.get("title")||"").trim();
    const category=String(form.get("category")||"Otros");
    const account=String(form.get("account")||"Efectivo");
    const amount=Number(form.get("amount")||0);
    if(!title||!Number.isFinite(amount)||amount<=0) { setNotice("Completa los datos correctamente"); return; }
    const id=editingMovement.id;
    setTransactions(items=>items.map(item=>item.id===id?{...item,title,category,account,amount}:item));
    if(editingMovement.expenseSource==="fixed"&&editingMovement.sourceId) setFixedExpenses(items=>items.map(item=>item.id===editingMovement.sourceId?{...item,name:title,category,account,amount}:item));
    if(editingMovement.expenseSource==="monthly"&&editingMovement.sourceId) setMonthlyExpenses(items=>items.map(item=>item.id===editingMovement.sourceId?{...item,name:title,category,account,amount}:item));
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
    e.preventDefault(); if(savingContributionTarget===null) return; const fd=new FormData(e.currentTarget); const amount=Number(fd.get("amount")||0); const operation=String(fd.get("operation")||"add"); const account=String(fd.get("account")||"BCP •• 2847");
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
      account,
      date: "Ahora",
      amount,
      kind: operation === "withdraw" ? "income" : "expense",
      period: activePeriod,
    };
    setTransactions(prev => [tx, ...prev]);

    setSavingContributionTarget(null);
    setNotice(operation === "withdraw" ? `Retiro de S/ ${amount} registrado` : `Aporte de S/ ${amount} registrado (${account})`);
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
      if(source==="fixed") { const expense=fixedExpenses.find(item=>item.id===expenseId); void deleteRelationalRecord("fixed_expenses",expense?.dbId,expenseId);setFixedExpenses(items=>items.filter(item=>item.id!==expenseId)); }
      if(source==="monthly") { const expense=monthlyExpenses.find(item=>item.id===expenseId); void deleteRelationalRecord("monthly_expenses",expense?.dbId,expenseId);setMonthlyExpenses(items=>items.filter(item=>item.id!==expenseId)); }
      if(source==="category") { const group=expenseGroups.find(item=>item.id===expenseId); void deleteRelationalRecord("expense_groups",group?.dbId,expenseId);setExpenseGroups(groups=>groups.filter(group=>group.id!==expenseId)); }
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
    void deleteRelationalRecord("transactions",transaction?.dbId,id);
    if(id>=0) setTransactions(previous=>previous.filter(item=>item.id!==id));
    setNotice(source?`${expenseSourceLabel(source)} eliminado`:"Movimiento eliminado y saldo de ahorro revertido");
  }

  function toggleExpenseCompletion(item:Tx) {
    const completed=!item.completed;
    if(item.expenseSource&&item.sourceId) {
      if(item.expenseSource==="fixed") setFixedExpenses(items=>items.map(entry=>entry.id===item.sourceId?{...entry,completed}:entry));
      if(item.expenseSource==="monthly") setMonthlyExpenses(items=>items.map(entry=>entry.id===item.sourceId?{...entry,completed}:entry));
      if(item.expenseSource==="category") setExpenseGroups(groups=>groups.map(group=>group.id===item.sourceId?{...group,completed}:group));
    }
    setTransactions(items=>items.map(entry=>entry.id===item.id||entry.sourceId===item.sourceId?{...entry,completed}:entry));
    setNotice(completed?`${item.title} marcado como realizado`:`${item.title} volvió a pendiente`);
  }

  function toggleDetailedCompletion(section:"fixed"|"monthly",id:number) {
    const current=(section==="fixed"?fixedExpenses:monthlyExpenses).find(item=>item.id===id);
    if(!current) return;
    const completed=!current.completed;
    const update=(items:ExpenseEntry[])=>items.map(item=>item.id===id?{...item,completed}:item);
    if(section==="fixed") setFixedExpenses(update); else setMonthlyExpenses(update);
    setTransactions(items=>items.map(item=>item.id===id||item.sourceId===id?{...item,completed}:item));
    setNotice(completed?`${current.name} marcado como realizado`:`${current.name} volvió a pendiente`);
  }

  function toggleSubExpenseCompletion(groupId:number,itemId:number) {
    const item=expenseGroups.find(group=>group.id===groupId)?.items.find(entry=>entry.id===itemId);
    if(!item) return;
    const completed=!item.completed;
    setExpenseGroups(groups=>groups.map(group=>group.id===groupId?{...group,items:group.items.map(entry=>entry.id===itemId?{...entry,completed}:entry)}:group));
    setNotice(completed?`${item.name} marcado como realizado`:`${item.name} volvió a pendiente`);
  }

  function addDetailedExpense(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!expenseModal) return;
    const fd=new FormData(e.currentTarget);
    const name=String(fd.get("name")||"").trim();
    const amount=Number(fd.get("amount")||0);
    const category=String(fd.get("category")||"Otros");
    const account=String(fd.get("account")||"Efectivo");
    const id=Date.now();
    if(expenseModal.kind==="group"&&!categories.some(item=>item.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Primero crea esta categoría en Configuración"); return; }
    if(expenseModal.kind==="group"&&expenseGroups.some(group=>group.name.toLocaleLowerCase()===name.toLocaleLowerCase())) { setNotice("Esta categoría ya tiene un detalle creado"); return; }
    // Los gastos creados desde el plan se confirman al momento de pagarlos.
    // Los registros antiguos se conservan como pronósticos sin modificar.
    const requiresConfirmation=expenseModal.kind!=="group";
    if(expenseModal.kind==="fixed") setFixedExpenses(items=>[{id,name,category,amount,account,requiresConfirmation,completed:false},...items]);
    if(expenseModal.kind==="monthly") setMonthlyExpenses(items=>[{id,name,category,amount,account,period:activePeriod,requiresConfirmation,completed:false},...items]);
    if(expenseModal.kind==="group") {
      setExpenseGroups(groups=>[{id,name,budget:amount,items:[]},...groups]);
      setOpenGroups(groups=>[id,...groups]);
    }
    if(expenseModal.kind==="sub"&&expenseModal.groupId) {
      const names=fd.getAll("name").map(value=>String(value).trim());
      const amounts=fd.getAll("amount").map(value=>Number(value));
      const rowCategories=fd.getAll("category").map(value=>String(value));
      const quantities=fd.getAll("quantity").map(value=>Number(value)||1);
      const units=fd.getAll("unit").map(value=>String(value)||"unid");
      const entries=names.map((entry,index)=>({
        id:id+index,
        name:entry,
        category:rowCategories[index]||"Otros",
        amount:amounts[index],
        quantity:quantities[index]||1,
        unit:units[index]||"unid",
        unitPrice:amounts[index]/(quantities[index]||1),
        account,
        period:activePeriod,
        requiresConfirmation,
        savingDestination:rowCategories[index]==="Ahorro"?(subSavingDestinations[subRows[index]]??"general"):undefined
      })).filter(entry=>entry.name&&Number.isFinite(entry.amount)&&entry.amount>0);
      const group=expenseGroups.find(item=>item.id===expenseModal.groupId);
      const periodGroupItems=group?.items.filter(item=>(item.period??initialPeriod)===activePeriod)??[];
      const used=periodGroupItems.reduce((sum,item)=>sum+item.amount,0);
      if(group&&used+entries.reduce((sum,item)=>sum+item.amount,0)>group.budget) { setNotice(`Excedes el monto definido por S/ ${(used+entries.reduce((sum,item)=>sum+item.amount,0)-group.budget).toLocaleString("es-PE",{minimumFractionDigits:2})}`); return; }
      setExpenseGroups(groups=>groups.map(group=>group.id===expenseModal.groupId?{...group,items:[...group.items,...entries]}:group));
      setOpenGroups(groups=>groups.includes(expenseModal.groupId!)?groups:[...groups,expenseModal.groupId!]);
      const generalContribution=entries.filter(entry=>entry.category==="Ahorro"&&entry.savingDestination==="general").reduce((sum,entry)=>sum+entry.amount,0);
      if(generalContribution) setSavings(value=>value+generalContribution);
      for(const entry of entries.filter(entry=>entry.category==="Ahorro"&&typeof entry.savingDestination==="number")) setSavingsGoals(goals=>goals.map(goal=>goal.id===entry.savingDestination?{...goal,amount:Math.min(goal.target,goal.amount+entry.amount)}:goal));
    }
    setExpenseModal(null);
    setSubRows([1]);
    setSubNames({});
    setSubQuantities({});
    setSubUnits({});
    setSubUnitPrices({});
    setSubAmounts({});
    setSubCategories({});
    setSubSavingDestinations({});
    setNotice(expenseModal.kind==="group"?"Detalle de categoría creado correctamente":"Gasto registrado correctamente");
  }

  function duplicateFixedExpense(item:ExpenseEntry) {
    setFixedExpenses(items=>[{...item,id:Date.now(),name:`${item.name} (copia)`},...items]);
    setNotice("Pago fijo duplicado; puedes editarlo antes de usarlo");
  }

  function openSubExpenseForm(groupId:number) { setSubRows([Date.now()]);setExpenseModal({kind:"sub",groupId}); }

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
    if(!name||!Number.isFinite(amount)||amount<0) { setNotice("Completa los datos correctamente"); return; }
    const update=(items:ExpenseEntry[])=>items.map(item=>item.id===detailedEdit.id?{...item,name,category,amount}:item);
    if(detailedEdit.section==="fixed") setFixedExpenses(update); else setMonthlyExpenses(update);
    setTransactions(items=>items.map(item=>item.id===detailedEdit.id?{...item,title:name,category,amount}:item));
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
    else { const category=String(fd.get("category")||"Otros"); setExpenseGroups(groups=>groups.map(group=>group.id===expenseEdit.groupId?{...group,items:group.items.map(item=>item.id===expenseEdit.itemId?{...item,name,amount,category}:item)}:group)); }
    setExpenseEdit(null);setNotice("Cambios guardados correctamente");
  }

  function openSalaryModal(existingTx?: Tx) {
    if (existingTx) {
      setEditingSalaryTxId(existingTx.id);
      setSalaryFormAmount(existingTx.amount);
      setSalaryFormAccount(existingTx.account || "BCP •• 2847");
      setSalaryFormUpdateBase(false);
    } else {
      setEditingSalaryTxId(null);
      setSalaryFormAmount(monthlySalary > 0 ? monthlySalary : "");
      setSalaryFormAccount("BCP •• 2847");
      setSalaryFormUpdateBase(false);
    }
    setShowSalaryModal(true);
  }

  function handleSaveSalary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(salaryFormAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Ingresa un monto de sueldo válido");
      return;
    }
    const account = salaryFormAccount || "BCP •• 2847";
    const salaryTitle = `Sueldo ${monthNames[selectedMonth]} ${selectedYear}`;

    if (editingSalaryTxId !== null) {
      setTransactions(items => items.map(item => item.id === editingSalaryTxId ? {
        ...item,
        amount,
        account,
        title: item.title || salaryTitle,
        category: "Sueldo",
        kind: "income" as const,
        period: activePeriod,
      } : item));
      setNotice(`Sueldo de ${monthNames[selectedMonth]} actualizado a S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`);
    } else {
      const id = Date.now();
      const salaryTx: Tx = {
        id,
        title: salaryTitle,
        category: "Sueldo",
        account,
        date: "Ahora",
        amount,
        kind: "income",
        period: activePeriod,
      };
      setTransactions(prev => [salaryTx, ...prev]);
      setNotice(`Sueldo de ${monthNames[selectedMonth]} (S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}) registrado`);
    }

    if (salaryFormUpdateBase) {
      setProfile(prev => ({ ...prev, monthlySalary: amount }));
    }

    setShowSalaryModal(false);
  }

  function registerMonthlySalary() {
    openSalaryModal(periodSalaryTx);
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

  function isPeriodEnabled(year:number,month:number) {
    return year<monthAccess.year || (year===monthAccess.year&&month<=monthAccess.month);
  }

  function closeMonth() {
    const next=selectedMonth===11?{year:selectedYear+1,month:0}:{year:selectedYear,month:selectedMonth+1};
    if(!isPeriodEnabled(selectedYear,selectedMonth)) { setNotice("Este período todavía no está habilitado"); return; }
    const nextIsLater=next.year>monthAccess.year||(next.year===monthAccess.year&&next.month>monthAccess.month);
    if(nextIsLater) setMonthAccess(next);
    setSelectedYear(next.year);setSelectedMonth(next.month);
    const nextPeriod=`${next.year}-${String(next.month+1).padStart(2,"0")}`;
    if(profile.autoRegisterSalary && profile.monthlySalary && profile.monthlySalary > 0) {
      const hasSalaryInNext = transactions.some(t => (t.period ?? initialPeriod) === nextPeriod && t.kind === "income" && (t.category === "Sueldo" || t.title.toLowerCase().includes("sueldo")));
      if (!hasSalaryInNext) {
        const id = Date.now();
        const salaryTx: Tx = {
          id,
          title: `Sueldo ${monthNames[next.month]} ${next.year}`,
          category: "Sueldo",
          account: "BCP •• 2847",
          date: "Ahora",
          amount: profile.monthlySalary,
          kind: "income",
          period: nextPeriod,
        };
        setTransactions(prev => [salaryTx, ...prev]);
      }
    }
    setNotice(`${monthNames[selectedMonth]} cerrado. ${monthNames[next.month]} ${next.year} ya está habilitado.`);
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

  const categoryExpenseItems=[
    ...periodTransactions.filter(t=>t.kind==="expense"),
    ...expenseEntriesForPeriod.filter(entry=>entry.source!=="category").map(({item})=>item),
    ...expenseGroups.flatMap(group=>{
      const periodItems = group.items.filter(item => (item.period ?? initialPeriod) === activePeriod);
      const detailed = periodItems.reduce((sum,item)=>sum+item.amount,0);
      const remaining = Math.max(0,group.budget-detailed);
      return [...periodItems,...(remaining?[{id:-group.id,name:`Pendiente de ${group.name}`,category:group.name,amount:remaining}]:[])];
    }),
  ];
  const expenseByCategory = categoryExpenseItems.reduce<Record<string,number>>((result,item)=>{
    result[item.category]=(result[item.category]||0)+item.amount;
    return result;
  },Object.fromEntries(categories.map(category=>[category,0])) as Record<string,number>);
  const dashboardCategories=Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]);
  const dashboardPalette=["#8957da","#1767e8","#ff9148","#35bdb4","#ed5d92","#d3a336","#6476d9","#8492a6"];
  const dashboardCategoryTotal=dashboardCategories.reduce((sum,[,value])=>sum+value,0);
  const dashboardDonut=dashboardCategoryTotal?`conic-gradient(${dashboardCategories.filter(([,value])=>value>0).map(([name,value],index)=>`${dashboardPalette[index%dashboardPalette.length]} ${dashboardCategories.filter(([,amount])=>amount>0).slice(0,index).reduce((sum,[,amount])=>sum+amount/dashboardCategoryTotal*100,0)}% ${dashboardCategories.filter(([,amount])=>amount>0).slice(0,index+1).reduce((sum,[,amount])=>sum+amount/dashboardCategoryTotal*100,0)}%`).join(",")})`:"conic-gradient(#edf0f5 0 100%)";
  function inspectCategory(category:string) { setSearch(category); activateModule("Movimientos"); }
  const fixedTotal=fixedExpenses.reduce((sum,item)=>sum+item.amount,0);
  const monthlyForPeriod=monthlyExpenses.filter(item=>(item.period??initialPeriod)===activePeriod);
  const monthlyTotal=monthlyForPeriod.reduce((sum,item)=>sum+item.amount,0);
  const groupedTotal=expenseGroups.reduce((sum,group)=>sum+group.budget,0);

  const netMonthBalance = totals.income - totals.expense;
  const extraIncome = Math.max(0, totals.income - monthlySalary);

  function moduleContent() {
    if(active==="Movimientos") return <>
      <ModuleHeading eyebrow="REGISTROS" title="Movimientos" text="Consulta, busca y administra todos tus ingresos y gastos." action={<button className="primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Nuevo movimiento</button>}/>
      {!hasSalaryInPeriod && (
        <div className="module-callout" style={{background:"#f0fdf4", borderColor:"#bbf7d0", color:"#166534", marginBottom:"16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"12px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
            <BriefcaseBusiness size={22} style={{color:"#16a34a", flexShrink:0}}/>
            <div>
              <strong style={{color:"#15803d", fontSize:"13px"}}>Sueldo de {monthNames[selectedMonth]} aún no registrado</strong>
              <p style={{margin:0, fontSize:"11px", color:"#166534"}}>
                {monthlySalary > 0 ? `Tu sueldo base referencial es S/ ${monthlySalary.toLocaleString("es-PE")}. Regístralo o ajusta el monto para este mes.` : "Define tu sueldo para conectar tus ingresos con el mes actual."}
              </p>
            </div>
          </div>
          <button className="primary" onClick={()=>openSalaryModal()} style={{fontSize:"12px", padding:"8px 14px", height:"auto", whiteSpace:"nowrap", flexShrink:0}}>
            <Plus size={15}/> {monthlySalary > 0 ? `Registrar sueldo (S/ ${monthlySalary.toLocaleString("es-PE")})` : "Registrar sueldo"}
          </button>
        </div>
      )}
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
      {expenseTab!=="groups"&&<article className="card module-card expense-list-card"><div className="card-title"><div><h2>{expenseTab==="fixed"?"Pagos que se repiten cada mes":`Gastos variables de ${monthNames[selectedMonth]}`}</h2><p>{expenseTab==="fixed"?"Alquiler, ahorro, pasajes y servicios recurrentes.":"Solo se muestran los consumos del período seleccionado."}</p></div></div><div className="expense-rows">{(expenseTab==="fixed"?fixedExpenses:monthlyForPeriod).map(item=><div className="expense-row" key={item.id}><div className="expense-row-left"><div className={`expense-kind-icon ${item.category==="Ahorro"?"saving":""}`}>{categoryIcon(item.category,"expense")}</div><div className="expense-row-info"><strong>{item.name}</strong><span>{item.category} · {item.account||"Efectivo"}{item.quantity ? ` · ${item.quantity} ${item.unit || "unid"}` : ""} · {item.requiresConfirmation?(item.completed?"Realizado":"Pendiente de pago"):"Pronóstico"}</span></div></div><div className="expense-row-right"><strong className="expense-value">S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>{item.requiresConfirmation&&<button className={`completion-toggle ${item.completed?"done":""}`} onClick={()=>toggleDetailedCompletion(expenseTab,item.id)} title={item.completed?"Realizado: volver a pendiente":"Marcar como realizado"}>{item.completed?<Check size={15}/>:<Circle size={15}/>}</button>}{expenseTab==="fixed"&&<button className="add-subexpense" onClick={()=>duplicateFixedExpense(item)}>Duplicar</button>}<button className="add-subexpense" onClick={()=>setDetailedEdit({section:expenseTab,id:item.id})}>Editar</button><button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeDetailedExpense(expenseTab,item.id)}><Trash2 size={15}/></button></div></div>)}{(expenseTab==="fixed"?fixedExpenses:monthlyForPeriod).length===0&&<div className="empty-state"><ReceiptText/><strong>Aún no tienes gastos en este período</strong><span>Usa “Agregar gasto” para registrarlo en {monthNames[selectedMonth]}.</span></div>}</div></article>}
      {expenseTab==="groups"&&<section className="expense-groups">{expenseGroups.map(group=>{const periodItems=group.items.filter(item=>(item.period??initialPeriod)===activePeriod);const total=periodItems.reduce((sum,item)=>sum+item.amount,0);const open=openGroups.includes(group.id);return <article className="card expense-group" key={group.id}><div className="expense-group-head"><button className="expense-group-toggle" onClick={()=>setOpenGroups(items=>items.includes(group.id)?items.filter(id=>id!==group.id):[...items,group.id])}><ChevronRight className={open?"open":""} size={18}/><div><strong>{group.name}</strong><span>{periodItems.length} subgastos en {monthNames[selectedMonth]} · Monto definido S/ {group.budget.toLocaleString("es-PE")}</span></div></button><div className="expense-group-total"><span>Detalle registrado ({monthNames[selectedMonth]})</span><strong>S/ {total.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div><button className="add-subexpense" onClick={()=>editExpenseGroup(group.id)}>Editar</button><button className="add-subexpense" onClick={()=>setExpenseModal({kind:"sub",groupId:group.id})}><Plus size={16}/>Subgasto</button><button className="expense-delete" aria-label={`Eliminar categoría ${group.name}`} onClick={()=>{setExpenseGroups(groups=>groups.filter(item=>item.id!==group.id));setNotice("Detalle de categoría eliminado")}}><Trash2 size={15}/></button></div><div className="progress group-progress"><i className={total>group.budget?"danger":""} style={{width:`${Math.min(100,total/group.budget*100)}%`}}/></div>{open&&<div className="subexpense-list">{periodItems.map(item=><div className="subexpense-row" key={item.id}><div className="subexpense-row-left"><span className="subexpense-dot"/><div className="subexpense-row-info"><strong>{item.name}</strong><span>{item.category}{item.quantity ? ` · ${item.quantity} ${item.unit || "unid"}` : ""} · {item.requiresConfirmation?(item.completed?"Realizado":"Pendiente"):"Pronóstico"}</span></div></div><div className="subexpense-row-right"><strong className="subexpense-value">S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>{item.requiresConfirmation&&<button className={`completion-toggle ${item.completed?"done":""}`} onClick={()=>toggleSubExpenseCompletion(group.id,item.id)} title={item.completed?"Realizado: volver a pendiente":"Marcar como realizado"}>{item.completed?<Check size={15}/>:<Circle size={15}/>}</button>}<button className="add-subexpense" onClick={()=>editSubExpense(group.id,item.id)}>Editar</button><button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeSubExpense(group.id,item.id)}><Trash2 size={14}/></button></div></div>)}{periodItems.length===0&&<div className="empty-subexpenses">Esta categoría todavía no tiene subgastos en {monthNames[selectedMonth]} {selectedYear}. Usa “+ Subgasto” para agregar uno este mes.</div>}</div>}</article>})}{expenseGroups.length===0&&<article className="card empty-state group-empty"><Layers3/><strong>Activa el detalle de tu primera categoría</strong><span>Las categorías se crean desde Configuración.</span></article>}</section>}
    </>;
    if(active==="Almacén") return <>
      <ModuleHeading eyebrow="CATÁLOGO DE COMPRAS HABITUALES" title="Almacén" text="Administra tus productos frecuentes con sus unidades de medida y precios referenciales para autocompletar tus gastos." action={<button className="primary" onClick={()=>{setEditingPantryItem(null);setShowPantryModal(true);}}><Plus size={18}/>Nuevo producto</button>}/>
      <section className="module-stats">
        <MiniStat label="Productos en almacén" value={pantry.length} plain tone="blue"/>
        <MiniStat label="Categorías cubiertas" value={new Set(pantry.map(p=>p.category)).size} plain tone="green"/>
        <MiniStat label="Precio referencial prom." value={pantry.length ? pantry.reduce((sum,p)=>sum+p.defaultPrice,0)/pantry.length : 0} tone="orange"/>
      </section>
      <article className="card module-card">
        <div className="card-title" style={{flexWrap:"wrap",gap:"12px"}}>
          <div>
            <h2>Productos y compras frecuentes</h2>
            <p>Selecciónalos rápidamente al crear gastos fijos, mensuales o subgastos.</p>
          </div>
          <div className="search" style={{maxWidth:"300px"}}>
            <Search size={16}/>
            <input placeholder="Buscar producto o categoría..." value={pantrySearch} onChange={e=>setPantrySearch(e.target.value)}/>
          </div>
        </div>
        <div className="pantry-grid">
          {pantry.filter(p=>p.name.toLowerCase().includes(pantrySearch.toLowerCase()) || p.category.toLowerCase().includes(pantrySearch.toLowerCase())).map(product=>(
            <article className="card pantry-card" key={product.id}>
              <div className="pantry-card-head">
                <div className="pantry-card-info">
                  <div className="pantry-card-icon">
                    <Package size={20}/>
                  </div>
                  <div className="pantry-card-titles">
                    <strong>{product.name}</strong>
                    <span>{product.category} · Unidad: <strong>{product.unit}</strong></span>
                  </div>
                </div>
                <button className="expense-delete" aria-label={`Eliminar ${product.name}`} onClick={()=>deletePantryItem(product.id)}>
                  <Trash2 size={15}/>
                </button>
              </div>
              <div className="pantry-card-price">
                <strong>S/ {product.defaultPrice.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong>
                <small>por {product.unit}</small>
              </div>
              <div className="pantry-card-actions">
                <button className="outline" onClick={()=>{setEditingPantryItem(product);setShowPantryModal(true);}}>
                  <Pencil size={13}/> Editar
                </button>
                <button className="primary" onClick={()=>quickExpenseFromPantry(product)}>
                  <Plus size={14}/> Comprar / Gasto
                </button>
              </div>
            </article>
          ))}
          {pantry.filter(p=>p.name.toLowerCase().includes(pantrySearch.toLowerCase()) || p.category.toLowerCase().includes(pantrySearch.toLowerCase())).length===0 && (
            <div className="empty-state" style={{gridColumn:"1 / -1"}}>
              <Package size={24}/>
              <strong>No encontramos productos en el almacén</strong>
              <span>Agrega productos habituales para usarlos al registrar gastos.</span>
            </div>
          )}
        </div>
      </article>
    </>;
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
                <span>{t.date} · {t.account}</span>
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
    </>;
    return <>
      <ModuleHeading eyebrow="CUENTAS VINCULADAS" title="Cuentas" text="Visualiza los saldos de tus bancos y billeteras digitales." action={<button className="primary" onClick={()=>setNotice("Modo de prueba: integración con APIs bancarias pendiente")}><Plus size={18}/>Conectar cuenta</button>}/>
      <article className="card module-card empty-state"><Landmark/><strong>Aún no tienes cuentas registradas</strong><span>Conecta o registra una cuenta para ver su saldo aquí.</span></article>
      <article className="card module-card"><div className="module-callout"><Landmark/><div><strong>Conexiones en modo demostración</strong><span>Los saldos son referenciales. La conexión real requiere autorización y APIs oficiales de cada entidad.</span></div></div></article>
    </>;
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

    <main>
      <header>
        <button className="menu" onClick={()=>setMobile(true)}><Menu/></button>
        <div className="search"><Search size={18}/><input aria-label="Buscar movimientos" value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim()) activateModule("Movimientos")}} placeholder="Buscar movimientos..." />{search&&<button aria-label="Limpiar búsqueda" onClick={()=>setSearch("")}><X size={15}/></button>}</div>
        <div className="header-actions"><span className={`sync-status ${syncStatus}`}>{syncStatus==="synced"?"Guardado en Supabase":syncStatus==="saving"?"Guardando en Supabase…":syncStatus==="setup"?"Supabase: revisar conexión":"Conectando a Supabase…"}</span><button className="icon-button"><Bell size={19}/><i/></button><div className="month-picker"><button className="month" onClick={()=>setShowMonthPicker(open=>!open)}>{monthNames[selectedMonth]} {selectedYear} <ChevronDown size={16}/></button>{showMonthPicker&&<div className="month-menu"><div className="month-menu-head"><button type="button" onClick={()=>setSelectedYear(year=>year-1)}>‹</button><strong>{selectedYear}</strong><button type="button" onClick={()=>setSelectedYear(year=>year+1)}>›</button></div><div className="month-options">{monthNames.map((name,index)=>{const enabled=isPeriodEnabled(selectedYear,index);return <button type="button" disabled={!enabled} className={index===selectedMonth?"selected":""} key={name} onClick={()=>{if(!enabled) return;setSelectedMonth(index);setShowMonthPicker(false);setNotice(`Periodo seleccionado: ${name} ${selectedYear}`)}}>{name.slice(0,3)}</button>})}</div></div>}</div><button className="outline" type="button" onClick={closeMonth}>Cerrar {monthNames[selectedMonth]}</button><button className="primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Nuevo movimiento</button></div>
      </header>

      <div className="content">
        {active!=="Resumen" ? moduleContent() : <>
        <div className="page-heading"><div><p className="eyebrow">PERÍODO: {monthNames[selectedMonth].toUpperCase()} {selectedYear}</p><h1>Buenos días, {profile.fullName} <span>👋</span></h1><p>Aquí tienes el resumen de tus finanzas de {monthNames[selectedMonth].toLowerCase()}.</p></div><button className="mobile-add primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Registrar</button></div>

        <section className="metrics">
          <Metric label="Saldo real" value={balance} delta="Solo pagos realizados" icon={<WalletCards/>} tone="blue" />
          <Metric label="Saldo proyectado" value={projectedBalance} delta="Incluye gastos pendientes" icon={<TrendingUp/>} tone="purple" />
          <Metric label="Gastos realizados" value={actualTotals.expense} delta={`Pronóstico: S/ ${totals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}`} icon={<ArrowUpRight/>} tone="orange" />
          <Metric label="Ahorro total" value={savings+savingsGoals.reduce((sum,goal)=>sum+goal.amount,0)} delta="Reserva general y metas" icon={<PiggyBank/>} tone="purple"/>
        </section>

        <article className="card module-card" style={{margin:"0 0 25px 0", padding:"22px"}}>
          <div className="card-title">
            <div>
              <h2>Análisis de Ingresos vs. Gastos y Ahorro ({monthNames[selectedMonth]} {selectedYear})</h2>
              <p>Desglose de tus ingresos totales (Sueldo + Extras), gastos de consumo y el monto apartado a reserva de ahorro</p>
            </div>
            {hasSalaryInPeriod && periodSalaryTx ? (
              <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                <span className="sync-status synced">✓ Sueldo registrado (S/ {periodSalaryTx.amount.toLocaleString("es-PE", {minimumFractionDigits: 2})})</span>
                <button className="category-details" onClick={()=>openSalaryModal(periodSalaryTx)} title="Modificar sueldo de este mes" style={{display:"inline-flex", alignItems:"center", gap:"5px", padding:"6px 10px", fontSize:"11px"}}>
                  <Pencil size={13}/> Modificar
                </button>
              </div>
            ) : (
              <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                <button className="primary" onClick={()=>openSalaryModal()} style={{display:"inline-flex", alignItems:"center", gap:"6px"}}>
                  <Plus size={16}/> Registrar sueldo del mes (S/ {monthlySalary.toLocaleString("es-PE")})
                </button>
              </div>
            )}
          </div>
          <div className="salary-stats-grid" style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"14px", marginTop:"16px"}}>
            <div style={{background:"#f8fafc", padding:"14px", borderRadius:"10px", border:"1px solid #e2e8f0"}}>
              <span style={{fontSize:"11px", color:"var(--muted)"}}>Ingresos Totales del Mes</span>
              <div style={{fontSize:"19px", fontWeight:700, margin:"4px 0", color:"var(--green)"}}>S/ {totals.income.toLocaleString("es-PE",{minimumFractionDigits:2})}</div>
              <small style={{fontSize:"10px", color:"var(--muted)", display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap"}}>
                <span>Sueldo base: S/ {monthlySalary.toLocaleString("es-PE")}</span>
                <button type="button" onClick={()=>openSalaryModal(periodSalaryTx)} style={{background:"none", border:0, padding:0, color:"var(--blue)", cursor:"pointer", textDecoration:"underline", fontSize:"10px", fontWeight:600}}>
                  {hasSalaryInPeriod ? "(Modificar este mes)" : "(Ajustar monto)"}
                </button>
                {extraIncome > 0 ? <span>+ Extra: S/ {extraIncome.toLocaleString("es-PE")}</span> : null}
              </small>
            </div>
            <div style={{background:"#fff7ed", padding:"14px", borderRadius:"10px", border:"1px solid #ffedd5"}}>
              <span style={{fontSize:"11px", color:"var(--muted)"}}>Gastos Totales del Mes</span>
              <div style={{fontSize:"19px", fontWeight:700, margin:"4px 0", color:"var(--orange)"}}>S/ {totals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}</div>
              <small style={{fontSize:"10px", color:"var(--muted)"}}>Gastos fijos, mensuales y categorías</small>
            </div>
            <div style={{background:netMonthBalance>=0?"#f0fdf4":"#fef2f2", padding:"14px", borderRadius:"10px", border:netMonthBalance>=0?"1px solid #bbf7d0":"1px solid #fecaca"}}>
              <span style={{fontSize:"11px", color:"var(--muted)"}}>Balance Neto del Mes</span>
              <div style={{fontSize:"19px", fontWeight:700, margin:"4px 0", color:netMonthBalance>=0?"var(--green)":"#dc2626"}}>{netMonthBalance < 0 ? `-S/ ${Math.abs(netMonthBalance).toLocaleString("es-PE",{minimumFractionDigits:2})}` : `S/ ${netMonthBalance.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</div>
              <small style={{fontSize:"10px", fontWeight:700, color:netMonthBalance>=0?"var(--green)":"#dc2626"}}>{netMonthBalance>=0 ? "Superávit disponible" : "Déficit mensual actual"}</small>
            </div>
          </div>
        </article>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title"><div><h2>Flujo de dinero</h2><p>Ingresos vs. gastos mensuales</p></div><button>Últimos 6 meses <ChevronDown size={15}/></button></div>
            <div className="chart-wrap"><div className="y-axis"><span>S/ {chartMax.toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.75).toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.5).toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.25).toLocaleString("es-PE")}</span><span>S/ 0</span></div><div className="bars">
              {transactions.length>0?<div className="bar-group"><div className="bar income" style={{height:`${totals.income/chartMax*100}%`}}/><div className="bar expense" style={{height:`${totals.expense/chartMax*100}%`}}/><span>Mes actual</span></div>:<div className="empty-state"><TrendingUp size={20}/><strong>Sin datos para el gráfico</strong><span>Registra movimientos para ver tu flujo.</span></div>}
            </div></div><div className="legend"><span><i className="dot green"/>Ingresos</span><span><i className="dot orange"/>Gastos</span></div>
          </article>

          <article className="card spending-card">
            <div className="card-title"><div><h2>Gastos por categoría</h2><p>Pronóstico y movimientos de este mes</p></div><button className="category-details" onClick={()=>activateModule("Gastos")}>Gestionar gastos</button></div>
            <div className="donut-area"><div className="donut" style={{background:dashboardDonut}}><div><strong>S/ {dashboardCategoryTotal.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><span>Total previsto</span></div></div><div className="category-list">
              {dashboardCategories.map(([name,value],index)=><button type="button" className="category-row" key={name} onClick={()=>inspectCategory(name)} title={`Ver movimientos de ${name}`}><i className="dot" style={{background:dashboardPalette[index%dashboardPalette.length]}}/><span>{name}</span><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><small>{dashboardCategoryTotal?`${Math.round(value/dashboardCategoryTotal*100)}%`:"Sin gasto"}</small></button>)}
            </div></div>
          </article>

          <article className="card transactions-card">
            <div className="card-title"><div><h2>Últimos movimientos</h2><p>Tus transacciones más recientes</p></div><button onClick={()=>activateModule("Movimientos")}>Ver todos <span>→</span></button></div>
            <div className="tx-list">{visibleTransactions.slice(0,6).map(t=><div className="tx" key={t.id}><div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div><div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account}</span></div><div className="tx-date">{t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div><button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>removeMovement(t.id)}><Trash2 size={14}/></button></div>)}{visibleTransactions.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>Prueba con otra palabra.</span></div>}</div>
          </article>

          <article className="card goal-card">
            <div className="card-title"><div><h2>Ahorro general</h2><p>Reserva sin una meta específica</p></div><button className="dots"><MoreHorizontal/></button></div>
            <div className="goal-amount"><strong>S/ {savings.toLocaleString("es-PE")}</strong></div><div className="goal-tip"><Target size={20}/><div><strong>Tu reserva disponible</strong><span>Este dinero no está comprometido con ninguna meta y puedes usarlo cuando sea necesario.</span></div></div><button className="outline" onClick={()=>setSavingContributionTarget("general")}>Registrar movimiento</button>
          </article>
        </section>

        <section className="accounts"><div className="section-heading"><div><h2>Mis cuentas</h2><p>Conecta y controla todo desde un solo lugar.</p></div><button onClick={()=>setNotice("Conexión bancaria lista para configurar con APIs oficiales")}><Plus size={17}/>Conectar cuenta</button></div><article className="card empty-state"><Landmark/><strong>Aún no hay cuentas conectadas</strong><span>Cuando agregues una, aparecerá aquí con su saldo real.</span></article></section>
        </>}
      </div>
    </main>

    {showModal&&<div className="modal-backdrop" onMouseDown={()=>setShowModal(false)}><form className="modal" onSubmit={addTransaction} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo movimiento</h2><p>Registra un ingreso o gasto en {monthNames[selectedMonth]} {selectedYear}.</p></div><button type="button" onClick={()=>setShowModal(false)}><X/></button></div><label>Tipo<select name="kind" value={movementKind} onChange={e=>setMovementKind(e.target.value as "income"|"expense")}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>{movementKind==="expense"&&<label>Tipo de gasto<select value={expenseType} onChange={e=>setExpenseType(e.target.value as "fixed"|"monthly"|"group")}><option value="fixed">Gasto fijo — se repite cada mes</option><option value="monthly">Gasto mensual — solo este mes</option><option value="group">Detalle por categoría</option></select></label>}{movementKind==="expense"&&<div className="pantry-helper"><Package size={15}/><span>¿Jalar de Almacén?</span><select onChange={e=>{const p=pantry.find(item=>item.id===Number(e.target.value));if(p){setMovementTitle(p.name);setMovementCategory(p.category);setMovementUnit(p.unit);setMovementQuantity(1);setMovementUnitPrice(p.defaultPrice);setMovementAmount(p.defaultPrice);}}} defaultValue=""><option value="" disabled>Selecciona producto para autocompletar...</option>{pantry.map(p=><option key={p.id} value={p.id}>{p.name} ({p.category}) - S/ {p.defaultPrice.toFixed(2)}/{p.unit}</option>)}</select></div>}<label>Descripción<input name="title" required value={movementTitle} onChange={e=>setMovementTitle(e.target.value)} placeholder={movementKind==="income"?"Ej. Sueldo mensual":expenseType==="fixed"?"Ej. Alquiler":"Ej. Almuerzo"}/></label>{movementKind==="expense"?<div className="form-row"><label>Cantidad<input name="quantity" type="number" min="0.01" step="any" value={movementQuantity} onChange={e=>{const q=Number(e.target.value)||1;setMovementQuantity(q);if(movementUnitPrice){setMovementAmount(+(q*Number(movementUnitPrice)).toFixed(2));}}} /></label><label>Unidad<select name="unit" value={movementUnit} onChange={e=>setMovementUnit(e.target.value)}>{defaultUnits.map(u=><option key={u} value={u}>{u}</option>)}</select></label><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={movementAmount} onChange={e=>setMovementAmount(e.target.value)} placeholder="0.00"/></label></div>:<div className="form-row"><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Categoría<select name="category" value={incomeCategories.includes(movementCategory)?movementCategory:incomeCategories[0]} onChange={e=>setMovementCategory(e.target.value)}>{incomeCategories.map(category=><option key={category}>{category}</option>)}</select></label></div>}{movementKind==="expense"&&<div className="form-row"><label>Categoría<select name="category" value={movementCategory} onChange={e=>setMovementCategory(e.target.value)}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Cuenta<select name="account"><option>Yape</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label></div>}{movementKind==="income"&&<label>Cuenta de ingreso<select name="account"><option>BCP •• 2847</option><option>Yape</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label>}{movementKind==="expense"&&movementCategory==="Ahorro"&&<label>Destino del ahorro<select name="savingDestination" value={String(savingDestination)} onChange={e=>setSavingDestination(e.target.value==="general"?"general":Number(e.target.value))}><option value="general">Ahorro general / indefinido</option>{savingsGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}{movementKind==="expense"&&movementCategory==="Ahorro"&&<p className="eyebrow">Este egreso se registrará también como aporte al destino que elegiste.</p>}{movementKind==="expense"&&expenseType==="group"&&movementCategory!=="Ahorro"&&<p className="eyebrow">Este movimiento se verá en el historial. Los subgastos se agregan desde Detalle por categoría.</p>}<div className="modal-actions"><button type="button" onClick={()=>setShowModal(false)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {expenseModal&&<div className="modal-backdrop" onMouseDown={()=>setExpenseModal(null)}><form className="modal" onSubmit={addDetailedExpense} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{expenseModal.kind==="group"?"Activar detalle por categoría":expenseModal.kind==="sub"?"Agregar subgastos":expenseModal.kind==="fixed"?"Nuevo gasto fijo":"Nuevo gasto mensual"}</h2><p>{expenseModal.kind==="group"?"Escribe una categoría existente. Las categorías se administran únicamente en Configuración.":expenseModal.kind==="sub"?"Añade varias compras o productos con su cantidad y unidad de medida.":"Registra el concepto y su monto."}</p></div><button type="button" onClick={()=>setExpenseModal(null)}><X/></button></div>{expenseModal.kind==="sub"?<><div className="card-title"><div><h2>Detalle de subgastos</h2><p>{subRows.length} filas listas para registrar.</p></div><button type="button" className="add-subexpense" onClick={()=>setSubRows(rows=>[...rows,Date.now()+rows.length])}><Plus size={16}/>Agregar fila</button></div><label>Cuenta para estos subgastos<select name="account"><option>Yape</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label>{subRows.map((row,index)=>{const category=subCategories[row]??categories.find(item=>item!=="Ahorro")??categories[0];return <div className="subexpense-form-row" key={row}><div className="pantry-helper" style={{gridColumn:"1 / -1", margin:"0 0 4px"}}><Package size={15}/><span>¿Jalar de Almacén?</span><select onChange={e=>selectPantryForSubRow(row,Number(e.target.value))} defaultValue=""><option value="" disabled>Selecciona producto para autocompletar...</option>{pantry.map(p=><option key={p.id} value={p.id}>{p.name} ({p.category}) - S/ {p.defaultPrice.toFixed(2)} / {p.unit}</option>)}</select></div><label>Descripción<input name="name" required autoFocus={index===0} value={subNames[row]??""} onChange={e=>setSubNames(items=>({...items,[row]:e.target.value}))} placeholder="Ej. Pañales Babysec G 64"/></label><label>Categoría<select name="category" value={category} onChange={e=>setSubCategories(items=>({...items,[row]:e.target.value}))}>{categories.map(item=><option key={item}>{item}</option>)}</select></label><label>Cantidad<input name="quantity" type="number" min="0.01" step="any" value={subQuantities[row]??1} onChange={e=>handleSubQuantityChange(row,Number(e.target.value))} /></label><label>Unidad<select name="unit" value={subUnits[row]??"unid"} onChange={e=>setSubUnits(items=>({...items,[row]:e.target.value}))}>{defaultUnits.map(u=><option key={u} value={u}>{u}</option>)}</select></label>{category==="Ahorro"&&<label>Destino<select value={String(subSavingDestinations[row]??"general")} onChange={e=>setSubSavingDestinations(items=>({...items,[row]:e.target.value==="general"?"general":Number(e.target.value)}))}><option value="general">Ahorro general</option>{savingsGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>}<label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" value={subAmounts[row]??""} onChange={e=>handleSubAmountChange(row,e.target.value)} placeholder="0.00"/></label>{subRows.length>1&&<button type="button" className="expense-delete" onClick={()=>setSubRows(rows=>rows.filter(item=>item!==row))}><Trash2 size={15}/></button>}</div>})}</>:<><label>{expenseModal.kind==="group"?"Categoría existente":"Descripción"}<input name="name" required autoFocus placeholder={expenseModal.kind==="group"?"Ej. Alimentación":"Ej. Alquiler"}/></label>{expenseModal.kind!=="group"&&<label>Categoría<select name="category">{categories.map(category=><option key={category}>{category}</option>)}</select></label>}<label>{expenseModal.kind==="group"?"Presupuesto mensual (S/)":"Monto (S/)"}<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label>{expenseModal.kind!=="group"&&<label>Cuenta<select name="account"><option>Yape</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label>}</>}<div className="modal-actions"><button type="button" onClick={()=>setExpenseModal(null)}>Cancelar</button><button className="primary" type="submit">{expenseModal.kind==="group"?"Activar detalle":expenseModal.kind==="sub"?`Guardar ${subRows.length} subgasto${subRows.length===1?"":"s"}`:"Guardar gasto"}</button></div></form></div>}
    {expenseEdit&&(()=>{const group=expenseGroups.find(item=>item.id===expenseEdit.groupId);const item=expenseEdit.kind==="sub"?group?.items.find(entry=>entry.id===expenseEdit.itemId):undefined;if(!group||expenseEdit.kind==="sub"&&!item)return null;const isGroup=expenseEdit.kind==="group";return <div className="modal-backdrop" onMouseDown={()=>setExpenseEdit(null)}><form className="modal" onSubmit={saveExpenseEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{isGroup?"Editar rubro":"Editar subgasto"}</h2><p>{isGroup?"Actualiza el nombre y el presupuesto. Los subgastos se conservan.":`Dentro del rubro ${group.name}.`}</p></div><button type="button" onClick={()=>setExpenseEdit(null)}><X/></button></div><label>{isGroup?"Nombre del rubro":"Descripción"}<input name="name" required autoFocus defaultValue={isGroup?group.name:item!.name}/></label>{!isGroup&&<label>Categoría<select name="category" defaultValue={item!.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label>}<label>{isGroup?"Presupuesto mensual (S/)":"Monto (S/)"}<input name="amount" required type="number" min="0" step="0.01" defaultValue={isGroup?group.budget:item!.amount}/></label><div className="module-callout"><ReceiptText/><div><strong>{isGroup?`${group.items.length} subgastos registrados`:`Periodo: ${monthNames[selectedMonth]} ${selectedYear}`}</strong><span>{isGroup?`Total usado actualmente: S/ ${group.items.reduce((sum,entry)=>sum+entry.amount,0).toLocaleString("es-PE",{minimumFractionDigits:2})}`:`Valor actual: S/ ${item!.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</span></div></div><div className="modal-actions"><button type="button" onClick={()=>setExpenseEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {detailedEdit&&(()=>{const item=(detailedEdit.section==="fixed"?fixedExpenses:monthlyExpenses).find(entry=>entry.id===detailedEdit.id);if(!item)return null;return <div className="modal-backdrop" onMouseDown={()=>setDetailedEdit(null)}><form className="modal" onSubmit={saveDetailedEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Editar {detailedEdit.section==="fixed"?"gasto fijo":"gasto mensual"}</h2><p>Actualiza los datos sin perder el registro.</p></div><button type="button" onClick={()=>setDetailedEdit(null)}><X/></button></div><label>Descripción<input name="name" required autoFocus defaultValue={item.name}/></label><label>Categoría<select name="category" defaultValue={item.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Monto (S/)<input name="amount" required type="number" min="0" step="0.01" defaultValue={item.amount}/></label><div className="modal-actions"><button type="button" onClick={()=>setDetailedEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {showSavingGoalModal&&<div className="modal-backdrop" onMouseDown={()=>setShowSavingGoalModal(false)}><form className="modal" onSubmit={createSavingsGoal} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nueva meta de ahorro</h2><p>Define para qué ahorrarás y cuánto necesitas reunir.</p></div><button type="button" onClick={()=>setShowSavingGoalModal(false)}><X/></button></div><label>Nombre de la meta<input name="name" required autoFocus placeholder="Ej. Laptop"/></label><div className="form-row"><label>Monto objetivo (S/)<input name="target" required type="number" min="0.01" step="0.01" placeholder="3000"/></label><label>Aporte inicial (S/)<input name="amount" type="number" min="0" step="0.01" defaultValue="0"/></label></div><div className="modal-actions"><button type="button" onClick={()=>setShowSavingGoalModal(false)}>Cancelar</button><button className="primary" type="submit">Crear meta</button></div></form></div>}
    {savingContributionTarget!==null&&<div className="modal-backdrop" onMouseDown={()=>setSavingContributionTarget(null)}><form className="modal" onSubmit={contributeToSaving} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Movimiento de ahorro</h2><p>{savingContributionTarget==="general"?"Ahorro general sin destino específico.":`Meta: ${savingsGoals.find(goal=>goal.id===savingContributionTarget)?.name??""}`}</p></div><button type="button" onClick={()=>setSavingContributionTarget(null)}><X/></button></div><label>Operación<select name="operation"><option value="add">Agregar aporte</option><option value="withdraw">Retirar dinero</option></select></label><label>Monto (S/)<input name="amount" required autoFocus type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Cuenta de origen / destino<select name="account"><option value="BCP •• 2847">BCP •• 2847</option><option value="Yape">Yape</option><option value="Interbank •• 9041">Interbank •• 9041</option><option value="Efectivo">Efectivo</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setSavingContributionTarget(null)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {editingMovement&&<div className="modal-backdrop" onMouseDown={()=>setEditingMovement(null)}><form className="modal" onSubmit={saveMovementEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Editar movimiento</h2><p>Actualiza este registro sin crear uno nuevo.</p></div><button type="button" onClick={()=>setEditingMovement(null)}><X/></button></div><label>Descripción<input name="title" required autoFocus defaultValue={editingMovement.title}/></label><div className="form-row"><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" defaultValue={editingMovement.amount}/></label><label>Categoría<select name="category" defaultValue={editingMovement.category}>{(editingMovement.kind==="income"?incomeCategories:categories).map(category=><option key={category}>{category}</option>)}</select></label></div><label>Cuenta<select name="account" defaultValue={editingMovement.account}><option>Yape</option><option>BCP</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setEditingMovement(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>}
    {deleteConfirmation&&<div className="modal-backdrop" onMouseDown={()=>setDeleteConfirmation(null)}><section className="modal delete-confirmation" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><p className="eyebrow">CONFIRMACIÓN</p><h2 id="delete-title">¿Eliminar registro?</h2><p>{deleteConfirmation.message}</p></div><button type="button" aria-label="Cerrar" onClick={()=>setDeleteConfirmation(null)}><X/></button></div><div className="modal-actions"><button type="button" onClick={()=>setDeleteConfirmation(null)}>Cancelar</button><button className="danger-action" type="button" onClick={()=>{const action=deleteConfirmation.onConfirm;setDeleteConfirmation(null);action();}}>Eliminar</button></div></section></div>}
    {showBudgetModal&&<div className="modal-backdrop" onMouseDown={()=>setShowBudgetModal(false)}><form className="modal" onSubmit={addBudget} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo presupuesto</h2><p>Define el límite mensual de un rubro.</p></div><button type="button" onClick={()=>setShowBudgetModal(false)}><X/></button></div><label>Rubro<input name="name" required autoFocus placeholder="Ej. Alimentación"/></label><label>Límite mensual (S/)<input name="limit" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Color<select name="color"><option value="purple">Morado</option><option value="blue">Azul</option><option value="orange">Naranja</option><option value="teal">Verde</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setShowBudgetModal(false)}>Cancelar</button><button className="primary" type="submit">Crear presupuesto</button></div></form></div>}
    {showSalaryModal && (
      <div className="modal-backdrop" onMouseDown={() => setShowSalaryModal(false)}>
        <form className="modal" onSubmit={handleSaveSalary} onMouseDown={e => e.stopPropagation()}>
          <div className="modal-title">
            <div>
              <h2>{editingSalaryTxId !== null ? "Modificar sueldo del mes" : "Registrar sueldo del mes"}</h2>
              <p>{monthNames[selectedMonth]} {selectedYear} • Período seleccionado</p>
            </div>
            <button type="button" onClick={() => setShowSalaryModal(false)}><X/></button>
          </div>

          <label>
            Monto del sueldo (S/)
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              autoFocus
              value={salaryFormAmount}
              onChange={e => setSalaryFormAmount(e.target.value)}
              placeholder="Ej. 1250.00"
            />
          </label>

          <label>
            Cuenta de depósito
            <select value={salaryFormAccount} onChange={e => setSalaryFormAccount(e.target.value)}>
              <option value="BCP •• 2847">BCP •• 2847</option>
              <option value="Yape">Yape</option>
              <option value="Interbank •• 9041">Interbank •• 9041</option>
              <option value="Efectivo">Efectivo</option>
            </select>
          </label>

          <label style={{display:"flex", alignItems:"center", gap:"10px", marginTop:"16px", cursor:"pointer", fontWeight:500}}>
            <input
              type="checkbox"
              checked={salaryFormUpdateBase}
              onChange={e => setSalaryFormUpdateBase(e.target.checked)}
              style={{width:"auto"}}
            />
            Actualizar también como mi sueldo base mensual en mi perfil
          </label>

          <div className="modal-actions">
            <button type="button" onClick={() => setShowSalaryModal(false)}>Cancelar</button>
            <button className="primary" type="submit">
              {editingSalaryTxId !== null ? "Guardar cambios" : "Registrar sueldo"}
            </button>
          </div>
        </form>
      </div>
    )}
    {showPantryModal && (
      <div className="modal-backdrop" onMouseDown={() => setShowPantryModal(false)}>
        <form className="modal" onSubmit={savePantryItem} onMouseDown={e => e.stopPropagation()}>
          <div className="modal-title">
            <div>
              <h2>{editingPantryItem ? "Editar producto de Almacén" : "Nuevo producto en Almacén"}</h2>
              <p>Guarda productos habituales para autocompletar gastos y compras.</p>
            </div>
            <button type="button" onClick={() => setShowPantryModal(false)}><X/></button>
          </div>
          <label>
            Nombre del producto
            <input name="name" required autoFocus defaultValue={editingPantryItem?.name ?? ""} placeholder="Ej. Pañales Babysec G 64"/>
          </label>
          <label>
            Categoría
            <select name="category" defaultValue={editingPantryItem?.category ?? categories[0]}>
              {categories.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </label>
          <div className="form-row">
            <label>
              Unidad de medida
              <select name="unit" defaultValue={editingPantryItem?.unit ?? "unid"}>
                {defaultUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label>
              Precio de referencia (S/)
              <input name="defaultPrice" required type="number" min="0.01" step="0.01" defaultValue={editingPantryItem?.defaultPrice ?? ""} placeholder="54.00"/>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setShowPantryModal(false)}>Cancelar</button>
            <button className="primary" type="submit">
              {editingPantryItem ? "Guardar cambios" : "Agregar a Almacén"}
            </button>
          </div>
        </form>
      </div>
    )}
    {notice&&<div className="toast">✓ {notice}</div>}
  </div>
}
