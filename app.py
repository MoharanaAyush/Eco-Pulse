from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from datetime import datetime
import numpy as np
from sklearn.ensemble import IsolationForest

app = FastAPI(title="EcoPulse")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://eco-pulse-0pc6.onrender.com"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE = "ecopulse.db"


def create_database():
    connection = sqlite3.connect(DATABASE)
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource TEXT NOT NULL,
            location TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


create_database()


class Reading(BaseModel):
    resource: str
    location: str
    value: float
    unit: str


@app.get("/")
def home():
    return {
        "message": "EcoPulse is running!"
    }


@app.post("/api/readings")
def add_reading(reading: Reading):
    connection = sqlite3.connect(DATABASE)
    cursor = connection.cursor()

    timestamp = datetime.now().isoformat()

    cursor.execute("""
        INSERT INTO readings
        (resource, location, value, unit, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (
        reading.resource,
        reading.location,
        reading.value,
        reading.unit,
        timestamp
    ))

    connection.commit()
    connection.close()

    return {
        "message": "Reading added successfully",
        "data": reading
    }


@app.get("/api/readings")
def get_readings():
    connection = sqlite3.connect(DATABASE)
    cursor = connection.cursor()

    cursor.execute("""
        SELECT id, resource, location, value, unit, timestamp
        FROM readings
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    connection.close()

    readings = []

    for row in rows:
        readings.append({
            "id": row[0],
            "resource": row[1],
            "location": row[2],
            "value": row[3],
            "unit": row[4],
            "timestamp": row[5]
        })

    return readings


@app.get("/api/anomalies")
def detect_anomalies():
    connection = sqlite3.connect(DATABASE)
    cursor = connection.cursor()

    cursor.execute("""
        SELECT resource, location, value, unit, timestamp
        FROM readings
        ORDER BY id
    """)

    rows = cursor.fetchall()
    connection.close()

    groups = {}

    for row in rows:
        resource = row[0]
        location = row[1]
        key = (resource, location)

        if key not in groups:
            groups[key] = []

        groups[key].append(row)

    anomalies = []

    for key, readings in groups.items():

        if len(readings) < 5:
            continue

        values = np.array([
            [reading[2]]
            for reading in readings
        ])

        model = IsolationForest(
            contamination=0.15,
            random_state=42
        )

        predictions = model.fit_predict(values)

        for reading, prediction in zip(
            readings,
            predictions
        ):
            if prediction == -1:
                anomalies.append({
                    "resource": reading[0],
                    "location": reading[1],
                    "value": reading[2],
                    "unit": reading[3],
                    "timestamp": reading[4],
                    "message": "Unusual consumption detected"
                })

    return anomalies