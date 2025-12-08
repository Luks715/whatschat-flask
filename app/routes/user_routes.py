from flask import Blueprint, jsonify, render_template, request
from app import db
from app.models.user import User
from app.routes.default import get_token_from_request, is_token_valid

users = Blueprint("users", __name__)

@users.route('/home', methods=['GET'])
def home():
    return render_template('home.html')

@users.route('/allusers', methods=['GET'])
def all_users():
    token = get_token_from_request()
    if is_token_valid(token):

        # buscar somente usuários online
        online_users = User.query.filter_by(isOnline=True).all()

        # transformar em JSON
        result = []
        for u in online_users:
            result.append({
                "id": u.id,
                "username": u.username,
                "isOnline": bool(u.isOnline)
            })

        return jsonify(result)

    else:
        return jsonify({"message": "Unauthorized"}), 401

@users.route('/chat', methods=['GET'])
def chat_page():
    # 1. Validar token
    token = get_token_from_request()
    payload = is_token_valid(token)
    if not payload:
        return jsonify({"message": "Unauthorized"}), 401
    
    # is_token_valid() retorna o payload se for válido
    my_id = payload.get("user_id")
    me = User.query.get(my_id)

    if not me:
        return jsonify({"message": "Usuário não encontrado"}), 404

    # 3. Pegar ID do outro usuário pela query string
    other_id = request.args.get("user")
    if not other_id:
        return jsonify({"message": "ID do usuário não informado"}), 400

    other_user = User.query.filter_by(id=other_id).first()
    if not other_user:
        return jsonify({"message": "Usuário destino não existe"}), 404

    # 4. Renderizar o chat
    return render_template(
        "chat.html",
        my_id=me.id,
        my_username=me.username,
        other_id=other_user.id,
        other_username=other_user.username
    )

@users.route('/me', methods=['GET'])
def users_me():
    token = request.cookies.get("token")
    if not token:
        return jsonify({"error": "Not authenticated"}), 401

    data = is_token_valid(token)  # sua função que faz jwt.decode e retorna o payload
    if not data:
        return jsonify({"error": "Invalid token"}), 401

    user_id = data.get("user_id")
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username
    })