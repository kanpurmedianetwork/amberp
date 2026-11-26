# Ambica Engineers & Lubricants Ltd. — Web-Based Sales & Document ERP

Production-grade, standalone web application integrated directly with the production **Google Sheets database** (`Ambica_Engineers_ERP_2026-2027_fixed`), **Google Drive document archive**, and genuine Quotation & Proforma Invoice templates.

---

## 1. System Overview

- **Primary Database:** Google Sheets API (`Ambica_Engineers_ERP_2026-2027_fixed`)
- **Document Storage:** Google Drive API (Folder ID: `1cYj1YtJ0XoZV9omI09H-BiP7XajGHKz0`)
- **Quotation Template:** Drive ID `1gqy9ayxgQXSs7S28vMegrA7QCNE6Eks7` (`quotaion format.xlsx`)
- **PI Template:** Drive ID `14wE8Y4asvGfqsIJpBneMIeOWInoENamH` (`pi_template.xlsx`)
- **Frontend Framework:** Next.js 14, React 18, Tailwind CSS, Lucide icons (Deployable to Cloudflare Pages)
- **Backend Architecture:** Node.js, Express, TypeScript, ExcelJS, Headless PDF engine (Deployable to Google Cloud Run)

---

## 2. Mandatory Business Rule (Section 4 Compliance)

> **STRICT DIRECTIVE:** Every line item in an Enquiry, Quotation, Order, or Proforma Invoice records **ONLY**:
> - **Item Description**
> - **Quantity**
>
> **NO** item-level fields for Rate, Price, Amount, Availability, Payment Terms, or Item Remarks.
> Prices are never auto-filled.
> Totals, Subtotals, GST, Round off, and Amount in words are left blank on generated documents and database rows.

---

## 3. Four Employee Google Accounts & RBAC

The system enforces authentication and role-based permissions on both the backend REST API and the frontend UI:

| Employee Name | Google Account Email | Role | Module Permissions |
|---|---|---|---|
| **Mohit AbhayRaj Chhajer** | `mohit@ambicaengineers.in` | `ADMIN` | Full access, settings, templates, user management |
| **Harpreet Singh** | `sales@ambicaengineers.in` | `SALES` | Customers, Products, Enquiries, Quotation generation |
| **Saurabh Agnihotri** | `operations@ambicaengineers.in` | `OPERATIONS` | Order conversion, Proforma Invoice generation |
| **Accounts Executive** | `accounts@ambicaengineers.in` | `VIEWER` | Read-only records, Document archive downloads |

---

## 4. Sequential Document Numbering & Atomic Locking

To prevent race conditions and duplicate document numbering during concurrent multi-user operations, the system implements mutex-locked sequence allocation matching historical patterns:
- **Enquiry Number:** `ENR-XXXXXX` (Next: `ENR-002819`)
- **Quotation Number:** `AELPL/26-27/XXX` (Next: `AELPL/26-27/188`)
- **Order Number:** `AE/26-27/OXXX` (Next: `AE/26-27/O180`)
- **Proforma Invoice Number:** `AELPL/26-27/XXX` (Next: `AELPL/26-27/188`)

---

## 5. Running the Application Locally

### Backend
```bash
cd backend
npm install
npm run build
npm start
# Server listens on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm start
# Application accessible at http://localhost:3000
```

---

## 6. Cloudflare Pages & Google Cloud Run Deployment

- **Frontend on Cloudflare Pages:**
  - Build command: `npm run build`
  - Output directory: `.next`
  - Zero SaaS hosting cost within Cloudflare Pages Free limits.
- **Backend on Google Cloud Run:**
  - Standard container execution with Node.js and Chromium.
  - Zero database subscription costs: uses existing Google Workspace / Google Sheets API.
