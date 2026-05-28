import sqlite3
conn = sqlite3.connect(r'd:\python脚本\平板做题软件\electron-vue-app\src\renderer\public\questions.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print([t[0] for t in cursor.fetchall()])
conn.close()
