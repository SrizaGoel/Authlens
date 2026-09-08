import sqlite3
DB_NAME = "database/nhai.db"
def get_connection():
    return sqlite3.connect(DB_NAME)
def create_tables():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS embeddings(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        embedding TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        confidence REAL,
        result TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY(user_id)
        REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()

    print("Database Ready")

def add_user(name):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users(name) VALUES(?)",
        (name,)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return user_id

def save_embedding(user_id, embedding):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO embeddings(user_id, embedding)
        VALUES(?,?)
        """,
        (user_id, embedding)
    )

    conn.commit()
    conn.close()

def get_all_embeddings():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        users.id,
        users.name,
        embeddings.embedding
    FROM users
    JOIN embeddings
    ON users.id = embeddings.user_id
    """)
    rows = cursor.fetchall()
    conn.close()

    return rows

def save_log(
    user_id,
    confidence,
    result
):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO logs(
            user_id,
            confidence,
            result
        )
        VALUES(?,?,?)
        """,
        (
            user_id,
            confidence,
            result
        )
    )

    conn.commit()
    conn.close()

def user_exists(name):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE LOWER(name) = LOWER(?)
        """,
        (name,)
    )

    user = cursor.fetchone()

    conn.close()

    return user is not None

def get_user_by_name(name):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM users
        WHERE LOWER(name) = LOWER(?)
        """,
        (name,)
    )

    user = cursor.fetchone()

    conn.close()

    return user[0] if user else None


def get_user_embeddings(user_id):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT embedding
        FROM embeddings
        WHERE user_id = ?
        """,
        (user_id,)
    )

    rows = cursor.fetchall()

    conn.close()

    return rows
def embedding_count(user_id):

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM embeddings
        WHERE user_id = ?
        """,
        (user_id,)
    )

    count = cursor.fetchone()[0]

    conn.close()

    return count

def get_logs():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT
        logs.id,
        users.name,
        logs.confidence,
        logs.result,
        logs.timestamp

    FROM logs

    LEFT JOIN users

    ON logs.user_id = users.id

    ORDER BY logs.timestamp DESC
    """)

    rows = cursor.fetchall()

    conn.close()

    return rows
def get_users():

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT id, name
    FROM users
    """)

    rows = cursor.fetchall()

    conn.close()

    return rows
if __name__ == "__main__":
    create_tables()