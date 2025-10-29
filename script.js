tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        "primary-text": "var(--primary-text-color)",
        secondary: "var(--secondary-color)",
        "dark-bg": "var(--dark-bg-color)",
        "card-bg": "var(--card-bg-color)",
        "text-color": "var(--text-color)",
        "text-muted": "var(--text-muted-color)",
        "border-color": "var(--border-color)",
      },
    },
  },
};
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Tippy.js
  if (typeof tippy === "function") {
    tippy("[title]", {
      content: (reference) => reference.getAttribute("title"),
      theme: "material",
      arrow: false,
      animation: "scale-subtle",
    });
  } else {
    console.error("Tippy.js did not load.");
  }

  const fileInput = document.getElementById("fileInput");
  const canvas = document.getElementById("imageCanvas");
  const ctx = canvas.getContext("2d");
  const downloadButton = document.getElementById("downloadButton");
  const changeImageButton = document.getElementById("changeImageButton");
  const statusMessage = document.getElementById("statusMessage");
  const canvasContainer = document.getElementById("canvas-container");
  const centerUploadArea = document.getElementById("centerUploadArea");
  const cropButton = document.getElementById("cropButton");
  const rotateButton = document.getElementById("rotateButton");
  const flipHorizontalButton = document.getElementById("flipHorizontalButton");
  const flipVerticalButton = document.getElementById("flipVerticalButton");
  const cropSelection = document.getElementById("cropSelection");
  const resetButton = document.getElementById("resetButton");
  const cropActions = document.getElementById("crop-actions");
  const confirmCrop = document.getElementById("confirmCrop");
  const cancelCrop = document.getElementById("cancelCrop");

  // Drawing elements
  const drawModeButton = document.getElementById("drawModeButton");
  const drawingColorPicker = document.getElementById("drawingColorPicker");
  const brushSizeSlider = document.getElementById("brushSize");

  let currentImage = null;
  let originalImage = null;
  let rotationAngle = 0;
  let flipH = 1;
  let flipV = 1;
  const filterSettings = {
    exposure: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    highlight: 0,
    shadow: 0,
  };
  let isCropping = false;
  let cropStartX, cropStartY;
  let cropRect = { x: 0, y: 0, width: 0, height: 0 };

  // Drawing state
  let isDrawingMode = false;
  let drawingColor = "#00BCD4";
  let brushSize = 5;
  let drawnStrokes = []; // Stores objects like { color: string, size: number, points: [{x,y}, ...] }
  let isDrawingStroke = false; // To track if a stroke is currently being drawn

  function buildFilterString() {
    let filter = `brightness(${filterSettings.exposure}%) contrast(${filterSettings.contrast}%) saturate(${filterSettings.saturation}%)`;
    if (filterSettings.blur > 0) {
      filter += ` blur(${filterSettings.blur}px)`;
    }
    return filter;
  }

  function applyPixelFilters(imageData) {
    const data = imageData.data;
    const highlight = filterSettings.highlight;
    const shadow = filterSettings.shadow;

    if (highlight === 0 && shadow === 0) {
      return; // No change needed
    }

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Apply highlights
      if (highlight !== 0) {
        const factor = highlight / 100;
        r = r + (255 - r) * factor;
        g = g + (255 - g) * factor;
        b = b + (255 - b) * factor;
      }

      // Apply shadows
      if (shadow !== 0) {
        const factor = shadow / 100;
        r = r * (1 + factor);
        g = g * (1 + factor);
        b = b * (1 + factor);
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  function applyCssFilters() {
    if (currentImage) {
      const filter = buildFilterString();
      canvas.style.filter = filter;
    }
  }

  function drawImageOnCanvas() {
    if (!currentImage) return;
    const imgWidth = currentImage.naturalWidth || currentImage.width;
    const imgHeight = currentImage.naturalHeight || currentImage.height;

    // Create a temporary canvas to draw the base image
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Draw image with transformations on temp canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(flipH, flipV);
    ctx.rotate((rotationAngle * Math.PI) / 180);
    ctx.drawImage(
      currentImage,
      -imgWidth / 2,
      -imgHeight / 2,
      imgWidth,
      imgHeight
    );
    ctx.restore();

    // Apply pixel-based filters (Highlights/Shadows)
    if (filterSettings.highlight !== 0 || filterSettings.shadow !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyPixelFilters(imageData);
      ctx.putImageData(imageData, 0, 0);
    }

    // Apply CSS-based filters (Exposure, Contrast, etc.)
    applyCssFilters();

    // Redraw strokes over the pixel-adjusted image
    redrawStrokes();
  }
  function redrawStrokes() {
    // Draw all stored strokes
    drawnStrokes.forEach((stroke) => {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round"; // Added for smoother corners
      ctx.stroke();
    });
  }

  let statusTimeout;
  function updateStatus(message) {
    if (statusMessage) {
      statusMessage.textContent = message;
      clearTimeout(statusTimeout);
      statusTimeout = setTimeout(() => {
        if (statusMessage) statusMessage.textContent = "";
      }, 3000);
    }
  }

  function toggleTransformationButtons(enabled) {
    if (rotateButton) rotateButton.disabled = !enabled;
    if (flipHorizontalButton) flipHorizontalButton.disabled = !enabled;
    if (flipVerticalButton) flipVerticalButton.disabled = !enabled;
    if (cropButton) cropButton.disabled = !enabled;
    if (resetButton) resetButton.disabled = !enabled;
    if (downloadButton) downloadButton.disabled = !enabled;
    if (drawModeButton) drawModeButton.disabled = !enabled;
    if (drawingColorPicker) drawingColorPicker.disabled = !enabled;
    if (brushSizeSlider) brushSizeSlider.disabled = !enabled;
    if (changeImageButton)
      changeImageButton.style.display = enabled ? "flex" : "none";

    if (!enabled) {
      // If disabling all transformations, also disable drawing mode
      if (isDrawingMode) toggleDrawingMode();
    }
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (currentImage) {
        resetAllEdits(true);
      }
      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          currentImage = img;
          originalImage = img;
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          applyCssFilters();
          toggleTransformationButtons(true);
          canvas.classList.remove("hidden");
          if (centerUploadArea) centerUploadArea.classList.add("hidden");
          updateStatus("Image loaded successfully.");
        };
        img.onerror = function () {
          updateStatus("Error loading image.");
          toggleTransformationButtons(false);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (changeImageButton) {
    changeImageButton.addEventListener("click", () => {
      if (fileInput) fileInput.click();
    });
  }

  document
    .querySelectorAll('#controls input[type="range"]')
    .forEach((slider) => {
      if (slider) {
        slider.addEventListener("input", (e) => {
          const id = e.target.id;
          let value = e.target.value;
          if (id === "blur") {
            filterSettings[id] = parseFloat(value);
          } else {
            // Handles exposure, contrast, saturation, highlight, shadow
            filterSettings[id] = parseInt(value);
          }
          applyCssFilters();
        });
      }
    });

  // Separate listener for pixel-based filters to trigger a full redraw
  document.querySelectorAll("#highlight, #shadow").forEach((slider) => {
    if (slider) {
      slider.addEventListener("input", (e) => {
        const id = e.target.id;
        filterSettings[id] = parseInt(e.target.value);
        drawImageOnCanvas();
      });
    }
  });

  // Event listeners for drawing controls
  if (drawModeButton) {
    drawModeButton.addEventListener("click", toggleDrawingMode);
  }
  if (drawingColorPicker) {
    drawingColorPicker.addEventListener("input", (e) => {
      drawingColor = e.target.value;
    });
  }
  if (brushSizeSlider) {
    brushSizeSlider.addEventListener("input", (e) => {
      brushSize = parseInt(e.target.value);
    });
  }

  function toggleDrawingMode() {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
      drawModeButton.classList.add("active-transform-button");
      // Disable cropping mode if active
      if (isCropping) exitCropMode(false);
      canvas.style.cursor = "crosshair";
      updateStatus("Drawing mode activated.");
    } else {
      drawModeButton.classList.remove("active-transform-button");
      canvas.style.cursor = "default";
      updateStatus("Drawing mode deactivated.");
    }
    // Ensure canvas is visible if an image is loaded
    if (currentImage && canvas.classList.contains("hidden")) {
      canvas.classList.remove("hidden");
    }
  }

  function redrawImageWithTransformations() {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    const imgWidth = currentImage.naturalWidth || currentImage.width;
    const imgHeight = currentImage.naturalHeight || currentImage.height;
    if (rotationAngle === 90 || rotationAngle === 270) {
      tempCanvas.width = imgHeight;
      tempCanvas.height = imgWidth;
    } else {
      tempCanvas.width = imgWidth;
      tempCanvas.height = imgHeight;
    }
    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.scale(flipH, flipV);
    tempCtx.rotate((rotationAngle * Math.PI) / 180);
    tempCtx.drawImage(
      currentImage,
      -imgWidth / 2,
      -imgHeight / 2,
      imgWidth,
      imgHeight
    );
    tempCtx.restore();
    const newImage = new Image();
    newImage.onload = () => {
      currentImage = newImage;
      canvas.width = currentImage.width;
      canvas.height = currentImage.height;
      drawImageOnCanvas();
    };
    newImage.src = tempCanvas.toDataURL();
  }

  if (rotateButton) {
    rotateButton.addEventListener("click", () => {
      if (isCropping) exitCropMode(false);
      if (isDrawingMode) toggleDrawingMode(); // Disable drawing mode if active
      if (!currentImage) return;
      rotationAngle = (rotationAngle + 90) % 360;
      redrawImageWithTransformations();
      updateStatus(`Image rotated to ${rotationAngle}°`);
    });
  }

  if (flipHorizontalButton) {
    flipHorizontalButton.addEventListener("click", () => {
      if (isCropping) exitCropMode(false);
      if (isDrawingMode) toggleDrawingMode(); // Disable drawing mode if active
      if (!currentImage) return;
      flipH *= -1;
      redrawImageWithTransformations();
      updateStatus(
        flipH === -1 ? "Image flipped horizontally" : "Horizontal flip removed"
      );
    });
  }

  if (flipVerticalButton) {
    flipVerticalButton.addEventListener("click", () => {
      if (isCropping) exitCropMode(false);
      if (isDrawingMode) toggleDrawingMode(); // Disable drawing mode if active
      if (!currentImage) return;
      flipV *= -1;
      redrawImageWithTransformations();
      updateStatus(
        flipV === -1 ? "Image flipped vertically" : "Vertical flip removed"
      );
    });
  }

  function resetAllEdits(isNewImage = false) {
    if (!originalImage && !isNewImage) return;

    document.getElementById("exposure").value = 100;
    document.getElementById("contrast").value = 100;
    document.getElementById("saturation").value = 100;
    document.getElementById("blur").value = 0;
    document.getElementById("highlight").value = 0;
    document.getElementById("shadow").value = 0;

    Object.assign(filterSettings, {
      exposure: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      highlight: 0,
      shadow: 0,
    });

    rotationAngle = 0;
    flipH = 1;
    flipV = 1;
    drawnStrokes = []; // Clear all drawn strokes

    exitCropMode(false);
    if (isDrawingMode) toggleDrawingMode(); // Exit drawing mode

    if (isNewImage) {
      currentImage = null;
      originalImage = null;
      canvas.classList.add("hidden");
      if (centerUploadArea) centerUploadArea.classList.remove("hidden");
      toggleTransformationButtons(false);
      updateStatus("");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      currentImage = originalImage;
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      drawImageOnCanvas();
      updateStatus("All edits have been reset.");
    }
  }

  function applyCrop() {
    if (!currentImage || cropRect.width === 0 || cropRect.height === 0) {
      updateStatus("No valid crop area selected.");
      return;
    }
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = cropRect.width;
    tempCanvas.height = cropRect.height;
    tempCtx.drawImage(
      currentImage,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    );
    const newImage = new Image();
    newImage.onload = () => {
      currentImage = newImage;
      canvas.width = currentImage.width;
      canvas.height = currentImage.height;
      drawImageOnCanvas();
      updateStatus("Image cropped successfully.");
    };
    newImage.src = tempCanvas.toDataURL();
  }

  function exitCropMode(apply = false) {
    if (apply && cropRect.width > 0 && cropRect.height > 0) {
      applyCrop();
    }
    isCropping = false;
    cropActions.classList.add("hidden");
    cropSelection.style.display = "none";
    cropButton.classList.remove("active-transform-button");
    if (!isDrawingMode) {
      // Only reset cursor if not in drawing mode
      canvas.style.cursor = "default";
    }
  }

  if (cropButton) {
    cropButton.addEventListener("click", () => {
      if (!currentImage) return;
      if (isDrawingMode) toggleDrawingMode(); // Disable drawing mode if active
      if (isCropping) return;
      isCropping = true;
      updateStatus("Crop mode activated. Drag to select area.");
      cropButton.classList.add("active-transform-button");
      cropRect = { x: 0, y: 0, width: 0, height: 0 };
      cropSelection.style.width = "0px";
      cropSelection.style.height = "0px";
      cropSelection.style.left = "0px";
      cropSelection.style.top = "0px";
      canvas.style.cursor = "crosshair";
    });
  }

  cropActions.addEventListener("mousedown", (e) => e.stopPropagation());
  confirmCrop.addEventListener("click", () => exitCropMode(true));
  cancelCrop.addEventListener("click", () => exitCropMode(false));

  let isDrawing = false; // This variable is for cropping selection
  let startX, startY;
  if (canvasContainer) {
    canvasContainer.addEventListener("mousedown", (e) => {
      if (!currentImage) return;

      if (isDrawingMode) {
        isDrawingStroke = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        currentStroke = {
          color: drawingColor,
          size: brushSize,
          points: [{ x, y }],
        };
        drawnStrokes.push(currentStroke);
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (isCropping) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        startX = (e.clientX - rect.left) * scaleX;
        startY = (e.clientY - rect.top) * scaleY;
        isDrawing = true;
        cropSelection.style.display = "block";
        cropActions.classList.add("hidden");
        cropSelection.style.left = `${e.clientX - rect.left}px`;
        cropSelection.style.top = `${e.clientY - rect.top}px`;
        cropSelection.style.width = "0px";
        cropSelection.style.height = "0px";
      }
    });

    canvasContainer.addEventListener("mousemove", (e) => {
      if (!currentImage) return;

      if (isDrawingMode && isDrawingStroke) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        currentStroke.points.push({ x, y });
        ctx.lineTo(x, y);
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (isCropping && isDrawing) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;
        const containerRect = canvasContainer.getBoundingClientRect();
        const startLeft = startX / scaleX + rect.left - containerRect.left;
        const startTop = startY / scaleY + rect.top - containerRect.top;
        const mouseLeft = e.clientX - containerRect.left;
        const mouseTop = e.clientY - containerRect.top;

        const selWidth = Math.abs(mouseLeft - startLeft);
        const selHeight = Math.abs(mouseTop - startTop);

        cropSelection.style.left = `${Math.min(startLeft, mouseLeft)}px`;
        cropSelection.style.top = `${Math.min(startTop, mouseTop)}px`;
        cropSelection.style.width = `${selWidth}px`;
        cropSelection.style.height = `${selHeight}px`;

        const width = currentX - startX;
        const height = currentY - startY;
        cropRect = {
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width: Math.abs(width),
          height: Math.abs(height),
        };
      }
    });

    canvasContainer.addEventListener("mouseup", () => {
      if (!currentImage) return;

      if (isDrawingMode && isDrawingStroke) {
        isDrawingStroke = false;
        ctx.closePath();
        redrawStrokes(); // Just redraw strokes, no need to redraw the whole image
      } else if (isCropping && isDrawing) {
        isDrawing = false;
        if (cropRect.width > 5 && cropRect.height > 5) {
          cropActions.classList.remove("hidden");
        }
      }
    });

    canvasContainer.addEventListener("mouseleave", () => {
      if (isDrawingMode && isDrawingStroke) {
        isDrawingStroke = false;
        ctx.closePath();
        redrawStrokes();
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetAllEdits();
    });
  }

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      if (!currentImage) {
        updateStatus("Please load an image first.");
        return;
      }
      updateStatus("Preparing image for download...");
      try {
        const downloadCanvas = document.createElement("canvas");
        const downloadCtx = downloadCanvas.getContext("2d");
        downloadCanvas.width = canvas.width;
        downloadCanvas.height = canvas.height;

        // 1. Draw the base transformed image
        downloadCtx.save();
        downloadCtx.translate(
          downloadCanvas.width / 2,
          downloadCanvas.height / 2
        );
        downloadCtx.scale(flipH, flipV);
        downloadCtx.rotate((rotationAngle * Math.PI) / 180);
        downloadCtx.drawImage(
          currentImage,
          -currentImage.width / 2,
          -currentImage.height / 2
        );
        downloadCtx.restore();

        // 2. Apply pixel-based filters (Highlights/Shadows)
        const imageData = downloadCtx.getImageData(
          0,
          0,
          downloadCanvas.width,
          downloadCanvas.height
        );
        applyPixelFilters(imageData);
        downloadCtx.putImageData(imageData, 0, 0);

        // 3. Apply CSS-based filters
        downloadCtx.filter = buildFilterString();
        downloadCtx.drawImage(downloadCanvas, 0, 0); // Draw canvas onto itself to apply filter

        // 4. Draw strokes on top
        drawnStrokes.forEach((stroke) => {
          downloadCtx.beginPath();
          downloadCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            downloadCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          downloadCtx.strokeStyle = stroke.color;
          downloadCtx.lineWidth = stroke.size;
          downloadCtx.lineCap = "round";
          downloadCtx.lineJoin = "round";
          downloadCtx.stroke();
        });

        const link = document.createElement("a");
        link.download = "edited-image.png";
        link.href = downloadCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        updateStatus("Download started!");
      } catch (error) {
        console.error("Download error:", error);
        updateStatus("Error trying to download the image.");
      }
    });
  }

  window.addEventListener("resize", () => {
    if (currentImage) {
      drawImageOnCanvas();
    }
  });
});
