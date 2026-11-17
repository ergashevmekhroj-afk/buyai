# Build the React app and publish web/dist to Vercel production (project "buy-smarter").
# Needs: Node on PATH (npm), and a Vercel login on this computer (the Vercel CLI's saved token).
# Run from the project folder:  python3 scripts/deploy.py
import hashlib, json, os, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "web", "dist")
PROJECT, TEAM = "buy-smarter", "team_ZCft3Kv7tvUHxA3MHARBFzD9"
TOKEN = json.load(open(os.path.expanduser("~/Library/Application Support/com.vercel.cli/auth.json")))["token"]

def api(method, path, body=None, headers=None, raw=False):
    h = {"Authorization": "Bearer " + TOKEN, **(headers or {})}
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    if not raw and body is not None: h["Content-Type"] = "application/json"
    req = urllib.request.Request(f"https://api.vercel.com{path}{'&' if '?' in path else '?'}teamId={TEAM}", data=data, headers=h, method=method)
    with urllib.request.urlopen(req) as r: return json.loads(r.read() or b"{}")

subprocess.run(["npm", "run", "build"], cwd=os.path.join(ROOT, "web"), check=True)

# the built site is plain static files; headers come from vercel.json (without its build settings)
cfg = json.load(open(os.path.join(ROOT, "vercel.json")))
static_cfg = json.dumps({"$schema": cfg["$schema"], "headers": cfg["headers"]}, indent=2).encode()
files = [("vercel.json", static_cfg)]
for d, _, names in os.walk(DIST):
    for n in names:
        full = os.path.join(d, n)
        files.append((os.path.relpath(full, DIST), open(full, "rb").read()))

listing = []
for rel, data in files:
    sha = hashlib.sha1(data).hexdigest()
    api("POST", "/v2/files", data, {"Content-Type": "application/octet-stream", "x-vercel-digest": sha, "Content-Length": str(len(data))}, raw=True)
    listing.append({"file": rel, "sha": sha, "size": len(data)})
dep = api("POST", "/v13/deployments", {"name": PROJECT, "project": PROJECT, "target": "production", "files": listing,
    "projectSettings": {"framework": None, "buildCommand": "", "installCommand": "", "outputDirectory": "."}})
print(f"uploaded {len(listing)} files -> {dep.get('url')} ({dep.get('readyState')}); live at https://buy-smarter.vercel.app")
