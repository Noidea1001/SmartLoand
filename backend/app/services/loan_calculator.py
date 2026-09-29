"""Pure, dependency-free loan math: no DB session, no FastAPI imports.
This keeps it trivially unit-testable (see tests/test_loan_calculator.py).

Convention: `interest_rate_percent` is a MONTHLY rate, matching common
microfinance practice in Cambodia (e.g. "2% per month"), for both
flat and reducing-balance loans.
"""

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal


def _round(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class ScheduledInstallment:
    installment_number: int
    due_date: date
    amount_due: Decimal


def _add_months(start: date, months: int) -> date:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, 28)  # avoid month-length edge cases (Feb, etc.)
    return date(year, month, day)


def generate_flat_schedule(
    principal: Decimal, monthly_rate_percent: Decimal, term_months: int, start_date: date
) -> list[ScheduledInstallment]:
    """Flat rate: interest is charged on the full original principal for
    every month of the term, regardless of the declining balance."""

    monthly_rate = monthly_rate_percent / Decimal(100)
    total_interest = principal * monthly_rate * term_months
    total_payable = principal + total_interest
    base_installment = _round(total_payable / term_months)

    schedule = []
    running_total = Decimal("0.00")
    for i in range(1, term_months + 1):
        due = _add_months(start_date, i)
        # Put any rounding remainder on the final installment.
        if i == term_months:
            amount = _round(total_payable - running_total)
        else:
            amount = base_installment
            running_total += amount
        schedule.append(ScheduledInstallment(installment_number=i, due_date=due, amount_due=amount))
    return schedule


def generate_reducing_balance_schedule(
    principal: Decimal, monthly_rate_percent: Decimal, term_months: int, start_date: date
) -> list[ScheduledInstallment]:
    """Reducing balance: interest each month is charged only on the
    outstanding balance, producing a standard amortized payment."""

    monthly_rate = monthly_rate_percent / Decimal(100)

    if monthly_rate == 0:
        level_payment = _round(principal / term_months)
    else:
        factor = (1 + monthly_rate) ** term_months
        level_payment = _round(principal * monthly_rate * factor / (factor - 1))

    schedule = []
    balance = principal
    for i in range(1, term_months + 1):
        due = _add_months(start_date, i)
        interest_component = _round(balance * monthly_rate)
        if i == term_months:
            # Final installment clears whatever balance + interest remains,
            # absorbing rounding drift instead of leaving a residual balance.
            amount = _round(balance + interest_component)
        else:
            amount = level_payment
        principal_component = amount - interest_component
        balance = balance - principal_component
        schedule.append(ScheduledInstallment(installment_number=i, due_date=due, amount_due=amount))
    return schedule


def generate_schedule(
    principal: Decimal,
    monthly_rate_percent: Decimal,
    term_months: int,
    start_date: date,
    interest_type: str,
) -> list[ScheduledInstallment]:
    if term_months <= 0:
        raise ValueError("term_months must be positive")
    if interest_type == "flat":
        return generate_flat_schedule(principal, monthly_rate_percent, term_months, start_date)
    if interest_type == "reducing":
        return generate_reducing_balance_schedule(principal, monthly_rate_percent, term_months, start_date)
    raise ValueError(f"Unknown interest_type: {interest_type!r}")
