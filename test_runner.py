"""
Ashnance automated test runner — sessions 5+
Run from the project root on any machine with internet access.
"""
import json, urllib.request, urllib.error, time, sys, os
sys.stdout.reconfigure(encoding='utf-8')

TOKENS_FILE = r'C:\Users\LENOVO\Desktop\ashnance\.tokens.json'
BASE = 'https://api.ashnance.com'

def load():
    with open(TOKENS_FILE) as f:
        return json.load(f)

def save(d):
    with open(TOKENS_FILE, 'w') as f:
        json.dump(d, f, indent=2)

def api(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def refresh_owner():
    d = load()
    r = api('POST', '/api/auth/refresh', {'refreshToken': d['OWNER_REFRESH']})
    if r.get('data', {}).get('accessToken'):
        d['OWNER'] = r['data']['accessToken']
        d['OWNER_REFRESH'] = r['data']['refreshToken']
        save(d)
    return load()['OWNER']

def tok(key):
    return load()[key]

def result(tc, status, note):
    icon = '[PASS]' if status == 'PASS' else ('[FAIL]' if status == 'FAIL' else '[WARN]')
    print(f'  {icon} {tc}: {note}')
    return status

if __name__ == '__main__':
    d = load()
    print('Tokens OK, keys:', list(d.keys()))
