import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  CreateContractBody,
  CreateContractResponse,
  CreateExpenseBody,
  CreateExpenseResponse,
  CreatePaymentBody,
  CreatePaymentResponse,
  CreatePropertyBody,
  CreatePropertyResponse,
  CreateTenantBody,
  CreateTenantResponse,
  CreateUnitBody,
  CreateUnitResponse,
  GetContractsQueryParams,
  GetContractsResponse,
  GetDashboardResponse,
  GetExpensesQueryParams,
  GetExpensesResponse,
  GetNotificationsResponse,
  GetPaymentSchedulesQueryParams,
  GetPaymentSchedulesResponse,
  GetPaymentsQueryParams,
  GetPaymentsResponse,
  GetPropertiesQueryParams,
  GetPropertiesResponse,
  GetPropertyParams,
  GetPropertyResponse,
  GetTenantsQueryParams,
  GetTenantsResponse,
  GetUnitsQueryParams,
  GetUnitsResponse,
  GlobalSearchQueryParams,
  GlobalSearchResponse,
} from "@workspace/api-zod";
import { supabaseRequest } from "../lib/supabase";

type PropertyRow = {
  id: string;
  name: string;
  property_type: string;
  city: string;
  district: string;
  location_description: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
};

type UnitRow = {
  id: string;
  property_id: string;
  unit_number: string;
  unit_name: string;
  unit_type: string;
  floor: string | null;
  area: string | number | null;
  expected_rent: string | number;
  status: string;
  electricity_meter_number: string | null;
  water_meter_number: string | null;
  gas_meter_number: string | null;
  notes: string | null;
  deleted_at: string | null;
};

type TenantRow = {
  id: string;
  tenant_type: string;
  name: string;
  national_id: string | null;
  mobile: string;
  email: string | null;
  company_name: string | null;
  commercial_registration: string | null;
  notes: string | null;
  deleted_at: string | null;
};

type ContractRow = {
  id: string;
  contract_number: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  annual_rent: string | number;
  payment_frequency: string;
  security_deposit: string | number;
  contract_status: string;
  notes: string | null;
  deleted_at: string | null;
};

type ScheduleRow = {
  id: string;
  contract_id: string;
  due_date: string;
  amount_due: string | number;
  amount_paid: string | number;
  remaining_amount: string | number;
  status: string;
};

type PaymentRow = {
  id: string;
  payment_schedule_id: string;
  contract_id: string;
  tenant_id: string;
  amount: string | number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
};

type ExpenseRow = {
  id: string;
  property_id: string;
  unit_id: string | null;
  expense_type: string;
  description: string;
  amount: string | number;
  expense_date: string;
  beneficiary: string;
  deleted_at: string | null;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  read_at: string | null;
  created_at: string;
};

type DataSet = {
  properties: PropertyRow[];
  units: UnitRow[];
  tenants: TenantRow[];
  contracts: ContractRow[];
  schedules: ScheduleRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
};

