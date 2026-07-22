"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bell, BriefcaseBusiness, CalendarDays, Car, ChevronDown, ChevronRight, CircleDollarSign, CreditCard, Home as HomeIcon, Layers3, LayoutDashboard, Landmark, Menu, MoreHorizontal, PiggyBank, Plus, ReceiptText, Search, Settings, ShoppingBag, Smartphone, Target, Trash2, TrendingUp, Utensils, WalletCards, X, Zap } from "lucide-react";
import { isSupabaseConfigured, loadSupabaseState, saveSupabaseState, syncSupabaseTables } from "../lib/supabase-state";

type Tx = { id:number; title:string; category:string; account:string; date:string; amount:number; kind:"income"|"expense"; period?:string };
type ExpenseEntry = { id:number; name:string; category:string; amount:number; period?:string };
type ExpenseGroup = { id:number; name:string; budget:number; items:ExpenseEntry[] };
type ExpenseModal = { kind:"fixed"|"monthly"|"group"|"sub"; groupId?:number } | null;
type ExpenseEdit = { kind:"group"; groupId:number } | { kind:"sub"; groupId:number; itemId:number } | null;
type Profile = { fullName:string; currency:string };
type Budget = { id:number; name:string; limit:number; color:string };
type MonthAccess = { year:number; month:number };

const seed: Tx[] = [];
const fixedSeed: ExpenseEntry[] = [];
const monthlySeed: ExpenseEntry[] = [];
const groupSeed: ExpenseGroup[] = [];
const demoTransactionIds = new Set([1,2,3,4,5]);
const demoFixedExpenseIds = new Set([101,102,103,104]);
const demoMonthlyExpenseIds = new Set([201,202,203]);
const demoGroupIds = new Set([301,302]);
const initialPeriod = "2026-08";
const defaultCategories = ["Hogar","Ahorro","Transporte","Alimentación","Servicios","Suscripciones","Frutas","Abarrotes","Otros"];
const defaultIncomeCategories = ["Sueldo","Honorarios","Ventas","Freelance","Transferencia recibida","Reembolso","Otros ingresos"];

const nav = [
  ["Resumen", LayoutDashboard], ["Movimientos", WalletCards], ["Gastos", ReceiptText], ["Presupuestos", CircleDollarSign], ["Metas de ahorro", Target], ["Reportes", TrendingUp], ["Cuentas", Landmark],
] as const;
const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function categoryIcon(category:string,kind:"income"|"expense") {
  if(kind==="income") return <BriefcaseBusiness/>;
  const icons:Record<string,React.ReactNode>={Alimentación:<Utensils/>,Transporte:<Car/>,Servicios:<Zap/>,Compras:<ShoppingBag/>,Hogar:<HomeIcon/>,Suscripciones:<Smartphone/>};
  return icons[category] ?? <CreditCard/>;
}

