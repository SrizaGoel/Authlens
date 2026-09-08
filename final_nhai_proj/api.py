from flask_cors import CORS
from database.db import (
    create_tables, get_logs, get_users, user_exists, add_user,
    save_embedding, save_log, get_user_by_name, embedding_count,
)
import base64

import os
import json
import subprocess
import uuid
import time
import random
import cv2
import sys
from flask import Flask, request
from utils.matcher import find_best_match
from utils.blink import detect_blink
from utils.head_pose import get_head_direction

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EMBEDDING_GENERATOR_PY = os.path.join(SCRIPT_DIR, "utils", "embedding_generator.py")
REVERIFY_PY = os.path.join(SCRIPT_DIR, "utils", "reverify.py")

# Resolve deepface virtual environment path dynamically
# final_nhai/final_nhai_proj -> final_nhai -> MyProjects/open-cv
PARENT_DIR = os.path.dirname(os.path.dirname(SCRIPT_DIR))
PYTHON_EXE = os.path.join(PARENT_DIR, "deepface_env", "Scripts", "python.exe")

if not os.path.exists(PYTHON_EXE):
    # Fallback to hardcoded absolute path or sys.executable
    PYTHON_EXE = r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\deepface_env\Scripts\python.exe"
    if not os.path.exists(PYTHON_EXE):
        PYTHON_EXE = sys.executable

app = Flask(__name__)
CORS(app)

os.makedirs("uploads", exist_ok=True)

challenge_sessions = {}

def cleanup_session(session_id):
    """Clean up challenge session and temporary files."""
    session = challenge_sessions.pop(session_id, None)
    if session:
        start_path = session.get("start_image_path")
        if start_path and os.path.exists(start_path):
            try:
                os.remove(start_path)
            except Exception:
                pass

@app.route("/")
def home():
    return {
        "message": "NHAI Face Verification API Running"
    }

@app.route("/logs")
def logs():
    logs_data = get_logs()
    formatted_logs = []
    for log in logs_data:
        formatted_logs.append({
            "id": log[0],
            "user": log[1],
            "confidence": log[2],
            "result": log[3],
            "timestamp": log[4]
        })
    return {
        "logs": formatted_logs
    }

@app.route("/users")
def users():
    users_data = get_users()
    formatted_users = []
    for user in users_data:
        formatted_users.append({
            "id": user[0],
            "name": user[1]
        })
    return {
        "users": formatted_users
    }

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")

    if not name:
        return {
            "success": False,
            "message": "Name required"
        }, 400

    if user_exists(name):
        return {
            "success": False,
            "message": "User already exists"
        }

    user_id = add_user(name)
    return {
        "success": True,
        "user_id": user_id,
        "message": f"{name} registered successfully"
    }