const number = (value: string | number | null | undefined) => Number(value ?? 0);
const todayIso = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) =>
  Math.ceil((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000);
const lower = (value: string | null | undefined) => value?.toLocaleLowerCase("ar") ?? "";
const matches = (values: Array<string | null | undefined>, query: string) =>
  values.some((value) => lower(value).includes(lower(query)));

const unitStatusLabel: Record<string, string> = {
  Rented: "مؤجرة",
  Vacant: "شاغرة",
  Maintenance: "صيانة",
};
const contractStatusLabel: Record<string, string> = {
  Active: "نشط",
  Expired: "منتهي",
  Cancelled: "ملغي",
  PendingRenewal: "ينتهي قريباً",
};
const paymentMethodLabel: Record<string, string> = {
  BankTransfer: "تحويل بنكي",
  Cash: "نقدي",
  Cheque: "شيك",
  Other: "أخرى",
};
const expenseTypeLabel: Record<string, string> = {
  Maintenance: "صيانة",
  Electricity: "كهرباء",
  Water: "مياه",
  Cleaning: "نظافة",
  GovernmentFees: "رسوم حكومية",
  Management: "إدارة",
  Other: "أخرى",
};

const propertyTypeValue: Record<string, string> = {
  "مجمع سكني": "Residential",
  "سكني": "Residential",
  "مبنى تجاري": "Commercial",
  "تجاري": "Commercial",
  "متعدد الاستخدام": "Mixed",
};
const unitTypeValue: Record<string, string> = {
  "شقة": "Apartment",
  "محل": "Shop",
  "مكتب": "Office",
  "مستودع": "Warehouse",
};
const tenantTypeValue: Record<string, string> = {
  "فرد": "Individual",
  "شركة": "Company",
  "مؤسسة": "Company",
};
const frequencyValue: Record<string, string> = {
  "شهري": "Monthly",
  "ربع سنوي": "Quarterly",
  "نصف سنوي": "SemiAnnual",
  "سنوي": "Annual",
};
const paymentMethodValue: Record<string, string> = {
  "تحويل بنكي": "BankTransfer",
  "نقدي": "Cash",
  "شيك": "Cheque",
  "أخرى": "Other",
};
const expenseTypeValue: Record<string, string> = {
  "صيانة": "Maintenance",
  "كهرباء": "Electricity",
  "مياه": "Water",
  "نظافة": "Cleaning",
  "رسوم حكومية": "GovernmentFees",
  "إدارة": "Management",
  "أخرى": "Other",
};

async function getRows<T>(table: string, query = "select=*"): Promise<T[]> {
  return supabaseRequest<T[]>(`/rest/v1/${table}?${query}`);
}

async function insertRow<T>(table: string, body: Record<string, unknown>): Promise<T> {
  const rows = await supabaseRequest<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!rows[0]) throw new Error(`Supabase did not return the inserted ${table} row`);
  return rows[0];
}

