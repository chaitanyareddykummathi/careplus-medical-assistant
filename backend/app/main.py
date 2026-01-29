from fastapi import FastAPI

app = FastAPI(title="CarePlus Medical Assistant")

@app.get("/")
def root():
    return {"message": "CarePlus API is running"}
