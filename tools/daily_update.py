"""NeuroUnknown daily literature watch. Runs every day at 12:00 Europe/Berlin (CET/CEST) via GitHub Actions, or on demand.

What it does (Python standard library only, NCBI E-utilities, no API key, <= 3 requests/second):
1. For every gene flagged "overlooked", checked by hand, or marked "few papers, database link only" in assets/data/atlas.json,
   re-counts PubMed records with the pipeline's query ("SYMBOL"[tiab]) and an alias-aware query (official symbol OR former
   symbols OR aliases; may include homonyms).
2. If a gene now exceeds the flag threshold (60 records), its flag is removed and a dated note is added. Flags are never
   added automatically: new flags need the full pipeline and a manual check.
3. Lists new PubMed records (last 2 days by entry date) for the flagged genes and for fixed topics (self-disorders, sense of
   agency in schizophrenia, the catalog diseases' genetics, and our seven diseases in a fixed list of selected journals, published on cite.html), with titles from
   esummary, and counts all new records on our seven diseases in the last 24 hours (shown in the site's news ticker).
4. Writes assets/data/updates.json (read by the home page) and updates atlas.json meta.
Failures are recorded as NOT ACCESSED; nothing is imputed.
Usage: python3 tools/daily_update.py [--force]   (without --force it exits unless it is 12:xx in Europe/Berlin)
"""
import datetime as dt
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

SITE = Path(__file__).resolve().parents[1]
ATLAS = SITE / "assets/data/atlas.json"
OUT = SITE / "assets/data/updates.json"
EU = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
THRESHOLD = 60
TOPICS = {
    "Self-disorders": '("self-disorder*"[tiab] OR "ipseity"[tiab] OR "basic self"[tiab] OR "minimal self"[tiab]) AND (schizophren*[tiab] OR psychosis[tiab])',
    "Sense of agency": '("sense of agency"[tiab] OR "corollary discharge"[tiab] OR "passivity"[tiab]) AND (schizophren*[tiab] OR psychosis[tiab])',
    "Schizophrenia genetics": 'schizophren*[ti] AND (exome[tiab] OR "rare variant*"[tiab] OR GWAS[tiab])',
    "ALS genetics": '("amyotrophic lateral sclerosis"[ti]) AND (gene[ti] OR genetic*[ti] OR variant*[ti])',
}
DISEASE_TI = ('(schizophreni*[ti] OR psychosis[ti] OR bipolar[ti] OR depressi*[ti] OR autis*[ti] OR alzheimer*[ti] OR parkinson*[ti] '
              'OR "amyotrophic lateral sclerosis"[ti] OR "motor neuron disease"[ti])')
MAJOR = ('("Nature"[ta] OR "Science"[ta] OR "Cell"[ta] OR "N Engl J Med"[ta] OR "Lancet"[ta] OR "Lancet Neurol"[ta] OR "Lancet Psychiatry"[ta] '
         'OR "JAMA"[ta] OR "JAMA Neurol"[ta] OR "JAMA Psychiatry"[ta] OR "Nat Med"[ta] OR "Nat Neurosci"[ta] OR "Neuron"[ta] OR "Nat Genet"[ta] '
         'OR "Mol Psychiatry"[ta] OR "Am J Psychiatry"[ta] OR "Brain"[ta] OR "BMJ"[ta])')
TOPICS["Selected journals"] = DISEASE_TI + " AND " + MAJOR
ALL_TOPICS = DISEASE_TI  # used only to count how many new records appeared in our diseases
_last = [0.0]


