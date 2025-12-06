from flask_socketio import emit, send
from flask_socketio import join_room, leave_room
from flask import request
from app import socketio

# Evento: quando um cliente conecta
@socketio.on("connect")
def on_connect():
    print("Cliente conectado:", request.sid)
    emit("connected", {"message": "Bem-vindo!"})

# Evento: quando o cliente desconecta
@socketio.on("disconnect")
def on_disconnect():
    print("Cliente saiu:", request.sid)
    
@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    emit(username + ' has entered the room.', to=room)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    emit(username + ' has left the room.', to=room)

# Evento: quando um cliente envia uma mensagem
@socketio.on("mensagem")
def on_mensagem(data):
    destino = data["to"]
    emit("mensagem", data, to=destino)
