from flask_socketio import emit, join_room, leave_room, rooms
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


# rooms_messages["room_1_5"] = [(1, "Oi"), (5, "Olá"), ...]
rooms_messages = {}

def build_room_name(id1, id2):
    return f"room_{min(id1, id2)}_{max(id1, id2)}"

@socketio.on("connect")
def on_connect():
    print("Cliente conectado:", request.sid)
    emit("connected", {"message": "Bem-vindo!"})

@socketio.on("disconnect")
def on_disconnect():
    print("Cliente saiu:", request.sid)

@socketio.on("join")
def join_room_event(data):
    user1_id = int(data["user1_id"])
    user2_id = int(data["user2_id"])

    room = build_room_name(user1_id, user2_id)

    # Cria o histórico se não existir
    if room not in rooms_messages:
        rooms_messages[room] = []

    join_room(room)

    print(f"Usuário {user1_id} entrou na sala {room}")

    # Enviar histórico existente para o usuário que acabou de entrar
    emit("load_history", rooms_messages[room])

    # Notifica todos na sala
    emit("user_joined", {"room": room, "user_id": user1_id}, room=room)

@socketio.on("leave")
def on_leave(data):
    user_id = data["user_id"]
    other_id = data["other_id"]

    room = build_room_name(user_id, other_id)

    leave_room(room)
    print(f"Usuário {user_id} saiu da sala {room}")

    emit("user_left", {"room": room, "user_id": user_id}, room=room)

    # Checa se a sala está vazia
    # rooms(sid) não ajuda pois não há SID aqui
    # Usamos socketio.server.manager.rooms
    room_members = socketio.server.manager.rooms["/"].get(room, set())

    if len(room_members) == 0:
        print(f"Sala {room} vazia → apagando histórico.")
        if room in rooms_messages:
            del rooms_messages[room]

@socketio.on("send_message")
def send_message(data):
    sender = int(data["sender_id"])
    receiver = int(data["receiver_id"])
    msg = data["message"]

    room = build_room_name(sender, receiver)

    # Salvar mensagem na memória efêmera
    if room not in rooms_messages:
        rooms_messages[room] = []

    rooms_messages[room].append((sender, msg))

    print(f"[{room}] {sender}: {msg}")

    # Emitir a mensagem para os usuários da sala
    emit(
        "receive_message",
        {"sender": sender, "message": msg},
        room=room
    )
