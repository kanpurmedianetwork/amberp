export type UserRole = 'ADMIN' | 'SALES' | 'OPERATIONS' | 'VIEWER';

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  picture?: string;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  firstActivity?: string;
  latestActivity?: string;
  notes?: string;
}

export interface Product {
  id: string;
  description: string;
  normalizedKey?: string;
  defaultPrice?: number;
  oldPrice?: number;
  notes?: string;
  active: boolean;
}

export interface DocumentItem {
  description: string;
  qty: number;
  unitPrice?: number;
  amount?: number;
  hsn?: string;
}

export interface Enquiry {
  id: string;
  date: string;
  customer: string;
  contactPerson?: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  reference?: string;
  status: string;
  remarks?: string;
  items: DocumentItem[];
  allSummary?: string;
}

export interface Order {
  id: string;
  orderId?: string;
  sourceEnquiryId: string;
  date: string;
  customer: string;
  contactPerson?: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status: string;
  modeOfDispatch?: string;
  docketNumber?: string;
  reference?: string;
  remarks?: string;
  items: DocumentItem[];
  allSummary?: string;
}

export interface Quotation {
  id: string;
  date: string;
  customer: string;
  sourceEnquiryId: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: string;
  remarks?: string;
  reference?: string;
  items: DocumentItem[];
  allSummary?: string;
  sheetFileId?: string;
  sheetUrl?: string;
  pdfUrl?: string;
}

export interface ProformaInvoice {
  id: string;
  date: string;
  customer: string;
  sourceOrderId: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: string;
  transportVia?: string;
  purchaseOrder?: string;
  orderDate?: string;
  remarks?: string;
  reference?: string;
  items: DocumentItem[];
  allSummary?: string;
  sheetFileId?: string;
  sheetUrl?: string;
  pdfUrl?: string;
}

export interface DocLogEntry {
  timestamp: string;
  type: 'QUOTATION' | 'PI' | 'ORDER';
  documentNo: string;
  sourceDocument: string;
  customer: string;
  sheetFileId: string;
  sheetUrl: string;
  pdfUrl: string;
}

export interface DashboardStats {
  historicalEnquiries: number;
  historicalQuotations: number;
  historicalOrders: number;
  historicalPIs: number;
  customerCount: number;
  productCount: number;
  nextEnquiryNo: string;
  nextQuotationNo: string;
  nextOrderNo: string;
  nextPINo: string;
}

export interface ExportLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  exportType: string;
  format: 'XLSX' | 'JSON' | 'CSV';
  recordsCount: number;
  fileSize: string;
  userAgent: string;
}

export interface LoginLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  previousIp?: string;
  ipChanged: boolean;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
}

export interface EditLogEntry {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'GENERATE' | 'STATUS_CHANGE';
  entityType: 'ENQUIRY' | 'CUSTOMER' | 'PRODUCT' | 'QUOTATION' | 'PI' | 'ORDER';
  entityId: string;
  details: string;
  userAgent: string;
}

export interface AuditStats {
  totalExports: number;
  totalLogins: number;
  ipChangesCount: number;
  totalEdits: number;
  uniqueIps: number;
}
