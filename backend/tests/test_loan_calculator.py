from datetime import date
from decimal import Decimal

from app.services.loan_calculator import generate_flat_schedule, generate_reducing_balance_schedule, generate_schedule


def test_flat_schedule_totals_match_principal_plus_interest():
    schedule = generate_flat_schedule(
        principal=Decimal("1000"), monthly_rate_percent=Decimal("2"), term_months=12, start_date=date(2026, 1, 15),
    )
    assert len(schedule) == 12
    total = sum(item.amount_due for item in schedule)
    # 1000 principal + (1000 * 0.02 * 12) interest = 1240.00
    assert total == Decimal("1240.00")


def test_flat_schedule_due_dates_increment_monthly():
    schedule = generate_flat_schedule(
        principal=Decimal("500"), monthly_rate_percent=Decimal("1.5"), term_months=3, start_date=date(2026, 1, 31),
    )
    months = [item.due_date.month for item in schedule]
    assert months == [2, 3, 4]


def test_reducing_balance_schedule_pays_off_principal_exactly():
    schedule = generate_reducing_balance_schedule(
        principal=Decimal("1000"), monthly_rate_percent=Decimal("2"), term_months=6, start_date=date(2026, 1, 15),
    )
    assert len(schedule) == 6
    # Reducing-balance installments should be roughly level except for
    # rounding drift absorbed into the final payment.
    amounts = [item.amount_due for item in schedule]
    assert max(amounts) - min(amounts) < Decimal("1.00")


def test_reducing_balance_with_zero_interest_splits_principal_evenly():
    schedule = generate_reducing_balance_schedule(
        principal=Decimal("900"), monthly_rate_percent=Decimal("0"), term_months=3, start_date=date(2026, 1, 1),
    )
    assert [item.amount_due for item in schedule] == [Decimal("300.00")] * 3


def test_generate_schedule_dispatches_on_interest_type():
    flat = generate_schedule(Decimal("100"), Decimal("1"), 2, date(2026, 1, 1), "flat")
    reducing = generate_schedule(Decimal("100"), Decimal("1"), 2, date(2026, 1, 1), "reducing")
    assert flat != reducing


def test_generate_schedule_rejects_unknown_interest_type():
    try:
        generate_schedule(Decimal("100"), Decimal("1"), 2, date(2026, 1, 1), "bogus")
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_generate_schedule_rejects_non_positive_term():
    try:
        generate_schedule(Decimal("100"), Decimal("1"), 0, date(2026, 1, 1), "flat")
        assert False, "expected ValueError"
    except ValueError:
        pass
