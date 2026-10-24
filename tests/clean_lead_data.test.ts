import test from "node:test";
import assert from "node:assert/strict";
import type { Lead } from "../types/leads.ts";
import {
  cleanSingleLeadCompany,
  cleanSingleEmail,
  cleanSinglePhone,
  cleanSingleName,
  resolveSingleLeadData,
  isMultiLeadBlob,
} from "../lib/utils/cleanLeadData.ts";

test("detects multi-lead concatenated text blob", () => {
  const normalText = "Kotak Securities";
  const blobText =
    "nd Floor [North Side] Block B 2 Phase I Nirlon Knowledge Park Goregaon (East) Mumbai 400 063 Phone: Natasha Mathur Executive Human Resources at Nomura Nomura Services India Private Limited Nomura Bldg Off High Street Hiranandani Business Park Powai Mumbai 400 076 India Tel: +91 22 3053 4626 Fax: +91 22 3053 2111 Mr Jiju George Director HR Broadcomm Broadcomm India Pvt Ltd 4th Floor Campus 1A RMZ Ecospace Bellandur Village Varthur Hobli Bangalore 560103 India 0804148444 Mr Manish Kumar Executive Vice President & Head of HR Kotak Securities";

  assert.strictEqual(isMultiLeadBlob(normalText), false);
  assert.strictEqual(isMultiLeadBlob(blobText), true);
});

test("cleanSingleLeadCompany extracts Kotak Securities for Ks Servicehead from concatenated multi-lead text", () => {
  const blob =
    "nd Floor [North Side] Block B 2 Phase I Nirlon Knowledge Park Goregaon (East) Mumbai 400 063 Phone: Natasha Mathur Executive Human Resources at Nomura Nomura Services India Private Limited Nomura Bldg Off High Street Hiranandani Business Park Powai Mumbai 400 076 India Tel: +91 22 3053 4626 Fax: +91 22 3053 2111 Mr Jiju George Director HR Broadcomm Broadcomm India Pvt Ltd 4th Floor Campus 1A RMZ Ecospace Bellandur Village Varthur Hobli Bangalore 560103 India 0804148444 Mr Manish Kumar Executive Vice President & Head of HR Kotak Securities";

  const res = cleanSingleLeadCompany(blob, "Ks Servicehead");
  assert.strictEqual(res.company, "Kotak Securities");
  assert.strictEqual(res.city, "Mumbai");
  assert.strictEqual(res.jobTitle, "Executive Vice President & Head of HR");
});

test("cleanSingleLeadCompany extracts Nomura for Natasha Mathur", () => {
  const blob =
    "nd Floor [North Side] Block B 2 Phase I Nirlon Knowledge Park Goregaon (East) Mumbai 400 063 Phone: Natasha Mathur Executive Human Resources at Nomura Nomura Services India Private Limited Nomura Bldg Off High Street Hiranandani Business Park Powai Mumbai 400 076 India Tel: +91 22 3053 4626 Fax: +91 22 3053 2111 Mr Jiju George Director HR Broadcomm Broadcomm India Pvt Ltd 4th Floor Campus 1A RMZ Ecospace Bellandur Village Varthur Hobli Bangalore 560103 India 0804148444 Mr Manish Kumar Executive Vice President & Head of HR Kotak Securities";

  const res = cleanSingleLeadCompany(blob, "Natasha Mathur");
  assert.ok(res.company.includes("Nomura"));
  assert.strictEqual(res.phone, "+91 22 3053 4626");
});

test("cleanSingleLeadCompany extracts Broadcomm for Jiju George", () => {
  const blob =
    "nd Floor [North Side] Block B 2 Phase I Nirlon Knowledge Park Goregaon (East) Mumbai 400 063 Phone: Natasha Mathur Executive Human Resources at Nomura Nomura Services India Private Limited Nomura Bldg Off High Street Hiranandani Business Park Powai Mumbai 400 076 India Tel: +91 22 3053 4626 Fax: +91 22 3053 2111 Mr Jiju George Director HR Broadcomm Broadcomm India Pvt Ltd 4th Floor Campus 1A RMZ Ecospace Bellandur Village Varthur Hobli Bangalore 560103 India 0804148444 Mr Manish Kumar Executive Vice President & Head of HR Kotak Securities";

  const res = cleanSingleLeadCompany(blob, "Jiju George");
  assert.ok(res.company.includes("Broadcomm"));
  assert.strictEqual(res.city, "Bangalore");
});

test("cleanSinglePhone cleans multiple phone numbers to single primary number", () => {
  assert.strictEqual(cleanSinglePhone("+91 9876543210 / +91 9123456780"), "+91 9876543210");
  assert.strictEqual(cleanSinglePhone("022 3053 4626, 022 3053 4627"), "022 3053 4626");
});

test("cleanSingleEmail cleans multiple emails to single primary email", () => {
  assert.strictEqual(cleanSingleEmail("first@corp.com, second@corp.com"), "first@corp.com");
  assert.strictEqual(cleanSingleEmail("admin@zyoris.local; user@zyoris.local"), "admin@zyoris.local");
});

test("cleanSingleName cleans concatenated name strings", () => {
  assert.strictEqual(cleanSingleName("John Doe / Jane Smith"), "John Doe");
  assert.strictEqual(cleanSingleName("Manish Kumar; Jiju George"), "Manish Kumar");
});

test("resolveSingleLeadData produces clean single lead record from multi-lead blob", () => {
  const blob =
    "nd Floor [North Side] Block B 2 Phase I Nirlon Knowledge Park Goregaon (East) Mumbai 400 063 Phone: Natasha Mathur Executive Human Resources at Nomura Nomura Services India Private Limited Nomura Bldg Off High Street Hiranandani Business Park Powai Mumbai 400 076 India Tel: +91 22 3053 4626 Fax: +91 22 3053 2111 Mr Jiju George Director HR Broadcomm Broadcomm India Pvt Ltd 4th Floor Campus 1A RMZ Ecospace Bellandur Village Varthur Hobli Bangalore 560103 India 0804148444 Mr Manish Kumar Executive Vice President & Head of HR Kotak Securities";

  const lead: Partial<Lead> = {
    id: "cmvlf7h7i068aua0znvpw2snf",
    name: "Ks Servicehead",
    company: blob,
    status: "NEW",
  };

  const resolved = resolveSingleLeadData(lead);

  assert.strictEqual(resolved.company, "Kotak Securities");
  assert.strictEqual(resolved.city, "Mumbai");
  assert.strictEqual(resolved.jobTitle, "Executive Vice President & Head of HR");
  assert.strictEqual(resolved.name, "Ks Servicehead");
  assert.strictEqual(isMultiLeadBlob(resolved.company), false);
});
