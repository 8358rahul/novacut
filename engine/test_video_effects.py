import unittest
import subprocess
import imageio_ffmpeg
from video_effects import SUPPORTED_EFFECTS, effect_filters, color_filters

class EffectTests(unittest.TestCase):
    def test_every_advertised_effect_renders_and_zero_is_identity(self):
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        for effect in SUPPORTED_EFFECTS:
            with self.subTest(effect=effect):
                self.assertEqual(effect_filters(effect, 0), '')
                filters = 'format=yuv420p' + effect_filters(effect, 0.7)
                result = subprocess.run([ffmpeg, '-v', 'error', '-f', 'lavfi', '-i',
                    'testsrc2=s=96x96:r=24:d=0.5', '-vf', filters,
                    '-f', 'null', '-'], capture_output=True, timeout=20)
                self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_color_adjustments_render(self):
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        filters = color_filters(dict(brightness=.1, contrast=1.3, saturation=.5, temperature=-.3))[1:]
        result = subprocess.run([ffmpeg, '-v', 'error', '-f', 'lavfi', '-i',
            'testsrc2=s=96x96:r=24:d=0.1', '-vf', filters, '-f', 'null', '-'], capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr.decode())

if __name__ == '__main__': unittest.main()
