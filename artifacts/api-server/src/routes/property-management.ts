import { Router, type IRouter } from "express";
import {
  CreateContractBody,
  CreateExpenseBody,
  CreatePaymentBody,
  CreatePropertyBody,
  CreateTenantBody,
  CreateUnitBody,
  GetContractsQueryParams,
  GetExpensesQueryParams,
  GetPaymentSchedulesQueryParams,
  GetPaymentsQueryParams,
  GetPropertiesQueryParams,
  GetPropertyParams,
  GetUnitsQueryParams,
  GetTenantsQueryParams,
  GlobalSearchQueryParams,
  GetDashboardResponse,
  GetPropertiesResponse,
  GetPropertyResponse,
  GetUnitsResponse,
  GetTenantsResponse,
  GetContractsResponse,
  GetPaymentSchedulesResponse,
  GetPaymentsResponse,
  GetExpensesResponse,
  GetNotificationsResponse,
  GlobalSearchResponse,
  CreatePropertyResponse,
  CreateUnitResponse,
  CreateTenantResponse,
  CreateContractResponse,
  CreatePaymentResponse,
  CreateExpenseResponse,
} from "@workspace/api-zod";

type Property = {
  id: string;
  name: string;
  propertyType: string;
  city: string;
  district: string;
  locationDescription: string | null;
  notes: string | null;
  unitsCount: number;
  rentedUnits: number;
  vacantUnits: number;
  netIncome: number;
  createdAt: string;
};

type Unit = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  unitName: string;
  unitType: string;
  floor: string;
  area: number;
  expectedRent: number;
  status: string;
  electricityMeterNumber: string | null;
  waterMeterNumber: string | null;
  gasMeterNumber: string | null;
  notes: string | null;
  hasElectricityMeter: boolean;
  hasWaterMeter: boolean;
};

type Tenant = {
  id: string;
  name: string;
  tenantType: string;
  nationalId: string | null;
  mobile: string;
  email: string | null;
  companyName: string | null;
  activeContracts: number;
  totalDue: number;
  totalPaid: number;
  totalArrears: number;
};

type Contract = {
  id: string;
  contractNumber: string;
  tenantId: string;
  tenantName: string;
  unitId: string;
  unitLabel: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  annualRent: number;
  paymentFrequency: string;
  securityDeposit: number;
  contractStatus: string;
  daysToEnd: number;
};

type PaymentSchedule = {
  id: string;
  contractNumber: string;
  tenantName: string;
  unitLabel: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  remainingAmount: number;
  status: string;
};

type Payment = {
  id: string;
  contractNumber: string;
  tenantName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
};

type Expense = {
  id: string;
  propertyName: string;
  unitLabel: string | null;
  expenseType: string;
  description: string;
  amount: number;
  expenseDate: string;
  beneficiary: string;
};

const today = new Date();
const iso = (daysFromToday: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
};

const properties: Property[] = [
  {
    id: "prop-1",
    name: "أبراج الندى",
    propertyType: "Residential",
    city: "الرياض",
    district: "العليا",
    locationDescription: "على طريق الملك فهد بالقرب من محطة المترو",
    notes: "مجمع سكني حديث",
    unitsCount: 24,
    rentedUnits: 20,
    vacantUnits: 3,
    netIncome: 232500,
    createdAt: "2025-01-12",
  },
  {
    id: "prop-2",
    name: "مركز الملتقى التجاري",
    propertyType: "Commercial",
    city: "الرياض",
    district: "الملز",
    locationDescription: "واجهة تجارية على شارع صلاح الدين",
    notes: "مواقف خلفية متاحة للمستأجرين",
    unitsCount: 18,
    rentedUnits: 15,
    vacantUnits: 2,
    netIncome: 188900,
    createdAt: "2024-08-20",
  },
  {
    id: "prop-3",
    name: "فلل الواحة",
    propertyType: "Mixed",
    city: "جدة",
    district: "الروضة",
    locationDescription: "مجمع فلل هادئ بالقرب من الخدمات",
    notes: "يشمل وحدات سكنية ومحلات",
    unitsCount: 12,
    rentedUnits: 8,
    vacantUnits: 4,
    netIncome: 97400,
    createdAt: "2024-03-04",
  },
];

