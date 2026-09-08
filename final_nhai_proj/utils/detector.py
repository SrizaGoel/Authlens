import cv2
import mediapipe as mp

mp_face_detection = mp.solutions.face_detection.FaceDetection()

def detect_face(frame):

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = mp_face_detection.process(rgb)

    if not results.detections:
        return None, 0, []

    faces = []

    h, w, _ = frame.shape

    for detection in results.detections:

        bbox = detection.location_data.relative_bounding_box

        original_xmin = int(bbox.xmin * w)
        original_ymin = int(bbox.ymin * h)

        width = int(bbox.width * w)
        height = int(bbox.height * h)

        padding_x = int(width * 0.3)
        padding_y = int(height * 0.3)

        xmin = max(0, original_xmin - padding_x)
        ymin = max(0, original_ymin - padding_y)

        xmax = min(w, original_xmin + width + padding_x)
        ymax = min(h, original_ymin + height + padding_y)

        faces.append((xmin, ymin, xmax, ymax))

    first_face = frame[
        faces[0][1]:faces[0][3],
        faces[0][0]:faces[0][2]
    ]

    return first_face, len(faces), faces