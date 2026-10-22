import { setupData } from '@/lib/pos/data';
import { EmployeeForm } from '../pos/ManagementForms';
export const instant = false;
export default async function Page() {
  const { merchants, outlets, employees } = await setupData();
  const staff = employees.filter(e=>e.role !== 'admin');
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Employee accounts</h2><p>Individual email/password accounts for POS. Inactive staff and staff without an assigned outlet cannot access the POS.</p><section className="rounded-xl border p-5 space-y-4"><h3 className="font-semibold">Register employee</h3><EmployeeForm merchants={merchants} outlets={outlets}/></section>{!staff.length && <p>No employee accounts yet. Create an outlet first.</p>}{staff.map(employee=><details className="rounded-xl border p-5" key={employee.id}><summary className="cursor-pointer font-semibold">{employee.full_name || employee.email} · {employee.role} · {employee.is_active ? 'Active' : 'Inactive'}<span className="block text-sm font-normal">{employee.email} · {outlets.find(o=>o.id===employee.outlet_id)?.name || 'No outlet access'}</span></summary><div className="pt-4"><EmployeeForm merchants={merchants} outlets={outlets} employee={employee}/></div></details>)}</div>;
}
