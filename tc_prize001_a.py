"""TC-PRIZE-001 Part A: create round, burn, save roundId. Then user runs psql to drain rewardPool."""
import json, sys, time
sys.stdout.reconfigure(encoding='utf-8')

TOKENS_FILE = r'C:\Users\LENOVO\Desktop\ashnance\.tokens.json'
BASE = 'https://api.ashnance.com'

import urllib.request, urllib.error

def load():
    with open(TOKENS_FILE) as f: return json.load(f)

def save(d):
    with open(TOKENS_FILE, 'w') as f: json.dump(d, f, indent=2)

def api(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = f'Bearer {token}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f'{BASE}{path}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e: return json.loads(e.read())

def refresh_owner():
    d = load()
    r = api('POST', '/api/auth/refresh', {'refreshToken': d['OWNER_REFRESH']})
    if r.get('data', {}).get('accessToken'):
        d['OWNER'] = r['data']['accessToken']
        d['OWNER_REFRESH'] = r['data']['refreshToken']
        save(d)
    return load()['OWNER']

def refresh_user(access_key, refresh_key):
    d = load()
    r = api('POST', '/api/auth/refresh', {'refreshToken': d[refresh_key]})
    if r.get('data', {}).get('accessToken'):
        d[access_key] = r['data']['accessToken']
        d[refresh_key] = r['data']['refreshToken']
        save(d)
    return load()[access_key]

owner = refresh_owner()
tb = refresh_user('TB', 'RB')

# Cancel any active round first
active = api('GET', '/api/round/current', token=owner)
if active.get('data', {}).get('id'):
    rid = active['data']['id']
    print(f'Cancelling active round {rid}')
    api('POST', f'/api/owner/round/{rid}/cancel', {}, token=owner)
    time.sleep(1)

# Check current rewardPool
sol = api('GET', '/api/owner/solvency', token=owner)
rp = sol.get('data', {}).get('breakdown', {}).get('rewardPool', '?')
print(f'rewardPool before round: {rp}')

# Create new round
r = api('POST', '/api/owner/round', {'timeLimitHours': 24}, token=owner)
round_id = r.get('data', {}).get('id') or r.get('data', {}).get('round', {}).get('id')
print(f'Round created: {round_id}  full={r}')
if not round_id:
    print('[ERROR] no round id')
    sys.exit(1)

# Save round id for part B
d = load()
d['PRIZE001_ROUND'] = round_id
save(d)

time.sleep(1)

# T_B burns $5 -> currentPool += 2.50, rewardPool += 2.50
burn = api('POST', '/api/burn', {'amount': 5}, token=tb)
print(f'T_B burn $5: {burn}')
pool = burn.get('data', {}).get('round', {}).get('currentPool') or burn.get('data', {}).get('currentPool')
print(f'currentPool after burn: {pool}')

time.sleep(1)

# Check rewardPool now
sol2 = api('GET', '/api/owner/solvency', token=owner)
rp2 = sol2.get('data', {}).get('breakdown', {}).get('rewardPool', '?')
print(f'rewardPool AFTER burn (before drain): {rp2}')

print()
print('=== ACTION REQUIRED ===')
print('Run this psql command to drain rewardPool to $1:')
print()
print(r'  sudo -u postgres psql -p 5433 -d ashnance -c "UPDATE reward_pool SET \"totalBalance\"=1;"')
print()
print('Then run: python tc_prize001_b.py')
