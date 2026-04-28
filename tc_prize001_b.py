"""TC-PRIZE-001 Part B: call end after rewardPool drained. Verify prize was capped."""
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

owner = refresh_owner()
d = load()
round_id = d.get('PRIZE001_ROUND')
if not round_id:
    print('[ERROR] No PRIZE001_ROUND in tokens. Run tc_prize001_a.py first.')
    sys.exit(1)

print(f'=== TC-PRIZE-001: Prize capped at 70% of rewardPool ===')

# Check rewardPool just before end
sol_before = api('GET', '/api/owner/solvency', token=owner)
rp_before = sol_before.get('data', {}).get('breakdown', {}).get('rewardPool', '?')
print(f'rewardPool before end: {rp_before}')

# End round (no force — normal end)
end_r = api('POST', f'/api/owner/round/{round_id}/end', {}, token=owner)
print(f'End response: {end_r}')

prize = None
if end_r.get('data'):
    prize = end_r['data'].get('prizeAmount') or end_r['data'].get('prize') or end_r['data'].get('round', {}).get('prizeAmount')

print(f'Prize paid: {prize}')

# Expected: min(currentPool, 0.70 * rp_before)
try:
    rp_f = float(rp_before)
    # currentPool was ~2.50 from the $5 burn
    # We need the actual currentPool from the round
    expected_max = round(0.70 * rp_f, 2)
    print(f'Expected max (70% of {rp_f}): {expected_max}')
    if prize is not None:
        prize_f = float(prize)
        if prize_f <= expected_max + 0.01:
            print(f'[PASS] TC-PRIZE-001: prize={prize_f} <= maxSafe={expected_max} (cap applied)')
        else:
            print(f'[FAIL] TC-PRIZE-001: prize={prize_f} > maxSafe={expected_max} (cap NOT applied)')
    else:
        print(f'[FAIL] TC-PRIZE-001: no prize in response')
except Exception as ex:
    print(f'[ERROR] {ex}')