async function insertRows<T>(table: string, body: Array<Record<string, unknown>>): Promise<T[]> {
  if (!body.length) return [];
  return supabaseRequest<T[]>(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function updateRows<T>(table: string, query: string, body: Record<string, unknown>): Promise<T[]> {
  return supabaseRequest<T[]>(`/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function loadData(): Promise<DataSet> {
  const [properties, units, tenants, contracts, schedules, payments, expenses] = await Promise.all([
    getRows<PropertyRow>("properties", "select=*&deleted_at=is.null"),
    getRows<UnitRow>("units", "select=*&deleted_at=is.null"),
    getRows<TenantRow>("tenants", "select=*&deleted_at=is.null"),
    getRows<ContractRow>("contracts", "select=*&deleted_at=is.null"),
    getRows<ScheduleRow>("payment_schedules"),
    getRows<PaymentRow>("payments"),
    getRows<ExpenseRow>("expenses", "select=*&deleted_at=is.null"),
  ]);
  return { properties, units, tenants, contracts, schedules, payments, expenses };
}

function maps(data: DataSet) {
  return {
    properties: new Map(data.properties.map((row) => [row.id, row])),
    units: new Map(data.units.map((row) => [row.id, row])),
    tenants: new Map(data.tenants.map((row) => [row.id, row])),
    contracts: new Map(data.contracts.map((row) => [row.id, row])),
  };
}

function effectiveUnitStatus(row: UnitRow, data: DataSet) {
  const hasCurrentContract = data.contracts.some((contract) =>
    contract.unit_id === row.id &&
    ["Active", "PendingRenewal"].includes(contract.contract_status) &&
    contract.deleted_at === null &&
    contract.start_date <= todayIso() &&
    contract.end_date >= todayIso()
  );
  if (hasCurrentContract) return "Rented";
  return row.status === "Maintenance" ? "Maintenance" : "Vacant";
}

function scheduleStatus(row: ScheduleRow) {
  const remaining = number(row.remaining_amount);
  if (remaining <= 0) return "مدفوع";
  if (row.due_date < todayIso()) return "متأخر";
  if (number(row.amount_paid) > 0) return "جزئي";
  return "مستحق قريباً";
}

function mapUnit(row: UnitRow, data: DataSet) {
  const property = data.properties.find((item) => item.id === row.property_id);
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyName: property?.name ?? "",
    unitNumber: row.unit_number,
    unitName: row.unit_name,
    unitType: row.unit_type,
    floor: row.floor ?? "",
    area: number(row.area),
    expectedRent: number(row.expected_rent),
    status: unitStatusLabel[effectiveUnitStatus(row, data)] ?? effectiveUnitStatus(row, data),
    electricityMeterNumber: row.electricity_meter_number,
    waterMeterNumber: row.water_meter_number,
    gasMeterNumber: row.gas_meter_number,
    notes: row.notes,
    hasElectricityMeter: Boolean(row.electricity_meter_number),
    hasWaterMeter: Boolean(row.water_meter_number),
  };
}

function mapContract(row: ContractRow, data: DataSet) {
  const lookup = maps(data);
  const tenant = lookup.tenants.get(row.tenant_id);
  const unit = lookup.units.get(row.unit_id);
  const property = unit ? lookup.properties.get(unit.property_id) : undefined;
  const daysToEnd = daysBetween(todayIso(), row.end_date);
  const status =
    row.contract_status === "Active" && daysToEnd >= 0 && daysToEnd <= 90
      ? "ينتهي قريباً"
      : contractStatusLabel[row.contract_status] ?? row.contract_status;
  return {
    id: row.id,
    contractNumber: row.contract_number,
    tenantId: row.tenant_id,
    tenantName: tenant?.name ?? "",
    unitId: row.unit_id,
    unitLabel: `${property?.name ?? ""} / ${unit?.unit_number ?? ""}`,
    propertyName: property?.name ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    annualRent: number(row.annual_rent),
    paymentFrequency: row.payment_frequency,
    securityDeposit: number(row.security_deposit),
    contractStatus: status,
    daysToEnd,
  };
}

function mapSchedule(row: ScheduleRow, data: DataSet) {
  const lookup = maps(data);
  const contract = lookup.contracts.get(row.contract_id);
  const tenant = contract ? lookup.tenants.get(contract.tenant_id) : undefined;
  const unit = contract ? lookup.units.get(contract.unit_id) : undefined;
  const property = unit ? lookup.properties.get(unit.property_id) : undefined;
  return {
    id: row.id,
    contractNumber: contract?.contract_number ?? "",
    tenantName: tenant?.name ?? "",
    unitLabel: `${property?.name ?? ""} / ${unit?.unit_number ?? ""}`,
    dueDate: row.due_date,
    amountDue: number(row.amount_due),
    amountPaid: number(row.amount_paid),
    remainingAmount: number(row.remaining_amount),
    status: scheduleStatus(row),
  };
}

function mapPayment(row: PaymentRow, data: DataSet) {
  const lookup = maps(data);
  const contract = lookup.contracts.get(row.contract_id);
  const tenant = lookup.tenants.get(row.tenant_id);
  return {
    id: row.id,
    contractNumber: contract?.contract_number ?? "",
    tenantName: tenant?.name ?? "",
    amount: number(row.amount),
    paymentDate: row.payment_date,
    paymentMethod: paymentMethodLabel[row.payment_method] ?? row.payment_method,
    referenceNumber: row.reference_number,
  };
}

function mapExpense(row: ExpenseRow, data: DataSet) {
  const lookup = maps(data);
  return {
    id: row.id,
    propertyName: lookup.properties.get(row.property_id)?.name ?? "",
    unitLabel: row.unit_id ? lookup.units.get(row.unit_id)?.unit_number ?? null : null,
    expenseType: expenseTypeLabel[row.expense_type] ?? row.expense_type,
    description: row.description,
    amount: number(row.amount),
    expenseDate: row.expense_date,
    beneficiary: row.beneficiary,
  };
}

function mapProperty(row: PropertyRow, data: DataSet) {
  const propertyUnits = data.units.filter((unit) => unit.property_id === row.id);
  const unitIds = new Set(propertyUnits.map((unit) => unit.id));
  const propertyContracts = data.contracts.filter((contract) => unitIds.has(contract.unit_id));
  const contractIds = new Set(propertyContracts.map((contract) => contract.id));
  const revenue = data.payments
    .filter((payment) => contractIds.has(payment.contract_id))
    .reduce((sum, payment) => sum + number(payment.amount), 0);
  const expenses = data.expenses
    .filter((expense) => expense.property_id === row.id)
    .reduce((sum, expense) => sum + number(expense.amount), 0);
  return {
    id: row.id,
    name: row.name,
    propertyType: row.property_type,
    city: row.city,
    district: row.district,
    locationDescription: row.location_description,
    notes: row.notes,
    unitsCount: propertyUnits.length,
    rentedUnits: propertyUnits.filter((unit) => effectiveUnitStatus(unit, data) === "Rented").length,
    vacantUnits: propertyUnits.filter((unit) => effectiveUnitStatus(unit, data) === "Vacant").length,
    netIncome: revenue - expenses,
    createdAt: row.created_at,
  };
}

function mapTenant(row: TenantRow, data: DataSet) {
  const tenantContracts = data.contracts.filter((contract) => contract.tenant_id === row.id);
  const contractIds = new Set(tenantContracts.map((contract) => contract.id));
  const schedules = data.schedules.filter((schedule) => contractIds.has(schedule.contract_id));
  const payments = data.payments.filter((payment) => payment.tenant_id === row.id);
  return {
    id: row.id,
    name: row.name,
    tenantType: row.tenant_type,
    nationalId: row.national_id,
    mobile: row.mobile,
    email: row.email,
    companyName: row.company_name,
    activeContracts: tenantContracts.filter((contract) => contract.contract_status === "Active").length,
    totalDue: schedules.reduce((sum, schedule) => sum + number(schedule.amount_due), 0),
    totalPaid: payments.reduce((sum, payment) => sum + number(payment.amount), 0),
    totalArrears: schedules
      .filter((schedule) => schedule.due_date < todayIso())
      .reduce((sum, schedule) => sum + number(schedule.remaining_amount), 0),
  };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildRevenueSeries(data: DataSet) {
  const formatter = new Intl.DateTimeFormat("ar-SA", { month: "long", timeZone: "UTC" });
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    return { key: monthKey(date), month: formatter.format(date), revenue: 0, expenses: 0 };
  });
  const byKey = new Map(months.map((month) => [month.key, month]));
  for (const payment of data.payments) {
    const item = byKey.get(payment.payment_date.slice(0, 7));
    if (item) item.revenue += number(payment.amount);
  }
  for (const expense of data.expenses) {
    const item = byKey.get(expense.expense_date.slice(0, 7));
    if (item) item.expenses += number(expense.amount);
  }
  return months.map(({ month, revenue, expenses }) => ({ month, revenue, expenses }));
}

function buildDashboard(data: DataSet) {
  const today = todayIso();
  const rentedUnits = data.units.filter((unit) => effectiveUnitStatus(unit, data) === "Rented").length;
  const vacantUnits = data.units.filter((unit) => effectiveUnitStatus(unit, data) === "Vacant").length;
  const totalAvailableUnits = rentedUnits + vacantUnits;
  const occupancyRate = totalAvailableUnits === 0 ? 0 : Math.round((rentedUnits / totalAvailableUnits) * 1000) / 10;
  const collectedAmount = data.payments.reduce((sum, payment) => sum + number(payment.amount), 0);
  const expenses = data.expenses.reduce((sum, expense) => sum + number(expense.amount), 0);
  const firstDay = `${today.slice(0, 7)}-01`;
  const nextMonth = new Date(`${firstDay}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const nextMonthIso = nextMonth.toISOString().slice(0, 10);
  const overdue = data.schedules.filter(
    (schedule) => schedule.due_date < today && number(schedule.remaining_amount) > 0,
  );
  const expiring = data.contracts.filter((contract) => {
    const days = daysBetween(today, contract.end_date);
    return ["Active", "PendingRenewal"].includes(contract.contract_status) && days >= 0 && days <= 90;
  });
  return {
    stats: {
      properties: data.properties.length,
      units: data.units.length,
      rentedUnits,
      vacantUnits,
      occupancyRate,
      activeContractsValue: data.contracts
        .filter((contract) => contract.contract_status === "Active")
        .reduce((sum, contract) => sum + number(contract.annual_rent), 0),
      dueAmount: data.schedules
        .filter((schedule) => schedule.due_date >= firstDay && schedule.due_date < nextMonthIso)
        .reduce((sum, schedule) => sum + number(schedule.amount_due), 0),
      collectedAmount,
      arrears: overdue.reduce((sum, schedule) => sum + number(schedule.remaining_amount), 0),
      expenses,
      netIncome: collectedAmount - expenses,
    },
    revenueSeries: buildRevenueSeries(data),
    latestPayments: [...data.payments]
      .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
      .slice(0, 5)
      .map((row) => mapPayment(row, data)),
    overdueSchedules: overdue
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((row) => mapSchedule(row, data)),
    upcomingSchedules: data.schedules
      .filter((schedule) => schedule.due_date >= today && number(schedule.remaining_amount) > 0)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .map((row) => mapSchedule(row, data)),
    expiringContracts: expiring
      .sort((a, b) => a.end_date.localeCompare(b.end_date))
      .map((row) => mapContract(row, data)),
    vacantUnits: data.units.filter((unit) => effectiveUnitStatus(unit, data) === "Vacant").map((row) => mapUnit(row, data)),
  };
}

function paymentScheduleRows(contract: ContractRow) {
  const frequencyMonths: Record<string, number> = { Monthly: 1, Quarterly: 3, SemiAnnual: 6, Annual: 12 };
  const months = frequencyMonths[contract.payment_frequency] ?? 12;
  const installments = 12 / months;
  const amount = Math.round((number(contract.annual_rent) / installments) * 100) / 100;
  const rows: Array<Record<string, unknown>> = [];
  const start = new Date(`${contract.start_date}T00:00:00Z`);
  const end = new Date(`${contract.end_date}T00:00:00Z`);
  for (let index = 0; index < installments; index += 1) {
    const due = new Date(start);
    due.setUTCMonth(due.getUTCMonth() + index * months);
    if (due > end) break;
    rows.push({
      contract_id: contract.id,
      due_date: due.toISOString().slice(0, 10),
      amount_due: amount,
      amount_paid: 0,
      status: due.toISOString().slice(0, 10) < todayIso() ? "Overdue" : "Upcoming",
    });
  }
  return rows;
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const asyncHandler = (handler: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res).catch(next);
};

const router: IRouter = Router();

router.get("/dashboard", asyncHandler(async (_req, res) => {
  const data = await loadData();
  res.json(GetDashboardResponse.parse(buildDashboard(data)));
}));

router.get("/properties", asyncHandler(async (req, res) => {
  const parsed = GetPropertiesQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.properties
    .filter((row) => !parsed.search || matches([row.name, row.city, row.district], parsed.search))
    .map((row) => mapProperty(row, data));
  res.json(GetPropertiesResponse.parse(result));
}));

router.post("/properties", asyncHandler(async (req, res) => {
  const input = CreatePropertyBody.parse(req.body);
  const row = await insertRow<PropertyRow>("properties", {
    name: input.name,
    property_type: propertyTypeValue[input.propertyType] ?? input.propertyType,
    city: input.city,
    district: input.district,
    location_description: input.locationDescription || null,
    notes: input.notes || null,
  });
  const data = await loadData();
  res.status(201).json(CreatePropertyResponse.parse(mapProperty(row, data)));
}));

router.get("/properties/:id", asyncHandler(async (req, res) => {
  const { id } = GetPropertyParams.parse(req.params);
  const data = await loadData();
  const row = data.properties.find((property) => property.id === id);
  if (!row) {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  const property = mapProperty(row, data);
  const propertyUnits = data.units.filter((unit) => unit.property_id === id);
  const unitIds = new Set(propertyUnits.map((unit) => unit.id));
  const contractIds = new Set(data.contracts.filter((contract) => unitIds.has(contract.unit_id)).map((contract) => contract.id));
  const totalRevenue = data.payments
    .filter((payment) => contractIds.has(payment.contract_id))
    .reduce((sum, payment) => sum + number(payment.amount), 0);
  const totalArrears = data.schedules
    .filter((schedule) => contractIds.has(schedule.contract_id) && schedule.due_date < todayIso())
    .reduce((sum, schedule) => sum + number(schedule.remaining_amount), 0);
  const totalExpenses = data.expenses
    .filter((expense) => expense.property_id === id)
    .reduce((sum, expense) => sum + number(expense.amount), 0);
  res.json(GetPropertyResponse.parse({
    ...property,
    units: propertyUnits.map((unit) => mapUnit(unit, data)),
    totalRevenue,
    totalArrears,
    totalExpenses,
  }));
}));

router.get("/units", asyncHandler(async (req, res) => {
  const parsed = GetUnitsQueryParams.parse(req.query);
  const data = await loadData();
  const databaseStatus = parsed.status
    ? Object.entries(unitStatusLabel).find(([, label]) => label === parsed.status)?.[0] ?? parsed.status
    : undefined;
  const result = data.units
    .filter((row) =>
      (!parsed.propertyId || row.property_id === parsed.propertyId) &&
      (!databaseStatus || row.status === databaseStatus) &&
      (!parsed.search || matches([
        row.unit_number,
        row.unit_name,
        data.properties.find((property) => property.id === row.property_id)?.name,
      ], parsed.search)))
    .map((row) => mapUnit(row, data));
  res.json(GetUnitsResponse.parse(result));
}));

router.post("/units", asyncHandler(async (req, res) => {
  const input = CreateUnitBody.parse(req.body);
  const row = await insertRow<UnitRow>("units", {
    property_id: input.propertyId,
    unit_number: input.unitNumber,
    unit_name: input.unitName,
    unit_type: unitTypeValue[input.unitType] ?? input.unitType,
    floor: input.floor || null,
    area: input.area ?? null,
    expected_rent: input.expectedRent,
    status: "Vacant",
    electricity_meter_number: input.electricityMeterNumber || null,
    water_meter_number: input.waterMeterNumber || null,
    gas_meter_number: input.gasMeterNumber || null,
    notes: input.notes || null,
  });
  const data = await loadData();
  res.status(201).json(CreateUnitResponse.parse(mapUnit(row, data)));
}));

router.get("/tenants", asyncHandler(async (req, res) => {
  const parsed = GetTenantsQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.tenants
    .filter((row) => !parsed.search || matches([row.name, row.mobile, row.national_id, row.company_name], parsed.search))
    .map((row) => mapTenant(row, data));
  res.json(GetTenantsResponse.parse(result));
}));

router.post("/tenants", asyncHandler(async (req, res) => {
  const input = CreateTenantBody.parse(req.body);
  const row = await insertRow<TenantRow>("tenants", {
    tenant_type: tenantTypeValue[input.tenantType] ?? input.tenantType,
    name: input.name,
    national_id: input.nationalId || null,
    mobile: input.mobile,
    email: input.email || null,
    company_name: input.companyName || null,
    commercial_registration: input.commercialRegistration || null,
    notes: input.notes || null,
  });
  const data = await loadData();
  res.status(201).json(CreateTenantResponse.parse(mapTenant(row, data)));
}));

router.get("/contracts", asyncHandler(async (req, res) => {
  const parsed = GetContractsQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.contracts
    .map((row) => mapContract(row, data))
    .filter((contract) =>
      (!parsed.status || contract.contractStatus === parsed.status) &&
      (!parsed.search || matches([contract.contractNumber, contract.tenantName, contract.unitLabel, contract.propertyName], parsed.search)));
  res.json(GetContractsResponse.parse(result));
}));

router.post("/contracts", asyncHandler(async (req, res) => {
  const input = CreateContractBody.parse(req.body);
  const data = await loadData();
  const unit = data.units.find((row) => row.id === input.unitId);
  const tenant = data.tenants.find((row) => row.id === input.tenantId);
  if (!unit || !tenant) {
    res.status(400).json({ error: "Tenant or unit not found" });
    return;
  }
  const hasOverlappingContract = data.contracts.some((existing) =>
    existing.unit_id === input.unitId &&
    ["Active", "PendingRenewal"].includes(existing.contract_status) &&
    existing.start_date <= input.endDate &&
    existing.end_date >= input.startDate
  );
  if (hasOverlappingContract) {
    res.status(409).json({ error: "Unit already has an overlapping active contract" });
    return;
  }
  const row = await insertRow<ContractRow>("contracts", {
    contract_number: input.contractNumber,
    tenant_id: input.tenantId,
    unit_id: input.unitId,
    start_date: input.startDate,
    end_date: input.endDate,
    annual_rent: input.annualRent,
    payment_frequency: frequencyValue[input.paymentFrequency] ?? input.paymentFrequency,
    security_deposit: input.securityDeposit ?? 0,
    contract_status: "Active",
    notes: input.notes || null,
  });
  await insertRows<ScheduleRow>("payment_schedules", paymentScheduleRows(row));
  const refreshed = await loadData();
  res.status(201).json(CreateContractResponse.parse(mapContract(row, refreshed)));
}));

router.get("/payment-schedules", asyncHandler(async (req, res) => {
  const parsed = GetPaymentSchedulesQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.schedules
    .map((row) => mapSchedule(row, data))
    .filter((schedule) => !parsed.status || schedule.status === parsed.status);
  res.json(GetPaymentSchedulesResponse.parse(result));
}));

router.get("/payments", asyncHandler(async (req, res) => {
  const parsed = GetPaymentsQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.payments
    .map((row) => mapPayment(row, data))
    .filter((payment) => !parsed.search || matches([payment.contractNumber, payment.tenantName, payment.referenceNumber], parsed.search));
  res.json(GetPaymentsResponse.parse(result));
}));

router.post("/payments", asyncHandler(async (req, res) => {
  const input = CreatePaymentBody.parse(req.body);
  const data = await loadData();
  const schedule = data.schedules.find((row) => row.id === input.paymentScheduleId);
  const contract = schedule ? data.contracts.find((row) => row.id === schedule.contract_id) : undefined;
  if (!schedule || !contract) {
    res.status(404).json({ error: "Payment schedule not found" });
    return;
  }
  if (input.amount <= 0 || input.amount > number(schedule.remaining_amount)) {
    res.status(400).json({ error: "Payment amount must be positive and cannot exceed the remaining amount" });
    return;
  }
  const row = await insertRow<PaymentRow>("payments", {
    payment_schedule_id: schedule.id,
    contract_id: contract.id,
    tenant_id: contract.tenant_id,
    amount: input.amount,
    payment_date: input.paymentDate,
    payment_method: paymentMethodValue[input.paymentMethod] ?? input.paymentMethod,
    bank_name: input.bankName || null,
    reference_number: input.referenceNumber || null,
    notes: input.notes || null,
  });
  const refreshed = await loadData();
  res.status(201).json(CreatePaymentResponse.parse(mapPayment(row, refreshed)));
}));

router.get("/expenses", asyncHandler(async (req, res) => {
  const parsed = GetExpensesQueryParams.parse(req.query);
  const data = await loadData();
  const result = data.expenses
    .map((row) => mapExpense(row, data))
    .filter((expense) => !parsed.search || matches([expense.propertyName, expense.description, expense.beneficiary], parsed.search));
  res.json(GetExpensesResponse.parse(result));
}));

router.post("/expenses", asyncHandler(async (req, res) => {
  const input = CreateExpenseBody.parse(req.body);
  const row = await insertRow<ExpenseRow>("expenses", {
    property_id: input.propertyId,
    unit_id: input.unitId || null,
    expense_type: expenseTypeValue[input.expenseType] ?? input.expenseType,
    description: input.description,
    amount: input.amount,
    expense_date: input.expenseDate,
    beneficiary: input.beneficiary,
    notes: input.notes || null,
  });
  const data = await loadData();
  res.status(201).json(CreateExpenseResponse.parse(mapExpense(row, data)));
}));

router.get("/notifications", asyncHandler(async (_req, res) => {
  const rows = await getRows<NotificationRow>("notifications", "select=*&order=created_at.desc");
  res.json(GetNotificationsResponse.parse(rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    priority: row.priority,
    read: Boolean(row.read_at),
  }))));
}));

router.get("/search", asyncHandler(async (req, res) => {
  const { q } = GlobalSearchQueryParams.parse(req.query);
  const data = await loadData();
  const properties = data.properties.map((row) => mapProperty(row, data));
  const units = data.units.map((row) => mapUnit(row, data));
  const tenants = data.tenants.map((row) => mapTenant(row, data));
  const contracts = data.contracts.map((row) => mapContract(row, data));
  res.json(GlobalSearchResponse.parse({
    properties: properties.filter((row) => matches([row.name, row.city, row.district], q)),
    units: units.filter((row) => matches([row.unitNumber, row.unitName, row.propertyName, row.electricityMeterNumber, row.waterMeterNumber], q)),
    tenants: tenants.filter((row) => matches([row.name, row.mobile, row.nationalId, row.companyName], q)),
    contracts: contracts.filter((row) => matches([row.contractNumber, row.tenantName, row.unitLabel], q)),
  }));
}));

export default router;