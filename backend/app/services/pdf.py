"""Loan statement / receipt PDF generation.

Deliberately decoupled from SQLAlchemy models: this function takes plain
data (a dict + a list of dicts), not ORM objects, so it stays trivially
testable and reusable (e.g. from a background job) without a DB session.
"""

import io
from decimal import Decimal
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_loan_agreement_pdf(
    tenant_name: str,
    client_name: str,
    client_phone: str | None,
    client_national_id: str | None,
    loan: dict[str, Any],
) -> bytes:
    """Renders a signable loan agreement: parties, terms, boilerplate
    conditions, and signature lines for both sides. This is a starting
    template — have it reviewed by a lawyer qualified in Cambodian
    consumer-finance law before using it with real clients.
    """

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Heading1"], fontSize=16, spaceAfter=4)
    meta_style = ParagraphStyle("MetaStyle", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#6b7076"))
    section_style = ParagraphStyle("SectionStyle", parent=styles["Heading2"], fontSize=12, spaceBefore=16, spaceAfter=6)
    body_style = ParagraphStyle("BodyStyle", parent=styles["Normal"], fontSize=9.5, leading=14)
    clause_style = ParagraphStyle("ClauseStyle", parent=body_style, spaceAfter=8)

    elements: list[Any] = []
    elements.append(Paragraph(tenant_name, title_style))
    elements.append(Paragraph("Loan Agreement", meta_style))
    elements.append(Spacer(1, 10))

    parties_rows = [
        ["Lender", tenant_name],
        ["Borrower", client_name],
        ["Borrower phone", client_phone or "—"],
        ["Borrower national ID", client_national_id or "—"],
        ["Agreement date", str(loan["start_date"])],
    ]
    parties_table = Table(parties_rows, colWidths=[45 * mm, 110 * mm])
    parties_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7076")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(parties_table)

    elements.append(Paragraph("Loan Terms", section_style))
    terms_rows = [
        ["Principal amount", f"{loan['principal_amount']} {loan['principal_currency']}"],
        ["Interest rate", f"{loan['interest_rate_percent']}% per month ({loan['interest_type']})"],
        ["Term", f"{loan['term_months']} months"],
        ["Grace period", f"{loan.get('grace_period_days', '—')} days after each due date"],
        ["Late fee", f"{loan.get('late_fee_percent', '—')}% of the overdue installment"],
    ]
    terms_table = Table(terms_rows, colWidths=[45 * mm, 110 * mm])
    terms_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7076")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e2df")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(terms_table)

    elements.append(Paragraph("Terms and Conditions", section_style))
    clauses = [
        "1. Repayment. The Borrower agrees to repay the Principal amount together with "
        "interest as set out above, in installments according to the schedule provided "
        "separately as the Loan Statement, until the full amount is repaid.",

        "2. Late payment. If any installment is not paid in full within the grace period "
        "stated above, the Lender may apply the late fee stated above to the overdue "
        "installment, and may take further action permitted under applicable law.",

        "3. Early repayment. The Borrower may repay all or part of the outstanding balance "
        "before the end of the term. Any prepayment will be applied to the earliest unpaid "
        "installments first.",

        "4. Default. If the Borrower fails to make payments for an extended period, the "
        "Lender may declare the loan in default and pursue recovery of the outstanding "
        "balance, including any collateral pledged under a separate security agreement, "
        "to the extent permitted by law.",

        "5. Currency. Amounts stated in this agreement are in the currency shown above. "
        "Where a payment is made in a different currency, it will be converted at the "
        "Lender's posted exchange rate on the date of payment.",

        "6. Governing law. This agreement is governed by the laws of the Kingdom of "
        "Cambodia. This document is a template and should be reviewed by qualified legal "
        "counsel before use.",
    ]
    for clause in clauses:
        elements.append(Paragraph(clause, clause_style))

    elements.append(Spacer(1, 28))
    elements.append(Paragraph("Signatures", section_style))

    sig_rows = [
        ["Borrower signature:", "_______________________________", "Date:", "____________"],
        ["", "", "", ""],
        ["Lender representative signature:", "_______________________________", "Date:", "____________"],
    ]
    sig_table = Table(sig_rows, colWidths=[55 * mm, 55 * mm, 15 * mm, 30 * mm])
    sig_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ]))
    elements.append(sig_table)

    doc.build(elements)
    return buffer.getvalue()


def generate_loan_statement_pdf(
    tenant_name: str,
    client_name: str,
    loan: dict[str, Any],
    installments: list[dict[str, Any]],
) -> bytes:
    """Renders a one-page loan statement. `loan` and each item in
    `installments` are plain dicts matching the shape documented below.

    loan = {
        "id": str, "principal_amount": Decimal, "principal_currency": str,
        "interest_rate_percent": Decimal, "interest_type": str,
        "term_months": int, "start_date": str, "status": str,
    }
    installments[i] = {
        "installment_number": int, "due_date": str, "amount_due": Decimal,
        "amount_paid": Decimal, "status": str,
    }
    """

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleStyle", parent=styles["Heading1"], fontSize=16, spaceAfter=4)
    meta_style = ParagraphStyle("MetaStyle", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#6b7076"))
    section_style = ParagraphStyle("SectionStyle", parent=styles["Heading2"], fontSize=12, spaceBefore=14, spaceAfter=6)

    elements = []
    elements.append(Paragraph(tenant_name, title_style))
    elements.append(Paragraph("Loan Statement", meta_style))
    elements.append(Spacer(1, 10))

    summary_rows = [
        ["Client", client_name],
        ["Loan ID", str(loan["id"])],
        ["Principal", f"{loan['principal_amount']} {loan['principal_currency']}"],
        ["Interest rate", f"{loan['interest_rate_percent']}% / month ({loan['interest_type']})"],
        ["Term", f"{loan['term_months']} months"],
        ["Start date", str(loan["start_date"])],
        ["Status", str(loan["status"]).replace("_", " ").title()],
    ]
    summary_table = Table(summary_rows, colWidths=[45 * mm, 110 * mm])
    summary_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7076")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(summary_table)

    elements.append(Paragraph("Installment Schedule", section_style))

    header = ["#", "Due Date", "Amount Due", "Amount Paid", "Status"]
    rows = [header]
    total_due = Decimal("0")
    total_paid = Decimal("0")
    for inst in installments:
        rows.append([
            str(inst["installment_number"]),
            str(inst["due_date"]),
            str(inst["amount_due"]),
            str(inst["amount_paid"]),
            str(inst["status"]).title(),
        ])
        total_due += Decimal(str(inst["amount_due"]))
        total_paid += Decimal(str(inst["amount_paid"]))
    rows.append(["", "Total", str(total_due), str(total_paid), ""])

    table = Table(rows, colWidths=[12 * mm, 32 * mm, 35 * mm, 35 * mm, 41 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f6f6f4")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e2df")),
        ("ALIGN", (2, 0), (3, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)

    doc.build(elements)
    return buffer.getvalue()
