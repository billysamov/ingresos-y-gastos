type StoredState = Record<string, unknown>;
type JsonRow = Record<string, unknown>;

const metaEnv = (typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined) ?? {};
const procEnv = (typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : undefined) ?? {};
const nextPublicSupabaseUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const nextPublicSupabaseKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY : undefined;
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || nextPublicSupabaseUrl || procEnv.VITE_SUPABASE_URL)?.replace(/\/$/, "");
const publishableKey = metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || nextPublicSupabaseKey || procEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
const profileId = "00000000-0000-4000-8000-000000000001";
const initialPeriod = "2026-08";
const remoteIds = new Map<string, string>();
const remoteVersions = new Map<string, string>();

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

function headers(extra: Record<string, string> = {}) {
  return { apikey: publishableKey!, Authorization: `Bearer ${publishableKey!}`, "Content-Type": "application/json", ...extra };
}
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function clientId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  return 1_000_000_000 + hash;
}
function parseNotes(notes: unknown) {
  const text = String(notes ?? "");
  const category = text.match(/Categor[íi]a:\s*([^.]*)/i)?.[1]?.trim();
  const account = text.match(/Cuenta:\s*([^.]*)/i)?.[1]?.trim();
  return { category, account };
}

/** Lee las tablas normalizadas. finanza_state no participa en la aplicación. */
export async function loadRelationalFinanceState(): Promise<StoredState> {
  if (!isSupabaseConfigured) throw new Error("Supabase no está configurado");
  const profileFilter = `profile_id=eq.${profileId}`;
  const [profiles, settings, categories, transactions, fixedExpenses, monthlyExpenses, groups, savingsGoals] = await Promise.all([
    request(`profiles?id=eq.${profileId}&select=*`), request(`finance_settings?profile_id=eq.${profileId}&select=*`), request(`categories?${profileFilter}&select=*`),
    request(`transactions?${profileFilter}&select=*&order=created_at.desc`), request(`fixed_expenses?${profileFilter}&select=*&order=created_at.desc`),
    request(`monthly_expenses?${profileFilter}&select=*&order=created_at.desc`), request(`expense_groups?${profileFilter}&select=*&order=created_at.asc`), request(`savings_goals?${profileFilter}&select=*`),
  ]) as JsonRow[][];
  const groupIds = groups.map(row => String(row.id));
  const items = groupIds.length ? await request(`expense_items?expense_group_id=in.(${groupIds.join(",")})&select=*&order=created_at.asc`) as JsonRow[] : [];
  const profile = profiles[0] ?? {};
  const config = settings[0] ?? {};
  const mapTransaction = (row: JsonRow) => {
    const fallback = parseNotes(row.notes);
    return { id: clientId(String(row.id)), dbId: row.id, dbUpdatedAt: row.updated_at, title: row.description ?? "Movimiento", category: row.category_name ?? fallback.category ?? "Otros", account: row.account_name ?? fallback.account ?? "Efectivo", date: "Ahora", amount: Number(row.amount ?? 0), kind: row.transaction_type, period: row.period_key ?? initialPeriod, planned: Boolean(row.is_planned), requiresConfirmation: Boolean(row.requires_confirmation), completed: Boolean(row.completed) };
  };
  return {
    transactions: transactions.map(mapTransaction),
    fixedExpenses: fixedExpenses.map(row => ({ id: clientId(String(row.id)), dbId: row.id, dbUpdatedAt: row.updated_at, name: row.name ?? "Gasto fijo", category: row.category_name ?? "Otros", account: row.account_name ?? "Efectivo", amount: Number(row.amount ?? 0), requiresConfirmation: row.requires_confirmation !== false, completed: Boolean(row.completed) })),
    monthlyExpenses: monthlyExpenses.map(row => ({ id: clientId(String(row.id)), dbId: row.id, dbUpdatedAt: row.updated_at, name: row.name ?? "Gasto mensual", category: row.category_name ?? row.notes ?? "Otros", account: row.account_name ?? "Efectivo", amount: Number(row.amount ?? 0), period: row.period_key ?? String(row.expense_month ?? initialPeriod).slice(0, 7), requiresConfirmation: row.requires_confirmation !== false, completed: Boolean(row.completed) })),
    expenseGroups: groups.map(group => ({ id: clientId(String(group.id)), dbId: group.id, dbUpdatedAt: group.updated_at, name: group.name ?? "Categoría", budget: Number(group.monthly_budget ?? 0), items: items.filter(item => item.expense_group_id === group.id).map(item => ({ id: clientId(String(item.id)), dbId: item.id, dbUpdatedAt: item.updated_at, name: item.name ?? "Subgasto", category: item.category ?? "Otros", account: item.account_name ?? "Efectivo", amount: Number(item.amount ?? 0), period: item.period_key ?? initialPeriod, requiresConfirmation: item.requires_confirmation !== false, completed: Boolean(item.completed) })) })),
    savings: Number(savingsGoals.find(row => row.name === "Ahorro personal")?.current_amount ?? 0),
    savingsGoals: savingsGoals.filter(row => row.name !== "Ahorro personal").map(row => ({ id: clientId(String(row.id)), dbId: row.id, dbUpdatedAt: row.updated_at, name: row.name ?? "Meta", target: Number(row.target_amount ?? 0), amount: Number(row.current_amount ?? 0) })),
    profile: { fullName: profile.full_name ?? "Mi perfil", currency: profile.currency_code ?? "PEN", monthlySalary: Number(config.monthly_salary ?? 0), autoRegisterSalary: Boolean(config.auto_register_salary) },
    monthAccess: { year: Number(config.active_year ?? 2026), month: Math.max(0, Number(config.active_month ?? 8) - 1) },
    categories: categories.filter(row => row.category_type === "expense").map(row => String(row.name)),
    incomeCategories: categories.filter(row => row.category_type === "income").map(row => String(row.name)),
    budgets: [],
  };
}

