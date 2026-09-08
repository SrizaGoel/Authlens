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

def eye_distance(face_landmarks, h):

    top = face_landmarks.landmark[LEFT_TOP]
    bottom = face_landmarks.landmark[LEFT_BOTTOM]

    y1 = int(top.y * h)
    y2 = int(bottom.y * h)

    return abs(y2 - y1)

def detect_blink(frame):

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return False

    h, w, _ = frame.shape

    face_landmarks = results.multi_face_landmarks[0]

    distance = eye_distance(face_landmarks, h)

    return distance < 4