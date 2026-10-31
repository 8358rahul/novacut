"""Real render checks, independent of proprietary application binaries."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
import imageio_ffmpeg
import numpy as np
from timeline_render import build_render_command


class RenderTests(unittest.TestCase):
    def test_timeline_gap_speed_audio_and_mute(self):
        ff = imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as tmp:
            source = str(Path(tmp) / 'source.mp4')
            subprocess.run([ff, '-y', '-f', 'lavfi', '-i', 'color=red:s=64x64:r=24:d=2',
                            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
                            '-c:v', 'libx264', '-c:a', 'aac', '-shortest', source],
                           check=True, capture_output=True)
            clip = dict(type='video', uri=source, startUs=500000, durationUs=1000000,
                        sourceStartUs=0, speed=2, volume=1)
            for volume in [1, 0]:
                clip['volume'] = volume
                output = str(Path(tmp) / f'render-{volume}.mp4')
                result = subprocess.run(build_render_command(ff, [clip], output, 64, 64, 24, 'standard'), capture_output=True)
                self.assertEqual(result.returncode, 0, result.stderr.decode())
                video = subprocess.run([ff, '-i', output, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
                frames = np.frombuffer(video.stdout, dtype=np.uint8).reshape(-1, 64, 64, 3)
                self.assertAlmostEqual(len(frames) / 24, 1.5, delta=1/24)
                self.assertLess(frames[2].mean(), 5)  # timeline gap is black
                self.assertGreater(frames[20, :, :, 0].mean(), 200)
                audio = subprocess.run([ff, '-i', output, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], capture_output=True, check=True)
                samples = np.frombuffer(audio.stdout, dtype=np.float32)
                self.assertLess(np.abs(samples[:15000]).max(), 0.001)
                peak = np.abs(samples[30000:60000]).max()
                self.assertGreater(peak, 0.01) if volume else self.assertLess(peak, 0.001)

    def test_upload_export_download(self):
        with tempfile.TemporaryDirectory() as tmp:
            os.environ['NOVACUT_DATA_DIR'] = tmp
            from fastapi.testclient import TestClient
            from novacut_studio import app
            from PIL import Image
            import io
            image = io.BytesIO()
            Image.new('RGB', (32, 32), 'blue').save(image, format='PNG')
            client = TestClient(app)
            uploaded = client.post('/ai/upload', files={'file': ('photo.png', image.getvalue(), 'image/png')})
            self.assertEqual(uploaded.status_code, 200)
            job = client.post('/export', json={'projectId': 'test', 'resolution': '720p', 'clips': [
                dict(id='c', trackId='t', type='image', uri=uploaded.json()['downloadUrl'], durationUs=100000,
                     visualEffect='film_grain', visualEffectIntensity=0.5,
                     colorAdjustments=dict(brightness=0.1, contrast=1.1, saturation=0.8, temperature=0.2))
            ]})
            self.assertEqual(job.status_code, 200, job.text)
            status = client.get('/export/' + job.json()['jobId']).json()
            self.assertEqual(status['status'], 'completed', status)
            download = client.get('/download/' + status['filename'])
            self.assertEqual(download.status_code, 200)
            self.assertGreater(len(download.content), 100)
            self.assertEqual(client.post('/export', json={'projectId': 'empty', 'clips': []}).status_code, 422)


if __name__ == '__main__':
    unittest.main()