def get(endpoint, **params):
    params.update(db="pubmed", tool="neurounknown_daily")
    url = EU + endpoint + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        wait = 0.35 - (time.monotonic() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.monotonic()
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return r.read().decode()
        except Exception:  # network or rate-limit error: back off and retry
            time.sleep(2 * (attempt + 1))
    return None


def count(term):
    x = get("esearch.fcgi", term=term, rettype="count")
    m = re.search(r"<Count>(\d+)</Count>", x or "")
    return int(m.group(1)) if m and "<ERROR" not in x else None


SCANNED = [0]


def recent(term, days=2, n=5):
    x = get("esearch.fcgi", term=term, reldate=days, datetype="edat", retmax=n, sort="pub_date", retmode="json")
    try:
        r = json.loads(x)["esearchresult"]
        SCANNED[0] += int(r.get("count", 0))
        return r["idlist"]
    except Exception:
        return None


def summaries(pmids):
    if not pmids:
        return {}
    x = get("esummary.fcgi", id=",".join(pmids), retmode="json")
    try:
        res = json.loads(x)["result"]
        return {p: dict(title=res[p].get("title", ""), journal=res[p].get("source", ""), date=res[p].get("pubdate", "")) for p in pmids if p in res}
    except Exception:
        return {}


def main():
    now = dt.datetime.now(ZoneInfo("Europe/Berlin"))
    if "--force" not in sys.argv and now.hour != 12:
        print("Not 12:00 in Europe/Berlin (", now.isoformat(), "); exiting. Use --force to run anyway.")
        return
    atlas = json.loads(ATLAS.read_text(encoding="utf-8"))
    prev = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    genes = {}
    for d in atlas["diseases"]:
        for r in d["genes"]:
            if r.get("over") or r.get("watch_note") or r.get("dbfew"):
                genes.setdefault(r["g"], []).append((d, r))
    changes, unflagged, failed, new = [], [], [], []
    for sym, rows in sorted(genes.items()):
        c = count(f'"{sym}"[tiab]')
        if c is None:
            failed.append(sym)
            if len(failed) >= 5 and not changes and len(failed) == len([g for g in genes if g <= sym]):
                sys.exit("PubMed not reachable (first 5 queries failed); nothing written.")
            continue
        old = rows[0][1].get("pm")
        if old is not None and c != old:
            changes.append(dict(gene=sym, before=old, now=c))
        al = rows[0][1].get("al") or []
        ca = count("(" + " OR ".join(f'"{x}"[tiab]' for x in [sym] + al) + ")") if al else None
        for d, r in rows:
            r["pm"] = c
            if ca is not None:
                r["pma"] = ca
            if r.get("over") and c > THRESHOLD:
                r["over"] = False
                r["studied_note"] = f"Flag removed automatically on {now.date().isoformat()}: {c} PubMed records, above the threshold of {THRESHOLD}."
                r["studied_pmids"] = []
                unflagged.append(sym)
        if old is not None and c > old:
            ids = recent(f'"{sym}"[tiab]', days=3, n=3) or []
            new += [dict(pmid=p, topic=sym) for p in ids]
    x = get("esearch.fcgi", term=ALL_TOPICS, reldate=1, datetype="edat", rettype="count")
    m_ = re.search(r"<Count>(\d+)</Count>", x or "")
    new_in_diseases = int(m_.group(1)) if m_ else None
    for topic, term in TOPICS.items():
        ids = recent(term, n=8 if topic == "Selected journals" else 5)
        if ids is None:
            failed.append(topic)
            continue
        new += [dict(pmid=p, topic=topic) for p in ids]
    seen, uniq = set(), []
    for x in new:
        if x["pmid"] not in seen:
            seen.add(x["pmid"]); uniq.append(x)
    meta = summaries([x["pmid"] for x in uniq][:40])
    for x in uniq:
        x.update(meta.get(x["pmid"], dict(title="(title NOT ACCESSED)", journal="", date="")))
    uniq.sort(key=lambda x: x["topic"] != "Selected journals")
    for d in atlas["diseases"]:
        d["n_over"] = sum(1 for r in d["genes"] if r.get("over"))
    n_q = len(genes) + len(TOPICS)
    summary_extra = f" {new_in_diseases:,} new PubMed records on our seven diseases in the last 24 hours." if new_in_diseases is not None else ""
    atlas["meta"]["daily_check"] = dict(checked=now.isoformat(timespec="minutes"), genes_rechecked=len(genes) - len(failed), unflagged=unflagged)
    ATLAS.write_text(json.dumps(atlas, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    summary = (f"Re-counted PubMed records for {len(genes) - len([f for f in failed if f in genes])} flagged or watched genes and searched {len(TOPICS)} topics. "
               f"{len(changes)} gene counts changed; {len(unflagged)} flag(s) removed; {len(uniq)} new records listed.")
    summary += summary_extra
    if failed:
        summary += f" NOT ACCESSED: {', '.join(failed[:10])}."
    out = dict(checked=dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
               checked_local=now.strftime("%d %b %Y, %H:%M %Z"), queries=n_q + 1, summary=summary,
               genes_rechecked=len(genes) - len([f for f in failed if f in genes]), records_in_topics=SCANNED[0],
               new_in_our_diseases_24h=new_in_diseases,
               count_changes=changes, unflagged=unflagged, new_papers=uniq,
               history=([dict(date=now.date().isoformat(), changes=len(changes), new=len(uniq), diseases_24h=new_in_diseases)] + prev.get("history", []))[:60])
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
