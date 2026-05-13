from ds import DeepSeekChat
import json

TOKEN = 'vudA7MkMfED1EKfTHoMs9Dlby6/P0DK2kTCeAsg03bxlbvlQTMNs1BtnutKsseiC'

chat = DeepSeekChat(TOKEN)

# 测试 PoW 响应生成
pow_resp = chat.get_pow_response()
print('PoW response:', pow_resp)
print('PoW response length:', len(pow_resp) if pow_resp else 0)

# 测试完整对话
print('\n--- Testing chat ---')
result = chat.chat('你好', model='deepseek-chat', stream=False)
print('Chat result:', result[:100] if result else None)
