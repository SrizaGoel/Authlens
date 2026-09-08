from deepface import DeepFace
import json
import sys


def get_embedding(image_path):

    result = DeepFace.represent(
        img_path=image_path,
        model_name="Facenet512",
        enforce_detection=False
    )

    return result[0]["embedding"]


if __name__ == "__main__":

    image_path = sys.argv[1]

    embedding = get_embedding(image_path)

    print(json.dumps(embedding))