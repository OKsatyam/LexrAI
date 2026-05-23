from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings


def get_llm():
    primary = ChatGroq(
        api_key=settings.groq_api_key,
        model="llama-3.3-70b-versatile",
        temperature=0,
    )
    fallback = ChatGoogleGenerativeAI(
        api_key=settings.gemini_api_key,
        model="gemini-1.5-flash",
        temperature=0,
    )
    return primary.with_fallbacks([fallback])