type FinanceData = { transactions: JsonRow[]; savings: number; savingsGoals: JsonRow[]; fixedExpenses: JsonRow[]; monthlyExpenses: JsonRow[]; expenseGroups: JsonRow[]; profile: JsonRow; monthAccess: JsonRow; categories: string[]; incomeCategories: string[] };
async function patchOrInsert(table: string, dbId: unknown, body: JsonRow, localId?: unknown, dbUpdatedAt?: unknown) {
  const memoryKey = localId === undefined ? undefined : `${table}:${localId}`;
  const remoteId = dbId ?? (memoryKey ? remoteIds.get(memoryKey) : undefined);
  const version = memoryKey ? (remoteVersions.get(memoryKey) ?? dbUpdatedAt) : dbUpdatedAt;
  if (remoteId) {
    const filter = version ? `&updated_at=eq.${encodeURIComponent(String(version))}` : "";
    const updated = await request(`${table}?id=eq.${remoteId}${filter}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
    if (!updated?.[0]) throw new Error("Conflicto: este registro fue actualizado desde otro dispositivo. Recarga antes de volver a guardarlo.");
    if (memoryKey && updated[0].updated_at) remoteVersions.set(memoryKey, updated[0].updated_at);
    return updated;
  }
  const created = await request(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (memoryKey && created?.[0]?.id) remoteIds.set(memoryKey, created[0].id);
  if (memoryKey && created?.[0]?.updated_at) remoteVersions.set(memoryKey, created[0].updated_at);
  return created;
}

/** Sincroniza filas individualmente; jamás borra tablas ni usa finanza_state. */
export async function saveRelationalFinanceState(data: FinanceData) {
  if (!isSupabaseConfigured) throw new Error("Supabase no está configurado");
  const period = `${data.monthAccess.year}-${String(Number(data.monthAccess.month) + 1).padStart(2, "0")}`;
  await Promise.all([
    request(`profiles?id=eq.${profileId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ full_name: data.profile.fullName, currency_code: data.profile.currency, updated_at: new Date().toISOString() }) }),
    request("finance_settings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ profile_id: profileId, active_year: data.monthAccess.year, active_month: Number(data.monthAccess.month) + 1, monthly_salary: data.profile.monthlySalary ?? 0, auto_register_salary: Boolean(data.profile.autoRegisterSalary), updated_at: new Date().toISOString() }) }),
  ]);
  // Cada fila conserva su UUID. Las inserciones futuras se reconocen por sus datos
  // y se reciben con UUID al recargar desde Supabase.
  await Promise.all(data.transactions.map(row => patchOrInsert("transactions", row.dbId, { profile_id: profileId, transaction_type: row.kind, description: row.title, amount: row.amount, occurred_at: new Date().toISOString(), period_key: row.period ?? period, category_name: row.category, account_name: row.account, is_planned: Boolean(row.planned), requires_confirmation: Boolean(row.requiresConfirmation), completed: row.completed !== false }, row.id, row.dbUpdatedAt)));
  await Promise.all(data.fixedExpenses.map(row => patchOrInsert("fixed_expenses", row.dbId, { profile_id: profileId, name: row.name, amount: row.amount, frequency: "monthly", category_name: row.category, account_name: row.account, requires_confirmation: row.requiresConfirmation !== false, completed: Boolean(row.completed) }, row.id, row.dbUpdatedAt)));
  await Promise.all(data.monthlyExpenses.map(row => patchOrInsert("monthly_expenses", row.dbId, { profile_id: profileId, name: row.name, amount: row.amount, expense_month: `${row.period ?? period}-01`, category_name: row.category, account_name: row.account, period_key: row.period ?? period, requires_confirmation: row.requiresConfirmation !== false, completed: Boolean(row.completed) }, row.id, row.dbUpdatedAt)));
  for (const group of data.expenseGroups) {
    const result = await patchOrInsert("expense_groups", group.dbId, { profile_id: profileId, name: group.name, monthly_budget: group.budget, period_key: period }, group.id, group.dbUpdatedAt);
    const groupId = group.dbId ?? remoteIds.get(`expense_groups:${group.id}`) ?? result?.[0]?.id;
    if (!groupId) continue;
    await Promise.all((Array.isArray(group.items) ? group.items : []).map((item: JsonRow) => patchOrInsert("expense_items", item.dbId, { expense_group_id: groupId, name: item.name, category: item.category, amount: item.amount, account_name: item.account ?? "Efectivo", period_key: item.period ?? period, requires_confirmation: item.requiresConfirmation !== false, completed: Boolean(item.completed) }, item.id, item.dbUpdatedAt)));
  }
  const remoteGroups = await request(`expense_groups?profile_id=eq.${profileId}&select=id`) as JsonRow[];
  const activeGroupIds = new Set(data.expenseGroups.map(group => String(group.dbId ?? remoteIds.get(`expense_groups:${group.id}`) ?? "")));
  await Promise.all(remoteGroups.filter(group => !activeGroupIds.has(String(group.id))).map(group => request(`expense_groups?id=eq.${group.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } })));
  const allCategories = [...data.categories.map(name => ({ name, category_type: "expense" })), ...data.incomeCategories.map(name => ({ name, category_type: "income" }))];
  const remoteCategories = await request(`categories?profile_id=eq.${profileId}&select=id,name,category_type`) as JsonRow[];
  await Promise.all(allCategories.filter(item => !remoteCategories.some(row => row.name === item.name && row.category_type === item.category_type)).map(item => request("categories", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ profile_id: profileId, ...item }) })));
  await Promise.all(data.savingsGoals.map(goal => patchOrInsert("savings_goals", goal.dbId, { profile_id: profileId, name: goal.name, target_amount: goal.target, current_amount: goal.amount, is_active: true }, goal.id, goal.dbUpdatedAt)));
  const remoteSavings = await request(`savings_goals?profile_id=eq.${profileId}&name=eq.Ahorro%20personal&select=id`) as JsonRow[];
  if (remoteSavings[0]?.id) await request(`savings_goals?id=eq.${remoteSavings[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ current_amount: data.savings, is_active: true }) });
  else await request("savings_goals", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ profile_id: profileId, name: "Ahorro personal", target_amount: Math.max(1, data.savings), current_amount: data.savings, is_active: true }) });
}

/** Elimina únicamente el registro elegido. Los subgastos se eliminan en cascada con su grupo. */
export async function deleteRelationalRecord(table: "transactions"|"fixed_expenses"|"monthly_expenses"|"expense_groups"|"expense_items"|"savings_goals", dbId?: string) {
  if (!dbId) return;
  await request(`${table}?id=eq.${dbId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
