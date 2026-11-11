"""Narration for demo.cjs via Gemini TTS (through the temporary musicprompt-tts edge function).
usage: python3 -I tts.py <voice> <out.mp3> <text> [rate]   (same interface as the Edge tts.py)"""
import base64, json, subprocess, sys, time, urllib.request, os, ssl
URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/functions/v1/musicprompt-tts'
STYLE = 'קראי בעברית, בקול חם, חי וטבעי, כמו קריינית של סרט תדמית קצר. קצב שיחה זורם, עם חיוך בקול, בלי הטעמה מוגזמת:'
def main(voice, out, text, rate='+0%'):
    ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if os.path.exists('/root/.ccr/ca-bundle.crt') else None
    last = ''
    for attempt in range(4):
        try:
            req = urllib.request.Request(URL, data=json.dumps({'token': os.environ.get('MP_TTS_TOKEN', ''), 'text': text, 'voice': voice, 'style': STYLE}).encode(), headers={'Content-Type': 'application/json'})
            j = json.loads(urllib.request.urlopen(req, timeout=120, context=ctx).read())
            pcm = base64.b64decode(j['audio'])
            sr = '24000'
            for part in j.get('mime', '').split(';'):
                if 'rate=' in part: sr = part.split('=')[1]
            p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', sr, '-ac', '1', '-i', 'pipe:0', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-b:a', '128k', out], input=pcm)
            if p.returncode == 0 and os.path.getsize(out) > 1000: return
            last = 'ffmpeg failed'
        except Exception as e:
            last = str(e)
        time.sleep(3 * (attempt + 1))
    sys.exit('tts failed: ' + last)
if __name__ == '__main__': main(*sys.argv[1:5])
