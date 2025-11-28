from flask import Flask
from database import init_db

app = Flask(__name__)

@app.route("/")
def home():
    return "Servidor Flask funcionando!"

if __name__ == "__main__":
    init_db()  # cria o banco se não existir
    app.run(debug=True)