const units: Unit[] = [
  {
    id: "unit-1",
    propertyId: "prop-1",
    propertyName: "أبراج الندى",
    unitNumber: "A-204",
    unitName: "شقة غرفتين",
    unitType: "Apartment",
    floor: "2",
    area: 128,
    expectedRent: 54000,
    status: "Rented",
    electricityMeterNumber: "E-884120",
    waterMeterNumber: "W-334820",
    gasMeterNumber: null,
    notes: null,
    hasElectricityMeter: true,
    hasWaterMeter: true,
  },
  {
    id: "unit-2",
    propertyId: "prop-1",
    propertyName: "أبراج الندى",
    unitNumber: "B-107",
    unitName: "شقة ثلاث غرف",
    unitType: "Apartment",
    floor: "1",
    area: 162,
    expectedRent: 68000,
    status: "Vacant",
    electricityMeterNumber: "E-884171",
    waterMeterNumber: null,
    gasMeterNumber: null,
    notes: "تحتاج إلى فحص عداد المياه",
    hasElectricityMeter: true,
    hasWaterMeter: false,
  },
  {
    id: "unit-3",
    propertyId: "prop-2",
    propertyName: "مركز الملتقى التجاري",
    unitNumber: "S-12",
    unitName: "محل واجهة",
    unitType: "Shop",
    floor: "الأرضي",
    area: 84,
    expectedRent: 92000,
    status: "Rented",
    electricityMeterNumber: "E-210991",
    waterMeterNumber: "W-190221",
    gasMeterNumber: null,
    notes: null,
    hasElectricityMeter: true,
    hasWaterMeter: true,
  },
  {
    id: "unit-4",
    propertyId: "prop-3",
    propertyName: "فلل الواحة",
    unitNumber: "V-03",
    unitName: "فيلا مستقلة",
    unitType: "Other",
    floor: "أرضي",
    area: 340,
    expectedRent: 120000,
    status: "Maintenance",
    electricityMeterNumber: null,
    waterMeterNumber: null,
    gasMeterNumber: null,
    notes: "أعمال صيانة قبل إعادة العرض",
    hasElectricityMeter: false,
    hasWaterMeter: false,
  },
];

const tenants: Tenant[] = [
  {
    id: "tenant-1",
    name: "شركة آفاق التقنية",
    tenantType: "Company",
    nationalId: null,
    mobile: "050 456 7821",
    email: "finance@afaq.example",
    companyName: "شركة آفاق التقنية",
    activeContracts: 2,
    totalDue: 184000,
    totalPaid: 151000,
    totalArrears: 33000,
  },
  {
    id: "tenant-2",
    name: "عبدالله السالم",
    tenantType: "Individual",
    nationalId: "10••••••421",
    mobile: "055 203 1189",
    email: "abdullah@example",
    companyName: null,
    activeContracts: 1,
    totalDue: 54000,
    totalPaid: 54000,
    totalArrears: 0,
  },
  {
    id: "tenant-3",
    name: "مؤسسة مذاق البن",
    tenantType: "Company",
    nationalId: null,
    mobile: "053 884 1120",
    email: "accounts@madaq.example",
    companyName: "مؤسسة مذاق البن",
    activeContracts: 1,
    totalDue: 92000,
    totalPaid: 69000,
    totalArrears: 23000,
  },
];

const contracts: Contract[] = [
  {
    id: "contract-1",
    contractNumber: "CN-2025-0148",
    tenantId: "tenant-1",
    tenantName: "شركة آفاق التقنية",
    unitId: "unit-3",
    unitLabel: "مركز الملتقى التجاري / S-12",
    propertyName: "مركز الملتقى التجاري",
    startDate: "2025-02-01",
    endDate: iso(18),
    annualRent: 92000,
    paymentFrequency: "Quarterly",
    securityDeposit: 9200,
    contractStatus: "Active",
    daysToEnd: 18,
  },
  {
    id: "contract-2",
    contractNumber: "CN-2025-0106",
    tenantId: "tenant-2",
    tenantName: "عبدالله السالم",
    unitId: "unit-1",
    unitLabel: "أبراج الندى / A-204",
    propertyName: "أبراج الندى",
    startDate: "2025-01-01",
    endDate: iso(63),
    annualRent: 54000,
    paymentFrequency: "Annual",
    securityDeposit: 4500,
    contractStatus: "Active",
    daysToEnd: 63,
  },
  {
    id: "contract-3",
    contractNumber: "CN-2024-0081",
    tenantId: "tenant-3",
    tenantName: "مؤسسة مذاق البن",
    unitId: "unit-3",
    unitLabel: "مركز الملتقى التجاري / S-12",
    propertyName: "مركز الملتقى التجاري",
    startDate: "2024-04-01",
    endDate: iso(92),
    annualRent: 92000,
    paymentFrequency: "Quarterly",
    securityDeposit: 9200,
    contractStatus: "PendingRenewal",
    daysToEnd: 92,
  },
];