@app.route("/verify", methods=["POST"])
def verify():
    image = request.files.get("image")
    if not image:
        return {
            "success": False,
            "message": "Image required"
        }, 400

    unique_id = str(uuid.uuid4())
    image_path = os.path.join(
        "uploads",
        f"verify_{unique_id}.jpg"
    )

    try:
        image.save(image_path)

        result = subprocess.run(
            [
                PYTHON_EXE,
                EMBEDDING_GENERATOR_PY,
                image_path
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print("VERIFY EMBEDDING ERROR:", result.stderr)
            if os.path.exists(image_path):
                os.remove(image_path)
            return {
                "success": False,
                "message": result.stderr or "Face embedding generation failed"
            }, 500

        current_embedding = json.loads(result.stdout.strip())
        user_id, matched_name, score = find_best_match(current_embedding)

        if user_id is None:
            return {
                "success": False,
                "message": "No registered users"
            }

        confidence = score * 100

        if confidence >= 90:
            status = "VERIFIED"
            save_log(user_id, confidence, "VERIFIED")
            
            if os.path.exists(image_path):
                os.remove(image_path)
                
            return {
                "success": True,
                "user_id": user_id,
                "user": matched_name,
                "confidence": confidence,
                "status": status
            }

        elif confidence >= 75:
            session_id = str(uuid.uuid4())
            challenge = random.choice(["BLINK", "LEFT", "RIGHT"])
            
            challenge_start_path = os.path.join(
                "uploads",
                f"challenge_start_{session_id}.jpg"
            )
            os.rename(image_path, challenge_start_path)

            challenge_sessions[session_id] = {
                "user_id": user_id,
                "matched_name": matched_name,
                "confidence": confidence,
                "challenge": challenge,
                "attempts": 1,
                "start_time": time.time(),
                "start_image_path": challenge_start_path
            }

            return {
                "success": True,
                "status": "CHALLENGE_REQUIRED",
                "session_id": session_id,
                "challenge": challenge,
                "user_id": user_id,
                "user": matched_name,
                "confidence": confidence
            }

        else:
            status = "UNKNOWN"
            save_log(None, confidence, "UNKNOWN")
            
            if os.path.exists(image_path):
                os.remove(image_path)
                
            return {
                "success": False,
                "user_id": None,
                "user": "Unknown",
                "confidence": confidence,
                "status": status
            }

    except Exception as e:
        if os.path.exists(image_path):
            os.remove(image_path)
        return {
            "success": False,
            "message": str(e)
        }, 500

@app.route("/verify-challenge", methods=["POST"])
def verify_challenge():
    session_id = request.form.get("session_id")
    image = request.files.get("image")

    if not session_id:
        return {
            "success": False,
            "message": "Session ID required"
        }, 400

    if not image:
        return {
            "success": False,
            "message": "Challenge proof image required"
        }, 400

    session = challenge_sessions.get(session_id)
    if not session:
        return {
            "success": False,
            "message": "Session not found or expired"
        }, 404

    if time.time() - session["start_time"] > 30:
        cleanup_session(session_id)
        return {
            "success": False,
            "message": "Challenge session expired"
        }, 400

    unique_id = str(uuid.uuid4())
    challenge_image_path = os.path.join(
        "uploads",
        f"challenge_end_{session_id}_{unique_id}.jpg"
    )

    try:
        image.save(challenge_image_path)

        frame = cv2.imread(challenge_image_path)
        if frame is None:
            if os.path.exists(challenge_image_path):
                os.remove(challenge_image_path)
            return {
                "success": False,
                "message": "Failed to read uploaded image"
            }, 400

        challenge_type = session["challenge"]
        liveness_passed = False

        if challenge_type == "BLINK":
            liveness_passed = detect_blink(frame)
        elif challenge_type == "LEFT":
            liveness_passed = (get_head_direction(frame) == "LEFT")
        elif challenge_type == "RIGHT":
            liveness_passed = (get_head_direction(frame) == "RIGHT")

        if not liveness_passed:
            session["attempts"] += 1
            if os.path.exists(challenge_image_path):
                os.remove(challenge_image_path)

            if session["attempts"] > 3:
                save_log(session["user_id"], session["confidence"], "CHALLENGE_FAILED")
                cleanup_session(session_id)
                return {
                    "success": False,
                    "status": "REJECTED",
                    "message": "Liveness verification failed. Max attempts exceeded."
                }
            else:
                session["challenge"] = random.choice(["BLINK", "LEFT", "RIGHT"])
                session["start_time"] = time.time()  # Reset timer for next attempt
                return {
                    "success": False,
                    "status": "CHALLENGE_REQUIRED",
                    "session_id": session_id,
                    "challenge": session["challenge"],
                    "message": f"Liveness check failed. Try again with: {session['challenge']}"
                }

        result = subprocess.run(
            [
                PYTHON_EXE,
                REVERIFY_PY,
                session["start_image_path"],
                challenge_image_path
            ],
            capture_output=True,
            text=True
        )

        reverify_result = result.stdout.strip()
        
        if os.path.exists(challenge_image_path):
            os.remove(challenge_image_path)

        if reverify_result == "True":
            save_log(session["user_id"], session["confidence"], "CHALLENGE_PASSED")
            user_id = session["user_id"]
            user_name = session["matched_name"]
            confidence = session["confidence"]
            cleanup_session(session_id)
            return {
                "success": True,
                "status": "VERIFIED",
                "user_id": user_id,
                "user": user_name,
                "confidence": confidence,
                "message": "Challenge passed and face verified successfully"
            }
        else:
            save_log(session["user_id"], 0, "CHALLENGE_FAILED")
            cleanup_session(session_id)
            return {
                "success": False,
                "status": "REJECTED",
                "message": "Challenge completed, but identity verification failed"
            }

    except Exception as e:
        if os.path.exists(challenge_image_path):
            os.remove(challenge_image_path)
        return {
            "success": False,
            "message": str(e)
        }, 500

@app.route("/register-face", methods=["POST"])
def register_face():
    name = request.form.get("name")
    image = request.files.get("image")

    if not name:
        return {
            "success": False,
            "message": "Name required"
        }, 400

    if not image:
        return {
            "success": False,
            "message": "Image required"
        }, 400

    existing_user_id = get_user_by_name(name)

    if existing_user_id is not None:
        count = embedding_count(existing_user_id)
        if count > 0:
            return {
                "success": False,
                "message": "User face already registered"
            }
        user_id = existing_user_id
    else:
        user_id = add_user(name)

    unique_id = str(uuid.uuid4())[:8]
    temp_path = os.path.join(
        "uploads",
        f"temp_register_{name}_{unique_id}.jpg"
    )

    try:
        image.save(temp_path)

        result = subprocess.run(
            [
                PYTHON_EXE,
                EMBEDDING_GENERATOR_PY,
                temp_path
            ],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            return {
                "success": False,
                "message": result.stderr
            }, 500

        embedding = json.loads(result.stdout.strip())
        save_embedding(user_id, json.dumps(embedding))

        permanent_path = os.path.join(
            "uploads",
            f"{name}.jpg"
        )
        if os.path.exists(permanent_path):
            os.remove(permanent_path)
        os.rename(temp_path, permanent_path)

        return {
            "success": True,
            "user_id": user_id,
            "message": f"{name} face registered successfully"
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }, 500
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

create_tables()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,
        use_reloader=False,
    )