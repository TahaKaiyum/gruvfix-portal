export interface User {
  empid: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  active: boolean;
}

export interface Customer {
  name: string;
  code: string;
  notes?: string;
  contact?: string;
  gst?: string;
}

export interface Part {
  customer: string;
  partNo: string;
  component: string;
  process: string;
  qtyTarget: number;
}

export interface Tool {
  name: string;
  qty: number;
  available: number;
  location: string;
}

export interface ToolRequest {
  id: number;
  employeeId: string;
  employeeName: string;
  customer: string;
  toolName: string;
  requirements: string;
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  conditionOnClose?: string;
}

export interface LogEntry {
  id?: number;
  date: string;
  hour: string;
  customer: string;
  part: string;
  component: string;
  process: string;
  qty: number;
  machine: string;
  status: 'completed' | 'rework' | 'scrap';
  file?: string;
  locked: boolean;
  employee: string;
  shift: string;
}
