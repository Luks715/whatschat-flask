from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

auth = Blueprint("auth", __name__)

@auth.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data["username"]
    password = data["password"]

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    user = User(username=username, password=hashed)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "user created"})

@auth.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data["username"]
    password = data["password"]

    user = User.query.filter_by(username=username).first()

    if not user:
        return jsonify({"message": "Usuário não encontrado"}), 404

    if not bcrypt.checkpw(password.encode(), user.password):
        return jsonify({"message": "Senha incorreta"}), 401

    token = jwt.encode(
        {
            "username": user.username,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1)
        },
        "chave_secreta",
        algorithm="HS256"
    )

    return jsonify({"token": token})