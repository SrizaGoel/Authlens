import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

NOSE = 1

def get_head_direction(frame):

    h, w, _ = frame.shape
    target_w = 480
    target_h = int((target_w / w) * h)
    frame = cv2.resize(frame, (target_w, target_h))

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return "NO FACE"

    h, w, _ = frame.shape

    landmarks = results.multi_face_landmarks[0]
    
    # 1 is nose tip, 234 is left side of face, 454 is right side of face
    nose = landmarks.landmark[1]
    left_side = landmarks.landmark[234]
    right_side = landmarks.landmark[454]
    
    # Calculate horizontal distances from nose to sides of face (absolute values)
    dist_left = abs(nose.x - left_side.x)
    dist_right = abs(right_side.x - nose.x)
    
    # If the distance to one side is significantly smaller, the head is turned that way
    # A ratio of 1.5 or more indicates a significant turn
    if dist_right > 1.5 * dist_left:
        return "LEFT"
    elif dist_left > 1.5 * dist_right:
        return "RIGHT"
    else:
        return "CENTER"