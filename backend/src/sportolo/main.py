from fastapi import FastAPI

from sportolo.api.routes.muscle_usage import router as muscle_usage_router

app = FastAPI(title="Sportolo API", version="0.1.0")
app.include_router(muscle_usage_router)
