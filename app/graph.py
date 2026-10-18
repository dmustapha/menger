# app/graph.py
"""The only module that touches the falkordb client.

Decision D-4 (section 2.4): the read/write split is STRUCTURAL.

  * ReadChannel wraps `Graph.ro_query` and asserts, at construction, that the bound method
    it holds is literally named `ro_query`. If a refactor ever hands it `Graph.query`, the
    process fails to start instead of silently losing containment.
  * WriteChannel's only public method takes a REGISTRY KEY, not Cypher text. There is no
    code path in MENGER that sends a caller-supplied string to GRAPH.QUERY. Adding a write
    means adding a named entry to app/cypher.py WRITES, which is a visible, reviewable act.

Probe evidence for every engine call in this file is in ARCHITECTURE.md section 3:
  P39 — ro_query(q, params) binds $params and REJECTS CREATE server-side; exact signature;
        exact exception type (redis.exceptions.ResponseError).
  P40 — the exact Graph/QueryResult/FalkorDB surface, incl. QueryResult.run_time_ms.
"""
import time
from typing import Any, Dict, List, Mapping, Optional

from falkordb import FalkorDB
from redis.exceptions import RedisError, ResponseError

from app import config, cypher
from app.errors import MengerError


class CypherLog:
    """Collects the verbatim parameterised statements executed for one decision.

    This is the raw material of the DOCKET receipt (CONTRACT.md section 2.5 `cypher[]`):
    one entry per statement, in execution order, carrying the text AS EXECUTED and the
    params AS BOUND. It is what POST /receipts/{id}/replay re-runs.

    The log stores the statement text, never a rendered/interpolated query. A receipt whose
    `query` had its params substituted in would not be replayable as a parameterised
    statement, and "replayable" is the whole claim.
    """

    def __init__(self) -> None:
        self.statements: List[Dict[str, Any]] = []

    def record(
        self,
        label: str,
        query: str,
        params: Optional[Mapping[str, Any]],
        duration_ms: int,
    ) -> None:
        self.statements.append(
            {
                "label": label,
                "read_command": config.READ_PATH,
                "query": query,
                "params": dict(params or {}),
                "duration_ms": duration_ms,
            }
        )

    def as_list(self) -> List[Dict[str, Any]]:
        return [dict(s) for s in self.statements]


class ReadChannel:
    """Every read in MENGER. GRAPH.RO_QUERY only."""

    def __init__(self, graph: Any) -> None:
        bound = graph.ro_query
        actual = getattr(bound, "__name__", "<unnamed>")
        if actual != "ro_query":
            # Fail at construction, not at request time. A process that cannot prove its
            # read path is RO_QUERY must not start: receipt.engine.read_path would be a lie.
            raise RuntimeError(
                "ReadChannel refuses to bind: expected the bound method 'ro_query', "
                f"got {actual!r}. The AF-8 containment boundary is not in effect."
            )
        self._ro = bound

    def run(
        self,
        label: str,
        query: str,
        params: Optional[Mapping[str, Any]] = None,
        log: Optional[CypherLog] = None,
    ) -> List[List[Any]]:
        """Execute one read. Returns the raw result_set (a list of rows).

        `label` is the receipt label (CONTRACT.md section 2.5 `cypher[].label`), not a
        comment: if `log` is supplied the statement lands in the receipt under this name.
        """
        started = time.perf_counter()
        try:
            result = self._ro(query, dict(params or {}))
        except ResponseError as exc:
            # P39 recorded the exact text for a write attempt through RO_QUERY:
            # "graph.RO_QUERY is to be executed only on read-only queries".
            # Any ResponseError here is an engine-level refusal or a Cypher error; both are
            # 503 ENGINE_UNAVAILABLE to the caller, with the engine's own words in `reason`.
            raise MengerError.engine_unavailable(f"{label}: {exc}") from exc
        except RedisError as exc:
            # Connection-level: the container is down, the socket died, the 1000 ms
            # server-side TIMEOUT (P0) fired. Same contract code, different cause.
            raise MengerError.engine_unavailable(f"{label}: {type(exc).__name__}: {exc}") from exc

        # QueryResult.run_time_ms is the ENGINE's own measurement (P40). Prefer it over the
        # wall clock, which includes client-side RESP decoding, and fall back to the wall
        # clock only if the client ever stops exposing it.
        engine_ms = getattr(result, "run_time_ms", None)
        if engine_ms is None:
            engine_ms = (time.perf_counter() - started) * 1000.0
        duration_ms = int(round(float(engine_ms)))

        if log is not None:
            log.record(label, query, params, duration_ms)
        return list(result.result_set or [])


