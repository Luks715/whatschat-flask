from flask_socketio import emit, join_room, leave_room, rooms
from flask import request
from app import socketio

active_users_in_room = {}

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
    user1_id = int(data["user1_id"])   # quem está entrando
    user2_id = int(data["user2_id"])   # interlocutor

    room = build_room_name(user1_id, user2_id)

    # Cria histórico da sala se não existir
    if room not in rooms_messages:
        rooms_messages[room] = []

    # Garante que exista o registro de usuários ativos
    if room not in active_users_in_room:
        active_users_in_room[room] = set()

    # Entra na sala
    join_room(room)
    active_users_in_room[room].add(user1_id)

    print(f"Usuário {user1_id} entrou na sala {room}")

    # Só quando AMBOS estiverem na sala enviamos load_history
    if active_users_in_room[room] == {user1_id, user2_id} or \
       active_users_in_room[room] == {user2_id, user1_id}:

        print(f"Ambos os usuários estão presentes em {room}. Enviando load_history.")
        emit("load_history", rooms_messages.get(room, []), room=room)


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
    sender = int(data["sender"])
    receiver = int(data["receiver"])

    ciphertext = data["ciphertext"]  # mensagem criptografada pela chave do DH
    iv = data["iv"]                  # Initialization Vector
    mac = data["mac"]                # HMAC da mensagem

    room = build_room_name(sender, receiver)

    # Salvar mensagem na memória efêmera
    if room not in rooms_messages:
        rooms_messages[room] = []

    rooms_messages[room].append((sender, ciphertext))

    print(f"[{room}] (encrypted) {sender}: {ciphertext}")

    # Emitir a mensagem para os usuários da sala
    emit(
        "receive_message",
        {
            "sender": sender,
            "ciphertext": ciphertext,
            "iv": iv,
            "mac": mac
        },
        room=room
    )

#========== EVENTO PARA CONFIDENCIALIDADE E INTEGRIDADE DAS MENSAGENS ==================

@socketio.on("send_dh_public_key")
def send_dh_public_key(data):
    sender = int(data["sender"])
    receiver = int(data["receiver"])
    dh_public_key = data["dh_public_key"]

    room = build_room_name(sender, receiver)

    emit(
        "receive_dh_public_key", 
        {   
            "sender": sender,
            "dh_public_key": dh_public_key,
        },
        room=room,
        include_self=False
    )