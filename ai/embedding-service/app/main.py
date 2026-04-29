from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException

from app.config import get_settings
from app.gms_client import GmsEmbeddingClient
from app.hint_formatter import render_document_text, render_query_text
from app.schemas import (
    EmbeddingItem,
    EmbeddingRequest,
    EmbeddingResponse,
    HintDocumentEmbedRequest,
    HintDocumentEmbedResponse,
    HintDocumentEmbeddingItem,
    HintQueryEmbedRequest,
    HintQueryEmbedResponse,
    SingleEmbedRequest,
    UsageInfo,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.gms_key:
        raise RuntimeError("GMS_KEY is not configured. Set it in environment or .env")
    client = GmsEmbeddingClient(settings=settings)
    app.state.gms_client = client
    try:
        yield
    finally:
        await client.close()


app = FastAPI(
    title="Lucas Embedding Service",
    version="0.1.0",
    description="FastAPI wrapper for GMS Gemini embedding model",
    lifespan=lifespan,
)


def _normalize_inputs(text_input: str | list[str]) -> list[str]:
    return [text_input] if isinstance(text_input, str) else text_input


def _normalize_model(model: str) -> str:
    return model.removeprefix("models/")


def _raise_upstream_error(exc: Exception) -> None:
    if isinstance(exc, httpx.HTTPStatusError):
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to create embeddings from GMS",
                "upstream_status": exc.response.status_code,
                "upstream_body": exc.response.text,
            },
        ) from exc
    if isinstance(exc, httpx.RequestError):
        raise HTTPException(status_code=502, detail={"message": "Cannot reach GMS embedding endpoint"}) from exc
    if isinstance(exc, ValueError):
        raise HTTPException(status_code=502, detail={"message": str(exc)}) from exc
    raise exc


async def _embed_many(
    texts: list[str],
    model: str,
    task_type: str | None,
    title: str | None,
    output_dimensionality: int | None,
) -> tuple[list[EmbeddingItem], UsageInfo, list[dict[str, Any]]]:
    semaphore = asyncio.Semaphore(settings.embed_max_concurrency)
    client: GmsEmbeddingClient = app.state.gms_client

    async def _one(index: int, text: str):
        async with semaphore:
            result = await client.embed_text(
                text=text,
                model=model,
                task_type=task_type,
                title=title,
                output_dimensionality=output_dimensionality,
            )
            item = EmbeddingItem(index=index, embedding=result.embedding)
            return item, result.prompt_tokens, result.total_tokens, result.raw

    tasks = [_one(i, text) for i, text in enumerate(texts)]
    done = await asyncio.gather(*tasks)

    data = [item for item, _, _, _ in done]
    prompt_tokens = sum(prompt for _, prompt, _, _ in done)
    total_tokens = sum(total for _, _, total, _ in done)
    raw_responses = [raw for _, _, _, raw in done]
    return data, UsageInfo(prompt_tokens=prompt_tokens, total_tokens=total_tokens), raw_responses


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.service_name, "env": settings.app_env}


@app.get("/v1/key-info")
async def get_key_info() -> dict[str, Any]:
    client: GmsEmbeddingClient = app.state.gms_client
    try:
        return await client.get_key_info()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to fetch key info from GMS",
                "upstream_status": exc.response.status_code,
                "upstream_body": exc.response.text,
            },
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail={"message": "Cannot reach GMS key-info endpoint"}) from exc


@app.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest) -> EmbeddingResponse:
    texts = _normalize_inputs(request.input)
    if len(texts) > settings.embed_max_batch_size:
        raise HTTPException(
            status_code=422,
            detail=f"Maximum batch size is {settings.embed_max_batch_size}, received {len(texts)}",
        )

    target_model = _normalize_model(request.model or settings.gms_embedding_model)

    try:
        data, usage, raw_responses = await _embed_many(
            texts=texts,
            model=target_model,
            task_type=request.task_type,
            title=request.title,
            output_dimensionality=request.output_dimensionality,
        )
    except (httpx.HTTPStatusError, httpx.RequestError, ValueError) as exc:
        _raise_upstream_error(exc)

    return EmbeddingResponse(
        model=target_model,
        data=data,
        usage=usage,
        metadata={"count": len(texts), "raw_response_count": len(raw_responses)},
    )


@app.post("/v1/embed")
async def create_single_embedding(request: SingleEmbedRequest) -> dict[str, Any]:
    payload = EmbeddingRequest(
        input=request.text,
        model=request.model,
        task_type=request.task_type,
        title=request.title,
        output_dimensionality=request.output_dimensionality,
    )
    response = await create_embeddings(payload)
    first = response.data[0]
    return {
        "model": response.model,
        "embedding": first.embedding,
        "usage": response.usage.model_dump(),
    }


@app.post("/v1/hint/embed-documents", response_model=HintDocumentEmbedResponse)
async def hint_embed_documents(request: HintDocumentEmbedRequest) -> HintDocumentEmbedResponse:
    if len(request.documents) > settings.embed_max_batch_size:
        raise HTTPException(
            status_code=422,
            detail=f"Maximum batch size is {settings.embed_max_batch_size}, received {len(request.documents)}",
        )

    texts = [render_document_text(document) for document in request.documents]
    target_model = _normalize_model(request.model or settings.gms_embedding_model)

    try:
        data, usage, _ = await _embed_many(
            texts=texts,
            model=target_model,
            task_type="RETRIEVAL_DOCUMENT",
            title=None,
            output_dimensionality=request.output_dimensionality,
        )
    except (httpx.HTTPStatusError, httpx.RequestError, ValueError) as exc:
        _raise_upstream_error(exc)

    items: list[HintDocumentEmbeddingItem] = []
    for idx, vector_item in enumerate(data):
        source = request.documents[idx]
        items.append(
            HintDocumentEmbeddingItem(
                doc_id=source.doc_id,
                doc_type=source.doc_type,
                chapter_id=source.chapter_id,
                from_node_id=source.from_node_id,
                action_type=source.action_type,
                text=texts[idx],
                embedding=vector_item.embedding,
                metadata=source.metadata,
            )
        )

    return HintDocumentEmbedResponse(model=target_model, usage=usage, items=items)


@app.post("/v1/hint/embed-query", response_model=HintQueryEmbedResponse)
async def hint_embed_query(request: HintQueryEmbedRequest) -> HintQueryEmbedResponse:
    text = render_query_text(request)
    target_model = _normalize_model(request.model or settings.gms_embedding_model)

    try:
        data, usage, _ = await _embed_many(
            texts=[text],
            model=target_model,
            task_type="RETRIEVAL_QUERY",
            title=None,
            output_dimensionality=request.output_dimensionality,
        )
    except (httpx.HTTPStatusError, httpx.RequestError, ValueError) as exc:
        _raise_upstream_error(exc)

    return HintQueryEmbedResponse(
        model=target_model,
        text=text,
        embedding=data[0].embedding,
        usage=usage,
    )
