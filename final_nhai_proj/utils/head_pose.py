import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

def get_head_direction(frame):

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return 'NO FACE'

    landmarks = results.multi_face_landmarks[0]

    # Nose tip landmark 1. Mediapipe gives NORMALIZED coords 0.0 -> 1.0.
    # Straight ahead: nose.x is roughly 0.5
    # Turn LEFT  -> nose.x drops toward 0.0
    # Turn RIGHT -> nose.x rises toward 1.0
    nose_x = landmarks.landmark[1].x

    if nose_x < 0.42:
        return 'LEFT'
    elif nose_x > 0.58:
        return 'RIGHT'
    else:
        return 'CENTER'

