import cv2
import mediapipe as mp
import math

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

LEFT_TOP = 159
LEFT_BOTTOM = 145

LEFT_INNER = 133
LEFT_OUTER = 33

def get_ear(face_landmarks, w, h):
    top = face_landmarks.landmark[LEFT_TOP]
    bottom = face_landmarks.landmark[LEFT_BOTTOM]
    inner = face_landmarks.landmark[LEFT_INNER]
    outer = face_landmarks.landmark[LEFT_OUTER]

    # Vertical distance
    v_dist = math.hypot((top.x - bottom.x) * w, (top.y - bottom.y) * h)
    
    # Horizontal distance
    h_dist = math.hypot((inner.x - outer.x) * w, (inner.y - outer.y) * h)

    if h_dist == 0:
        return 1.0

    return v_dist / h_dist

def detect_blink(frame):

    h, w, _ = frame.shape
    target_w = 480
    target_h = int((target_w / w) * h)
    frame = cv2.resize(frame, (target_w, target_h))

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return False

    h, w, _ = frame.shape

    face_landmarks = results.multi_face_landmarks[0]

    ear = get_ear(face_landmarks, target_w, target_h)

    return ear < 0.25  # Standard EAR threshold for a blink