import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'out', 'data', 'qingrui.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'")
print(cursor.fetchone()[0])

conn.close()
