"""
NovaCut AI Cutout Engine
Smart Portrait & Subject Background Removal powered by OpenCV GrabCut & Alpha Matting.
Produces feathered, high-quality RGBA cutouts with transparent backgrounds.
"""

import os
from pathlib import Path
from typing import Dict, Any, Tuple
import cv2
import numpy as np
from PIL import Image


def remove_background(
    input_path: str,
    output_path: str,
    iterations: int = 5,
    feather_radius: int = 5,
    bbox_margin_pct: float = 0.05,
) -> Dict[str, Any]:
    """
    Isolates foreground subject using iterative Graph-Cut energy minimization (GrabCut)
    and produces a smooth, feathered transparent RGBA output image.
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Unable to read input image at: {input_path}")

    h, w = img.shape[:2]

    # Initialize mask: 0=BGD, 1=FGD, 2=PR_BGD, 3=PR_FGD
    mask = np.zeros((h, w), np.uint8)

    # Initial foreground bounding box (excluding outer margins)
    margin_x = int(w * bbox_margin_pct)
    margin_y = int(h * bbox_margin_pct)
    rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)

    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    # Run GrabCut segmentation
    cv2.grabCut(img, mask, rect, bgd_model, fgd_model, iterations, cv2.GC_INIT_WITH_RECT)

    # Foreground pixels are 1 (definite) or 3 (probable)
    fg_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype("uint8")

    # Smooth & feather edges using morphological operations and Gaussian blur
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=1)

    if feather_radius > 0:
        k_size = feather_radius * 2 + 1
        fg_mask = cv2.GaussianBlur(fg_mask, (k_size, k_size), 0)

    # Combine BGR channels with alpha mask to make 4-channel BGRA
    b, g, r = cv2.split(img)
    rgba = cv2.merge([b, g, r, fg_mask])

    out_p = Path(output_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_p), rgba)

    # Compute bounding box of foreground
    contours, _ = cv2.findContours((fg_mask > 30).astype("uint8"), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        largest = max(contours, key=cv2.contourArea)
        bx, by, bw, bh = cv2.boundingRect(largest)
    else:
        bx, by, bw, bh = 0, 0, w, h

    fg_ratio = float(np.count_nonzero(fg_mask > 30) / (w * h))

    return {
        "status": "success",
        "outputPath": str(out_p),
        "dimensions": {"width": w, "height": h},
        "foregroundBoundingBox": {"x": bx, "y": by, "width": bw, "height": bh},
        "foregroundCoverageRatio": round(fg_ratio, 4),
    }

