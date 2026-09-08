import sys
from deepface import DeepFace

img1 = sys.argv[1] if len(sys.argv) > 1 else "challenge_start.jpg"
img2 = sys.argv[2] if len(sys.argv) > 2 else "challenge_end.jpg"

result = DeepFace.verify(
    img1,
    img2,
    model_name="Facenet512",
    enforce_detection=False
)

print(result["verified"])