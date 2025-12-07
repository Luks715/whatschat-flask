import ssl
import os

CERTS_DIR = "certs"

def get_server_ssl_context():
    """Configura o contexto para o Servidor (exige certificado do cliente)"""
    # Contexto para o servidor autenticar o cliente
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    
    # Certificado do servidor e sua chave privada
    context.load_cert_chain(
        certfile=os.path.join(CERTS_DIR, "server-cert.pem"), 
        keyfile=os.path.join(CERTS_DIR, "server-key.pem")
    )
    
    # Carrega a CA para verificar os certificados dos clientes
    context.load_verify_locations(cafile=os.path.join(CERTS_DIR, "ca-cert.pem"))
    
    # mTLS 
    context.verify_mode = ssl.CERT_REQUIRED
    
    return context

def get_client_ssl_context():
    """Configura o contexto para o Cliente (apresenta certificado ao servidor)"""
    # Contexto para o cliente verificar o servidor
    context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
    
    # Certificado do cliente e sua chave privada
    context.load_cert_chain(
        certfile=os.path.join(CERTS_DIR, "client-cert.pem"), 
        keyfile=os.path.join(CERTS_DIR, "client-key.pem")
    )
    
    # CA para validar o servidor
    context.load_verify_locations(cafile=os.path.join(CERTS_DIR, "ca-cert.pem"))
    
    return context