const schedules: PaymentSchedule[] = [
  {
    id: "schedule-1",
    contractNumber: "CN-2025-0148",
    tenantName: "شركة آفاق التقنية",
    unitLabel: "مركز الملتقى التجاري / S-12",
    dueDate: iso(-12),
    amountDue: 23000,
    amountPaid: 0,
    remainingAmount: 23000,
    status: "Overdue",
  },
  {
    id: "schedule-2",
    contractNumber: "CN-2025-0106",
    tenantName: "عبدالله السالم",
    unitLabel: "أبراج الندى / A-204",
    dueDate: iso(5),
    amountDue: 54000,
    amountPaid: 0,
    remainingAmount: 54000,
    status: "Upcoming",
  },
  {
    id: "schedule-3",
    contractNumber: "CN-2024-0081",
    tenantName: "مؤسسة مذاق البن",
    unitLabel: "مركز الملتقى التجاري / S-12",
    dueDate: iso(-2),
    amountDue: 23000,
    amountPaid: 15000,
    remainingAmount: 8000,
    status: "Partial",
  },
];

const payments: Payment[] = [
  {
    id: "payment-1",
    contractNumber: "CN-2024-0081",
    tenantName: "مؤسسة مذاق البن",
    amount: 15000,
    paymentDate: iso(-4),
    paymentMethod: "BankTransfer",
    referenceNumber: "TRX-884291",
  },
  {
    id: "payment-2",
    contractNumber: "CN-2025-0106",
    tenantName: "عبدالله السالم",
    amount: 54000,
    paymentDate: iso(-15),
    paymentMethod: "BankTransfer",
    referenceNumber: "TRX-884120",
  },
  {
    id: "payment-3",
    contractNumber: "CN-2025-0148",
    tenantName: "شركة آفاق التقنية",
    amount: 23000,
    paymentDate: iso(-38),
    paymentMethod: "Cheque",
    referenceNumber: "CHQ-00248",
  },
];

const expenses: Expense[] = [
  {
    id: "expense-1",
    propertyName: "أبراج الندى",
    unitLabel: "A-204",
    expenseType: "Maintenance",
    description: "صيانة مضخة التكييف",
    amount: 4200,
    expenseDate: iso(-8),
    beneficiary: "مؤسسة حلول الصيانة",
  },
  {
    id: "expense-2",
    propertyName: "مركز الملتقى التجاري",
    unitLabel: null,
    expenseType: "Cleaning",
    description: "خدمات النظافة الشهرية",
    amount: 6800,
    expenseDate: iso(-18),
    beneficiary: "شركة العناية للمرافق",
  },
];

const notifications = [
  {
    id: "notification-1",
    type: "contract",
    title: "عقد يقترب من الانتهاء",
    description: "العقد CN-2025-0148 ينتهي خلال 18 يومًا",
    createdAt: iso(-1),
    priority: "high",
    read: false,
  },
  {
    id: "notification-2",
    type: "payment",
    title: "دفعة متأخرة",
    description: "يوجد مبلغ 23,000 ر.س مستحق على شركة آفاق التقنية",
    createdAt: iso(-2),
    priority: "high",
    read: false,
  },
  {
    id: "notification-3",
    type: "meter",
    title: "بيانات عداد ناقصة",
    description: "الوحدة B-107 لا تحتوي على رقم عداد مياه",
    createdAt: iso(-3),
    priority: "medium",
    read: true,
  },
];

const revenueSeries = [
  { month: "يناير", revenue: 182000, expenses: 28000 },
  { month: "فبراير", revenue: 206000, expenses: 31000 },
  { month: "مارس", revenue: 194000, expenses: 24500 },
  { month: "أبريل", revenue: 238000, expenses: 38200 },
  { month: "مايو", revenue: 222000, expenses: 29400 },
  { month: "يونيو", revenue: 261000, expenses: 34200 },
];

const matches = (value: string | null | undefined, query: string) =>
  Boolean(value && value.toLocaleLowerCase("ar").includes(query.toLocaleLowerCase("ar")));

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  const dashboard = {
    stats: {
      properties: properties.length,
      units: 54,
      rentedUnits: 43,
      vacantUnits: 7,
      occupancyRate: 79.6,
      activeContractsValue: 428000,
      dueAmount: 196000,
      collectedAmount: 151000,
      arrears: 61000,
      expenses: 34200,
      netIncome: 116800,
    },
    revenueSeries,
    latestPayments: payments,
    overdueSchedules: schedules.filter((item) => item.status === "Overdue"),
    upcomingSchedules: schedules.filter((item) => item.status !== "Paid"),
    expiringContracts: contracts.filter((item) => item.daysToEnd <= 90),
    vacantUnits: units.filter((item) => item.status === "Vacant"),
  };
  res.json(GetDashboardResponse.parse(dashboard));
});

