from flask import Blueprint, jsonify
from app import db
from app.models.user import User
from app.routes.default import get_token_from_request, is_token_valid

users = Blueprint("users", __name__)

@users.route('/allusers', methods=['GET'])
def all_users():
    token = get_token_from_request()
    if is_token_valid(token):
        # SELECT * FROM users
        users = User.query.all()

        # transformar em JSON
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "username": u.username
            })
        return jsonify(result)
    else:
        return jsonify({"message": "Unauthorized"}), 401
