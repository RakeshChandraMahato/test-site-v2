import { OrderRecord } from '@/types/sales';
import { Customer, Supplier, PurchaseRecord } from '@/types/models';

/**
 * Format a Date string (YYYY-MM-DD or ISO) into Tally Date format (YYYYMMDD)
 */
function formatTallyDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return dateStr.slice(0, 10).replace(/-/g, '');
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Tally XML for Sales Vouchers
 * Compatible with Tally Prime and Tally.ERP 9
 */
export function generateSalesTallyXML(orders: OrderRecord[], customers: Customer[]): string {
  const vouchersXml = orders
    .filter((o) => o.status === 'POSTED')
    .map((order) => {
      const customer = customers.find((c) => c.id === order.customerId);
      const partyName = escapeXml(customer?.name || 'Cash Sales');
      const orderDate = formatTallyDate(order.billingDate);
      const totalAmount = order.totalOrderRevenue;
      const taxableAmount = order.totalTaxableRevenue;
      const gstAmount = order.totalOutputGst || 0;
      const orderNo = escapeXml(order.orderNumber);
      const narration = escapeXml(`ASJ Order #${order.orderNumber} - Customer: ${partyName}`);

      return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Sales" ACTION="Create">
        <DATE>${orderDate}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${orderNo}</VOUCHERNUMBER>
        <REFERENCE>${orderNo}</REFERENCE>
        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
        <NARRATION>${narration}</NARRATION>
        
        <!-- Customer / Party Ledger (Debit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${partyName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Sales Revenue Ledger (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Sales Account</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${taxableAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        ${
          gstAmount > 0
            ? `
        <!-- Output GST Ledger (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Output GST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${gstAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
            : ''
        }
      </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>ASJ Dry Fruits</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generate Tally XML for Purchase Vouchers
 */
export function generatePurchasesTallyXML(purchases: PurchaseRecord[], suppliers: Supplier[]): string {
  const vouchersXml = purchases
    .map((pur) => {
      const supplier = suppliers.find((s) => s.id === pur.supplierId);
      const partyName = escapeXml(supplier?.name || 'Cash Purchase');
      const purDate = formatTallyDate(pur.purchaseDate);
      const totalAmount = pur.calculatedLandedCost || (pur.acceptedQty * pur.purchaseUnitRate);
      const invoiceNo = escapeXml(pur.invoiceReference || pur.purchaseNumber);
      const narration = escapeXml(`Purchase Bill #${invoiceNo} from ${partyName}`);

      return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Purchase" ACTION="Create">
        <DATE>${purDate}</DATE>
        <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${escapeXml(pur.purchaseNumber)}</VOUCHERNUMBER>
        <REFERENCE>${invoiceNo}</REFERENCE>
        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
        <NARRATION>${narration}</NARRATION>
        
        <!-- Purchase Account (Debit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Purchase Account</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${totalAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>

        <!-- Supplier / Creditor Ledger (Credit) -->
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${partyName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${totalAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>ASJ Dry Fruits</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchersXml}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
