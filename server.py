"""
AI Backend — Toxic Content Filter
===================================
Model : unitaryai/detoxify  (RoBERTa, 6 real-time toxicity categories)

6 scores per request:
  toxicity · severe_toxicity · obscene · threat · insult · identity_attack

Severity:
  HIGH   : toxicity > 0.65  OR  threat > 0.50  OR  identity_attack > 0.50
  MEDIUM : toxicity > 0.45
  LOW    : toxicity > 0.30

Install:
  pip install flask flask-cors detoxify torch
  python server.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch, threading

app  = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type"], methods=["GET","POST","OPTIONS"])

_detox = None
_lock  = threading.Lock()


def get_detoxify():
    global _detox
    if _detox is not None:
        return _detox
    with _lock:
        if _detox is not None:
            return _detox
        print("\n[AI] Loading Detoxify (unitaryai/detoxify) ...")
        from detoxify import Detoxify
        _detox = Detoxify("original")
        print("[AI] Detoxify ready")
        return _detox


def run_analysis(text):
    raw    = get_detoxify().predict(text[:512])
    scores = {k: round(float(v), 4) for k, v in raw.items()}
    tox    = scores.get("toxicity", 0)
    threat = scores.get("threat", 0)
    ident  = scores.get("identity_attack", 0)
    if tox > 0.65 or threat > 0.50 or ident > 0.50:
        severity = "high"
    elif tox > 0.45:
        severity = "medium"
    elif tox > 0.30:
        severity = "low"
    else:
        severity = "none"
    return {
        "detoxify": {"scores": scores, "score": tox},
        "combined_severity": severity,
        "should_blur":       severity != "none"
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "gpu":    torch.cuda.is_available(),
        "models": ["detoxify"] if _detox is not None else []
    })


@app.route("/analyze/text", methods=["POST"])
def analyze_text():
    body = request.get_json(force=True)
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "no text"}), 400
    try:
        return jsonify(run_analysis(text))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analyze/batch", methods=["POST"])
def analyze_batch():
    body  = request.get_json(force=True)
    texts = body.get("texts") or []
    if not texts or len(texts) > 100:
        return jsonify({"error": "send 1-100 texts"}), 400
    results = []
    for t in texts:
        t = (t or "").strip()
        if not t:
            results.append({"combined_severity": "none", "should_blur": False})
        else:
            try:
                results.append(run_analysis(t))
            except Exception as e:
                results.append({"error": str(e), "combined_severity": "none", "should_blur": False})
    return jsonify({"results": results})


if __name__ == "__main__":
    print("=" * 48)
    print("  Toxic Filter Backend")
    print(f"  GPU : {'YES' if torch.cuda.is_available() else 'CPU only'}")
    print()
    print("  Model : unitaryai/detoxify (RoBERTa)")
    print()
    print("  6 score categories:")
    print("    toxicity         HIGH if > 65%")
    print("    severe_toxicity  informational")
    print("    obscene          informational")
    print("    threat           HIGH if > 50%")
    print("    insult           informational")
    print("    identity_attack  HIGH if > 50%")
    print()
    print("  http://127.0.0.1:5050")
    print("=" * 48)
    try:
        get_detoxify()
    except Exception as e:
        print(f"[WARN] pre-load failed: {e}")
    app.run(host="127.0.0.1", port=5050, debug=False, threaded=True)
