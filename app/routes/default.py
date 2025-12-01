from flask import Blueprint, render_template, request, redirect, url_for, current_app
from app import db
from app.models.user import User
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError

default_bp = Blueprint("default", __name__)

def get_token_from_request():
    # conforme definido em auth_routes.py
    token = request.cookies.get("token")
    if token:
        return token
    return None

def is_token_valid(token):
    if not token:
        return False
    secret = current_app.config.get("SECRET_KEY")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return True
    except ExpiredSignatureError:
        return False
    except InvalidTokenError:
        return False

@default_bp.route('/', methods=['GET'])
def default():
    token = get_token_from_request()
    if not is_token_valid(token):
        return redirect(url_for('auth.login_get'))
    else:
        return redirect(url_for('users.all_users'))
