import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


NONCE_SIZE = 12  # 96-bit nonce for AES-GCM


def encrypt_file(file_data: bytes, key: bytes) -> bytes:
    """
    Encrypt file data using AES-256-GCM.

    The output format is: nonce (12 bytes) || ciphertext+tag.
    The AESGCM cipher appends the 16-byte authentication tag to the ciphertext
    automatically, so the result is: nonce || ciphertext || tag.

    Args:
        file_data: Raw bytes of the file to encrypt.
        key: 32-byte AES key.

    Returns:
        Encrypted bytes with nonce prepended.
    """
    if len(key) != 32:
        raise ValueError('AES-256 requires a 32-byte key.')

    nonce = os.urandom(NONCE_SIZE)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, file_data, None)
    return nonce + ciphertext


def decrypt_file(encrypted_data: bytes, key: bytes) -> bytes:
    """
    Decrypt file data encrypted with AES-256-GCM.

    Expects the input format: nonce (12 bytes) || ciphertext+tag.

    Args:
        encrypted_data: Encrypted bytes with nonce prepended.
        key: 32-byte AES key.

    Returns:
        Decrypted plaintext bytes.

    Raises:
        cryptography.exceptions.InvalidTag: If authentication fails (data tampered).
    """
    if len(key) != 32:
        raise ValueError('AES-256 requires a 32-byte key.')

    if len(encrypted_data) < NONCE_SIZE:
        raise ValueError('Encrypted data is too short to contain a valid nonce.')

    nonce = encrypted_data[:NONCE_SIZE]
    ciphertext = encrypted_data[NONCE_SIZE:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)


def get_encryption_key(hex_key: str) -> bytes:
    """
    Convert a hex-encoded string to a 32-byte key.

    Args:
        hex_key: 64-character hex string representing a 32-byte key.

    Returns:
        32-byte key as bytes.
    """
    key = bytes.fromhex(hex_key)
    if len(key) != 32:
        raise ValueError('Hex key must decode to exactly 32 bytes (64 hex characters).')
    return key