router.get("/properties", (req, res) => {
  const parsed = GetPropertiesQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const result = search
    ? properties.filter((item) => [item.name, item.city, item.district].some((field) => matches(field, search)))
    : properties;
  res.json(GetPropertiesResponse.parse(result));
});

router.post("/properties", (req, res) => {
  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const property: Property = {
    id: `prop-${properties.length + 1}`,
    name: parsed.data.name,
    propertyType: parsed.data.propertyType,
    city: parsed.data.city,
    district: parsed.data.district,
    locationDescription: parsed.data.locationDescription ?? null,
    notes: parsed.data.notes ?? null,
    unitsCount: 0,
    rentedUnits: 0,
    vacantUnits: 0,
    netIncome: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  properties.unshift(property);
  res.status(201).json(CreatePropertyResponse.parse(property));
});

router.get("/properties/:id", (req, res) => {
  const parsed = GetPropertyParams.safeParse(req.params);
  const property = properties.find((item) => item.id === parsed.data?.id);
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return;
  }
  const propertyUnits = units.filter((item) => item.propertyId === property.id);
  res.json(
    GetPropertyResponse.parse({
      ...property,
      units: propertyUnits,
      totalRevenue: property.netIncome + 32000,
      totalArrears: property.id === "prop-2" ? 23000 : 0,
      totalExpenses: property.id === "prop-1" ? 11000 : 6800,
    }),
  );
});

router.get("/units", (req, res) => {
  const parsed = GetUnitsQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const status = parsed.success ? parsed.data.status ?? "" : "";
  const propertyId = parsed.success ? parsed.data.propertyId ?? "" : "";
  const result = units.filter(
    (item) =>
      (!status || item.status === status) &&
      (!propertyId || item.propertyId === propertyId) &&
      (!search || [item.unitNumber, item.unitName, item.propertyName].some((field) => matches(field, search))),
  );
  res.json(GetUnitsResponse.parse(result));
});

router.post("/units", (req, res) => {
  const parsed = CreateUnitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const property = properties.find((item) => item.id === parsed.data.propertyId);
  if (!property) {
    res.status(400).json({ error: "Property not found" });
    return;
  }
  const unit: Unit = {
    id: `unit-${units.length + 1}`,
    propertyId: parsed.data.propertyId,
    propertyName: property.name,
    unitNumber: parsed.data.unitNumber,
    unitName: parsed.data.unitName,
    unitType: parsed.data.unitType,
    floor: parsed.data.floor ?? "",
    area: parsed.data.area ?? 0,
    expectedRent: parsed.data.expectedRent,
    status: "Vacant",
    electricityMeterNumber: parsed.data.electricityMeterNumber ?? null,
    waterMeterNumber: parsed.data.waterMeterNumber ?? null,
    gasMeterNumber: parsed.data.gasMeterNumber ?? null,
    notes: parsed.data.notes ?? null,
    hasElectricityMeter: Boolean(parsed.data.electricityMeterNumber),
    hasWaterMeter: Boolean(parsed.data.waterMeterNumber),
  };
  units.unshift(unit);
  res.status(201).json(CreateUnitResponse.parse(unit));
});

router.get("/tenants", (req, res) => {
  const parsed = GetTenantsQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const result = search
    ? tenants.filter((item) => [item.name, item.mobile, item.nationalId, item.companyName].some((field) => matches(field, search)))
    : tenants;
  res.json(GetTenantsResponse.parse(result));
});

router.post("/tenants", (req, res) => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenant: Tenant = {
    id: `tenant-${tenants.length + 1}`,
    name: parsed.data.name,
    tenantType: parsed.data.tenantType,
    nationalId: parsed.data.nationalId ?? null,
    mobile: parsed.data.mobile,
    email: parsed.data.email ?? null,
    companyName: parsed.data.companyName ?? null,
    activeContracts: 0,
    totalDue: 0,
    totalPaid: 0,
    totalArrears: 0,
  };
  tenants.unshift(tenant);
  res.status(201).json(CreateTenantResponse.parse(tenant));
});

router.get("/contracts", (req, res) => {
  const parsed = GetContractsQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const status = parsed.success ? parsed.data.status ?? "" : "";
  const result = contracts.filter(
    (item) =>
      (!status || item.contractStatus === status) &&
      (!search || [item.contractNumber, item.tenantName, item.unitLabel, item.propertyName].some((field) => matches(field, search))),
  );
  res.json(GetContractsResponse.parse(result));
});

