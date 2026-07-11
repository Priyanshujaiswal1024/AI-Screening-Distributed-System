import requests
import json

url = "https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions"
headers = {
    "Authorization": "Bearer AQ.Ab8RN6IvNUDnD7zYfvLMi05G1fjZVGHSoQXaDJBRafeeI_-HPw",
    "Content-Type": "application/json"
}
payload = {
    "model": "gemini-1.5-flash-latest",
    "messages": [{"role": "user", "content": "hello"}]
}

response = requests.post(url, headers=headers, json=payload)
print(response.status_code)
print(response.text)
