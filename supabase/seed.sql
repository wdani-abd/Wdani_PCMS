-- بيانات اختبار مترابطة للتحقق من لوحة التحكم.
-- تحذير: هذا الملف يمسح بيانات جداول التطبيق الحالية، لذلك يستخدم فقط في بيئة الاختبار.

begin;

truncate table
  public.audit_logs,
  public.notifications,
  public.payments,
  public.payment_schedules,
  public.contracts,
  public.expenses,
  public.units,
  public.tenants,
  public.properties
restart identity cascade;

insert into public.properties (id, name, property_type, city, district)
values
  ('10000000-0000-0000-0000-000000000001', 'عقار اختبار الرياض', 'Residential', 'الرياض', 'النخيل'),
  ('10000000-0000-0000-0000-000000000002', 'عقار اختبار جدة', 'Commercial', 'جدة', 'الروضة');

insert into public.units (
  id, property_id, unit_number, unit_name, unit_type, floor, area, expected_rent, status
)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'R-101', 'شقة اختبار 1', 'Apartment', '1', 120, 48000, 'Rented'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'R-102', 'شقة اختبار 2', 'Apartment', '1', 110, 42000, 'Vacant'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'J-201', 'مكتب اختبار', 'Office', '2', 90, 60000, 'Rented'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'J-202', 'محل صيانة', 'Shop', '2', 75, 36000, 'Maintenance');

insert into public.tenants (id, tenant_type, name, national_id, mobile, email, company_name)
values
  ('30000000-0000-0000-0000-000000000001', 'Individual', 'مستأجر اختبار فردي', '1000000001', '0500000001', 'tenant1@example.test', null),
  ('30000000-0000-0000-0000-000000000002', 'Company', 'شركة اختبار العقود', '7000000002', '0500000002', 'tenant2@example.test', 'شركة اختبار العقود');

insert into public.contracts (
  id, contract_number, tenant_id, unit_id, start_date, end_date,
  annual_rent, payment_frequency, security_deposit, contract_status
)
values
  (
    '40000000-0000-0000-0000-000000000001', 'TEST-CONTRACT-001',
    '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    current_date - 335, current_date + 30, 48000, 'Quarterly', 4000, 'Active'
  ),
  (
    '40000000-0000-0000-0000-000000000002', 'TEST-CONTRACT-002',
    '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003',
    current_date - 165, current_date + 200, 60000, 'SemiAnnual', 5000, 'Active'
  );

insert into public.payment_schedules (
  id, contract_id, due_date, amount_due, amount_paid, status
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    date_trunc('month', current_date)::date + 2, 12000, 2000, 'Overdue'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    date_trunc('month', current_date)::date + 5, 15000, 15000, 'Paid'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000002',
    (date_trunc('month', current_date) + interval '1 month' + interval '5 days')::date,
    30000, 0, 'Upcoming'
  );

insert into public.payments (
  id, payment_schedule_id, contract_id, tenant_id, amount,
  payment_date, payment_method, reference_number
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    2000, current_date, 'BankTransfer', 'TEST-PAY-001'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    15000, date_trunc('month', current_date)::date + 5, 'BankTransfer', 'TEST-PAY-002'
  );

insert into public.expenses (
  id, property_id, unit_id, expense_type, description, amount, expense_date, beneficiary
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Maintenance', 'مصروف اختبار حالي', 3000, current_date, 'مورد اختبار'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    null,
    'Cleaning', 'مصروف اختبار سابق', 1000, current_date - 35, 'مورد اختبار'
  );

insert into public.notifications (id, type, title, description, priority)
values
  (
    '80000000-0000-0000-0000-000000000001',
    'payment', 'دفعة اختبار متأخرة',
    'تنبيه اختبار مرتبط بالاستحقاق المتأخر.', 'high'
  );

commit;

-- القيم المتوقعة مباشرة بعد التشغيل:
-- properties = 2
-- units = 4, rentedUnits = 2, vacantUnits = 1
-- occupancyRate = 2 / (2 + 1) * 100 = 66.7%
-- activeContractsValue = 108000
-- dueAmount = 27000
-- collectedAmount = 17000
-- arrears = 10000
-- expenses = 4000
-- netIncome = 13000
-- expiringContracts = 1
-- overdueSchedules = 1