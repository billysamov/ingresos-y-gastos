"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, CircleDollarSign, CreditCard, LayoutDashboard, Landmark, Menu, MoreHorizontal, PiggyBank, Plus, Search, Settings, Target, TrendingUp, WalletCards, X } from "lucide-react";

type Tx = { id:number; title:string; category:string; account:string; date:string; amount:number; kind:"income"|"expense" };

const seed: Tx[] = [
  { id:1, title:"Salario mensual", category:"Ingresos", account:"BCP •• 2847", date:"Hoy, 09:30", amount:5400, kind:"income" },
  { id:2, title:"Supermercado Wong", category:"Alimentación", account:"Yape", date:"Ayer, 18:42", amount:186.5, kind:"expense" },
  { id:3, title:"Netflix", category:"Suscripciones", account:"Interbank •• 9041", date:"18 Jul, 10:15", amount:44.9, kind:"expense" },
  { id:4, title:"Freelance — diseño", category:"Ingresos extra", account:"BBVA •• 6210", date:"17 Jul, 16:20", amount:850, kind:"income" },
  { id:5, title:"Grifo Primax", category:"Transporte", account:"Yape", date:"16 Jul, 20:08", amount:120, kind:"expense" },
];

const nav = [
  ["Resumen", LayoutDashboard], ["Movimientos", WalletCards], ["Presupuestos", CircleDollarSign], ["Metas de ahorro", Target], ["Reportes", TrendingUp], ["Cuentas", Landmark],
] as const;

