"""Read-only deployed Worker diagnosis. Never emit credentials or raw settings."""
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

EXPECTED_VERSION = "d0458ac3-23c7-4ccd-b820-26ad9fd0fbf0"


def summarize(kind, result):
    if kind == "subdomain":
        return {k: result.get(k) for k in ("enabled", "previews_enabled")}
    if kind == "settings":
        bindings = result.get("bindings", [])
        names = {b.get("name") for b in bindings}
        return {"required_bindings_present": {name: name in names for name in
                ("AI", "RL", "GROQ_API_KEY", "GEMINI_API_KEY")},
                "compatibility_date": result.get("compatibility_date")}
    deployments = result.get("deployments", []) if isinstance(result, dict) else result
    latest = deployments[0] if deployments else {}
    versions = [{"version_id": v.get("version_id"), "percentage": v.get("percentage")}
                for v in latest.get("versions", [])]
    return {"latest_created_on": latest.get("created_on"), "active_versions": versions,
            "expected_version_active": any(v.get("version_id") == EXPECTED_VERSION
                and v.get("percentage") == 100 for v in versions)}


def main():
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    account = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    report = {"read_only": True, "chat_requests": 0, "checks": {}}
    if not token or not account:
        report["error"] = "existing_credentials_unavailable"
    else:
        for kind in ("subdomain", "settings", "deployments"):
            url = f"https://api.cloudflare.com/client/v4/accounts/{account}/workers/scripts/game-llm/{kind}"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
            try:
                with urllib.request.urlopen(req, timeout=20) as response:
                    payload = json.load(response)
                report["checks"][kind] = {"success": payload.get("success"),
                                          **summarize(kind, payload.get("result", {}))}
            except urllib.error.HTTPError as error:
                # Do not print exception URLs or response bodies: both can contain identifiers.
                report["checks"][kind] = {"success": False, "http_status": error.code}
            except Exception as error:
                report["checks"][kind] = {"success": False, "error_type": type(error).__name__}
    safe = json.dumps(report, ensure_ascii=False, indent=2)
    Path("control-plane.json").write_text(safe + "\n")
    print(safe)


if __name__ == "__main__":
    main()
