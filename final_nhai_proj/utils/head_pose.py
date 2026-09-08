import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

NOSE = 1

def get_head_direction(frame):

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return "NO FACE"

    h, w, _ = frame.shape

    landmarks = results.multi_face_landmarks[0]

    nose = landmarks.landmark[NOSE]

    nose_x = int(nose.x * w)

    center = w // 2

    if nose_x < center - 40:
        return "LEFT"

    elif nose_x > center + 40:
        return "RIGHT"

    else:
        return "CENTER"