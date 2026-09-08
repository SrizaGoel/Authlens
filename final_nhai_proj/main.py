import cv2
from utils.detector import detect_face
from utils.blink import detect_blink
from utils.head_pose import get_head_direction
# from utils.embedding_generator import get_embedding
from database.db import (add_user, save_embedding,save_log,user_exists,embedding_count,get_users)

from utils.matcher import find_best_match
import subprocess
import random
import time
import json

challenge_start_time = None
challenge_attempts = 0
MAX_ATTEMPTS = 3
CHALLENGE_TIMEOUT = 10
current_challenge = None
challenge_passed = False
verification_pending = False
verified = False
confidence_score = 0
rejected = False
recognized_user = "Unknown"
current_user_id = None

webcam=cv2.VideoCapture(0)
while webcam.isOpened():
    
    success,frame=webcam.read()
    if not success:
        break
    face, face_count, faces = detect_face(frame)
    if face_count == 0:
        cv2.putText(frame,"NO FACE DETECTED",(20,360),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)
    elif face_count > 1:
        cv2.putText(frame,"MULTIPLE FACES DETECTED",(20,360),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)
    blink_detected = detect_blink(frame)
    direction = get_head_direction(frame)
    status = "IDLE"

    if verified:
        status = "VERIFIED"
    elif verification_pending:
        status = "CHALLENGE"
    elif rejected:
        status = "REJECTED"
    cv2.putText(frame,f"Faces: {face_count}",(20,40),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)
    cv2.putText(frame,f"Head: {direction}",(20,80),cv2.FONT_HERSHEY_SIMPLEX,1,(255,0,0),2)
    cv2.putText(frame,f"Status: {status}",(20,120),cv2.FONT_HERSHEY_SIMPLEX,1,(255,255,0),2)
    cv2.putText(frame,f"Confidence: {confidence_score:.2f}%",(20,200),cv2.FONT_HERSHEY_SIMPLEX,1,(255,255,255),2)
    cv2.putText(frame,f"User: {recognized_user}",(20,360),cv2.FONT_HERSHEY_SIMPLEX,1,(255,255,255),2)
    for xmin, ymin, xmax, ymax in faces:
        cv2.rectangle(frame,(xmin, ymin),(xmax, ymax),(0,255,0),2)
    if verification_pending:
            elapsed = time.time() - challenge_start_time
            remaining = max(0,int(CHALLENGE_TIMEOUT - elapsed))
            cv2.putText(frame,f"Time Left: {remaining}s",(20,240),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)
            cv2.putText(frame,f"Attempts: {challenge_attempts}/{MAX_ATTEMPTS}",(20,280),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),2)
            cv2.putText(frame,f"Challenge: {current_challenge}",(20,160),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,255),2)
            if elapsed > CHALLENGE_TIMEOUT:
                if challenge_attempts >= MAX_ATTEMPTS:
                    verification_pending = False
                    rejected = True
                    confidence_score = 0
                    print("Challenge Failed")
                    current_challenge = None
                    challenge_start_time = None
                else:
                    challenge_attempts += 1
                    current_challenge = random.choice( ["BLINK","LEFT","RIGHT"])
                    challenge_start_time = time.time()
                    print(f"Retry {challenge_attempts}/{MAX_ATTEMPTS} - "f"{current_challenge}")
            if current_challenge == "BLINK" and blink_detected:
                challenge_passed = True
            elif current_challenge == "LEFT" and direction == "LEFT":
                challenge_passed = True
            elif current_challenge == "RIGHT" and direction == "RIGHT":
                challenge_passed = True
    if challenge_passed:
            verification_pending = False
            cv2.imwrite("challenge_end.jpg",face)
            result = subprocess.run(
                [
                    r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\deepface_env\Scripts\python.exe",
                    r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\final_nhai_proj\utils\reverify.py"
                ],
                capture_output=True,
                text=True
            )
            reverify_result = result.stdout.strip()
            if reverify_result == "True":
                verified = True
                rejected = False
                verification_pending = False
                print("Challenge Passed + Reverified")
                save_log(current_user_id,confidence_score,"CHALLENGE_PASSED")
            else:
                verified = False
                rejected = True
                confidence_score = 0
                print("Challenge Failed Reverification")
            current_challenge = None
            challenge_passed = False
            challenge_attempts = 0
            challenge_start_time = None
    if verified:
        cv2.putText(frame,"VERIFIED",(20,220),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),3)
    if rejected:
        cv2.putText(frame,"ACCESS DENIED",(20,320),cv2.FONT_HERSHEY_SIMPLEX,1,(0,0,255),3)
    if face is not None:
        cv2.imshow("Face Crop", face)
    cv2.imshow("Camera", frame)
    key = cv2.waitKey(5) & 0xFF    
    if key == ord("r") and face is not None:
        name = input("Enter User Name: ")
        if user_exists(name):
            print("User already exists")
            continue
        cv2.imwrite("temp_register.jpg",face)
        result = subprocess.run(
        [
            r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\deepface_env\Scripts\python.exe",
            r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\final_nhai_proj\utils\embedding_generator.py",
            "temp_register.jpg"
        ],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(result.stderr)
            continue
        embedding = json.loads(result.stdout.strip())
        user_id = add_user(name)
        save_embedding(user_id,json.dumps(embedding))
        print(f"{name} Registered")
        print(f"User ID: {user_id}")

        confidence_score = 0
        verified = False
        verification_pending = False
        current_challenge = None
        challenge_passed = False
        rejected = False
        challenge_attempts = 0
        challenge_start_time = None

    if key == ord("v") and face is not None:
        current_user_id = None
        recognized_user = "Unknown"
        if face_count != 1:
            print("Verification blocked: multiple faces")
            continue
        verified = False
        verification_pending = False
        challenge_passed = False
        current_challenge=None
        rejected = False
        cv2.imwrite("temp_verify.jpg",face)
        result = subprocess.run(
            [
                r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\deepface_env\Scripts\python.exe",
                r"C:\Users\Sriza Goel\OneDrive\Desktop\MyProjects\open-cv\final_nhai_proj\utils\embedding_generator.py",
                "temp_verify.jpg"
            ],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(result.stderr)
            continue
        current_embedding = json.loads(result.stdout.strip())
        user_id, matched_name, score = find_best_match(current_embedding)
        current_user_id = user_id
        recognized_user = matched_name
        confidence = score * 100
        confidence_score = confidence
        print("Matched User:", matched_name)
        print("Confidence:", confidence)
        if confidence >= 90:
            verified = True
            verification_pending = False
            rejected = False
            challenge_attempts = 0
            challenge_start_time = None
            print(f"HIGH CONFIDENCE VERIFIED: {matched_name}")
            save_log(current_user_id,confidence,"VERIFIED")
            if confidence >= 95:
                if embedding_count(user_id) < 20: # later on add to delete old ones
                    save_embedding(user_id,json.dumps(current_embedding))
                    print("Adaptive embedding saved")
        elif confidence >= 75:
            cv2.imwrite("challenge_start.jpg",face)
            current_challenge = random.choice(["BLINK","LEFT","RIGHT"])
            verification_pending = True
            challenge_start_time = time.time()
            challenge_attempts = 1
            print(f"Challenge for {matched_name}: {current_challenge}")
        else:
            print("LOW CONFIDENCE REJECTED")
            verified = False
            verification_pending = False
            rejected = True
            save_log(None,confidence_score,"UNKNOWN")
    
    if key == ord("q"):
        break

webcam.release()
cv2.destroyAllWindows()