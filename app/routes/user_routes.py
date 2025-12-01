from flask import Blueprint, jsonify
from app import db
from app.models.user import User

users = Blueprint("users", __name__)

@users.route('/allUsers', methods=['GET'])
def all_users():
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
