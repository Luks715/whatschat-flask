import os
import ipaddress
import platform
from datetime import datetime, timedelta, timezone
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12

# configurações
certs_dir = "certs"
key_size = 2048
validity_days = 365

def save_key(key, filename):
    path = os.path.join(certs_dir, filename)
    with open(path, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    print(f"[ok] chave salva: {path}")

def save_cert(cert, filename):
    path = os.path.join(certs_dir, filename)
    with open(path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print(f"[ok] certificado salvo: {path}")

def generate_ca():
    """gera a autoridade certificadora (ca) raiz"""
    print("--- gerando autoridade certificadora (ca) ---")
    key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"br"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"unb - trabalho seguranca"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"whatschat root ca"),
    ])
    
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.now(timezone.utc)
    ).not_valid_after(
        datetime.now(timezone.utc) + timedelta(days=validity_days)
    ).add_extension(
        x509.BasicConstraints(ca=True, path_length=None), critical=True,
    ).sign(key, hashes.SHA256())
    
    save_key(key, "ca-key.pem")
    save_cert(cert, "ca-cert.pem")
    return key, cert

def generate_client_cert(ca_key, ca_cert):
    """gera o certificado do cliente assinado pela ca"""
    print("\n--- gerando certificado do cliente ---")
    key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"br"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"unb"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"client"),
    ])

    san = x509.SubjectAlternativeName([
        x509.DNSName(u"localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        x509.IPAddress(ipaddress.ip_address("0.0.0.0"))
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        ca_cert.subject
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.now(timezone.utc)
    ).not_valid_after(
        datetime.now(timezone.utc) + timedelta(days=validity_days)
    ).add_extension(
        san, critical=False
    ).sign(ca_key, hashes.SHA256())
    
    save_key(key, "client-key.pem")
    save_cert(cert, "client-cert.pem")
    return key, cert

def generate_server_cert(ca_key, ca_cert):
    """gera o certificado do servidor assinado pela ca"""
    print("\n--- gerando certificado do servidor (localhost) ---")
    key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    
    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, u"br"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"unb"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"server"),
    ])
    
    san = x509.SubjectAlternativeName([
        x509.DNSName(u"localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        x509.IPAddress(ipaddress.ip_address("0.0.0.0"))
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        ca_cert.subject
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.now(timezone.utc)
    ).not_valid_after(
        datetime.now(timezone.utc) + timedelta(days=validity_days)
    ).add_extension(
        san, critical=False
    ).sign(ca_key, hashes.SHA256())
    
    save_key(key, "server-key.pem")
    save_cert(cert, "server-cert.pem")

def generate_pkcs12(client_key, client_cert, ca_cert):
    """gera um arquivo .p12 (PKCS#12) para importar no Windows"""
    print("\n--- gerando arquivo PKCS#12 (.p12) para Windows ---")
    
    # Cria o arquivo PKCS#12
    p12_data = pkcs12.serialize_key_and_certificates(
        name=b"whatschat-client",
        key=client_key,
        cert=client_cert,
        cas=[ca_cert],
        encryption_algorithm=serialization.BestAvailableEncryption(b"password"),
    )
    
    path = os.path.join(certs_dir, "client.p12")
    with open(path, "wb") as f:
        f.write(p12_data)
    print(f"[ok] arquivo PKCS#12 salvo: {path}")
    print("    Senha: password")

if __name__ == "__main__":
    if not os.path.exists(certs_dir):
        os.makedirs(certs_dir)
    
    # 1. gera a ca
    ca_key, ca_cert = generate_ca()
    
    # 2. gera o certificado do servidor usando a ca
    generate_server_cert(ca_key, ca_cert)
    
    # 3. gera o certificado do cliente usando a ca
    client_key, client_cert = generate_client_cert(ca_key, ca_cert)
    
    # 4. gera o arquivo .p12 para Windows (apenas no Windows)
    if platform.system() == "Windows":
        generate_pkcs12(client_key, client_cert, ca_cert)
    
    print("\n✓ Certificados gerados na pasta \"certs/\"!")
    print("  - CA: ca-cert.pem, ca-key.pem")
    print("  - Servidor: server-cert.pem, server-key.pem")
    print("  - Cliente: client-cert.pem, client-key.pem")
    if platform.system() == "Windows":
        print("  - Windows: client.p12 (importar no navegador)")
