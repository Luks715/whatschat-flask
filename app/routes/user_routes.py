from flask import Blueprint, jsonify, render_template
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

