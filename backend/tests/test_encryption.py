import pytest
import os
from apps.documents.encryption import encrypt_file, decrypt_file, get_encryption_key


class TestEncryption:
    def test_encrypt_decrypt_roundtrip(self):
        key = os.urandom(32)
        plaintext = b'This is a test document content.'
        encrypted = encrypt_file(plaintext, key)
        assert encrypted != plaintext
        decrypted = decrypt_file(encrypted, key)
        assert decrypted == plaintext

    def test_encrypted_data_is_longer_than_plaintext(self):
        key = os.urandom(32)
        plaintext = b'Short content.'
        encrypted = encrypt_file(plaintext, key)
        # nonce (12) + ciphertext + tag (16)
        assert len(encrypted) > len(plaintext)

    def test_different_encryptions_produce_different_ciphertexts(self):
        key = os.urandom(32)
        plaintext = b'Same plaintext.'
        encrypted1 = encrypt_file(plaintext, key)
        encrypted2 = encrypt_file(plaintext, key)
        # Different nonces should produce different ciphertexts
        assert encrypted1 != encrypted2

    def test_wrong_key_raises_exception(self):
        key1 = os.urandom(32)
        key2 = os.urandom(32)
        plaintext = b'Secret data.'
        encrypted = encrypt_file(plaintext, key1)
        with pytest.raises(Exception):
            decrypt_file(encrypted, key2)

    def test_invalid_key_length_raises_value_error(self):
        with pytest.raises(ValueError, match='32-byte'):
            encrypt_file(b'data', b'short_key')

    def test_get_encryption_key_valid_hex(self):
        hex_key = 'a' * 64
        key = get_encryption_key(hex_key)
        assert len(key) == 32

    def test_get_encryption_key_invalid_length(self):
        with pytest.raises(ValueError):
            get_encryption_key('a' * 62)

    def test_encrypt_empty_file(self):
        key = os.urandom(32)
        plaintext = b''
        encrypted = encrypt_file(plaintext, key)
        decrypted = decrypt_file(encrypted, key)
        assert decrypted == plaintext

    def test_encrypt_large_file(self):
        key = os.urandom(32)
        plaintext = os.urandom(1024 * 1024)  # 1MB
        encrypted = encrypt_file(plaintext, key)
        decrypted = decrypt_file(encrypted, key)
        assert decrypted == plaintext
