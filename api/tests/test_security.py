from app.security import normalize_phone, validate_national_id


def test_normalize_iranian_phone_digits() -> None:
    assert normalize_phone("۰۹۱۲ ۰۰۰ ۰۰۰۰") == "+989120000000"
    assert normalize_phone("+98 912 000 0000") == "+989120000000"


def test_national_id_checksum() -> None:
    assert validate_national_id("1000000001") is True
    assert validate_national_id("1111111111") is False
    assert validate_national_id("1000000002") is False
