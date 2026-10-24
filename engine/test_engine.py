"""
NovaCut Python AI Engine Verification Test Suite
Tests AI Cutout, AI Auto-Reframe, AI Enhancer, AI Audio Beat Detection,
and FastAPI API endpoints.
"""

import os
import sys
import tempfile
from pathlib import Path
import unittest
import numpy as np
import cv2

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from ai_cutout import remove_background
from ai_reframe import compute_frame_focal_point, calculate_smooth_reframe_keyframes
from ai_enhancer import enhance_frame, enhance_image
from ai_audio import detect_audio_beats_and_waveforms
from novacut_studio import app, FFMPEG_EXE
from fastapi.testclient import TestClient


class TestNovaCutAIEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.work_dir = Path(cls.temp_dir.name)

        # 1. Create a synthetic portrait test image: green background with a red circular subject
        cls.test_img_path = cls.work_dir / "test_portrait.png"
        img = np.full((300, 300, 3), (40, 180, 40), dtype=np.uint8)  # Green bg
        cv2.circle(img, (150, 150), 60, (30, 30, 220), -1)          # Red circle foreground
        cv2.imwrite(str(cls.test_img_path), img)

        # 2. Create a synthetic test video (16:9 landscape, 30 frames) with moving subject
        cls.test_vid_path = cls.work_dir / "test_moving.mp4"
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(cls.test_vid_path), fourcc, 10.0, (640, 360))
        for i in range(20):
            frame = np.full((360, 640, 3), 30, dtype=np.uint8)
            # Moving bright circle from x=200 to x=440
            cx = int(200 + i * 12)
            cv2.circle(frame, (cx, 180), 50, (255, 200, 50), -1)
            writer.write(frame)
        writer.release()

        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.temp_dir.cleanup()

    def test_01_ai_cutout_grabcut(self):
        """Tests smart subject background removal with feathered alpha."""
        out_path = self.work_dir / "cutout_res.png"
        res = remove_background(
            input_path=str(self.test_img_path),
            output_path=str(out_path),
            iterations=3,
            feather_radius=3,
        )

        self.assertEqual(res["status"], "success")
        self.assertTrue(os.path.exists(res["outputPath"]))
        self.assertGreater(res["foregroundCoverageRatio"], 0.05)
        self.assertLess(res["foregroundCoverageRatio"], 0.8)

        # Verify RGBA 4 channels
        rgba = cv2.imread(res["outputPath"], cv2.IMREAD_UNCHANGED)
        self.assertEqual(rgba.shape[2], 4, "Output must be RGBA 4-channel image")
        # Center should be opaque (alpha > 200)
        self.assertGreater(rgba[150, 150, 3], 200)
        # Corner should be transparent (alpha < 50)
        self.assertLess(rgba[10, 10, 3], 50)

    def test_02_ai_reframe_tracking(self):
        """Tests focal center tracking and keyframe calculation for 16:9 to 9:16 reframe."""
        res = calculate_smooth_reframe_keyframes(
            video_path=str(self.test_vid_path),
            target_aspect="9:16",
            sample_interval_sec=0.2,
        )

        self.assertEqual(res["status"], "success")
        self.assertEqual(res["targetAspectRatio"], "9:16")
        self.assertGreater(len(res["keyframes"]), 2)
        self.assertGreater(res["requiredScale"], 1.5)

        # Verify keyframes contain microsecond timing and translation
        first_kf = res["keyframes"][0]
        self.assertIn("timeUs", first_kf)
        self.assertIn("translateX", first_kf)
        self.assertIn("scale", first_kf)

    def test_03_ai_enhancer_modes(self):
        """Tests all 4 AI enhancement modes: HDR, Portrait, Night, Vivid."""
        sample = cv2.imread(str(self.test_img_path))
        modes = ["hdr", "portrait", "night_enhance", "vivid"]

        for m in modes:
            enhanced = enhance_frame(sample, mode=m, intensity=1.0)
            self.assertEqual(enhanced.shape, sample.shape)
            self.assertEqual(enhanced.dtype, np.uint8)

        # Test static image file save
        out_enhance = self.work_dir / "enhanced_hdr.jpg"
        res = enhance_image(str(self.test_img_path), str(out_enhance), mode="hdr")
        self.assertEqual(res["status"], "success")
        self.assertTrue(os.path.exists(res["outputPath"]))

    def test_04_ai_audio_detector(self):
        """Tests audio analysis fallback and beat detection calculation."""
        res = detect_audio_beats_and_waveforms(str(self.test_vid_path), FFMPEG_EXE)
        self.assertIn("status", res)
        self.assertIn("waveform", res)
        self.assertEqual(len(res["waveform"]), 100)

    def test_05_fastapi_endpoints(self):
        """Tests FastAPI /health, /export, and /ai/* endpoints."""
        # /health
        h = self.client.get("/health")
        self.assertEqual(h.status_code, 200)
        data = h.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["version"], "2.0.0")

        # /ai/detect-beats (synthetic BPM test)
        b = self.client.post("/ai/detect-beats", json={"bpm": 128, "durationSec": 5.0})
        self.assertEqual(b.status_code, 200)
        b_data = b.json()
        self.assertEqual(b_data["bpm"], 128)
        self.assertGreater(len(b_data["beatDrops"]), 5)

        # /ai/remove-bg
        c = self.client.post("/ai/remove-bg", json={"imagePath": str(self.test_img_path)})
        self.assertEqual(c.status_code, 200)
        c_data = c.json()
        self.assertEqual(c_data["status"], "success")

        # /ai/enhance
        e = self.client.post("/ai/enhance", json={"imagePath": str(self.test_img_path), "mode": "hdr"})
        self.assertEqual(e.status_code, 200)
        e_data = e.json()
        self.assertEqual(e_data["status"], "success")


if __name__ == "__main__":
    unittest.main()
