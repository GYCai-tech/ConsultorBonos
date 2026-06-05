from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import sqlalchemy
import os

load_dotenv(override=True)

_engine = None

def get_sqlserver_engine():
    global _engine
    if _engine is None:
        host = os.getenv("SQLSERVER_HOST")
        db   = os.getenv("SQLSERVER_DB")
        user = os.getenv("SQLSERVER_USER")
        pwd  = os.getenv("SQLSERVER_PASS")
        url  = (
            f"mssql+pyodbc://{user}:{pwd}@{host}/{db}"
            "?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        _engine = sqlalchemy.create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=1)
    return _engine

app = FastAPI(title="Consultor Bonos API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # red interna — sin restricción de origen
    allow_methods=["GET"],
    allow_headers=["*"],
)

QUERY = """
SELECT
    o.IdOrden,
    ob.IdBono,
    ob.Matricula,
    a_matricula.Descrip     AS descrip_matricula,
    ob.IdEstado             AS estado_bono,
    o.IdCliente,
    o.IdArticulo            AS idarticulo_orden,
    a_salida.Descrip        AS descrip_articulo,
    ob.Area,
    o.Usuario
FROM Ordenes_Bonos_Salidas obs
    JOIN Ordenes o              ON obs.IdOrden  = o.IdOrden
    JOIN Ordenes_Bonos ob       ON obs.IdOrden  = ob.IdOrden
                               AND obs.IdBono   = ob.IdBono
    JOIN Articulos a_salida     ON obs.IdArticulo  = a_salida.IdArticulo
    JOIN Articulos a_matricula  ON ob.Matricula    = a_matricula.IdArticulo
WHERE o.IdEstado  = :estado_orden
  {filtro_bono}
  {filtro_matricula}
ORDER BY o.IdOrden DESC
"""


def _row_to_dict(row):
    return dict(row._mapping)


@app.get("/bonos")
def get_bonos(
    matricula:    str | None = Query(None,  description="Matrícula de máquina (opcional)"),
    estado_bono:  int | None = Query(None,  description="Estado del bono (0=Espera, 1=Activo, 2=Finalizado). Omitir para todos."),
    estado_orden: int        = Query(1,     description="Estado de la orden (1=Activa, 3=Bloqueada)"),
):
    filtro_bono      = "AND ob.IdEstado = :estado_bono" if estado_bono is not None else ""
    filtro_matricula = "AND ob.Matricula = :matricula"  if matricula else ""
    query = QUERY.format(filtro_bono=filtro_bono, filtro_matricula=filtro_matricula)
    params = {"estado_orden": estado_orden}
    if estado_bono is not None:
        params["estado_bono"] = estado_bono
    if matricula:
        params["matricula"] = matricula

    try:
        engine = get_sqlserver_engine()
        with engine.connect() as conn:
            result = conn.execute(sqlalchemy.text(query), params)
            rows = [_row_to_dict(r) for r in result]
        return {"total": len(rows), "bonos": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/matriculas")
def get_matriculas():
    """Devuelve las matrículas distintas que tienen bonos en órdenes activas o bloqueadas."""
    query = """
        SELECT DISTINCT ob.Matricula, a.Descrip
        FROM Ordenes_Bonos ob
            JOIN Ordenes o          ON ob.IdOrden   = o.IdOrden
            JOIN Articulos a        ON ob.Matricula = a.IdArticulo
        WHERE o.IdEstado IN (1, 3)
        ORDER BY ob.Matricula
    """
    try:
        engine = get_sqlserver_engine()
        with engine.connect() as conn:
            result = conn.execute(sqlalchemy.text(query))
            rows = [_row_to_dict(r) for r in result]
        return {"matriculas": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