class WriteChannel:
    """Every write in MENGER. Takes a registry KEY, never Cypher text."""

    def __init__(self, graph: Any, registry: Mapping[str, str]) -> None:
        self._query = graph.query
        self._registry = dict(registry)

    def run(self, key: str, params: Optional[Mapping[str, Any]] = None) -> List[List[Any]]:
        """Execute the registered write statement `key`.

        There is deliberately NO overload that accepts a query string. If you are here
        because you need a new write, add it to app/cypher.py WRITES and call it by name.
        """
        if key not in self._registry:
            raise RuntimeError(
                f"WriteChannel: {key!r} is not a registered write. "
                "Writes must be named entries in app/cypher.py WRITES (Decision D-4)."
            )
        query = self._registry[key]
        try:
            result = self._query(query, dict(params or {}))
        except ResponseError as exc:
            raise MengerError.engine_unavailable(f"write[{key}]: {exc}") from exc
        except RedisError as exc:
            raise MengerError.engine_unavailable(
                f"write[{key}]: {type(exc).__name__}: {exc}"
            ) from exc
        return list(result.result_set or [])


class Engine:
    """One connection, two channels, and the engine identity block."""

    def __init__(self, graph_name: Optional[str] = None) -> None:
        self.graph_name = graph_name or config.GRAPH_NAME
        try:
            self._db = FalkorDB.from_url(config.REDIS_URL)   # P40: from_url exists
            self._graph = self._db.select_graph(self.graph_name)
        except RedisError as exc:
            raise MengerError.engine_unavailable(
                f"connect {config.REDIS_URL}: {type(exc).__name__}: {exc}"
            ) from exc
        self.read = ReadChannel(self._graph)
        self.write = WriteChannel(self._graph, cypher.WRITES)

    def identity(self) -> Dict[str, str]:
        """CONTRACT.md section 2.5 `engine` / section 2.8 `engine`, byte for byte."""
        return {
            "image": config.ENGINE_IMAGE,
            "graph": self.graph_name,
            "read_path": config.READ_PATH,
        }

    def write_channel(self, registry: Mapping[str, str]) -> WriteChannel:
        """A WriteChannel over a DIFFERENT named registry.

        ONE caller: app/seed.py, whose corpus writes are bulk statements that have no place
        in the server's seven-entry WRITES registry (adding them would mean the request path
        could execute 'delete everything'). The seed still passes KEYS, never text — its
        registry is app/seed.py SEED_WRITES — so Decision D-4's property holds for the seed
        too: there is no method in MENGER that accepts caller-supplied write Cypher.
        """
        return WriteChannel(self._graph, registry)

    def raw_graph(self) -> Any:
        """The underlying client Graph object.

        TWO callers, both named:
          * app/counterfactual.py — needs Graph.copy(). GRAPH.COPY is flagged `write` by the
            server (P28), so it can never go through RO_QUERY and cannot be expressed as a
            Cypher statement in the WRITES registry (section 10).
          * app/seed.py — needs Graph.delete() and Graph.create_node_range_index(), which are
            client methods, not Cypher, and so cannot live in a statement registry at all
            (section 7.7). The seed is not reachable from a request path (section 5.2).
        The escape hatch is named and documented at both use sites; it is not a general door.
        """
        return self._graph


_ENGINE: Optional[Engine] = None


def engine() -> Engine:
    """Process-wide singleton. Built lazily so that an unreachable engine surfaces as
    503 ENGINE_UNAVAILABLE on a request rather than as a stack trace at import time."""
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = Engine()
    return _ENGINE
