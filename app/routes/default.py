from flask import Blueprint, render_template
from app import db
from app.models.user import User

default_bp = Blueprint("default", __name__)

@default_bp.route('/', methods=['GET'])
def default():
    return render_template('base.html')
