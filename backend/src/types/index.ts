export type UserRole = 'ADMIN' | 'SALES' | 'OPERATIONS' | 'VIEWER';

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  picture?: string;
}

export interface Customer {
  id: string; // e.g. CUST-0001
  name: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  gstin?: string;
  firstActivity?: string;
  latestActivity?: string;
  notes?: string;
}

export interface Product {
  id: string; // e.g. PROD-0001
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
}

export interface Enquiry {
  id: string; // e.g. ENR-002819
  date: string;
  customer: string;
  contactPerson?: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  reference?: string;
  status: string; // Open, Quotation Generated, Order Created, Closed
  remarks?: string;
  items: DocumentItem[];
  allSummary?: string;
}

export interface Order {
  id: string; // Document ID / Order No, e.g. AE/26-27/O180
  orderId?: string;
  sourceEnquiryId: string; // ENR-XXXXXX
  date: string;
  customer: string;
  contactPerson?: string;
  assignedPerson?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  status: string; // Open, Dispatched, Closed
  modeOfDispatch?: string;
  docketNumber?: string;
  reference?: string;
  remarks?: string;
  items: DocumentItem[];
  allSummary?: string;
}

export interface Quotation {
  id: string; // e.g. AELPL/26-27/188
  date: string;
  customer: string;
  sourceEnquiryId: string; // ENR-XXXXXX
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
  id: string; // e.g. AELPL/26-27/188
  date: string;
  customer: string;
  sourceOrderId: string; // AE/26-27/OXXX
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
