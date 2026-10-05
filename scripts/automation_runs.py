"""Durable run outcomes; failure to record is a failed job, never a green run."""
import json
from datetime import datetime, timezone


def run_tracked(db, job, pipeline):
    # Both timestamps use this worker's clock; DB/worker skew must not fail a short run.
    started = db.table('automation_runs').insert({
        'job': job, 'status': 'running', 'started_at': datetime.now(timezone.utc).isoformat()
    }).execute()
    if not started.data:
        raise RuntimeError('Run tracking insert returned no row')
    run_id = started.data[0]['id']
    counts = {}
    status = 'failed'
    try:
        status = pipeline(db, counts)
        return {'job': job, 'status': status, 'counts': counts}
    finally:
        payload = {'status': status, 'counts': counts,
                   'finished_at': datetime.now(timezone.utc).isoformat()}
        saved = db.table('automation_runs').update(payload).eq('id', run_id).execute()
        if not saved.data:
            raise RuntimeError('Run tracking update returned no row')
        print(json.dumps({'job': job, **payload}, ensure_ascii=False))
