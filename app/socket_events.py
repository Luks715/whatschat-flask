from flask_socketio import emit
from flask import request
from app import socketio

# Evento: quando um cliente conecta
@socketio.on("connect")
def on_connect():
    print("Cliente conectado:", request.sid)
    emit("connected", {"message": "Bem-vindo!"})

# Evento: quando um cliente envia uma mensagem
@socketio.on("mensagem")
def on_mensagem(data):
    destino = data["to"]
    emit("mensagem", data, to=destino)

# Evento: quando o cliente desconecta
@socketio.on("disconnect")
def on_disconnect():
    print("Cliente saiu:", request.sid)