export default function Home() {
  const [active, setActive] = useState("Resumen");
  const [transactions, setTransactions] = useState(seed);
  const [showModal, setShowModal] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const totals = useMemo(() => ({
    income: transactions.filter(t=>t.kind==="income").reduce((a,b)=>a+b.amount,0),
    expense: transactions.filter(t=>t.kind==="expense").reduce((a,b)=>a+b.amount,0),
  }), [transactions]);
  const balance = 4230.5 + totals.income - 6250 - totals.expense;

  function addTransaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = fd.get("kind") as "income"|"expense";
    setTransactions(prev => [{ id:Date.now(), title:String(fd.get("title")), category:String(fd.get("category")), account:String(fd.get("account")), date:"Ahora", amount:Number(fd.get("amount")), kind }, ...prev]);
    setShowModal(false); setNotice("Movimiento registrado correctamente");
    setTimeout(()=>setNotice(""), 2600);
  }

  return <div className="app-shell">
    <aside className={mobile ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><TrendingUp size={19}/></div><span>Finanza</span><button className="close-mobile" onClick={()=>setMobile(false)}><X/></button></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>{setActive(label);setMobile(false)}}><Icon size={19}/>{label}</button>)}</nav>
      <div className="sidebar-bottom">
        <button onClick={()=>setNotice("Configuración disponible próximamente")}><Settings size={19}/>Configuración</button>
        <div className="profile"><div className="avatar">CM</div><div><strong>Carlos Mendoza</strong><span>Plan personal</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main>
      <header>
        <button className="menu" onClick={()=>setMobile(true)}><Menu/></button>
        <div className="search"><Search size={18}/><input aria-label="Buscar" placeholder="Buscar movimientos..." /></div>
        <div className="header-actions"><button className="icon-button"><Bell size={19}/><i/></button><button className="month">Julio 2026 <ChevronDown size={16}/></button><button className="primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Nuevo movimiento</button></div>
      </header>

      <div className="content">
        <div className="page-heading"><div><p className="eyebrow">LUNES, 20 DE JULIO</p><h1>Buenos días, Carlos <span>👋</span></h1><p>Aquí tienes el resumen de tus finanzas este mes.</p></div><button className="mobile-add primary" onClick={()=>setShowModal(true)}><Plus size={18}/>Registrar</button></div>

        <section className="metrics">
          <Metric label="Balance total" value={balance} delta="+8.4%" icon={<WalletCards/>} tone="blue" />
          <Metric label="Ingresos" value={totals.income} delta="+12.5%" icon={<ArrowDownLeft/>} tone="green" />
          <Metric label="Gastos" value={totals.expense} delta="−3.2%" icon={<ArrowUpRight/>} tone="orange" />
          <Metric label="Ahorro del mes" value={3200} delta="59% de tu meta" icon={<PiggyBank/>} tone="purple" progress={59}/>
        </section>

        <section className="dashboard-grid">
          <article className="card chart-card">
            <div className="card-title"><div><h2>Flujo de dinero</h2><p>Ingresos vs. gastos mensuales</p></div><button>Últimos 6 meses <ChevronDown size={15}/></button></div>
            <div className="chart-wrap"><div className="y-axis"><span>S/ 8k</span><span>S/ 6k</span><span>S/ 4k</span><span>S/ 2k</span><span>S/ 0</span></div><div className="bars">
              {[[55,38],[61,42],[48,36],[70,47],[62,40],[82,51]].map((x,i)=><div className="bar-group" key={i}><div className="bar income" style={{height:`${x[0]}%`}}/><div className="bar expense" style={{height:`${x[1]}%`}}/><span>{["Feb","Mar","Abr","May","Jun","Jul"][i]}</span></div>)}
            </div></div><div className="legend"><span><i className="dot green"/>Ingresos</span><span><i className="dot orange"/>Gastos</span></div>
          </article>

          <article className="card spending-card">
            <div className="card-title"><div><h2>Gastos por categoría</h2><p>Distribución este mes</p></div><button className="dots"><MoreHorizontal/></button></div>
            <div className="donut-area"><div className="donut"><div><strong>S/ 1,014</strong><span>Total gastos</span></div></div><div className="category-list">
              {[['Alimentación','S/ 354','35%','purple'],['Transporte','S/ 220','22%','blue'],['Servicios','S/ 176','17%','orange'],['Otros','S/ 264','26%','teal']].map(x=><div key={x[0]}><i className={`dot ${x[3]}`}/><span>{x[0]}</span><strong>{x[1]}</strong><small>{x[2]}</small></div>)}
            </div></div>
          </article>

          <article className="card transactions-card">
            <div className="card-title"><div><h2>Últimos movimientos</h2><p>Tus transacciones más recientes</p></div><button onClick={()=>setActive("Movimientos")}>Ver todos <span>→</span></button></div>
            <div className="tx-list">{transactions.slice(0,5).map(t=><div className="tx" key={t.id}><div className={`tx-icon ${t.kind}`}>{t.kind==="income"?<ArrowDownLeft/>:<CreditCard/>}</div><div className="tx-main"><strong>{t.title}</strong><span>{t.category} · {t.account}</span></div><div className="tx-date">{t.date}</div><div className={`tx-amount ${t.kind}`}>{t.kind==="income"?"+":"−"} S/ {t.amount.toLocaleString("es-PE",{minimumFractionDigits:2})}</div></div>)}</div>
          </article>

          <article className="card goal-card">
            <div className="card-title"><div><h2>Meta de ahorro</h2><p>Fondo de emergencia</p></div><button className="dots"><MoreHorizontal/></button></div>
            <div className="goal-amount"><strong>S/ 3,200</strong><span>de S/ 5,400</span></div><div className="progress"><i style={{width:"59%"}}/></div><div className="goal-row"><span>59% completado</span><strong>Faltan S/ 2,200</strong></div><div className="goal-tip"><Target size={20}/><div><strong>¡Vas por buen camino!</strong><span>Ahorrando S/ 550 al mes, llegarás a tu meta en noviembre.</span></div></div><button className="outline" onClick={()=>setNotice("Aporte de S/ 100 simulado")}>+ Agregar ahorro</button>
          </article>
        </section>

        <section className="accounts"><div className="section-heading"><div><h2>Mis cuentas</h2><p>Conecta y controla todo desde un solo lugar.</p></div><button onClick={()=>setNotice("Conexión bancaria lista para configurar con APIs oficiales")}><Plus size={17}/>Conectar cuenta</button></div><div className="account-grid">
          <Account logo="Y" color="#7427c5" name="Yape" type="Billetera digital" amount="S/ 842.50" />
          <Account logo="B" color="#0753a5" name="Banco de Crédito BCP" type="Cuenta de ahorros •• 2847" amount="S/ 4,680.00" />
          <Account logo="I" color="#009b84" name="Interbank" type="Tarjeta de crédito •• 9041" amount="− S/ 720.40" />
        </div></section>
      </div>
    </main>

    {showModal&&<div className="modal-backdrop" onMouseDown={()=>setShowModal(false)}><form className="modal" onSubmit={addTransaction} onMouseDown={e=>e.stopPropagation()}><div className="modal-title"><div><h2>Nuevo movimiento</h2><p>Registra un ingreso o gasto.</p></div><button type="button" onClick={()=>setShowModal(false)}><X/></button></div><label>Tipo<select name="kind"><option value="expense">Gasto</option><option value="income">Ingreso</option></select></label><label>Descripción<input name="title" required placeholder="Ej. Almuerzo"/></label><div className="form-row"><label>Monto (S/)<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0.00"/></label><label>Categoría<select name="category"><option>Alimentación</option><option>Transporte</option><option>Servicios</option><option>Ingresos extra</option><option>Otros</option></select></label></div><label>Cuenta<select name="account"><option>Yape</option><option>BCP •• 2847</option><option>Interbank •• 9041</option><option>Efectivo</option></select></label><div className="modal-actions"><button type="button" onClick={()=>setShowModal(false)}>Cancelar</button><button className="primary" type="submit">Guardar movimiento</button></div></form></div>}
    {notice&&<div className="toast">✓ {notice}</div>}
  </div>
}

function Metric({label,value,delta,icon,tone,progress}:{label:string,value:number,delta:string,icon:React.ReactNode,tone:string,progress?:number}) { return <article className="metric card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>S/ {value.toLocaleString("es-PE",{minimumFractionDigits:2})}</strong><small className={tone}>{delta}</small>{progress&&<div className="mini-progress"><i style={{width:`${progress}%`}}/></div>}</div></article> }
function Account({logo,color,name,type,amount}:{logo:string,color:string,name:string,type:string,amount:string}) { return <article className="account-card card"><div className="account-logo" style={{background:color}}>{logo}</div><div><strong>{name}</strong><span>{type}</span></div><div className="account-balance"><strong>{amount}</strong><span>Saldo disponible</span></div><button><MoreHorizontal/></button></article> }
