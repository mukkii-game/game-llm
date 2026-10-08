"""Bounded public-relay check. No secrets, retries, deployment or paid API added."""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = 'https://game-llm.mucky-totoro.workers.dev'
report = {'mode': 'live deployed relay; synthetic inputs; at most two chat requests', 'results': []}


def request(path, body=None):
    headers = {'Origin': 'https://mukkii-game.github.io'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, headers=headers,
        data=None if body is None else json.dumps(body, ensure_ascii=False).encode())
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=22) as response:
            status, raw = response.status, response.read(10000).decode()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read(10000).decode(errors='replace')
    except Exception as error:
        return {'status': None, 'error': type(error).__name__, 'seconds': round(time.monotonic()-started, 2)}
    try:
        result = json.loads(raw)
    except ValueError:
        result = {'error': 'non-json-response', 'responseSnippet': raw[:1200]}
    return {'status': status, 'body': result, 'seconds': round(time.monotonic()-started, 2)}


health = request('/health')
report['health'] = health
history = []
if health['status'] == 200 and health.get('body', {}).get('ok'):
    for turn, text in enumerate([
        '漫画は詳しくないけど、音楽の話は好きだよ',
        '雨の匂いって、なんだか昔の帰り道を思い出さない？',
    ], 4):
        response = request('/api/chat/emmichy', {
            'input': text, 'state': {'history': history}, 'session': {'turns': turn}
        })
        report['results'].append({'input': text, **response})
        if response['status'] != 200:
            report['stopReason'] = 'first failed request; no retry'
            break
        answer = response.get('body', {}).get('text')
        if not isinstance(answer, str) or not answer.strip():
            report['stopReason'] = 'invalid response; no retry'
            break
        history.extend([{'role': 'user', 'text': text}, {'role': 'enny', 'text': answer}])
else:
    report['stopReason'] = 'health unavailable; chat not attempted'

report['chatRequests'] = len(report['results'])
Path('live-smoke.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False))
if report.get('stopReason'):
    raise SystemExit(1)
