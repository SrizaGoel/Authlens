import json
import numpy as np
from database.db import get_all_embeddings

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a)* np.linalg.norm(b))

def find_best_match(current_embedding):
    rows = get_all_embeddings()
    best_name = None
    best_user_id = None
    best_score = -1
    for user_id, name, stored_embedding in rows:
        stored_embedding = json.loads(stored_embedding)
        score = cosine_similarity(current_embedding,stored_embedding)
        if score > best_score:
            best_score = score
            best_name = name
            best_user_id = user_id
    return (best_user_id,best_name,best_score)