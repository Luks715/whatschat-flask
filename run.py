from app import create_app, db, socketio

app = create_app()

# utilizacao de certificado autoassinado para HTTPS (desenvolvimento) e impedir 
# captura de tráfego plain text
ssl_context = ('assets/certs_example/server.crt', 'assets/certs_example/server.key')

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    socketio.run(app, debug=True, ssl_context=ssl_context, host='localhost', port=5000)
