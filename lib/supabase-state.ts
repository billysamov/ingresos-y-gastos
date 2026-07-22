type StoredState = Record<string, unknown>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const stateId = "finanza-personal";
const profileId = "00000000-0000-4000-8000-000000000001";

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

function headers() {
  return {
    apikey: publishableKey!,
    Authorization: `Bearer ${publishableKey!}`,
    "Content-Type": "application/json",
  };
}

export async function loadSupabaseState(): Promise<StoredState | null> {
  if (!isSupabaseConfigured) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/finanza_state?id=eq.${stateId}&select=data`, { headers: headers() });
  if (!response.ok) throw new Error("No se pudo leer Supabase");
  const rows = await response.json() as Array<{ data: StoredState }>;
  return rows[0]?.data ?? null;
}

export async function saveSupabaseState(data: StoredState) {
  if (!isSupabaseConfigured) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/finanza_state`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: stateId, data, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error("No se pudo guardar en Supabase");
}

async function tableRequest(table:string, method:string, body?:unknown, query="") {
  const response=await fetch(`${supabaseUrl}/rest/v1/${table}${query}`,{
    method,
    headers:{...headers(),Prefer:method==="POST"?"resolution=merge-duplicates,return=representation":"return=minimal"},
    body:body===undefined?undefined:JSON.stringify(body),
  });
  if(!response.ok) throw new Error(`No se pudo sincronizar ${table}`);
  return response;
}

type TransactionInput={title:string;category:string;account:string;date:string;amount:number;kind:"income"|"expense";period?:string};
type ExpenseInput={name:string;category:string;amount:number};
type GroupInput={name:string;budget:number;items:ExpenseInput[]};

export async function syncSupabaseTables(data:{transactions:TransactionInput[];savings:number;fixedExpenses:ExpenseInput[];monthlyExpenses:ExpenseInput[];expenseGroups:GroupInput[];profile:{fullName:string;currency:string}}) {
  if(!isSupabaseConfigured) return;
  const profileFilter=`?profile_id=eq.${profileId}`;
  await tableRequest("transactions","DELETE",undefined,profileFilter);
  await tableRequest("fixed_expenses","DELETE",undefined,profileFilter);
  await tableRequest("monthly_expenses","DELETE",undefined,profileFilter);
  await tableRequest("savings_goals","DELETE",undefined,profileFilter);
  await tableRequest("expense_groups","DELETE",undefined,profileFilter);
  await tableRequest("accounts","DELETE",undefined,profileFilter);
  await tableRequest("categories","DELETE",undefined,profileFilter);
  await tableRequest("profiles","POST",{id:profileId,full_name:data.profile.fullName,currency_code:data.profile.currency,updated_at:new Date().toISOString()});

  const accountNames=[...new Set(data.transactions.map(item=>item.account).filter(Boolean))];
  if(accountNames.length) await tableRequest("accounts","POST",accountNames.map(name=>({profile_id:profileId,name,institution:name,account_type:name.toLowerCase().includes("yape")?"wallet":"bank",current_balance:0})));
  const categoryRows=[...new Map(data.transactions.map(item=>[`${item.category}:${item.kind}`,{profile_id:profileId,name:item.category,category_type:item.kind==="income"?"income":"expense"}])).values()];
  if(categoryRows.length) await tableRequest("categories","POST",categoryRows);
  if(data.transactions.length) await tableRequest("transactions","POST",data.transactions.map(item=>({profile_id:profileId,transaction_type:item.kind,description:item.title,amount:item.amount,occurred_at:new Date().toISOString(),notes:`Categoría: ${item.category}. Cuenta: ${item.account}. Registro: ${item.date}`})));
  if(data.fixedExpenses.length) await tableRequest("fixed_expenses","POST",data.fixedExpenses.map(item=>({profile_id:profileId,name:item.name,amount:item.amount,frequency:"monthly"})));
  if(data.monthlyExpenses.length) await tableRequest("monthly_expenses","POST",data.monthlyExpenses.map(item=>({profile_id:profileId,name:item.name,amount:item.amount,notes:item.category})));
  for(const group of data.expenseGroups){
    const response=await tableRequest("expense_groups","POST",{profile_id:profileId,name:group.name,monthly_budget:group.budget});
    const [created]=await response.json() as Array<{id:string}>;
    if(created?.id&&group.items.length) await tableRequest("expense_items","POST",group.items.map(item=>({expense_group_id:created.id,name:item.name,category:item.category,amount:item.amount})));
  }
  await tableRequest("savings_goals","POST",{profile_id:profileId,name:"Ahorro personal",target_amount:5400,current_amount:data.savings,is_active:true});
}
