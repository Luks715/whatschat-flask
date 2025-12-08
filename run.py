from app import create_app, db, socketio
from pyngrok import ngrok, conf, exception

app = create_app()

# SSL opcional para desenvolvimento
ssl_context = ('assets/certs_example/server.crt', 'assets/certs_example/server.key')

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    # Porta local do Flask
    port = 5000

    public_url = None

    # Tenta criar ou usar um túnel ngrok
    try:
        # Configurar ngrok
        conf.get_default().region = "us"  # ou "ap" para Ásia, "eu" para Europa, etc.

        # Verifica túneis existentes
        tunnels = ngrok.get_tunnels()
        if tunnels:
            public_url = tunnels[0].public_url
        else:
            public_url = ngrok.connect(port, bind_tls=True).public_url

        print(f"Acesse o app pelo link público: {public_url}")

    except exception.PyngrokNgrokError as e:
        print(f"Erro ao iniciar ngrok: {e}")
        print("Você pode abrir manualmente com: ngrok http 5000")

    # Executa o Flask + SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=port)
