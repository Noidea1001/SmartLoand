import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Printer, X, Download, FileText, Edit3, Check, RotateCcw } from "lucide-react";
import type { Loan, Client } from "../../api/types";
import { getClient } from "../../api/clients";
import { useBranding } from "../../context/BrandingContext";
import { downloadLoanAgreement } from "../../api/loans";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";

interface LoanAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
}

type Lang = "km" | "en";

interface AgreementContent {
  contractRef: string;
  executionDate: string;
  partyA: string;
  partyB: string;
  partyC: string;
  principalText: string;
  principalWords: string;
  altPrincipalText: string;
  interestText: string;
  interestMethodText: string;
  tenureText: string;
  dueScheduleText: string;
  monthlyInstallmentText: string;
  latePenaltyText: string;
  collateralText: string;
  article1Title: string;
  article1Body: string;
  article2Title: string;
  article2Body: string;
  article3Title: string;
  article3Body: string;
  article4Title: string;
  article4Body: string;
  article5Title: string;
  article5Body: string;
  article6Title: string;
  article6Body: string;
  signerBorrowerTitle: string;
  signerBorrowerName: string;
  signerBorrowerNote: string;
  signerGuarantorTitle: string;
  signerGuarantorName: string;
  signerGuarantorNote: string;
  signerLenderTitle: string;
  signerLenderName: string;
  signerLenderSub: string;
}

// =========================================================================
// Number-to-Words Converters
// =========================================================================

function khmerNumberToWords(num: number, currency: "USD" | "KHR" | string): string {
  const digits = ["សូន្យ", "មួយ", "ពីរ", "បី", "បួន", "ប្រាំ", "ប្រាំមួយ", "ប្រាំពីរ", "ប្រាំបី", "ប្រាំបួន"];
  const tens = ["", "ដប់", "ម្ភៃ", "សាមសិប", "សែសិប", "ហាសិប", "ហុកសិប", "ចិតសិប", "ប៉ែតសិប", "កៅសិប"];
  const n = Math.floor(Math.abs(num));

  if (n === 0) {
    return currency === "USD" ? "សូន្យដុល្លារអាមេរិកគត់" : "សូន្យរៀលគត់";
  }

  function convertGroup(val: number): string {
    let res = "";
    if (val >= 100) {
      const h = Math.floor(val / 100);
      res += digits[h] + "រយ";
      val %= 100;
      if (val > 0) res += " ";
    }
    if (val >= 10 && val <= 19) {
      if (val === 10) res += "ដប់";
      else res += "ដប់" + digits[val % 10];
    } else if (val >= 20) {
      const t = Math.floor(val / 10);
      res += tens[t];
      const u = val % 10;
      if (u > 0) res += digits[u];
    } else if (val > 0) {
      res += digits[val];
    }
    return res;
  }

  let str = "";
  let rem = n;

  if (rem >= 1_000_000_000) {
    const bil = Math.floor(rem / 1_000_000_000);
    str += convertGroup(bil) + "ប៊ីលាន ";
    rem %= 1_000_000_000;
  }
  if (rem >= 1_000_000) {
    const mil = Math.floor(rem / 1_000_000);
    str += convertGroup(mil) + "លាន ";
    rem %= 1_000_000;
  }
  if (rem >= 1000) {
    const th = Math.floor(rem / 1000);
    str += convertGroup(th) + "ពាន់ ";
    rem %= 1000;
  }
  if (rem > 0) {
    str += convertGroup(rem);
  }

  const word = str.trim();
  const unit = currency === "USD" ? "ដុល្លារអាមេរិកគត់" : "រៀលគត់";
  return `${word}${unit}`;
}

function englishNumberToWords(num: number, currency: "USD" | "KHR" | string): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = Math.floor(Math.abs(num));

  if (n === 0) {
    return currency === "USD" ? "Zero US Dollars Only" : "Zero Khmer Riel Only";
  }

  function convertGroup(val: number): string {
    let s = "";
    if (val >= 100) {
      s += ones[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      s += tens[Math.floor(val / 10)] + (val % 10 !== 0 ? "-" + ones[val % 10] : "") + " ";
    } else if (val > 0) {
      s += ones[val] + " ";
    }
    return s.trim();
  }

  let str = "";
  let rem = n;

  if (rem >= 1_000_000_000) {
    str += convertGroup(Math.floor(rem / 1_000_000_000)) + " Billion ";
    rem %= 1_000_000_000;
  }
  if (rem >= 1_000_000) {
    str += convertGroup(Math.floor(rem / 1_000_000)) + " Million ";
    rem %= 1_000_000;
  }
  if (rem >= 1000) {
    str += convertGroup(Math.floor(rem / 1000)) + " Thousand ";
    rem %= 1000;
  }
  if (rem > 0) {
    str += convertGroup(rem) + " ";
  }

  const word = str.trim();
  const unit = currency === "USD" ? "United States Dollars Only" : "Khmer Riel Only";
  return `${word} ${unit}`;
}

// =========================================================================
// Date Formatting Helpers
// =========================================================================

function formatKhmerDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
      "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    ];
    return `ថ្ងៃទី ${d.getDate()} ខែ${months[d.getMonth()]} ឆ្នាំ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatKhmerShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatEnglishDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatEnglishShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

// =========================================================================
// Default Content Generators
// =========================================================================

function createDefaultKmContent(
  loan: Loan,
  client: Client | null,
  companyName?: string,
  usdToKhrRate?: number
): AgreementContent {
  const principalNum = Number(loan.principal_amount) || 0;
  const rateNum = Number(loan.interest_rate_percent) || 0;
  const months = loan.term_months || 1;
  const effectiveRate = usdToKhrRate || 4100;
  const isUSD = loan.principal_currency === "USD";

  const altAmount = isUSD
    ? Math.round(principalNum * effectiveRate)
    : Number((principalNum / effectiveRate).toFixed(2));

  const startDateObj = new Date(loan.start_date);
  const maturityDateObj = new Date(startDateObj);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + months);
  const maturityDateStr = maturityDateObj.toISOString().slice(0, 10);
  const dueDay = startDateObj.getDate() || 1;

  const monthlyInterest = principalNum * (rateNum / 100);
  const monthlyPrincipal = principalNum / months;
  const monthlyEstNum = monthlyPrincipal + monthlyInterest;

  const khmerWords = khmerNumberToWords(principalNum, loan.principal_currency);
  const yearStr = startDateObj.getFullYear() || 2026;
  const contractRefKhmer = `កស-${loan.id.slice(0, 8).toUpperCase()}-${yearStr}`;

  const clientNationalId = client?.national_id || `010${loan.client_id.replace(/\D/g, "").padEnd(6, "8").slice(0, 6)}`;
  const clientAddressKm = client?.address || "រាជធានីភ្នំពេញ ព្រះរាជាណាចក្រកម្ពុជា";
  const clientPhone = client?.phone || "012 345 678";

  let collateralKmText = "កម្ចីឥណទានគ្មានទ្រព្យបញ្ចាំ — ធានាសងដោយកេរ្តិ៍ឈ្មោះ និងទ្រព្យសម្បត្តិផ្ទាល់ខ្លួនរបស់អ្នកខ្ចី";
  if (loan.collateral_info && loan.collateral_info.description) {
    const typeMap: Record<string, string> = {
      land_hard_title: "ប័ណ្ណកម្មសិទ្ធិអចលនវត្ថុ (ប្លង់រឹង)",
      land_soft_title: "លិខិតផ្ទេរសិទ្ធិកាន់កាប់ដីធ្លី/ផ្ទះ (ប្លង់ទន់)",
      vehicle: "ប័ណ្ណសម្គាល់យានយន្ត (កាតគ្រី)",
      equipment: "គ្រឿងចក្រ ឬសម្ភារៈអាជីវកម្ម",
      gold: "មាស ឬគ្រឿងអលង្ការមានតម្លៃ",
      other: "ទ្រព្យធានាជាក់ស្តែង",
    };
    const assetTitle = typeMap[loan.collateral_info.asset_type || ""] || "ទ្រព្យធានា";
    const ref = loan.collateral_info.document_reference ? ` (លេខប័ណ្ណ៖ ${loan.collateral_info.document_reference})` : "";
    const val = Number(loan.collateral_info.estimated_value) > 0
      ? ` [តម្លៃប៉ាន់ស្មាន៖ ${isUSD ? "$" : ""}${Number(loan.collateral_info.estimated_value).toLocaleString()}${!isUSD ? " ៛" : ""}]`
      : "";
    collateralKmText = `${assetTitle}៖ ${loan.collateral_info.description}${ref}${val}`;
  }

  const guarantorKmText = loan.guarantor_info?.name
    ? `ឈ្មោះ ${loan.guarantor_info.name} (ត្រូវជា៖ ${loan.guarantor_info.relationship || "សាច់ញាតិ"}) កាន់អត្តសញ្ញាណប័ណ្ណលេខ៖ ${loan.guarantor_info.national_id || "មានក្នុងកំណត់ត្រា"} ទូរស័ព្ទលេខ៖ ${loan.guarantor_info.phone || "មិនមាន"} — យល់ព្រមធានារួមគ្នាយ៉ាងសាមគ្គីភាព និងឥតលក្ខខណ្ឌក្នុងការសងបំណុលជំនួសភាគី “ខ” ក្នុងករណីខកខាន។`
    : `កម្ចីផ្អែកលើការធានាផ្ទាល់ខ្លួនរបស់អ្នកខ្ចីប្រាក់ ដោយសន្យាយកកិត្តិយស និងទ្រព្យសម្បត្តិផ្ទាល់ខ្លួនទាំងអស់មកធានាកាតព្វកិច្ចសងបំណុល។`;

  return {
    contractRef: contractRefKhmer,
    executionDate: `ធ្វើនៅ រាជធានីភ្នំពេញ ថ្ងៃទី ${formatKhmerDate(loan.start_date)}`,
    partyA: `${companyName || "គ្រឹះស្ថានមីក្រូហិរញ្ញវត្ថុ ស្មាត ឡូន ភីអិលស៊ី"} (ទទួលបានអាជ្ញាប័ណ្ណស្របច្បាប់ពីធនាគារជាតិនៃកម្ពុជា) ទីស្នាក់ការកណ្តាលស្ថិតនៅរាជធានីភ្នំពេញ តំណាងស្របច្បាប់ដោយលោក/លោកស្រី ប្រធាននាយកដ្ឋានឥណទាន។`,
    partyB: `ឈ្មោះ ${loan.client_name || "កូនបំណុល"} ភេទ៖ ប្រុស/ស្រី សញ្ជាតិ៖ ខ្មែរ កាន់អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរលេខ៖ ${clientNationalId} អាសយដ្ឋានបច្ចុប្បន្ន៖ ${clientAddressKm} ទូរស័ព្ទលេខ៖ ${clientPhone} មានសិទ្ធិ និងសមត្ថភាពពេញលេញតាមច្បាប់។`,
    partyC: guarantorKmText,
    principalText: isUSD ? `$${principalNum.toLocaleString()}` : `${principalNum.toLocaleString()} ៛`,
    principalWords: `(${khmerWords})`,
    altPrincipalText: `(សមមូល ≈ ${isUSD ? `${altAmount.toLocaleString()} ៛` : `$${altAmount.toLocaleString()}`})`,
    interestText: `${rateNum.toFixed(2)}% ក្នុងមួយខែ (សមមូល ${(rateNum * 12).toFixed(1)}% ក្នុងមួយឆ្នាំ)`,
    interestMethodText: loan.interest_type === "reducing" ? "ការប្រាក់ថយចុះតាមសមតុល្យ" : "ការប្រាក់ថេរស្មើគ្នា",
    tenureText: `${months} ខែ (${formatKhmerShortDate(loan.start_date)} ដល់ ${formatKhmerShortDate(maturityDateStr)})`,
    dueScheduleText: `រៀងរាល់ថ្ងៃទី ${dueDay} នៃខែនីមួយៗ`,
    monthlyInstallmentText: `ប្រមាណ ${isUSD ? `$${monthlyEstNum.toFixed(2)}` : `${Math.round(monthlyEstNum).toLocaleString()} ៛`} / ខែ (រួមបញ្ចូលទាំងប្រាក់ដើម និងការប្រាក់)`,
    latePenaltyText: `${Number(loan.late_fee_percent).toFixed(2)}% លើប្រាក់ហួសកាលកំណត់ (អនុគ្រោះ ${loan.grace_period_days} ថ្ងៃ)`,
    collateralText: collateralKmText,
    article1Title: "ប្រការ ១ (ការបើកផ្តល់ប្រាក់កម្ចី និងការទទួលស្គាល់បំណុល)៖",
    article1Body: "ភាគី “ក” យល់ព្រមអនុម័ត និងបើកផ្តល់ប្រាក់កម្ចីចំនួនដូចបានកំណត់ក្នុងតារាងខាងលើជូនភាគី “ខ” ដើម្បីយកទៅប្រើប្រាស់ក្នុងមុខរបរ ឬតម្រូវការស្របច្បាប់។ ភាគី “ខ” សូមទទួលស្គាល់ និងបញ្ជាក់ថាខ្លួនពិតជាបានទទួលប្រាក់កម្ចីគ្រប់ចំនួនរួចរាល់នៅថ្ងៃចុះកិច្ចសន្យានេះ និងទទួលស្គាល់ខ្លួនជាកូនបំណុលស្របច្បាប់របស់ភាគី “ក” ដោយស្ម័គ្រចិត្ត និងគ្មានការបង្ខិតបង្ខំឡើយ។",
    article2Title: "ប្រការ ២ (កាតព្វកិច្ចសងប្រាក់ និងការទូទាត់មុនកាលកំណត់)៖",
    article2Body: "ភាគី “ខ” សន្យាសងប្រាក់ដើម ការប្រាក់ និងកម្រៃផ្សេងៗជូនភាគី “ក” ឱ្យបានទៀងទាត់តាមកាលវិភាគកំណត់។ ភាគី “ខ” មានសិទ្ធិទូទាត់សងផ្តាច់ប្រាក់កម្ចីមុនកាលកំណត់នៅគ្រប់ពេលវេលា ដោយត្រូវបានលើកលែងការបង់ការប្រាក់សម្រាប់ខែដែលមិនទាន់មកដល់ ស្របតាមបទប្បញ្ញត្តិរបស់ធនាគារជាតិនៃកម្ពុជា។",
    article3Title: "ប្រការ ៣ (ការគ្រប់គ្រងទ្រព្យធានា និងការសន្យាហាមឃាត់)៖",
    article3Body: "ទ្រព្យធានាដែលបានកំណត់ក្នុងកិច្ចសន្យានេះ ត្រូវបានដាក់តម្កល់ដើម្បីធានាកាតព្វកិច្ចសងបំណុល។ ភាគី “ខ” និងភាគី “គ” សន្យាមិនយកទ្រព្យធានាទៅលក់ ជួល ផ្ទេរ ឬដាក់បញ្ចាំបន្តជាដាច់ខាត បើគ្មានការយល់ព្រមជាលាយលក្ខណ៍អក្សរពីភាគី “ក”។ ភាគី “គ” យល់ព្រមទទួលខុសត្រូវរួមគ្នាយ៉ាងសាមគ្គីភាព និងឥតលក្ខខណ្ឌក្នុងការសងបំណុលជំនួសភាគី “ខ”។",
    article4Title: "ប្រការ ៤ (ការខកខាន និងការទារបំណុលជាបន្ទាន់)៖",
    article4Body: "ក្នុងករណីភាគី “ខ” ខកខានមិនបានសងប្រាក់លើសពី ៣០ ថ្ងៃ ភាគី “ក” មានសិទ្ធិប្រកាសទារប្រាក់បំណុលទាំងអស់ជាបន្ទាន់ (រួមទាំងប្រាក់ដើម ការប្រាក់ និងថ្លៃពិន័យ) និងមានសិទ្ធិពេញលេញតាមច្បាប់ក្នុងការចាត់ចែងលក់ទ្រព្យធានា ឬទាមទារតាមផ្លូវតុលាការដើម្បីទូទាត់បំណុលដែលនៅសេសសល់។",
    article5Title: "ប្រការ ៥ (ច្បាប់គ្រប់គ្រង និងយុត្តាធិការដោះស្រាយវិវាទ)៖",
    article5Body: "កិច្ចសន្យានេះស្ថិតនៅក្រោមការគ្រប់គ្រង និងបកស្រាយស្របតាមច្បាប់នៃព្រះរាជាណាចក្រកម្ពុជា។ រាល់វិវាទដែលកើតចេញពីកិច្ចសន្យានេះ ភាគីទាំងពីរត្រូវដោះស្រាយដោយការសម្រុះសម្រួលគ្នាដោយសន្តិវិធី។ បើពុំអាចដោះស្រាយបាន វិវាទនេះនឹងត្រូវបញ្ជូនទៅតុលាការមានសមត្ថកិច្ចនៃព្រះរាជាណាចក្រកម្ពុជា ដើម្បីកាត់សេចក្តីជាស្ថាពរ។",
    article6Title: "ប្រការ ៦ (អានុភាពគតិយុត្ត និងការអនុវត្ត)៖",
    article6Body: "កិច្ចសន្យានេះត្រូវបានធ្វើឡើងជាភាសាខ្មែរចំនួន ០២ ច្បាប់ដើម ដែលមានតម្លៃគតិយុត្តស្មើគ្នា (ភាគី “ក” រក្សាទុក ០១ ច្បាប់ និងភាគី “ខ” រក្សាទុក ០១ ច្បាប់)។ ភាគីទាំងអស់បានអាន ស្តាប់ និងយល់ព្រមទាំងស្រុង ព្រមទាំងស្ម័គ្រចិត្តផ្តិតមេដៃស្តាំ និងចុះហត្ថលេខាទុកជាភស្តុតាងនៅចំពោះមុខសាក្សី។",
    signerBorrowerTitle: "ស្នាមមេដៃស្តាំអ្នកខ្ចី (កូនបំណុល)",
    signerBorrowerName: loan.client_name || "អ្នកខ្ចីប្រាក់",
    signerBorrowerNote: `អត្តលេខ៖ ${clientNationalId}`,
    signerGuarantorTitle: loan.guarantor_info?.name ? "ស្នាមមេដៃស្តាំអ្នកធានា" : "ហត្ថលេខាសាក្សីស្របច្បាប់",
    signerGuarantorName: loan.guarantor_info?.name || "សាក្សីស្របច្បាប់",
    signerGuarantorNote: loan.guarantor_info?.name ? `ត្រូវជា៖ ${loan.guarantor_info.relationship || "អ្នកធានា"}` : "សាក្សីតំណាង",
    signerLenderTitle: "តំណាងស្របច្បាប់ស្ថាប័ន & ត្រា",
    signerLenderName: companyName || "ស្ថាប័នឥណទាន",
    signerLenderSub: "ប្រធាននាយកដ្ឋានឥណទាន",
  };
}

function createDefaultEnContent(
  loan: Loan,
  client: Client | null,
  companyName?: string,
  usdToKhrRate?: number
): AgreementContent {
  const principalNum = Number(loan.principal_amount) || 0;
  const rateNum = Number(loan.interest_rate_percent) || 0;
  const months = loan.term_months || 1;
  const effectiveRate = usdToKhrRate || 4100;
  const isUSD = loan.principal_currency === "USD";

  const altAmount = isUSD
    ? Math.round(principalNum * effectiveRate)
    : Number((principalNum / effectiveRate).toFixed(2));

  const startDateObj = new Date(loan.start_date);
  const maturityDateObj = new Date(startDateObj);
  maturityDateObj.setMonth(maturityDateObj.getMonth() + months);
  const maturityDateStr = maturityDateObj.toISOString().slice(0, 10);
  const dueDay = startDateObj.getDate() || 1;

  const monthlyInterest = principalNum * (rateNum / 100);
  const monthlyPrincipal = principalNum / months;
  const monthlyEstNum = monthlyPrincipal + monthlyInterest;

  const englishWords = englishNumberToWords(principalNum, loan.principal_currency);
  const yearStr = startDateObj.getFullYear() || 2026;
  const contractRefEnglish = `FAC-${loan.id.slice(0, 8).toUpperCase()}-${yearStr}`;

  const clientNationalId = client?.national_id || `010${loan.client_id.replace(/\D/g, "").padEnd(6, "8").slice(0, 6)}`;
  const clientAddressEn = client?.address || "Phnom Penh, Kingdom of Cambodia";
  const clientPhone = client?.phone || "012 345 678";

  let collateralEnText = "Unsecured Signature Facility — Backed by the personal covenant, creditworthiness, and general assets of the Borrower";
  if (loan.collateral_info && loan.collateral_info.description) {
    const typeMap: Record<string, string> = {
      land_hard_title: "Real Estate Property Title (Hard Title Deed)",
      land_soft_title: "Land & House Possession Transfer (Soft Title)",
      vehicle: "Official Vehicle Registration Certificate",
      equipment: "Commercial Machinery & Equipment",
      gold: "Gold Bullion / Precious Jewelry",
      other: "Pledged Security Collateral",
    };
    const assetTitle = typeMap[loan.collateral_info.asset_type || ""] || "Pledged Collateral";
    const ref = loan.collateral_info.document_reference ? ` (Document Ref: ${loan.collateral_info.document_reference})` : "";
    const val = Number(loan.collateral_info.estimated_value) > 0
      ? ` [Assessed Value: ${isUSD ? "$" : ""}${Number(loan.collateral_info.estimated_value).toLocaleString()}${!isUSD ? " KHR" : ""}]`
      : "";
    collateralEnText = `${assetTitle}: ${loan.collateral_info.description}${ref}${val}`;
  }

  const guarantorEnText = loan.guarantor_info?.name
    ? `Full Name: ${loan.guarantor_info.name} (Relationship: ${loan.guarantor_info.relationship || "Family"}), National ID: ${loan.guarantor_info.national_id || "On File"}, Phone: ${loan.guarantor_info.phone || "N/A"} — Unconditionally assuming joint, several, and irrevocable liability to guarantee all debt covenants hereunder.`
    : `Unsecured Signature Facility — Backed by the general assets, full personal liability, and bona fide credit standing of the Borrower.`;

  return {
    contractRef: contractRefEnglish,
    executionDate: `Executed at Phnom Penh on ${formatEnglishDate(loan.start_date)}`,
    partyA: `${companyName || "SMART LOAN PLATFORM MFI PLC."} — A licensed financial institution incorporated and operating under the laws of the Kingdom of Cambodia and regulations of the National Bank of Cambodia, represented herein by its Head of Credit Operations.`,
    partyB: `Full Name: ${loan.client_name || "Borrower"}, Gender: Male/Female, Nationality: Cambodian, National ID / Passport No: ${clientNationalId}, Current Address: ${clientAddressEn}, Phone: ${clientPhone}, possessing full legal capacity and competence to assume credit obligations.`,
    partyC: guarantorEnText,
    principalText: isUSD ? `USD ${principalNum.toLocaleString()}` : `KHR ${principalNum.toLocaleString()}`,
    principalWords: `(${englishWords})`,
    altPrincipalText: `(Approx. ≈ ${isUSD ? `KHR ${altAmount.toLocaleString()}` : `USD ${altAmount.toLocaleString()}`})`,
    interestText: `${rateNum.toFixed(2)}% / month (${(rateNum * 12).toFixed(1)}% Annualized APR)`,
    interestMethodText: loan.interest_type === "reducing" ? "Reducing Balance Method" : "Flat Rate Method",
    tenureText: `${months} Months (${formatEnglishShortDate(loan.start_date)} to ${formatEnglishShortDate(maturityDateStr)})`,
    dueScheduleText: `Every ${dueDay}th day of each calendar month`,
    monthlyInstallmentText: `Approx. ${isUSD ? `$${monthlyEstNum.toFixed(2)}` : `${Math.round(monthlyEstNum).toLocaleString()} KHR`} / month (Principal and interest combined)`,
    latePenaltyText: `${Number(loan.late_fee_percent).toFixed(2)}% on overdue amounts (${loan.grace_period_days} Days Grace Period)`,
    collateralText: collateralEnText,
    article1Title: "Article 1 (Credit Facility, Disbursement & Debt Acknowledgment):",
    article1Body: "The Lender extends and the Borrower accepts the credit facility detailed in the table above for lawful economic purposes. The Borrower irrevocably confirms full receipt of disbursement funds upon execution and unconditionally acknowledges legal status as debtor to the Lender.",
    article2Title: "Article 2 (Repayment Undertakings & Prepayment Rights):",
    article2Body: "The Borrower covenants to punctually pay all monthly installments of principal, interest, and charges according to the amortized schedule. The Borrower reserves the right to effect full early prepayment at any time, whereupon future unaccrued interest shall be waived in full pursuant to National Bank of Cambodia regulations.",
    article3Title: "Article 3 (Collateral Custody, Negative Pledge & Joint Guarantee):",
    article3Body: "Any pledged collateral described herein is encumbered under an irrevocable first-priority lien. The Borrower and Guarantor covenant not to sell, transfer, lease, or further encumber the collateral without prior written authorization from the Lender. The Guarantor unconditionally assumes joint and several liability.",
    article4Title: "Article 4 (Events of Default & Acceleration Remedies):",
    article4Body: "In the event of default exceeding thirty (30) days from any installment due date, the Lender reserves the right to declare the entire balance (principal, interest, and late charges) immediately due and payable, and to initiate foreclosure and judicial liquidating proceedings under Cambodian law.",
    article5Title: "Article 5 (Governing Law & Judicial Jurisdiction):",
    article5Body: "This Agreement is governed by and construed in accordance with the laws of the Kingdom of Cambodia and regulations of the National Bank of Cambodia. Any dispute failing amicable settlement shall be submitted to the exclusive jurisdiction of the competent courts of the Kingdom of Cambodia.",
    article6Title: "Article 6 (Counterparts & Voluntary Execution):",
    article6Body: "Executed in two (2) authentic original counterparts of equal legal effect, one retained by the Lender and one by the Borrower. Each party confirms having read, understood, and voluntarily signed and thumbprinted this Agreement before official witnesses.",
    signerBorrowerTitle: "Borrower Signature & Thumbprint",
    signerBorrowerName: loan.client_name || "Borrower",
    signerBorrowerNote: `ID: ${clientNationalId}`,
    signerGuarantorTitle: loan.guarantor_info?.name ? "Guarantor Signature & Thumbprint" : "Witness Signature",
    signerGuarantorName: loan.guarantor_info?.name || "Official Witness",
    signerGuarantorNote: loan.guarantor_info?.name ? `Relation: ${loan.guarantor_info.relationship || "Guarantor"}` : "Legal Witness",
    signerLenderTitle: "Lender Representative & Seal",
    signerLenderName: companyName || "Credit Institution",
    signerLenderSub: "Head of Credit Operations",
  };
}

// =========================================================================
// Editable Text Element Component
// =========================================================================

function EditableField({
  value,
  onSave,
  isEditing,
  style,
  as: Component = "span",
  className = "",
}: {
  value: string;
  onSave: (val: string) => void;
  isEditing: boolean;
  style?: React.CSSProperties;
  as?: "div" | "span" | "p";
  className?: string;
}) {
  return (
    <Component
      contentEditable={isEditing}
      suppressContentEditableWarning
      onBlur={(e) => onSave(e.currentTarget.innerText.trim())}
      className={`editable-content-node ${isEditing ? "is-editing" : ""} ${className}`}
      style={{
        ...style,
        outline: isEditing ? "1px dashed #3b82f6" : "none",
        outlineOffset: isEditing ? "1px" : "0",
        backgroundColor: isEditing ? "rgba(59, 130, 246, 0.03)" : "transparent",
        borderRadius: isEditing ? "2px" : undefined,
        padding: isEditing ? "1px 2px" : undefined,
        cursor: isEditing ? "text" : "inherit",
        display: Component === "span" ? "inline" : "block",
        transition: "all 0.15s ease",
      }}
    >
      {value}
    </Component>
  );
}

// =========================================================================
// Main Component
// =========================================================================

export default function LoanAgreementModal({ isOpen, onClose, loan }: LoanAgreementModalProps) {
  const { i18n } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();
  const { companyName, usdToKhrRate } = useBranding();
  const [lang, setLang] = useState<Lang>(() => (i18n.language === "km" ? "km" : "en"));
  const [isEditing, setIsEditing] = useState(false);
  const [client, setClient] = useState<Client | null>(null);

  // Synchronize modal language with active i18n language when opening
  useEffect(() => {
    if (isOpen) {
      setLang(i18n.language === "km" ? "km" : "en");
    }
  }, [isOpen, i18n.language]);

  // Editable document states
  const [kmContent, setKmContent] = useState<AgreementContent>(() =>
    createDefaultKmContent(loan, null, companyName, usdToKhrRate)
  );
  const [enContent, setEnContent] = useState<AgreementContent>(() =>
    createDefaultEnContent(loan, null, companyName, usdToKhrRate)
  );

  // Fetch full client details
  useEffect(() => {
    if (!isOpen || !loan.client_id) return;
    getClient(loan.client_id)
      .then((c) => {
        setClient(c);
        // Pre-populate client data if default placeholders were used
        setKmContent((prev) => {
          const fresh = createDefaultKmContent(loan, c, companyName, usdToKhrRate);
          return {
            ...prev,
            partyB: fresh.partyB,
            signerBorrowerNote: fresh.signerBorrowerNote,
          };
        });
        setEnContent((prev) => {
          const fresh = createDefaultEnContent(loan, c, companyName, usdToKhrRate);
          return {
            ...prev,
            partyB: fresh.partyB,
            signerBorrowerNote: fresh.signerBorrowerNote,
          };
        });
      })
      .catch((err) => console.warn("Could not load client details for agreement:", err));
  }, [isOpen, loan.client_id, companyName, usdToKhrRate]);

  // Manage body class for clean 1-page printing
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("agreement-modal-active");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("agreement-modal-active");
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleDownloadPdf() {
    try {
      toast.info(lang === "km" ? "កំពុងទាញយកកិច្ចសន្យា PDF..." : "Generating PDF agreement...");
      await downloadLoanAgreement(loan.id);
      toast.success(lang === "km" ? "បានទាញយកកិច្ចសន្យា PDF រួចរាល់។" : "PDF contract downloaded.");
    } catch {
      toast.error(lang === "km" ? "បរាជ័យក្នុងការទាញយកកិច្ចសន្យា PDF។" : "Failed to generate PDF agreement.");
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleReset() {
    const ok = await confirm({
      title: lang === "km" ? "កំណត់ខ្លឹមសារឡើងវិញ?" : "Reset Contract Content?",
      message:
        lang === "km"
          ? "តើអ្នកពិតជាចង់កំណត់ខ្លឹមសារកែសម្រួលទាំងអស់ទៅជាតម្លៃលំនាំដើមរបស់ប្រព័ន្ធវិញមែនទេ?"
          : "Are you sure you want to reset all customized text back to system calculated defaults?",
      confirmLabel: lang === "km" ? "កំណត់ឡើងវិញ" : "Reset",
      cancelLabel: lang === "km" ? "បោះបង់" : "Cancel",
      danger: true,
    });
    if (!ok) return;

    setKmContent(createDefaultKmContent(loan, client, companyName, usdToKhrRate));
    setEnContent(createDefaultEnContent(loan, client, companyName, usdToKhrRate));
    toast.info(lang === "km" ? "បានកំណត់ខ្លឹមសារឡើងវិញជោគជ័យ។" : "Agreement content reset to defaults.");
  }

  const isKm = lang === "km";
  const curContent = isKm ? kmContent : enContent;

  function updateField<K extends keyof AgreementContent>(field: K, val: string) {
    if (isKm) {
      setKmContent((prev) => ({ ...prev, [field]: val }));
    } else {
      setEnContent((prev) => ({ ...prev, [field]: val }));
    }
  }

  const modalContent = (
    <div className="modal-backdrop agreement-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box agreement-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 820,
          width: "100%",
          maxHeight: "92vh",
          background: "var(--color-surface-sunken)",
          borderRadius: "14px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Controls Bar (Always hidden in print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 18px",
            borderBottom: "1px solid var(--color-border)",
            background: "#ffffff",
            flexShrink: 0,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={18} color="var(--color-accent)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "កិច្ចសន្យាឥណទាន និងទទួលស្គាល់បំណុល" : "Credit Facility & Debt Agreement"} • {curContent.contractRef}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {isKm ? "ទម្រង់ច្បាប់ស្តង់ដារកម្ពុជា (បោះពុម្ពត្រឹម ១ ទំព័រគត់)" : "Official Legal Banking Deed (Guaranteed 1-Page Print)"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Language Selector Tabs */}
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                padding: 2,
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setLang("km")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: isKm ? "var(--color-accent)" : "transparent",
                  color: isKm ? "#ffffff" : "var(--color-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {isKm ? "ភាសាខ្មែរ" : "Khmer"}
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                style={{
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: !isKm ? "var(--color-accent)" : "transparent",
                  color: !isKm ? "#ffffff" : "var(--color-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                {isKm ? "ភាសាអង់គ្លេស" : "English"}
              </button>
            </div>

            {/* Direct Edit Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={isEditing ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
              style={{
                borderRadius: "8px",
                fontSize: 11.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              title={isKm ? "ចុចដើម្បីកែសម្រួលអត្ថបទដោយផ្ទាល់លើក្រដាស" : "Click to edit text content directly on page"}
            >
              {isEditing ? <Check size={13} /> : <Edit3 size={13} />}
              {isEditing
                ? isKm ? "មើលទម្រង់ចុងក្រោយ" : "Done (Preview)"
                : isKm ? "កែប្រែខ្លឹមសារ" : "Edit Text"}
            </button>

            {/* Reset Button */}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleReset}
              style={{ borderRadius: "8px", fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}
              title={isKm ? "កំណត់ខ្លឹមសារឡើងវិញទៅលំនាំដើម" : "Reset text to system defaults"}
            >
              <RotateCcw size={12} />
              <span>{isKm ? "កំណត់ដើម" : "Reset"}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ borderRadius: "8px", fontSize: 11.5, fontWeight: 700 }}
            >
              <Printer size={13} /> {isKm ? "បោះពុម្ព ១ ទំព័រ" : "Print (1 Page)"}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleDownloadPdf}
              style={{ borderRadius: "8px", fontSize: 11.5 }}
            >
              <Download size={13} /> PDF
            </button>

            {/* Close Button */}
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Close"
              style={{ borderRadius: "8px" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Container on Screen */}
        <div
          className="modal-body-scroll agreement-paper-container"
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Edit Mode Notice Strip (Only visible on screen in edit mode) */}
          {isEditing && (
            <div
              className="no-print"
              style={{
                width: "100%",
                maxWidth: "760px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                padding: "6px 12px",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#1e40af",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Edit3 size={13} color="#2563eb" />
                <span>
                  {isKm
                    ? "របៀបកែសម្រួលបានបើក៖ លោកអ្នកអាចចុច និងកែប្រែរាល់អត្ថបទ តារាង ព័ត៌មានភាគី ឬប្រការច្បាប់ដោយផ្ទាល់នៅលើទំព័រនេះ។"
                    : "Direct Edit Mode Active: You can click and modify any text, table cell, or clause directly on the document below."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  background: "var(--color-accent)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isKm ? "មើលទម្រង់ចុងក្រោយ" : "Done Editing"}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* KHMER ONLY AGREEMENT PAPER (100% PURE KHMER — REAL HUMAN CAMBODIAN STYLE) */}
          {/* ========================================================================= */}
          {isKm && (
            <div
              className="one-page-contract"
              style={{
                width: "100%",
                maxWidth: "760px",
                background: "#ffffff",
                color: "#000000",
                padding: "18px 24px 14px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #cbd5e1",
                fontSize: "10.5px",
                lineHeight: 1.36,
                fontFamily: "'Khmer OS Battambang', 'Hanuman', 'Siemreap', 'Segoe UI', Arial, sans-serif",
                boxSizing: "border-box",
              }}
            >
              {/* National Header */}
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#000000" }}>
                  ព្រះរាជាណាចក្រកម្ពុជា
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#000000", marginTop: 1 }}>
                  ជាតិ សាសនា ព្រះមហាក្សត្រ
                </div>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.25em", margin: "1px 0 4px" }}>
                  ❖ ❖ ❖
                </div>

                {/* Title */}
                <div style={{ borderTop: "1.5px solid #000000", borderBottom: "1.5px solid #000000", padding: "3px 0", margin: "2px 0 4px" }}>
                  <h1 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "#000000", letterSpacing: "0.02em" }}>
                    កិច្ចសន្យាឥណទាន និងទទួលស្គាល់បំណុល
                  </h1>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#000000", marginTop: 2 }}>
                  <span>
                    លេខកិច្ចសន្យា៖{" "}
                    <EditableField
                      value={kmContent.contractRef}
                      onSave={(v) => updateField("contractRef", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </span>
                  <span>
                    <EditableField
                      value={kmContent.executionDate}
                      onSave={(v) => updateField("executionDate", v)}
                      isEditing={isEditing}
                    />
                  </span>
                </div>
              </div>

              {/* Contracting Parties Box */}
              <div
                style={{
                  border: "1px solid #000000",
                  padding: "5px 9px",
                  borderRadius: "2px",
                  marginBottom: 6,
                  fontSize: "9.8px",
                  background: "#f8fafc",
                  lineHeight: 1.35,
                }}
              >
                <div style={{ margin: "1px 0" }}>
                  <strong>១. ភាគីម្ចាស់បំណុល (ហៅកាត់ថា ភាគី “ក”)៖</strong>{" "}
                  <EditableField
                    value={kmContent.partyA}
                    onSave={(v) => updateField("partyA", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div style={{ margin: "2px 0" }}>
                  <strong>២. ភាគីអ្នកខ្ចីប្រាក់ (ហៅកាត់ថា ភាគី “ខ”)៖</strong>{" "}
                  <EditableField
                    value={kmContent.partyB}
                    onSave={(v) => updateField("partyB", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div style={{ margin: "1px 0" }}>
                  <strong>៣. ភាគីអ្នកធានា (ហៅកាត់ថា ភាគី “គ”)៖</strong>{" "}
                  <EditableField
                    value={kmContent.partyC}
                    onSave={(v) => updateField("partyC", v)}
                    isEditing={isEditing}
                  />
                </div>
              </div>

              {/* Boxed Terms Table (Classic Cambodian Banking Style) */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 6,
                  fontSize: "9.3px",
                  lineHeight: 1.3,
                  border: "1px solid #000000",
                }}
              >
                <tbody>
                  <tr style={{ background: "#f1f5f9" }}>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "23%", fontWeight: 700 }}>
                      ប្រាក់ដើមកម្ចី
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "27%", fontWeight: 800 }}>
                      <div>
                        <EditableField
                          value={kmContent.principalText}
                          onSave={(v) => updateField("principalText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8.5, color: "#1e293b", fontWeight: 700 }}>
                        <EditableField
                          value={kmContent.principalWords}
                          onSave={(v) => updateField("principalWords", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8, color: "#475569" }}>
                        <EditableField
                          value={kmContent.altPrincipalText}
                          onSave={(v) => updateField("altPrincipalText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "22%", fontWeight: 700 }}>
                      អត្រាការប្រាក់
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "28%", fontWeight: 800 }}>
                      <div>
                        <EditableField
                          value={kmContent.interestText}
                          onSave={(v) => updateField("interestText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8, color: "#475569" }}>
                        <EditableField
                          value={kmContent.interestMethodText}
                          onSave={(v) => updateField("interestMethodText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      រយៈពេលកម្ចី
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={kmContent.tenureText}
                        onSave={(v) => updateField("tenureText", v)}
                        isEditing={isEditing}
                        style={{ fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      កាលបរិច្ឆេទសងប្រាក់
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      <EditableField
                        value={kmContent.dueScheduleText}
                        onSave={(v) => updateField("dueScheduleText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                  </tr>

                  <tr style={{ background: "#f1f5f9" }}>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      ប្រាក់ត្រូវបង់រំលស់ប្រចាំខែ
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 800 }}>
                      <EditableField
                        value={kmContent.monthlyInstallmentText}
                        onSave={(v) => updateField("monthlyInstallmentText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      ថ្លៃពិន័យយឺតយ៉ាវ
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={kmContent.latePenaltyText}
                        onSave={(v) => updateField("latePenaltyText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      ទ្រព្យធានា / វត្ថុបញ្ចាំ
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={kmContent.collateralText}
                        onSave={(v) => updateField("collateralText", v)}
                        isEditing={isEditing}
                        as="div"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Standard Cambodian Legal Articles (ប្រការ និងខសន្យាផ្លូវច្បាប់ស្តង់ដារ) */}
              <div style={{ display: "grid", gap: 3, fontSize: "9.0px", lineHeight: 1.34, textAlign: "justify", marginBottom: 7 }}>
                <div>
                  <EditableField
                    value={kmContent.article1Title}
                    onSave={(v) => updateField("article1Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article1Body}
                    onSave={(v) => updateField("article1Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={kmContent.article2Title}
                    onSave={(v) => updateField("article2Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article2Body}
                    onSave={(v) => updateField("article2Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={kmContent.article3Title}
                    onSave={(v) => updateField("article3Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article3Body}
                    onSave={(v) => updateField("article3Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={kmContent.article4Title}
                    onSave={(v) => updateField("article4Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article4Body}
                    onSave={(v) => updateField("article4Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={kmContent.article5Title}
                    onSave={(v) => updateField("article5Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article5Body}
                    onSave={(v) => updateField("article5Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={kmContent.article6Title}
                    onSave={(v) => updateField("article6Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={kmContent.article6Body}
                    onSave={(v) => updateField("article6Body", v)}
                    isEditing={isEditing}
                  />
                </div>
              </div>

              {/* Signatures & Thumbprints (Cambodian Banking Standard 3 Columns) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  borderTop: "1.5px solid #000000",
                  paddingTop: 5,
                }}
              >
                {/* Borrower Thumbprint */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerBorrowerTitle}
                      onSave={(v) => updateField("signerBorrowerTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 48,
                      border: "1px dashed #475569",
                      borderRadius: "3px",
                      margin: "3px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    មេដៃស្តាំ
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerBorrowerName}
                      onSave={(v) => updateField("signerBorrowerName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={kmContent.signerBorrowerNote}
                      onSave={(v) => updateField("signerBorrowerNote", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>

                {/* Guarantor / Witness Thumbprint */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerGuarantorTitle}
                      onSave={(v) => updateField("signerGuarantorTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 48,
                      border: "1px dashed #475569",
                      borderRadius: "3px",
                      margin: "3px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    {loan.guarantor_info?.name ? "មេដៃស្តាំ" : "សាក្សី"}
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerGuarantorName}
                      onSave={(v) => updateField("signerGuarantorName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={kmContent.signerGuarantorNote}
                      onSave={(v) => updateField("signerGuarantorNote", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>

                {/* Lender Stamp & Signature */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerLenderTitle}
                      onSave={(v) => updateField("signerLenderTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 50,
                      height: 50,
                      border: "1px dashed #475569",
                      borderRadius: "50%",
                      margin: "2px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    ត្រាស្ថាប័ន
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.2, fontWeight: 800 }}>
                    <EditableField
                      value={kmContent.signerLenderName}
                      onSave={(v) => updateField("signerLenderName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={kmContent.signerLenderSub}
                      onSave={(v) => updateField("signerLenderSub", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ENGLISH ONLY AGREEMENT PAPER (100% PURE ENGLISH — INTERNATIONAL BANKING)   */}
          {/* ========================================================================= */}
          {!isKm && (
            <div
              className="one-page-contract"
              style={{
                width: "100%",
                maxWidth: "760px",
                background: "#ffffff",
                color: "#000000",
                padding: "18px 24px 14px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: "1px solid #cbd5e1",
                fontSize: "10px",
                lineHeight: 1.35,
                fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
                boxSizing: "border-box",
              }}
            >
              {/* National Header */}
              <div style={{ textAlign: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#000000", letterSpacing: "0.08em" }}>
                  KINGDOM OF CAMBODIA
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#1e293b", letterSpacing: "0.05em", marginTop: 1 }}>
                  NATION • RELIGION • KING
                </div>
                <div style={{ fontSize: 9.5, color: "#64748b", letterSpacing: "0.2em", margin: "1px 0 4px" }}>
                  --- ❖ ---
                </div>

                {/* Title */}
                <div style={{ borderTop: "1.5px solid #000000", borderBottom: "1.5px solid #000000", padding: "3px 0", margin: "2px 0 4px" }}>
                  <h1 style={{ margin: 0, fontSize: 14.5, fontWeight: 900, color: "#000000", letterSpacing: "0.03em" }}>
                    CREDIT FACILITY AND DEBT ACKNOWLEDGMENT AGREEMENT
                  </h1>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.8, color: "#000000", marginTop: 2 }}>
                  <span>
                    Contract Reference:{" "}
                    <EditableField
                      value={enContent.contractRef}
                      onSave={(v) => updateField("contractRef", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </span>
                  <span>
                    <EditableField
                      value={enContent.executionDate}
                      onSave={(v) => updateField("executionDate", v)}
                      isEditing={isEditing}
                    />
                  </span>
                </div>
              </div>

              {/* Contracting Parties Box */}
              <div
                style={{
                  border: "1px solid #000000",
                  padding: "5px 9px",
                  borderRadius: "2px",
                  marginBottom: 6,
                  fontSize: "9.5px",
                  background: "#f8fafc",
                  lineHeight: 1.34,
                }}
              >
                <div style={{ margin: "1px 0" }}>
                  <strong>1. THE CREDITOR (Party &ldquo;A&rdquo; / Lender):</strong>{" "}
                  <EditableField
                    value={enContent.partyA}
                    onSave={(v) => updateField("partyA", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div style={{ margin: "2px 0" }}>
                  <strong>2. THE BORROWER (Party &ldquo;B&rdquo; / Debtor):</strong>{" "}
                  <EditableField
                    value={enContent.partyB}
                    onSave={(v) => updateField("partyB", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div style={{ margin: "1px 0" }}>
                  <strong>3. THE GUARANTOR (Party &ldquo;C&rdquo;):</strong>{" "}
                  <EditableField
                    value={enContent.partyC}
                    onSave={(v) => updateField("partyC", v)}
                    isEditing={isEditing}
                  />
                </div>
              </div>

              {/* Boxed Terms Table (Classic Commercial Banking Style) */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: 6,
                  fontSize: "9.2px",
                  lineHeight: 1.3,
                  border: "1px solid #000000",
                }}
              >
                <tbody>
                  <tr style={{ background: "#f1f5f9" }}>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "24%", fontWeight: 700 }}>
                      Principal Facility Amount
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "26%", fontWeight: 800 }}>
                      <div>
                        <EditableField
                          value={enContent.principalText}
                          onSave={(v) => updateField("principalText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8.5, color: "#1e293b", fontWeight: 700 }}>
                        <EditableField
                          value={enContent.principalWords}
                          onSave={(v) => updateField("principalWords", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8, color: "#475569" }}>
                        <EditableField
                          value={enContent.altPrincipalText}
                          onSave={(v) => updateField("altPrincipalText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "23%", fontWeight: 700 }}>
                      Interest Rate & Basis
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "27%", fontWeight: 800 }}>
                      <div>
                        <EditableField
                          value={enContent.interestText}
                          onSave={(v) => updateField("interestText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                      <div style={{ fontSize: 8, color: "#475569" }}>
                        <EditableField
                          value={enContent.interestMethodText}
                          onSave={(v) => updateField("interestMethodText", v)}
                          isEditing={isEditing}
                        />
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      Facility Tenure
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={enContent.tenureText}
                        onSave={(v) => updateField("tenureText", v)}
                        isEditing={isEditing}
                        style={{ fontWeight: 700 }}
                      />
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      Repayment Schedule
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      <EditableField
                        value={enContent.dueScheduleText}
                        onSave={(v) => updateField("dueScheduleText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                  </tr>

                  <tr style={{ background: "#f1f5f9" }}>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      Monthly Installment
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 800 }}>
                      <EditableField
                        value={enContent.monthlyInstallmentText}
                        onSave={(v) => updateField("monthlyInstallmentText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      Late Penalty Fee
                    </td>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={enContent.latePenaltyText}
                        onSave={(v) => updateField("latePenaltyText", v)}
                        isEditing={isEditing}
                      />
                    </td>
                  </tr>

                  <tr>
                    <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: 700 }}>
                      Collateral Security
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #000000", padding: "3px 6px" }}>
                      <EditableField
                        value={enContent.collateralText}
                        onSave={(v) => updateField("collateralText", v)}
                        isEditing={isEditing}
                        as="div"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Standard Commercial Banking Articles */}
              <div style={{ display: "grid", gap: 3, fontSize: "8.8px", lineHeight: 1.34, textAlign: "justify", marginBottom: 7 }}>
                <div>
                  <EditableField
                    value={enContent.article1Title}
                    onSave={(v) => updateField("article1Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article1Body}
                    onSave={(v) => updateField("article1Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={enContent.article2Title}
                    onSave={(v) => updateField("article2Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article2Body}
                    onSave={(v) => updateField("article2Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={enContent.article3Title}
                    onSave={(v) => updateField("article3Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article3Body}
                    onSave={(v) => updateField("article3Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={enContent.article4Title}
                    onSave={(v) => updateField("article4Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article4Body}
                    onSave={(v) => updateField("article4Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={enContent.article5Title}
                    onSave={(v) => updateField("article5Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article5Body}
                    onSave={(v) => updateField("article5Body", v)}
                    isEditing={isEditing}
                  />
                </div>

                <div>
                  <EditableField
                    value={enContent.article6Title}
                    onSave={(v) => updateField("article6Title", v)}
                    isEditing={isEditing}
                    style={{ fontWeight: 800 }}
                  />{" "}
                  <EditableField
                    value={enContent.article6Body}
                    onSave={(v) => updateField("article6Body", v)}
                    isEditing={isEditing}
                  />
                </div>
              </div>

              {/* Signatures & Seals (3 Columns Matching Word Style) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  borderTop: "1.5px solid #000000",
                  paddingTop: 5,
                }}
              >
                {/* Borrower Thumbprint */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerBorrowerTitle}
                      onSave={(v) => updateField("signerBorrowerTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 48,
                      border: "1px dashed #475569",
                      borderRadius: "3px",
                      margin: "3px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    Right Thumbprint
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerBorrowerName}
                      onSave={(v) => updateField("signerBorrowerName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={enContent.signerBorrowerNote}
                      onSave={(v) => updateField("signerBorrowerNote", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>

                {/* Guarantor / Witness */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerGuarantorTitle}
                      onSave={(v) => updateField("signerGuarantorTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 44,
                      height: 48,
                      border: "1px dashed #475569",
                      borderRadius: "3px",
                      margin: "3px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    {loan.guarantor_info?.name ? "Thumbprint" : "Witness"}
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerGuarantorName}
                      onSave={(v) => updateField("signerGuarantorName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={enContent.signerGuarantorNote}
                      onSave={(v) => updateField("signerGuarantorNote", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>

                {/* Lender Stamp & Signature */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerLenderTitle}
                      onSave={(v) => updateField("signerLenderTitle", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>

                  <div
                    style={{
                      width: 50,
                      height: 50,
                      border: "1px dashed #475569",
                      borderRadius: "50%",
                      margin: "2px auto 2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 7.5,
                    }}
                  >
                    Official Seal
                  </div>

                  <div style={{ borderTop: "1px solid #475569", width: "85%", margin: "2px auto 2px" }} />
                  <div style={{ fontSize: 9.2, fontWeight: 800 }}>
                    <EditableField
                      value={enContent.signerLenderName}
                      onSave={(v) => updateField("signerLenderName", v)}
                      isEditing={isEditing}
                      style={{ fontWeight: 800 }}
                    />
                  </div>
                  <div style={{ fontSize: 8, color: "#475569" }}>
                    <EditableField
                      value={enContent.signerLenderSub}
                      onSave={(v) => updateField("signerLenderSub", v)}
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