function Metric({label,value,delta,icon,tone,progress}:{label:string,value:number,delta:string,icon:React.ReactNode,tone:string,progress?:number}) { return <article className="metric card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><small className={tone}>{delta}</small>{progress&&<div className="mini-progress"><i style={{width:`${progress}%`}}/></div>}</div></article> }
function Account({logo,color,name,type,amount}:{logo:string,color:string,name:string,type:string,amount:string}) { return <article className="account-card card"><div className="account-logo" style={{background:color}}>{logo}</div><div><strong>{name}</strong><span>{type}</span></div><div className="account-balance"><strong>{amount}</strong><span>Saldo disponible</span></div><button><MoreHorizontal/></button></article> }
export default function Home() {
  function ModuleHeading({eyebrow,title,text,action}:{eyebrow:string,title:string,text:string,action?:React.ReactNode}) { return <div className="page-heading module-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{action}</div> }
  function MiniStat({label,value,tone="blue",plain=false}:{label:string,value:number,tone?:string,plain?:boolean}) { return <article className="card mini-stat"><span>{label}</span><strong>{plain?value:`S/ ${value.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</strong><i className={tone}/></article> }
  function TransactionList({items,onDelete}:{items:Tx[],onDelete:(id:number)=>void}) { return <div className="tx-list">{items.map(t=><div className="tx" key={t.id}><div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div><div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account}</span></div><div className="tx-date">{t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div><button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>onDelete(t.id)}><Trash2 size={14}/></button></div>)}{items.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>Prueba con otra palabra.</span></div>}</div> }

  const [active, setActive] = useState("Resumen");
  const [transactions, setTransactions] = useState(seed);
  const [showModal, setShowModal] = useState(false);
  const [movementKind, setMovementKind] = useState<"income"|"expense">("expense");
  const [expenseType, setExpenseType] = useState<"fixed"|"monthly"|"group">("monthly");
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [savings, setSavings] = useState(0);
  const [expenseTab, setExpenseTab] = useState<"fixed"|"monthly"|"groups">("fixed");
  const [fixedExpenses, setFixedExpenses] = useState<ExpenseEntry[]>(fixedSeed);
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseEntry[]>(monthlySeed);
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>(groupSeed);
  const [expenseModal, setExpenseModal] = useState<ExpenseModal>(null);
  const [subRows, setSubRows] = useState<number[]>([1]);
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
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading"|"synced"|"local"|"setup">("loading");
  useEffect(()=>{
    async function hydrate() {
      let local:{transactions:Tx[];savings:number;fixedExpenses:ExpenseEntry[];monthlyExpenses:ExpenseEntry[];expenseGroups:ExpenseGroup[];profile:Profile;budgets:Budget[];monthAccess:MonthAccess;categories:string[];incomeCategories:string[]}={transactions:seed,savings:0,fixedExpenses:fixedSeed,monthlyExpenses:monthlySeed,expenseGroups:groupSeed,profile:{fullName:"Mi perfil",currency:"PEN"},budgets:[],monthAccess:{year:2026,month:7},categories:defaultCategories,incomeCategories:defaultIncomeCategories};
      try {
        const saved = localStorage.getItem("finanza-transactions");
        const savedSavings = localStorage.getItem("finanza-savings");
        const savedFixed = localStorage.getItem("finanza-fixed-expenses");
        const savedMonthly = localStorage.getItem("finanza-monthly-expenses");
        const savedGroups = localStorage.getItem("finanza-expense-groups");
        const savedSettings = localStorage.getItem("finanza-settings");
        if(saved) local.transactions=JSON.parse(saved);
        if(savedSavings) local.savings=Number(savedSavings);
        if(savedFixed) local.fixedExpenses=JSON.parse(savedFixed);
        if(savedMonthly) local.monthlyExpenses=JSON.parse(savedMonthly);
        if(savedGroups) local.expenseGroups=JSON.parse(savedGroups);
        if(savedSettings) { const settings=JSON.parse(savedSettings); if(settings.periodVersion===2&&settings.monthAccess) local.monthAccess=settings.monthAccess; if(Array.isArray(settings.categories)) local.categories=settings.categories; if(Array.isArray(settings.incomeCategories)) local.incomeCategories=settings.incomeCategories; }
      } catch {}
      let source=local;
      if(isSupabaseConfigured) {
        try {
          const remote=await loadSupabaseState();
          if(remote) source={
            transactions:Array.isArray(remote.transactions)?(remote.transactions as Tx[]).filter(item=>!demoTransactionIds.has(Number(item.id))).map(item=>({...item,period:item.period??initialPeriod})):local.transactions,
            savings:remote.savings===3200||remote.savings===3300?0:typeof remote.savings==="number"?remote.savings:local.savings,
            fixedExpenses:Array.isArray(remote.fixedExpenses)?(remote.fixedExpenses as ExpenseEntry[]).filter(item=>!demoFixedExpenseIds.has(Number(item.id))):local.fixedExpenses,
            monthlyExpenses:Array.isArray(remote.monthlyExpenses)?(remote.monthlyExpenses as ExpenseEntry[]).filter(item=>!demoMonthlyExpenseIds.has(Number(item.id))).map(item=>({...item,period:item.period??initialPeriod})):local.monthlyExpenses,
            expenseGroups:Array.isArray(remote.expenseGroups)?(remote.expenseGroups as ExpenseGroup[]).filter(item=>!demoGroupIds.has(Number(item.id))):local.expenseGroups,
            profile:typeof remote.profile==="object"&&remote.profile?remote.profile as Profile:local.profile,
            budgets:Array.isArray(remote.budgets)?remote.budgets as Budget[]:local.budgets,
            monthAccess:remote.periodVersion===2&&typeof remote.monthAccess==="object"&&remote.monthAccess?remote.monthAccess as MonthAccess:local.monthAccess,
            categories:Array.isArray(remote.categories)?remote.categories as string[]:local.categories,
            incomeCategories:Array.isArray(remote.incomeCategories)?remote.incomeCategories as string[]:local.incomeCategories,
          };
          else source={transactions:seed,savings:0,fixedExpenses:fixedSeed,monthlyExpenses:monthlySeed,expenseGroups:groupSeed,profile:local.profile,budgets:[],monthAccess:local.monthAccess,categories:local.categories,incomeCategories:local.incomeCategories};
          setSyncStatus("synced");
        } catch { setSyncStatus("setup"); }
      } else setSyncStatus("local");
      setTransactions(source.transactions);setSavings(source.savings);setFixedExpenses(source.fixedExpenses);setMonthlyExpenses(source.monthlyExpenses);setExpenseGroups(source.expenseGroups);setProfile(source.profile);setBudgets(source.budgets);setMonthAccess(source.monthAccess);setCategories(source.categories);setIncomeCategories(source.incomeCategories);
      setReady(true);
    }
    void hydrate();
  },[]);
  useEffect(()=>{
    if(ready){
      localStorage.setItem("finanza-transactions", JSON.stringify(transactions));
      localStorage.setItem("finanza-savings", String(savings));
    }
  },[transactions,savings,ready]);
  useEffect(()=>{
    if(ready){
      localStorage.setItem("finanza-fixed-expenses",JSON.stringify(fixedExpenses));
      localStorage.setItem("finanza-monthly-expenses",JSON.stringify(monthlyExpenses));
      localStorage.setItem("finanza-expense-groups",JSON.stringify(expenseGroups));
    }
  },[fixedExpenses,monthlyExpenses,expenseGroups,ready]);
  useEffect(()=>{ if(ready) localStorage.setItem("finanza-settings",JSON.stringify({monthAccess,categories,incomeCategories,periodVersion:2})); },[monthAccess,categories,incomeCategories,ready]);
  useEffect(()=>{
    if(!ready||!isSupabaseConfigured||syncStatus==="setup") return;
    const timer=window.setTimeout(()=>{
      const data={transactions,savings,fixedExpenses,monthlyExpenses,expenseGroups,profile,budgets,monthAccess,categories,incomeCategories,periodVersion:2};
      void Promise.all([saveSupabaseState(data),syncSupabaseTables(data)]).then(()=>setSyncStatus("synced")).catch(()=>setSyncStatus("setup"));
    },500);
    return ()=>window.clearTimeout(timer);
  },[transactions,savings,fixedExpenses,monthlyExpenses,expenseGroups,profile,budgets,monthAccess,categories,incomeCategories,ready,syncStatus]);
  const activePeriod=`${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}`;
  const periodTransactions = useMemo(() => transactions.filter(t=>(t.period??initialPeriod)===activePeriod),[transactions,activePeriod]);
  const expenseEntriesForPeriod=useMemo(()=>[
    ...fixedExpenses,
    ...monthlyExpenses.filter(item=>(item.period??initialPeriod)===activePeriod),
    ...expenseGroups.flatMap(group=>group.items.filter(item=>(item.period??initialPeriod)===activePeriod)),
  ].filter(item=>!transactions.some(transaction=>transaction.kind==="expense"&&transaction.id===item.id)),[fixedExpenses,monthlyExpenses,expenseGroups,transactions,activePeriod]);
  const extraExpenseForPeriod=expenseEntriesForPeriod.reduce((sum,item)=>sum+item.amount,0);
  const extraExpenseAccumulated=useMemo(()=>[
    ...fixedExpenses,...monthlyExpenses,...expenseGroups.flatMap(group=>group.items),
  ].filter(item=>!transactions.some(transaction=>transaction.kind==="expense"&&transaction.id===item.id)).reduce((sum,item)=>sum+item.amount,0),[fixedExpenses,monthlyExpenses,expenseGroups,transactions]);
  const totals = useMemo(() => ({
    income: periodTransactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: periodTransactions.filter(t=>t.kind==="expense").reduce((a,b)=>a+b.amount,0)+extraExpenseForPeriod,
  }), [periodTransactions,extraExpenseForPeriod]);
  const accumulatedTotals = useMemo(() => ({
    income: transactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: transactions.filter(t=>t.kind==="expense").reduce((a,b)=>a+b.amount,0)+extraExpenseAccumulated,
  }), [transactions,extraExpenseAccumulated]);
  const balance = accumulatedTotals.income - accumulatedTotals.expense;
  const chartMax = Math.max(totals.income, totals.expense, 1000);
  const visibleTransactions = periodTransactions.filter(t => `${t.title} ${t.category} ${t.account}`.toLowerCase().includes(search.toLowerCase()));

  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = fd.get("kind") as "income"|"expense";
    const id=Date.now(); const title=String(fd.get("title")); const category=String(fd.get("category")); const amount=Number(fd.get("amount"));
    setTransactions(prev => {
      const next = [{ id, title, category, account:String(fd.get("account")), date:"Ahora", amount, kind, period:activePeriod }, ...prev];
      localStorage.setItem("finanza-transactions", JSON.stringify(next));
      return next;
    });
    if(kind==="expense"&&expenseType==="fixed") setFixedExpenses(items=>[{id,name:title,category,amount},...items]);
    if(kind==="expense"&&expenseType==="monthly") setMonthlyExpenses(items=>[{id,name:title,category,amount,period:activePeriod},...items]);
    setShowModal(false); setNotice(kind==="expense"&&expenseType!=="group"?`Movimiento registrado como gasto ${expenseType==="fixed"?"fijo":"mensual"}`:"Movimiento registrado correctamente");
    setTimeout(()=>setNotice(""), 2600);
  }

  function changeSavings(amount:number) {
    setSavings(value => {
      const next = Math.max(0, Math.min(5400, value + amount));
      localStorage.setItem("finanza-savings", String(next));
      return next;
    });
    setNotice(amount > 0 ? `Se agregaron S/ ${amount} a tu ahorro` : `Se retiraron S/ ${Math.abs(amount)} del ahorro`);
  }

  function removeTransaction(id:number) {
    setTransactions(previous => {
      const next = previous.filter(item => item.id !== id);
      localStorage.setItem("finanza-transactions", JSON.stringify(next));
      return next;
    });
    setNotice("Movimiento eliminado");
  }

  function addDetailedExpense(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!expenseModal) return;
    const fd=new FormData(e.currentTarget);
    const name=String(fd.get("name")||"").trim();
    const amount=Number(fd.get("amount")||0);
    const category=String(fd.get("category")||"Otros");
    const id=Date.now();
    if(expenseModal.kind==="fixed") setFixedExpenses(items=>[{id,name,category,amount},...items]);
    if(expenseModal.kind==="monthly") setMonthlyExpenses(items=>[{id,name,category,amount,period:activePeriod},...items]);
    if(expenseModal.kind==="group") {
      setExpenseGroups(groups=>[{id,name,budget:amount,items:[]},...groups]);
      setOpenGroups(groups=>[id,...groups]);
    }
    if(expenseModal.kind==="sub"&&expenseModal.groupId) {
      const names=fd.getAll("name").map(value=>String(value).trim());const amounts=fd.getAll("amount").map(value=>Number(value));const rowCategories=fd.getAll("category").map(value=>String(value));
      const entries=names.map((entry,index)=>({id:id+index,name:entry,category:rowCategories[index]||"Otros",amount:amounts[index],period:activePeriod})).filter(entry=>entry.name&&Number.isFinite(entry.amount)&&entry.amount>0);
      setExpenseGroups(groups=>groups.map(group=>group.id===expenseModal.groupId?{...group,items:[...group.items,...entries]}:group));
      setOpenGroups(groups=>groups.includes(expenseModal.groupId!)?groups:[...groups,expenseModal.groupId!]);
    }
    setExpenseModal(null);setSubRows([1]);
    setNotice(expenseModal.kind==="group"?"Rubro creado correctamente":"Gasto registrado correctamente");
  }

  function openSubExpenseForm(groupId:number) { setSubRows([Date.now()]);setExpenseModal({kind:"sub",groupId}); }

  function removeDetailedExpense(section:"fixed"|"monthly",id:number) {
    if(section==="fixed") setFixedExpenses(items=>items.filter(item=>item.id!==id));
    else setMonthlyExpenses(items=>items.filter(item=>item.id!==id));
    setNotice("Gasto eliminado");
  }

  function saveDetailedEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!detailedEdit) return; const fd=new FormData(e.currentTarget);const name=String(fd.get("name")||"").trim();const category=String(fd.get("category")||"Otros");const amount=Number(fd.get("amount"));
    if(!name||!Number.isFinite(amount)||amount<0) { setNotice("Completa los datos correctamente"); return; }
    const update=(items:ExpenseEntry[])=>items.map(item=>item.id===detailedEdit.id?{...item,name,category,amount}:item);
    if(detailedEdit.section==="fixed") setFixedExpenses(update); else setMonthlyExpenses(update);
    setDetailedEdit(null);setNotice("Gasto actualizado correctamente");
  }

  function removeSubExpense(groupId:number,itemId:number) {
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

  function saveProfile(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    setProfile({fullName:String(fd.get("fullName")||"Mi perfil").trim()||"Mi perfil",currency:String(fd.get("currency")||"PEN")});
    setNotice("Perfil actualizado correctamente");
  }

  function addBudget(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd=new FormData(e.currentTarget);
    setBudgets(items=>[...items,{id:Date.now(),name:String(fd.get("name")),limit:Number(fd.get("limit")),color:String(fd.get("color"))}]);
    setShowBudgetModal(false); setNotice("Presupuesto creado correctamente");
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

  const expenseByCategory = [...periodTransactions.filter(t=>t.kind==="expense"),...expenseEntriesForPeriod].reduce<Record<string,number>>((result,item)=>{
    result[item.category]=(result[item.category]||0)+item.amount;
    return result;
  },{});
  const fixedTotal=fixedExpenses.reduce((sum,item)=>sum+item.amount,0);
  const monthlyForPeriod=monthlyExpenses.filter(item=>(item.period??initialPeriod)===activePeriod);
  const monthlyTotal=monthlyForPeriod.reduce((sum,item)=>sum+item.amount,0);
  const groupedTotal=expenseGroups.reduce((sum,group)=>sum+group.items.filter(item=>(item.period??initialPeriod)===activePeriod).reduce((subtotal,item)=>subtotal+item.amount,0),0);

  function moduleContent() {
    if(active==="Movimientos") return <>
      <ModuleHeading eyebrow="REGISTROS" title="Movimientos" text="Consulta, busca y administra todos tus ingresos y gastos." action={<button className="primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Nuevo movimiento</button>}/>
      <section className="module-stats"><MiniStat label="Ingresos registrados" value={totals.income} tone="green"/><MiniStat label="Gastos registrados" value={totals.expense} tone="orange"/><MiniStat label="Total de registros" value={periodTransactions.length} plain/></section>
      <article className="card module-card"><div className="card-title"><div><h2>Historial de {monthNames[selectedMonth]} {selectedYear}</h2><p>{visibleTransactions.length} movimientos encontrados</p></div></div><TransactionList items={visibleTransactions} onDelete={removeTransaction}/></article>
    </>;
    if(active==="Gastos") return <>
      <ModuleHeading eyebrow="CONTROL DE GASTOS" title="Gastos" text="Organiza tus pagos fijos, consumos mensuales y cada detalle por rubro." action={<button className="primary" onClick={()=>setExpenseModal({kind:expenseTab==="fixed"?"fixed":expenseTab==="monthly"?"monthly":"group"})}><Plus size={18}/>{expenseTab==="groups"?"Nuevo rubro":"Agregar gasto"}</button>}/>
      <section className="module-stats"><MiniStat label="Gastos fijos" value={fixedTotal} tone="orange"/><MiniStat label="Gastos mensuales" value={monthlyTotal} tone="blue"/><MiniStat label="Subgastos registrados" value={groupedTotal} tone="green"/></section>
      <div className="expense-tabs" role="tablist" aria-label="Tipos de gasto">
        <button role="tab" aria-selected={expenseTab==="fixed"} className={expenseTab==="fixed"?"active":""} onClick={()=>setExpenseTab("fixed")}><ReceiptText size={17}/>Gastos fijos</button>
        <button role="tab" aria-selected={expenseTab==="monthly"} className={expenseTab==="monthly"?"active":""} onClick={()=>setExpenseTab("monthly")}><CalendarDays size={17}/>Gastos mensuales</button>
        <button role="tab" aria-selected={expenseTab==="groups"} className={expenseTab==="groups"?"active":""} onClick={()=>setExpenseTab("groups")}><Layers3 size={17}/>Por rubro y subgastos</button>
      </div>
      {expenseTab!=="groups"&&<article className="card module-card expense-list-card"><div className="card-title"><div><h2>{expenseTab==="fixed"?"Pagos que se repiten cada mes":"Gastos variables de este mes"}</h2><p>{expenseTab==="fixed"?"Alquiler, ahorro, pasajes y servicios recurrentes.":"Consumos que pueden cambiar mes a mes."}</p></div></div><div className="expense-rows">{(expenseTab==="fixed"?fixedExpenses:monthlyExpenses).map(item=><div className="expense-row" key={item.id}><div className={`expense-kind-icon ${item.category==="Ahorro"?"saving":""}`}>{categoryIcon(item.category,"expense")}</div><div><strong>{item.name}</strong><span>{item.category} · {expenseTab==="fixed"?"Recurrente mensual":"Julio 2026"}</span></div><strong className="expense-value">S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><button className="add-subexpense" onClick={()=>setDetailedEdit({section:expenseTab,id:item.id})}>Editar</button><button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeDetailedExpense(expenseTab,item.id)}><Trash2 size={15}/></button></div>)}{(expenseTab==="fixed"?fixedExpenses:monthlyExpenses).length===0&&<div className="empty-state"><ReceiptText/><strong>Aún no tienes gastos en esta sección</strong><span>Usa “Agregar gasto” para registrar el primero.</span></div>}</div></article>}
      {expenseTab==="groups"&&<section className="expense-groups">{expenseGroups.map(group=>{const total=group.items.reduce((sum,item)=>sum+item.amount,0);const open=openGroups.includes(group.id);return <article className="card expense-group" key={group.id}><div className="expense-group-head"><button className="expense-group-toggle" onClick={()=>setOpenGroups(items=>items.includes(group.id)?items.filter(id=>id!==group.id):[...items,group.id])}><ChevronRight className={open?"open":""} size={18}/><div><strong>{group.name}</strong><span>{group.items.length} subgastos · Presupuesto S/ {group.budget.toLocaleString("es-PE")}</span></div></button><div className="expense-group-total"><span>Total utilizado</span><strong>S/ {total.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div><button className="add-subexpense" onClick={()=>editExpenseGroup(group.id)}>Editar</button><button className="add-subexpense" onClick={()=>setExpenseModal({kind:"sub",groupId:group.id})}><Plus size={16}/>Subgasto</button><button className="expense-delete" aria-label={`Eliminar rubro ${group.name}`} onClick={()=>{setExpenseGroups(groups=>groups.filter(item=>item.id!==group.id));setNotice("Rubro eliminado")}}><Trash2 size={15}/></button></div><div className="progress group-progress"><i className={total>group.budget?"danger":""} style={{width:`${Math.min(100,total/group.budget*100)}%`}}/></div>{open&&<div className="subexpense-list">{group.items.map(item=><div className="subexpense-row" key={item.id}><span className="subexpense-dot"/><div><strong>{item.name}</strong><span>{item.category}</span></div><strong>S/ {item.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><button className="add-subexpense" onClick={()=>editSubExpense(group.id,item.id)}>Editar</button><button className="expense-delete" aria-label={`Eliminar ${item.name}`} onClick={()=>removeSubExpense(group.id,item.id)}><Trash2 size={14}/></button></div>)}{group.items.length===0&&<div className="empty-subexpenses">Este rubro todavía no tiene subgastos.</div>}</div>}</article>})}{expenseGroups.length===0&&<article className="card empty-state group-empty"><Layers3/><strong>Crea tu primer rubro general</strong><span>Por ejemplo: Mercado, Transporte o Estudios.</span></article>}</section>}
    </>;
    if(active==="Presupuestos") return <>
      <ModuleHeading eyebrow="CONTROL MENSUAL" title="Presupuestos" text="Crea los límites por rubro que quieras controlar." action={<button onClick={()=>setShowBudgetModal(true)}><Plus size={18}/>Nuevo presupuesto</button>}/>
      <section className="budget-grid">{budgets.length>0?budgets.map(b=>{const spent=expenseByCategory[b.name]||0;const percent=Math.min(100,Math.round(spent/b.limit*100));return <article className="card budget-card" key={b.id}><div className={`budget-icon ${b.color}`}>{categoryIcon(b.name,"expense")}</div><div className="budget-top"><div><span>{b.name}</span><strong>S/ {spent.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div><small>de S/ {b.limit}</small></div><button className="expense-delete" onClick={()=>setBudgets(items=>items.filter(item=>item.id!==b.id))} aria-label={`Eliminar ${b.name}`}><Trash2 size={14}/></button><div className="progress budget-progress"><i className={percent>=90?"danger":""} style={{width:`${percent}%`}}/></div><div className="budget-footer"><span>{percent}% utilizado</span><strong>S/ {Math.max(0,b.limit-spent).toLocaleString("es-PE")} disponible</strong></div></article>}):<article className="card empty-state group-empty"><CircleDollarSign/><strong>Aún no has creado presupuestos</strong><span>Agrega un límite para Alimentación, Transporte u otro rubro.</span></article>}</section>
    </>;
    if(active==="Metas de ahorro") return <>
      <ModuleHeading eyebrow="PLAN DE AHORRO" title="Metas de ahorro" text="Crea una meta con tu propio monto y fecha objetivo."/>
      <article className="card empty-state group-empty"><Target/><strong>Aún no tienes una meta de ahorro</strong><span>Cuando la crees, aquí verás su avance y próximos hitos reales.</span></article>
    </>;
    if(active==="Reportes") return <>
      <ModuleHeading eyebrow="ANÁLISIS" title="Reportes" text="Revisa el comportamiento de tus finanzas con datos actualizados." action={<button onClick={()=>setNotice("Reporte preparado con los datos actuales")}><TrendingUp size={18}/>Generar reporte</button>}/>
      <section className="module-stats"><MiniStat label="Ingresos" value={totals.income} tone="green"/><MiniStat label="Gastos" value={totals.expense} tone="orange"/><MiniStat label="Balance neto" value={totals.income-totals.expense} tone="blue"/></section>
      <section className="report-grid"><article className="card module-card"><div className="card-title"><div><h2>Gastos por rubro</h2><p>Distribución de los registros actuales</p></div></div><div className="report-list">{Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]).map(([name,value])=><div key={name}><span className="report-name">{categoryIcon(name,"expense")}{name}</span><div className="report-bar"><i style={{width:`${totals.expense?value/totals.expense*100:0}%`}}/></div><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong></div>)}</div></article><article className="card report-summary"><TrendingUp/><span>Tasa de ahorro</span><strong>{totals.income?Math.max(0,Math.round((totals.income-totals.expense)/totals.income*100)):0}%</strong><p>Porcentaje disponible después de descontar tus gastos.</p></article></section>
    </>;
    if(active==="Configuración") return <>
      <ModuleHeading eyebrow="PREFERENCIAS" title="Configuración de perfil" text="Actualiza tu perfil, tus rubros y el avance de cada período."/>
      <article className="card module-card profile-settings"><form onSubmit={saveProfile}><div className="card-title"><div><h2>Datos personales</h2><p>Estos datos se guardan en tu perfil de Supabase.</p></div></div><div className="form-row"><label>Nombre visible<input name="fullName" required value={profile.fullName} onChange={e=>setProfile(value=>({...value,fullName:e.target.value}))}/></label><label>Moneda principal<select name="currency" value={profile.currency} onChange={e=>setProfile(value=>({...value,currency:e.target.value}))}><option value="PEN">Soles peruanos (PEN)</option><option value="USD">Dólares (USD)</option><option value="EUR">Euros (EUR)</option></select></label></div><div className="modal-actions"><button className="primary" type="submit">Guardar perfil</button></div></form></article>
      <article className="card module-card profile-settings"><div className="card-title"><div><h2>Rubros personales</h2><p>Estos nombres aparecen al registrar nuevos gastos.</p></div></div><form onSubmit={addCategory} className="form-row"><label>Nuevo rubro<input value={categoryDraft} onChange={e=>setCategoryDraft(e.target.value)} placeholder="Ej. Mascotas"/></label><div className="modal-actions"><button className="primary" type="submit">Agregar rubro</button></div></form><div className="report-list">{categories.map(category=><div key={category}><span className="report-name">{category}</span><button className="expense-delete" type="button" onClick={()=>setCategories(items=>items.filter(item=>item!==category))} aria-label={`Eliminar ${category}`}><Trash2 size={14}/></button></div>)}</div></article>
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
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>{setActive(label);setMobile(false)}}><Icon size={19}/>{label}</button>)}</nav>
      <div className="sidebar-bottom">
        <button className={active==="Configuración"?"active":""} onClick={()=>{setActive("Configuración");setMobile(false)}}><Settings size={19}/>Configuración</button>
        <div className="profile"><div className="avatar">{profile.fullName.split(" ").map(word=>word[0]).join("").slice(0,2).toUpperCase()}</div><div><strong>{profile.fullName}</strong><span>Plan personal</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main>
      <header>
        <button className="menu" onClick={()=>setMobile(true)}><Menu/></button>
        <div className="search"><Search size={18}/><input aria-label="Buscar" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar movimientos..." />{search&&<button aria-label="Limpiar búsqueda" onClick={()=>setSearch("")}><X size={15}/></button>}</div>
        <div className="header-actions"><span className={`sync-status ${syncStatus}`}>{syncStatus==="synced"?"Supabase sincronizado":syncStatus==="setup"?"Supabase: falta crear tabla":syncStatus==="local"?"Guardado local":"Conectando..."}</span><button className="icon-button"><Bell size={19}/><i/></button><div className="month-picker"><button className="month" onClick={()=>setShowMonthPicker(open=>!open)}>{monthNames[selectedMonth]} {selectedYear} <ChevronDown size={16}/></button>{showMonthPicker&&<div className="month-menu"><div className="month-menu-head"><button type="button" onClick={()=>setSelectedYear(year=>year-1)}>‹</button><strong>{selectedYear}</strong><button type="button" onClick={()=>setSelectedYear(year=>year+1)}>›</button></div><div className="month-options">{monthNames.map((name,index)=>{const enabled=isPeriodEnabled(selectedYear,index);return <button type="button" disabled={!enabled} className={index===selectedMonth?"selected":""} key={name} onClick={()=>{if(!enabled) return;setSelectedMonth(index);setShowMonthPicker(false);setNotice(`Periodo seleccionado: ${name} ${selectedYear}`)}}>{name.slice(0,3)}</button>})}</div></div>}</div><button className="outline" type="button" onClick={closeMonth}>Cerrar {monthNames[selectedMonth]}</button><button className="primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Nuevo movimiento</button></div>
      </header>

      <div className="content">
        {active!=="Resumen" ? moduleContent() : <>
        <div className="page-heading"><div><p className="eyebrow">LUNES, 20 DE JULIO</p><h1>Buenos días, Carlos <span>👋</span></h1><p>Aquí tienes el resumen de tus finanzas este mes.</p></div><button className="mobile-add primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Registrar</button></div>

        <section className="metrics">
          <Metric label="Balance total" value={balance} delta="Datos reales" icon={<WalletCards/>} tone="blue" />
          <Metric label="Ingresos" value={totals.income} delta="Datos reales" icon={<ArrowDownLeft/>} tone="green" />
          <Metric label="Gastos" value={totals.expense} delta="Datos reales" icon={<ArrowUpRight/>} tone="orange" />
          <Metric label="Ahorro del mes" value={savings} delta={`${Math.min(100,Math.round(savings/5400*100))}% de tu meta`} icon={<PiggyBank/>} tone="purple" progress={Math.min(100,Math.round(savings/5400*100))}/>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title"><div><h2>Flujo de dinero</h2><p>Ingresos vs. gastos mensuales</p></div><button>Últimos 6 meses <ChevronDown size={15}/></button></div>
            <div className="chart-wrap"><div className="y-axis"><span>S/ {chartMax.toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.75).toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.5).toLocaleString("es-PE")}</span><span>S/ {Math.round(chartMax*.25).toLocaleString("es-PE")}</span><span>S/ 0</span></div><div className="bars">
              {transactions.length>0?<div className="bar-group"><div className="bar income" style={{height:`${totals.income/chartMax*100}%`}}/><div className="bar expense" style={{height:`${totals.expense/chartMax*100}%`}}/><span>Mes actual</span></div>:<div className="empty-state"><TrendingUp size={20}/><strong>Sin datos para el gráfico</strong><span>Registra movimientos para ver tu flujo.</span></div>}
            </div></div><div className="legend"><span><i className="dot green"/>Ingresos</span><span><i className="dot orange"/>Gastos</span></div>
          </article>

          <article className="card spending-card">
            <div className="card-title"><div><h2>Gastos por categoría</h2><p>Distribución este mes</p></div><button className="dots"><MoreHorizontal/></button></div>
            <div className="donut-area"><div className="donut"><div><strong>S/ {totals.expense.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><span>Total gastos</span></div></div><div className="category-list">
              {Object.entries(expenseByCategory).length>0?Object.entries(expenseByCategory).slice(0,4).map(([name,value],index)=><div key={name}><i className={`dot ${["purple","blue","orange","teal"][index]}`}/><span>{name}</span><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><small>{totals.expense?`${Math.round(value/totals.expense*100)}%`:"0%"}</small></div>):<div><span>Aún no hay gastos registrados.</span></div>}
            </div></div>
          </article>

          <article className="card transactions-card">
            <div className="card-title"><div><h2>Últimos movimientos</h2><p>Tus transacciones más recientes</p></div><button onClick={()=>setActive("Movimientos")}>Ver todos <span>→</span></button></div>
            <div className="tx-list">{visibleTransactions.slice(0,6).map(t=><div className="tx" key={t.id}><div className={`tx-icon ${t.kind}`}>{categoryIcon(t.category,t.kind)}</div><div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account}</span></div><div className="tx-date">{t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div><button className="delete-tx" aria-label={`Eliminar ${t.title}`} onClick={()=>{setTransactions(p=>{const next=p.filter(x=>x.id!==t.id);localStorage.setItem("finanza-transactions",JSON.stringify(next));return next});setNotice("Movimiento eliminado")}}><Trash2 size={14}/></button></div>)}{visibleTransactions.length===0&&<div className="empty-state"><Search size={22}/><strong>No encontramos movimientos</strong><span>Prueba con otra palabra.</span></div>}</div>
          </article>

          <article className="card goal-card">
            <div className="card-title"><div><h2>Meta de ahorro</h2><p>Fondo de emergencia</p></div><button className="dots"><MoreHorizontal/></button></div>
            <div className="goal-amount"><strong>S/ {savings.toLocaleString("es-PE")}</strong><span>de S/ 5,400</span></div><div className="progress"><i style={{width:`${Math.min(100,savings/5400*100)}%`}}/></div><div className="goal-row"><span>{Math.min(100,Math.round(savings/5400*100))}% completado</span><strong>Faltan S/ {Math.max(0,5400-savings).toLocaleString("es-PE")}</strong></div><div className="goal-tip"><Target size={20}/><div><strong>¡Vas por buen camino!</strong><span>Agrega aportes y observa cómo avanza tu meta.</span></div></div><button className="outline" onClick={()=>{setSavings(v=>{const next=Math.min(5400,v+100);localStorage.setItem("finanza-savings",String(next));return next});setNotice("Se agregaron S/ 100 a tu ahorro")}}>+ Agregar S/ 100</button>
          </article>
        </section>

        <section className="accounts"><div className="section-heading"><div><h2>Mis cuentas</h2><p>Conecta y controla todo desde un solo lugar.</p></div><button onClick={()=>setNotice("Conexión bancaria lista para configurar con APIs oficiales")}><Plus size={17}/>Conectar cuenta</button></div><article className="card empty-state"><Landmark/><strong>Aún no hay cuentas conectadas</strong><span>Cuando agregues una, aparecerá aquí con su saldo real.</span></article><button className="reset-demo" onClick={()=>{setTransactions(seed);setSavings(0);setFixedExpenses(fixedSeed);setMonthlyExpenses(monthlySeed);setExpenseGroups(groupSeed);setSearch("");localStorage.setItem("finanza-transactions",JSON.stringify(seed));localStorage.setItem("finanza-savings","0");localStorage.setItem("finanza-fixed-expenses",JSON.stringify(fixedSeed));localStorage.setItem("finanza-monthly-expenses",JSON.stringify(monthlySeed));localStorage.setItem("finanza-expense-groups",JSON.stringify(groupSeed));setNotice("Datos vacíos restaurados")}}>Limpiar datos de prueba</button></section>
        </>}
      </div>
    </main>

    {showModal&&<div className="modal-backdrop" onMouseDown={()=>setShowModal(false)}><form className="modal" onSubmit={addTransaction} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo movimiento</h2><p>Registra un ingreso o gasto en {monthNames[selectedMonth]} {selectedYear}.</p></div><button type="button" onClick={()=>setShowModal(false)}><X/></button></div><label>Tipo<select name="kind" value={movementKind} onChange={e=>setMovementKind(e.target.value as "income"|"expense")}><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label>{movementKind==="expense"&&<label>Tipo de gasto<select value={expenseType} onChange={e=>setExpenseType(e.target.value as "fixed"|"monthly"|"group")}><option value="fixed">Gasto fijo — se repite cada mes</option><option value="monthly">Gasto mensual — solo este mes</option><option value="group">Por rubro / subgasto</option></select></label>}<label>Descripción<input name="title" required placeholder={movementKind==="income"?"Ej. Sueldo mensual":expenseType==="fixed"?"Ej. Alquiler":"Ej. Almuerzo"}/></label><div className="form-row"><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Categoría<select name="category">{(movementKind==="income"?incomeCategories:categories).map(category=><option key={category}>{category}</option>)}</select></label></div><label>Cuenta<select name="account"><option>Yape</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label>{movementKind==="expense"&&expenseType==="group"&&<p className="eyebrow">Este movimiento se verá en el historial. Para detallarlo por rubro, crea el rubro y sus subgastos en la sección Gastos.</p>}<div className="modal-actions"><button type="button" onClick={()=>setShowModal(false)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {expenseModal&&<div className="modal-backdrop" onMouseDown={()=>setExpenseModal(null)}><form className="modal" onSubmit={addDetailedExpense} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{expenseModal.kind==="group"?"Nuevo rubro":expenseModal.kind==="sub"?"Agregar subgastos":expenseModal.kind==="fixed"?"Nuevo gasto fijo":"Nuevo gasto mensual"}</h2><p>{expenseModal.kind==="group"?"Crea una categoría general para agrupar detalles.":expenseModal.kind==="sub"?"Añade varias compras al mismo rubro antes de guardar.":"Registra el concepto y su monto."}</p></div><button type="button" onClick={()=>setExpenseModal(null)}><X/></button></div>{expenseModal.kind==="sub"?<><div className="card-title"><div><h2>Detalle de subgastos</h2><p>{subRows.length} filas listas para registrar.</p></div><button type="button" className="add-subexpense" onClick={()=>setSubRows(rows=>[...rows,Date.now()+rows.length])}><Plus size={16}/>Agregar fila</button></div>{subRows.map((row,index)=><div className="form-row" key={row}><label>Descripción<input name="name" required autoFocus={index===0} placeholder="Ej. Mandarina"/></label><label>Categoría<select name="category">{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label>{subRows.length>1&&<button type="button" className="expense-delete" onClick={()=>setSubRows(rows=>rows.filter(item=>item!==row))}><Trash2 size={15}/></button>}</div>)}</>:<><label>{expenseModal.kind==="group"?"Nombre del rubro":"Descripción"}<input name="name" required autoFocus placeholder={expenseModal.kind==="group"?"Ej. Mercado":"Ej. Alquiler"}/></label>{expenseModal.kind!=="group"&&<label>Categoría<select name="category">{categories.map(category=><option key={category}>{category}</option>)}</select></label>}<label>{expenseModal.kind==="group"?"Presupuesto mensual (S/)":"Monto (S/)"}<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label></>}<div className="modal-actions"><button type="button" onClick={()=>setExpenseModal(null)}>Cancelar</button><button className="primary" type="submit">{expenseModal.kind==="group"?"Crear rubro":expenseModal.kind==="sub"?`Guardar ${subRows.length} subgasto${subRows.length===1?"":"s"}`:"Guardar gasto"}</button></div></form></div>}
    {expenseEdit&&(()=>{const group=expenseGroups.find(item=>item.id===expenseEdit.groupId);const item=expenseEdit.kind==="sub"?group?.items.find(entry=>entry.id===expenseEdit.itemId):undefined;if(!group||expenseEdit.kind==="sub"&&!item)return null;const isGroup=expenseEdit.kind==="group";return <div className="modal-backdrop" onMouseDown={()=>setExpenseEdit(null)}><form className="modal" onSubmit={saveExpenseEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>{isGroup?"Editar rubro":"Editar subgasto"}</h2><p>{isGroup?"Actualiza el nombre y el presupuesto. Los subgastos se conservan.":`Dentro del rubro ${group.name}.`}</p></div><button type="button" onClick={()=>setExpenseEdit(null)}><X/></button></div><label>{isGroup?"Nombre del rubro":"Descripción"}<input name="name" required autoFocus defaultValue={isGroup?group.name:item!.name}/></label>{!isGroup&&<label>Categoría<select name="category" defaultValue={item!.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label>}<label>{isGroup?"Presupuesto mensual (S/)":"Monto (S/)"}<input name="amount" required type="number" min="0" step="0.01" defaultValue={isGroup?group.budget:item!.amount}/></label><div className="module-callout"><ReceiptText/><div><strong>{isGroup?`${group.items.length} subgastos registrados`:`Periodo: ${monthNames[selectedMonth]} ${selectedYear}`}</strong><span>{isGroup?`Total usado actualmente: S/ ${group.items.reduce((sum,entry)=>sum+entry.amount,0).toLocaleString("es-PE",{minimumFractionDigits:2})}`:`Valor actual: S/ ${item!.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}`}</span></div></div><div className="modal-actions"><button type="button" onClick={()=>setExpenseEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {detailedEdit&&(()=>{const item=(detailedEdit.section==="fixed"?fixedExpenses:monthlyExpenses).find(entry=>entry.id===detailedEdit.id);if(!item)return null;return <div className="modal-backdrop" onMouseDown={()=>setDetailedEdit(null)}><form className="modal" onSubmit={saveDetailedEdit} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Editar {detailedEdit.section==="fixed"?"gasto fijo":"gasto mensual"}</h2><p>Actualiza los datos sin perder el registro.</p></div><button type="button" onClick={()=>setDetailedEdit(null)}><X/></button></div><label>Descripción<input name="name" required autoFocus defaultValue={item.name}/></label><label>Categoría<select name="category" defaultValue={item.category}>{categories.map(category=><option key={category}>{category}</option>)}</select></label><label>Monto (S/)<input name="amount" required type="number" min="0" step="0.01" defaultValue={item.amount}/></label><div className="modal-actions"><button type="button" onClick={()=>setDetailedEdit(null)}>Cancelar</button><button className="primary" type="submit">Guardar cambios</button></div></form></div>})()}
    {showBudgetModal&&<div className="modal-backdrop" onMouseDown={()=>setShowBudgetModal(false)}><form className="modal" onSubmit={addBudget} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo presupuesto</h2><p>Define el límite mensual de un rubro.</p></div><button type="button" onClick={()=>setShowBudgetModal(false)}><X/></button></div><label>Rubro<input name="name" required autoFocus placeholder="Ej. Alimentación"/></label><label>Límite mensual (S/)<input name="limit" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Color<select name="color"><option value="purple">Morado</option><option value="blue">Azul</option><option value="orange">Naranja</option><option value="teal">Verde</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setShowBudgetModal(false)}>Cancelar</button><button className="primary" type="submit">Crear presupuesto</button></div></form></div>}
    {notice&&<div className="toast">✓ {notice}</div>}
  </div>
}
