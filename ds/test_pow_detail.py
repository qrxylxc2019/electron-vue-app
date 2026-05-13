from ds import DeepSeekChat
import json
import base64

TOKEN = 'vudA7MkMfED1EKfTHoMs9Dlby6/P0DK2kTCeAsg03bxlbvlQTMNs1BtnutKsseiC'

chat = DeepSeekChat(TOKEN)

# 获取 PoW 挑战
import requests
resp = requests.post(
    'https://chat.deepseek.com/api/v0/chat/create_pow_challenge',
    headers=chat.get_auth_headers(),
    json={'target_path': '/api/v0/chat/completion'},
    timeout=30
)
data = resp.json()
challenge = data['data']['biz_data']['challenge']

# 计算答案
answer = chat.compute_pow_answer(
    challenge['algorithm'],
    challenge['challenge'],
    challenge['salt'],
    challenge['difficulty'],
    challenge['expire_at']
)
print('Answer:', answer)

# 构建 pow_dict (和 ds.py 完全一致)
pow_dict = {
    'algorithm': challenge['algorithm'],
    'challenge': challenge['challenge'],
    'salt': challenge['salt'],
    'answer': answer,
    'signature': challenge['signature'],
    'target_path': challenge['target_path'],
}

# Python 的 json.dumps
pow_str = json.dumps(pow_dict, separators=(',', ':'), ensure_ascii=False)
print('Python pow_str:', pow_str)
print('Python encoded:', base64.b64encode(pow_str.encode('utf-8')).decode('utf-8'))

# 模拟 JS 的 JSON.stringify(powDict, Object.keys(powDict).sort())
# 这会按字母顺序排列 key
sorted_keys = sorted(pow_dict.keys())
js_ordered_dict = {k: pow_dict[k] for k in sorted_keys}
js_pow_str = json.dumps(js_ordered_dict, separators=(',', ':'), ensure_ascii=False)
print('JS-style pow_str:', js_pow_str)
print('JS-style encoded:', base64.b64encode(js_pow_str.encode('utf-8')).decode('utf-8'))
