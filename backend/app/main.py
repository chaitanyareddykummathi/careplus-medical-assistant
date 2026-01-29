from fastapi import FastAPI
from app.api import auth

app = FastAPI(title="CarePlus Medical Assistant")

app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "CarePlus API is running"}
