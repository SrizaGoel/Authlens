from database.db import get_logs

logs = get_logs()

print("\nAUTHENTICATION LOGS\n")

for log in logs:

    log_id = log[0]

    user = log[1]

    confidence = log[2]

    result = log[3]

    timestamp = log[4]

    if user is None:
        user = "UNKNOWN"

    print(
        f"[{log_id}] "
        f"{user} | "
        f"{confidence:.2f}% | "
        f"{result} | "
        f"{timestamp}"
    )