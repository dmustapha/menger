# Proof surface: MENGER

Recompute tier. The reader runs one command and watches the headline claim re-derive from a
fresh clone. Nothing here is a screenshot of a number.

## The one action

```bash
bash scripts/verify.sh
```

## The claim it re-derives

**Two citations of the same document count as one independent source; two genuinely separate
origins count as two.** That is Menger's theorem evaluated over a node-split provenance DAG,
and it is the entire product.

```
CLM-1      PASS         expected=1 actual=1
CLM-2      PASS         expected=2 actual=2
```

Either number alone proves nothing. `1` without `2` is consistent with a query that returns
nothing. `2` without `1` is consistent with a naive citation count. The **pair** is the proof.

## Self-falsifying

The gate fails loudly rather than passing quietly:

- Remove the `SourceIn`/`SourceOut` split and CLM-1 returns the citation count instead of
  `1`. The gate reds.
- Change `weightProp` to `weightProperty` on `algo.SPpaths` and the engine returns a hop
  count with **no error**. CLM-3 reds on `0.21072`, and `GET /health` refuses to serve with
  **503 BOOT_ASSERTION_FAILED**.
- Re-seed with a different RNG and every expected value in `CLAIMS.md` reds.

## Full transcript

21 rows, all PASS or MEASURED, recorded at commit `327da93`:
[`evidence/claims.txt`](../evidence/claims.txt). Each row's re-derivation command is in
[`CLAIMS.md`](../CLAIMS.md).

## Gate composition

`scripts/verify.sh` is the single release gate, byte-identical in local dev and CI.

| Step | Expected |
|---|---|
| syntax, every module compiles | OK |
| no cardinal-probability vocabulary on the scoring surface | `0` hits |
| no overreach vocabulary anywhere in the engine | `0` hits |
| offline unit tier, `tests/unit/arbiter_math.test.sh` | 14/14 |
| claims re-derivation, `scripts/verify-claims.sh all` | 21 rows, all PASS |

Honest boundary: **CI has never executed.** The gate is CI-ready and green locally; the claim
"CI passes" is unproven and is not made.
