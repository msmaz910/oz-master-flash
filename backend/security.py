import hashlib
import hmac
import secrets

PBKDF2_ITERATIONS = 260_000

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    )
    return f"{PBKDF2_ITERATIONS}${salt}${digest.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        iterations_str, salt, digest_hex = stored.split("$")
        iterations = int(iterations_str)
    except (ValueError, AttributeError):
        return False
    computed = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations
    )
    return hmac.compare_digest(computed.hex(), digest_hex)

def generate_token() -> str:
    return secrets.token_urlsafe(32)
