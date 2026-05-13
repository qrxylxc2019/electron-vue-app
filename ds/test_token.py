from ds import DeepSeekChat
import json

TOKEN = 'vudA7MkMfED1EKfTHoMs9Dlby6/P0DK2kTCeAsg03bxlbvlQTMNs1BtnutKsseiC'

chat = DeepSeekChat(TOKEN)
print('Token valid:', chat.check_token_status())

# 测试 PoW
import requests
resp = requests.post(
    'https://chat.deepseek.com/api/v0/chat/create_pow_challenge',
    headers=chat.get_auth_headers(),
    json={'target_path': '/api/v0/chat/completion'},
    timeout=30
)
print('PoW status:', resp.status_code)
data = resp.json()
print('PoW response:', json.dumps(data, ensure_ascii=False, indent=2))
