from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    app = Flask(__name__)

    # Configurações
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SECRET_KEY"] = "chave_secreta"

    # Inicializar extensões
    db.init_app(app)
    socketio.init_app(app)

    # Registrar rotas (blueprints)
    from app.routes.auth_routes import auth
    from app.routes.user_routes import users
    app.register_blueprint(auth, url_prefix="/auth")
    app.register_blueprint(users, url_prefix="/users")

    # Registrar eventos do Socket.IO
    from app import socket_events  # noqa: F401

    return app
