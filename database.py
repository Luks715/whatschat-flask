import sqlite3
from pathlib import Path

DB_NAME = "chat_seguro.db"

def get_connection():
    return sqlite3.connect(DB_NAME)

def init_db():
    db_path = Path(DB_NAME)
    
    # se o banco já existir, não recria
    if db_path.exists():
        return

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
    """)

    conn.commit()
    conn.close()
    print("Banco de dados criado com sucesso!")