router.post("/contracts", (req, res) => {
  const parsed = CreateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tenant = tenants.find((item) => item.id === parsed.data.tenantId);
  const unit = units.find((item) => item.id === parsed.data.unitId);
  if (!tenant || !unit) {
    res.status(400).json({ error: "Tenant or unit not found" });
    return;
  }
  if (contracts.some((item) => item.unitId === unit.id && item.contractStatus === "Active")) {
    res.status(409).json({ error: "Unit already has an active contract" });
    return;
  }
  const contract: Contract = {
    id: `contract-${contracts.length + 1}`,
    contractNumber: parsed.data.contractNumber,
    tenantId: tenant.id,
    tenantName: tenant.name,
    unitId: unit.id,
    unitLabel: `${unit.propertyName} / ${unit.unitNumber}`,
    propertyName: unit.propertyName,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    annualRent: parsed.data.annualRent,
    paymentFrequency: parsed.data.paymentFrequency,
    securityDeposit: parsed.data.securityDeposit ?? 0,
    contractStatus: "Active",
    daysToEnd: Math.max(0, Math.ceil((new Date(parsed.data.endDate).getTime() - Date.now()) / 86400000)),
  };
  contracts.unshift(contract);
  unit.status = "Rented";
  res.status(201).json(CreateContractResponse.parse(contract));
});

router.get("/payment-schedules", (req, res) => {
  const parsed = GetPaymentSchedulesQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status ?? "" : "";
  const result = status ? schedules.filter((item) => item.status === status) : schedules;
  res.json(GetPaymentSchedulesResponse.parse(result));
});

router.get("/payments", (req, res) => {
  const parsed = GetPaymentsQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const result = search
    ? payments.filter((item) => [item.contractNumber, item.tenantName, item.referenceNumber].some((field) => matches(field, search)))
    : payments;
  res.json(GetPaymentsResponse.parse(result));
});

router.post("/payments", (req, res) => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const schedule = schedules.find((item) => item.id === parsed.data.paymentScheduleId);
  if (!schedule) {
    res.status(404).json({ error: "Payment schedule not found" });
    return;
  }
  const payment: Payment = {
    id: `payment-${payments.length + 1}`,
    contractNumber: schedule.contractNumber,
    tenantName: schedule.tenantName,
    amount: parsed.data.amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod,
    referenceNumber: parsed.data.referenceNumber ?? null,
  };
  payments.unshift(payment);
  schedule.amountPaid += parsed.data.amount;
  schedule.remainingAmount = Math.max(0, schedule.amountDue - schedule.amountPaid);
  schedule.status = schedule.remainingAmount === 0 ? "Paid" : "Partial";
  res.status(201).json(CreatePaymentResponse.parse(payment));
});

router.get("/expenses", (req, res) => {
  const parsed = GetExpensesQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search ?? "" : "";
  const result = search
    ? expenses.filter((item) => [item.propertyName, item.description, item.beneficiary].some((field) => matches(field, search)))
    : expenses;
  res.json(GetExpensesResponse.parse(result));
});

router.post("/expenses", (req, res) => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const property = properties.find((item) => item.id === parsed.data.propertyId);
  const unit = parsed.data.unitId ? units.find((item) => item.id === parsed.data.unitId) : undefined;
  const expense: Expense = {
    id: `expense-${expenses.length + 1}`,
    propertyName: property?.name ?? "عقار غير محدد",
    unitLabel: unit?.unitNumber ?? null,
    expenseType: parsed.data.expenseType,
    description: parsed.data.description,
    amount: parsed.data.amount,
    expenseDate: parsed.data.expenseDate,
    beneficiary: parsed.data.beneficiary,
  };
  expenses.unshift(expense);
  res.status(201).json(CreateExpenseResponse.parse(expense));
});

router.get("/notifications", (_req, res) => {
  res.json(GetNotificationsResponse.parse(notifications));
});

router.get("/search", (req, res) => {
  const parsed = GlobalSearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const search = parsed.data.q;
  res.json(
    GlobalSearchResponse.parse({
      properties: properties.filter((item) => [item.name, item.city, item.district].some((field) => matches(field, search))),
      units: units.filter((item) => [item.unitNumber, item.unitName, item.propertyName, item.electricityMeterNumber, item.waterMeterNumber].some((field) => matches(field, search))),
      tenants: tenants.filter((item) => [item.name, item.mobile, item.nationalId, item.companyName].some((field) => matches(field, search))),
      contracts: contracts.filter((item) => [item.contractNumber, item.tenantName, item.unitLabel].some((field) => matches(field, search))),
    }),
  );
});

export default router;